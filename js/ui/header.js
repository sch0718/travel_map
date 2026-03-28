/**
 * header.js
 * 헤더 영역 관리: 테마/여행 선택, 검색, 보기 모드 전환, 설정 버튼
 */
import { store } from '../store.js';
import { $ } from '../utils/dom.js';
import { debounce } from '../utils/debounce.js';
import { CONFIG } from '../config.js';

let themeSelect = null;
let searchInput = null;
let searchButton = null;
let viewModeSelector = null;
let themeViewBtn = null;
let tripViewBtn = null;
let settingsButton = null;

/** 현재 검색어 (카테고리 필터와 별개로 관리) */
let currentSearchTerm = '';

/**
 * 헤더 UI를 초기화한다.
 * DOM 요소를 캐시하고 이벤트 리스너를 바인딩한다.
 */
export function initHeader() {
  themeSelect = $('#theme-select');
  searchInput = $('#search-input');
  searchButton = $('#search-button');
  viewModeSelector = $('#view-mode-selector');
  themeViewBtn = $('#theme-view-btn');
  tripViewBtn = $('#trip-view-btn');
  settingsButton = $('#settings-button');

  if (!themeSelect || !searchInput) {
    console.warn('header.js: 필수 DOM 요소를 찾을 수 없습니다.');
    return;
  }

  populateSelector();
  setupSelectorChange();
  setupSearch();
  setupViewModeToggle();
  setupSettingsButton();

  store.on('map:changed', onMapChanged);
}

/**
 * 셀렉터에 테마/여행 옵션을 채운다.
 * store의 themes와 trips 배열을 기반으로 optgroup을 생성한다.
 */
function populateSelector() {
  const { themes, trips } = store.state;

  themeSelect.innerHTML = '<option value="">테마/여행 선택</option>';

  if (themes.length > 0) {
    const themeGroup = document.createElement('optgroup');
    themeGroup.label = '테마 지도';
    for (const theme of themes) {
      const opt = document.createElement('option');
      opt.value = `theme:${theme.id}`;
      opt.textContent = theme.title;
      themeGroup.appendChild(opt);
    }
    themeSelect.appendChild(themeGroup);
  }

  if (trips.length > 0) {
    const tripGroup = document.createElement('optgroup');
    tripGroup.label = '여행 지도';
    for (const trip of trips) {
      const opt = document.createElement('option');
      opt.value = `trip:${trip.id}`;
      opt.textContent = trip.title;
      tripGroup.appendChild(opt);
    }
    themeSelect.appendChild(tripGroup);
  }

  // 현재 맵이 있으면 선택 상태 동기화
  syncSelectorToCurrentMap();
}

/**
 * 현재 store의 currentMap에 맞게 셀렉터 값을 동기화한다.
 */
function syncSelectorToCurrentMap() {
  const { currentMap, viewMode } = store.state;
  if (currentMap) {
    const prefix = viewMode === 'trip' ? 'trip' : 'theme';
    themeSelect.value = `${prefix}:${currentMap.id}`;
  }
}

/**
 * 셀렉터 변경 시 해당 맵 데이터를 store에 반영한다.
 */
function setupSelectorChange() {
  themeSelect.addEventListener('change', () => {
    const val = themeSelect.value;
    if (!val) return;

    const [type, id] = val.split(':');
    const source = type === 'trip' ? store.state.trips : store.state.themes;
    const mapData = source.find(m => m.id === id);

    if (mapData) {
      currentSearchTerm = '';
      searchInput.value = '';
      store.setCurrentMap(mapData);
    }
  });
}

/**
 * 검색 입력에 대해 디바운스된 텍스트 필터링을 설정한다.
 * 카테고리 필터와 독립적으로 동작하며, 제목/주소에서 검색한다.
 */
