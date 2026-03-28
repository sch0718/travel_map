class EventEmitter {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const set = this._listeners.get(event);
    if (set) set.delete(fn);
  }

  emit(event, data) {
    const set = this._listeners.get(event);
    if (set) {
      for (const fn of set) {
        try { fn(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
      }
    }
  }
}

const initialState = {
  themes: [],
  trips: [],
  labels: {},
  transportations: [],
  currentMap: null,
  viewMode: null,      // 'theme' | 'trip'
  activeFilters: [],   // [{category, value}]
  filteredPlaces: [],
  selectedPlaceId: null,
  currentDay: null,
  loadingCount: 0,
  panelCollapsed: false,
  settings: {
    github: { owner: '', repo: '', branch: 'main', token: '' },
    gdrive: { apiKey: '', clientId: '' }
  }
};

class Store extends EventEmitter {
  constructor() {
    super();
    this._state = JSON.parse(JSON.stringify(initialState));
    this._loadSettings();
  }

  get state() {
    return this._state;
  }

  setState(partial) {
    const prev = { ...this._state };
    Object.assign(this._state, partial);

    for (const key of Object.keys(partial)) {
      if (prev[key] !== this._state[key]) {
        this.emit(`${key}:changed`, this._state[key]);
      }
    }
  }

  setCurrentMap(mapData) {
    const isTrip = Array.isArray(mapData?.days);
    const viewMode = isTrip ? 'trip' : 'theme';
    this.setState({
      currentMap: mapData,
      viewMode,
      activeFilters: [],
      filteredPlaces: mapData?.places || [],
      selectedPlaceId: null,
      currentDay: isTrip ? 0 : null
    });
    this.emit('map:changed', { mapData, viewMode });
  }

  selectPlace(placeId) {
    this.setState({ selectedPlaceId: placeId });
    if (placeId) {
      const place = this._state.currentMap?.places?.find(p => p.id === placeId);
      if (place) this.emit('place:selected', place);
    } else {
      this.emit('place:deselected');
    }
  }

  setDay(dayIndex) {
    this.setState({ currentDay: dayIndex });
    this.emit('day:changed', dayIndex);
  }

  applyFilters(filters) {
    this.setState({ activeFilters: filters });
    const places = this._state.currentMap?.places || [];
    if (filters.length === 0) {
      this.setState({ filteredPlaces: places });
    } else {
      const filtered = places.filter(place =>
        filters.every(f => place.labels?.includes(f))
      );
      this.setState({ filteredPlaces: filtered });
    }
    this.emit('places:filtered', this._state.filteredPlaces);
  }

  setLoading(isLoading) {
    const count = this._state.loadingCount + (isLoading ? 1 : -1);
    this.setState({ loadingCount: Math.max(0, count) });
    this.emit('loading:changed', this._state.loadingCount > 0);
  }

  togglePanel() {
    this.setState({ panelCollapsed: !this._state.panelCollapsed });
    this.emit('panel:toggled', this._state.panelCollapsed);
  }

  saveSettings(settings) {
    this.setState({ settings });
    try {
      localStorage.setItem('travelmap_settings', JSON.stringify(settings));
    } catch (e) { /* localStorage unavailable */ }
    this.emit('settings:changed', settings);
  }

  _loadSettings() {
    try {
      const saved = localStorage.getItem('travelmap_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        this._state.settings = { ...this._state.settings, ...parsed };
      }
    } catch (e) { /* ignore */ }
  }
}

export const store = new Store();
