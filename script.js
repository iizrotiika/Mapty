'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; //[lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    console.log('Calculating pace...');
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    console.log('Calculating speed...');
    // km/h
    this.speed = this.distance / (this.duration / 60);
  }
}

// experiments
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const deleteAllBtn = document.querySelector('.btn__delete--all');
const sortElementBtn = document.querySelector('.btn__sort');
const deleteElementBtn = document.querySelector('.workouts');
// edit btn selector
// const editElementBtn = document.querySelector('.workouts');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #sortBy = '';
  #initialElements = null;

  constructor() {
    // Get users's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    sortElementBtn.addEventListener('click', this.sortElements.bind(this));
    deleteElementBtn.addEventListener('click', this.deleteElement.bind(this));
    deleteAllBtn.addEventListener('click', this._deleteAllElements.bind(this));
    // edit btn handler
    // editElementBtn.addEventListener('click', this.editElement.bind(this));
  }

  _getPosition() {
    // Geolocation  API
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    // check if valid inputs
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🦶🏼'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="btn__container">
            <button class="btn btn__delete">Delete</button>
            <button class="btn btn__save">Save</button>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🦶🏼'
            }</span>
            <input class="workout__value" value="${
              workout.distance
            }" data-type="distance" required size="1">
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <input class="workout__value" value="${
              workout.duration
            }" data-type="duration" required size="1">
            <span class="workout__unit">min</span>
          </div>`;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <input class="workout__value" value="${workout.pace.toFixed(
            1
          )}" data-type="pace" disabled required size="1">
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <input class="workout__value" value="${
            workout.cadence
          }" data-type="cadence" required size="1">
          <span class="workout__unit">spm</span>
        </div>
      </li>`;

    if (workout.type === 'cycling')
      html += `
          <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <input class="workout__value" value="${workout.speed.toFixed(
            1
          )}" data-type="speed" disabled required size="2">
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <input class="workout__value" value="${
            workout.elevationGain
          }" data-type="elevationGain" required size="2">
          <span class="workout__unit">m</span>
        </div>
      </li>`;

    form.insertAdjacentHTML('afterend', html);

    // Add event listener for the "Save" button
    const saveBtn = document.querySelector(
      `[data-id="${workout.id}"] .btn__save`
    );
    saveBtn.addEventListener('click', () =>
      this._updateWorkoutInfo(workout.id)
    );
  }

  // move to marker on click
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (workout && workout.coords) {
      this.#map.setView(workout.coords, this.#mapZoomLevel, {
        animate: true,
        pan: {
          duration: 1,
        },
      });
    }
  }

  // Sorting logic
  initializeInitialElements() {
    const workoutElements = Array.from(
      containerWorkouts.getElementsByTagName('li')
    );
    this.#initialElements = workoutElements.slice();
  }

  sortElements() {
    if (!this.#initialElements) {
      this.initializeInitialElements();
    }

    const workoutElements = Array.from(
      containerWorkouts.getElementsByTagName('li')
    );

    if (!this.#sortBy) {
      this.#sortBy = 'cycling';
      workoutElements.sort((a, b) =>
        a.classList.contains('workout--cycling') ? -1 : 1
      );
    } else if (this.#sortBy === 'cycling') {
      this.#sortBy = 'running';
      workoutElements.sort((a, b) =>
        a.classList.contains('workout--running') ? -1 : 1
      );
    } else {
      this.#sortBy = '';
      workoutElements.sort((a, b) => {
        const indexA = this.#initialElements.indexOf(a);
        const indexB = this.#initialElements.indexOf(b);
        return indexA - indexB;
      });
    }

    workoutElements.forEach(element => containerWorkouts.appendChild(element));
  }

  // Editing workouts trough input fields
  _updateWorkoutInfo(workoutId) {
    console.log('Updating workout info...');
    const workoutEl = document.querySelector(
      `.workout[data-id="${workoutId}"]`
    );
    if (!workoutEl) return;

    const foundWorkoutIndex = this.#workouts.findIndex(
      work => work.id === workoutId
    );
    if (foundWorkoutIndex === -1) return;

    const distanceInput = workoutEl.querySelector(
      'input[data-type="distance"]'
    );
    const durationInput = workoutEl.querySelector(
      'input[data-type="duration"]'
    );
    const cadenceInput = workoutEl.querySelector('input[data-type="cadence"]');
    const elevationInput = workoutEl.querySelector(
      'input[data-type="elevationGain"]'
    );

    if (!distanceInput || !durationInput) {
      console.error('Input elements not found.');
      return;
    }

    const newDistance = +distanceInput.value;
    const newDuration = +durationInput.value;
    const newCadence = cadenceInput ? +cadenceInput.value : null;
    const newElevation = elevationInput ? +elevationInput.value : null;

    // Create a new instance of the appropriate subclass
    const updatedWorkout =
      this.#workouts[foundWorkoutIndex].type === 'running'
        ? new Running(
            this.#workouts[foundWorkoutIndex].coords,
            newDistance,
            newDuration,
            newCadence
          )
        : new Cycling(
            this.#workouts[foundWorkoutIndex].coords,
            newDistance,
            newDuration,
            newElevation
          );

    // Update the existing workout element without removing it
    this._updateWorkoutElement(workoutEl, updatedWorkout);

    // Replace the old workout with the updated one
    this.#workouts[foundWorkoutIndex] = updatedWorkout;

    // Save in local storage (update)
    this._setLocalStorage();
  }

  _updateWorkoutElement(workoutEl, workout) {
    workoutEl.querySelector('.workout__title').textContent =
      workout.description;

    const distanceValue = workoutEl.querySelector(
      'input[data-type="distance"]'
    );
    const durationValue = workoutEl.querySelector(
      'input[data-type="duration"]'
    );
    const cadenceValue = workoutEl.querySelector('input[data-type="cadence"]');
    const elevationValue = workoutEl.querySelector(
      'input[data-type="elevationGain"]'
    );

    distanceValue.value = workout.distance;
    durationValue.value = workout.duration;

    if (workout.type === 'running') {
      const paceValue = workoutEl.querySelector('input[data-type="pace"]');
      const cadenceValue = workoutEl.querySelector(
        'input[data-type="cadence"]'
      );
      paceValue.value = workout.pace.toFixed(1);
      cadenceValue.value = workout.cadence;
    } else if (workout.type === 'cycling') {
      const speedValue = workoutEl.querySelector('input[data-type="speed"]');
      const elevationValue = workoutEl.querySelector(
        'input[data-type="elevationGain"]'
      );
      speedValue.value = workout.speed.toFixed(1);
      elevationValue.value = workout.elevationGain;
    }
  }

  // Potential edit button
  // editElement(e) {
  //   const editEl = e.target.closest('.workout');
  //   if (!editEl) return;

  //   const workoutId = editEl.dataset.id;
  //   const workoutIndex = this.#workouts.findIndex(
  //     work => work.id === workoutId
  //   );
  //   if (workoutIndex !== -1 && e.target.classList.contains('btn__edit')) {
  //     this._showForm();
  //   }
  // }

  // Delete workouts
  deleteElement(e) {
    const deleteEl = e.target.closest('.workout');
    if (!deleteEl) return;

    const workoutId = deleteEl.dataset.id;
    const workoutIndex = this.#workouts.findIndex(
      work => work.id === workoutId
    );

    if (workoutIndex !== -1 && e.target.classList.contains('btn__delete')) {
      // Remove the workout element from the DOM
      deleteEl.remove();

      // Remove from #workouts array
      const removedWorkout = this.#workouts.splice(workoutIndex, 1)[0];

      // Remove from localStorage
      this.removeFromLocalStorage(removedWorkout.id);

      // Remove marker from map
      this.removeMarkerFromMap(removedWorkout.coords);
    }
  }

  removeMarkerFromMap(coords) {
    this.#map.eachLayer(layer => {
      if (layer instanceof L.Marker && layer.getLatLng().equals(coords)) {
        this.#map.removeLayer(layer);
      }
    });
  }

  removeFromLocalStorage(workoutId) {
    const workoutsFromLocalStorage =
      JSON.parse(localStorage.getItem('workouts')) || [];

    const updatedWorkouts = workoutsFromLocalStorage.filter(
      work => work.id !== workoutId
    );

    localStorage.setItem('workouts', JSON.stringify(updatedWorkouts));
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _deleteAllElements() {
    // Display a confirmation msg
    const isConfirmed = window.confirm(
      'Are you sure you want to delete all elements?'
    );

    if (isConfirmed) {
      localStorage.removeItem('workouts');
      location.reload();
    }
  }
}

const app = new App();