function setupSearch() {
  const doSearch = debounce((term) => {
    currentSearchTerm = term.trim().toLowerCase();
    applySearchFilter();
  }, CONFIG.searchDebounceMs);

  searchInput.addEventListener('input', (e) => {
    doSearch(e.target.value);
  });

  searchButton.addEventListener('click', () => {
    currentSearchTerm = searchInput.value.trim().toLowerCase();
    applySearchFilter();
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      currentSearchTerm = searchInput.value.trim().toLowerCase();
      applySearchFilter();
    }
  });
}

/**
 * 현재 검색어를 기반으로 장소를 필터링한다.
 * 검색어가 비어있으면 카테고리 필터만 적용되도록 한다.
 */
function applySearchFilter() {
  if (!currentSearchTerm) {
    // 검색어 없으면 카테고리 필터 상태를 다시 적용
    store.applyFilters(store.state.activeFilters);
    return;
  }

  const places = store.state.currentMap?.places || [];
  const activeFilters = store.state.activeFilters;

  let filtered = places;

  // 카테고리 필터가 있으면 먼저 적용
  if (activeFilters.length > 0) {
    filtered = filtered.filter(place =>
      activeFilters.every(f => place.labels?.includes(f))
    );
  }

  // 텍스트 검색 적용
  filtered = filtered.filter(place => {
    const title = (place.title || '').toLowerCase();
    const address = (place.address || '').toLowerCase();
    const description = (place.description || '').toLowerCase();
    return title.includes(currentSearchTerm) ||
           address.includes(currentSearchTerm) ||
           description.includes(currentSearchTerm);
  });

  store.setState({ filteredPlaces: filtered });
  store.emit('places:filtered', filtered);
}

/**
 * 보기 모드 전환 버튼을 설정한다.
 * 여행 맵일 때만 표시되며, 테마 보기/여행 보기를 토글한다.
 */
function setupViewModeToggle() {
  if (!themeViewBtn || !tripViewBtn || !viewModeSelector) return;

  themeViewBtn.addEventListener('click', () => {
    if (store.state.viewMode === 'theme') return;
    themeViewBtn.classList.add('active');
    tripViewBtn.classList.remove('active');
    store.setState({ viewMode: 'theme', currentDay: null });
    store.emit('map:changed', { mapData: store.state.currentMap, viewMode: 'theme' });
  });

  tripViewBtn.addEventListener('click', () => {
    if (store.state.viewMode === 'trip') return;
    tripViewBtn.classList.add('active');
    themeViewBtn.classList.remove('active');
    store.setState({ viewMode: 'trip', currentDay: 0 });
    store.emit('map:changed', { mapData: store.state.currentMap, viewMode: 'trip' });
  });
}

/**
 * 설정 버튼 클릭 시 'settings:open' 이벤트를 발생시킨다.
 */
function setupSettingsButton() {
  if (!settingsButton) return;
  settingsButton.addEventListener('click', () => {
    store.emit('settings:open');
  });
}

/**
 * map:changed 이벤트 핸들러.
 * 셀렉터를 다시 채우고, 보기 모드 토글 표시 여부를 결정한다.
 */
function onMapChanged({ mapData, viewMode }) {
  // 셀렉터 옵션 갱신 (새 맵이 추가되었을 수 있음)
  populateSelector();

  // 사이드 패널 헤더 업데이트
  const titleEl = document.getElementById('theme-title');
  const descEl = document.getElementById('theme-description');
  if (titleEl) titleEl.textContent = mapData?.title || '테마를 선택하세요';
  if (descEl) descEl.textContent = mapData?.description || '';

  // 보기 모드 선택기는 여행 맵일 때만 표시
  if (viewModeSelector) {
    const isTrip = Array.isArray(mapData?.days);
    viewModeSelector.style.display = isTrip ? '' : 'none';

    if (isTrip) {
      if (viewMode === 'trip') {
        tripViewBtn.classList.add('active');
        themeViewBtn.classList.remove('active');
      } else {
        themeViewBtn.classList.add('active');
        tripViewBtn.classList.remove('active');
      }
    }
  }
}

/**
 * 현재 검색어를 반환한다 (외부 모듈 연동용).
 * @returns {string}
 */
export function getSearchTerm() {
  return currentSearchTerm;
}
