/**
 * marker-manager.js
 * 마커 풀링을 사용한 고성능 마커 관리 모듈
 * 마커를 destroy/recreate 하지 않고 setMap(null)/setMap(map)으로 show/hide 한다.
 */
import { CONFIG } from '../config.js';
import { store } from '../store.js';
import { getMap } from './map-manager.js';

/**
 * 마커 풀: Map<placeId, {overlay: kakao.maps.CustomOverlay, visible: boolean}>
 */
const markerPool = new Map();

/** 현재 선택된 마커의 placeId */
let selectedId = null;

/**
 * 라벨 정보를 조회한다.
 * store.state.labels에 저장된 정보를 우선 사용하고, 없으면 기본값을 반환한다.
 * @param {string} labelName
 * @returns {{name: string, description: string, icon: string, color: string}}
 */
function getLabelInfo(labelName) {
  const labels = store.state.labels || {};
  const info = labels[labelName];
  if (info) {
    return {
      name: labelName,
      description: info.description || labelName,
      icon: info.icon || 'mdi:tag',
      color: info.color || '#9E9E9E'
    };
  }
  return {
    name: labelName,
    description: labelName,
    icon: 'mdi:tag',
    color: '#9E9E9E'
  };
}

/**
 * 테마 마커용 HTML 생성 (눈물방울 형태 + 아이콘)
 * @param {Object} place - 장소 데이터
 * @param {string} color - 마커 색상
 * @returns {string} HTML 문자열
 */
function createThemeMarkerHTML(place, color) {
  // 첫 번째 라벨의 아이콘을 사용
  let iconClass = 'mdi:tag';
  if (place.labels && place.labels.length > 0) {
    const labelInfo = getLabelInfo(place.labels[0]);
    iconClass = labelInfo.icon;
  }

  // Iconify 형식의 아이콘을 사용
  return `
    <div class="theme-marker" data-place-id="${place.id}" title="${escapeHTML(place.title)}">
      <div class="theme-marker__pin" style="background-color: ${color};">
        <span class="iconify theme-marker__icon" data-icon="${iconClass}"></span>
      </div>
      <div class="theme-marker__shadow"></div>
    </div>
  `;
}

/**
 * 여행 마커용 HTML 생성 (번호 원형)
 * @param {Object} place - 장소 데이터
 * @param {number} order - 방문 순서 (1부터 시작)
 * @param {string} color - 마커 색상
 * @returns {string} HTML 문자열
 */
function createTripMarkerHTML(place, order, color) {
  return `
    <div class="trip-marker" data-place-id="${place.id}" title="${escapeHTML(place.title)}">
      <div class="trip-marker__circle" style="background-color: ${color}; border-color: ${color};">
        <span class="trip-marker__number">${order}</span>
      </div>
    </div>
  `;
}

/**
 * HTML 특수문자를 이스케이프한다.
 * @param {string} str
 * @returns {string}
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 테마 마커를 생성한다.
 * @param {Object} place - 장소 데이터
 * @param {string} color - 마커 색상
 * @returns {kakao.maps.CustomOverlay}
 */
export function createThemeMarker(place, color) {
  const { kakao } = window;
  const content = document.createElement('div');
  content.innerHTML = createThemeMarkerHTML(place, color);

  // 클릭 이벤트 바인딩
  content.addEventListener('click', (e) => {
    e.stopPropagation();
    store.selectPlace(place.id);
  });

  const overlay = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
    content: content,
    yAnchor: 1,
    zIndex: 3,
    clickable: true
  });

  return overlay;
}

/**
 * 여행 마커를 생성한다.
 * @param {Object} place - 장소 데이터
 * @param {number} order - 방문 순서 (1부터)
 * @param {string} color - 마커 색상
 * @returns {kakao.maps.CustomOverlay}
 */
export function createTripMarker(place, order, color) {
  const { kakao } = window;
  const content = document.createElement('div');
  content.innerHTML = createTripMarkerHTML(place, order, color);

  content.addEventListener('click', (e) => {
    e.stopPropagation();
    store.selectPlace(place.id);
  });

  const overlay = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
    content: content,
    yAnchor: 0.5,
    zIndex: 3,
    clickable: true
  });

  return overlay;
}

/**
 * 마커를 업데이트한다. 풀링을 통해 기존 마커를 재사용하고,
 * 새로운 마커만 생성하며, 불필요한 마커는 숨긴다.
 *
 * @param {Array<Object>} places - 표시할 장소 배열
 * @param {Object} [options={}]
 * @param {string} [options.mode='theme'] - 'theme' 또는 'trip'
 * @param {string} [options.color] - 마커 색상 (테마 모드용)
 * @param {string} [options.dayColor] - 여행 일정 색상
 * @param {Map<string, number>} [options.orderMap] - placeId -> 방문 순서 매핑
 * @param {Map<string, string>} [options.colorMap] - placeId -> 색상 매핑
 */
export function updateMarkers(places, options = {}) {
  const map = getMap();
  if (!map) return;

  const mode = options.mode || 'theme';
  const newPlaceIds = new Set(places.map(p => p.id));

  // 1) 기존 풀에서 새 목록에 없는 마커를 숨긴다
  for (const [id, entry] of markerPool) {
    if (!newPlaceIds.has(id) && entry.visible) {
      entry.overlay.setMap(null);
      entry.visible = false;
    }
  }

  // 2) 새 목록의 마커를 처리: 풀에 있으면 재사용, 없으면 생성
  for (const place of places) {
    const existing = markerPool.get(place.id);

    if (existing) {
      // 이미 풀에 있는 마커
      if (!existing.visible) {
        existing.overlay.setMap(map);
        existing.visible = true;
      }
    } else {
      // 새 마커 생성
      let overlay;
      if (mode === 'trip') {
        const order = options.orderMap ? (options.orderMap.get(place.id) || 1) : 1;
        const color = (options.colorMap && options.colorMap.get(place.id))
          || options.dayColor || CONFIG.themeColors[0];
        overlay = createTripMarker(place, order, color);
      } else {
        const color = (options.colorMap && options.colorMap.get(place.id))
          || options.color || CONFIG.themeColors[0];
        overlay = createThemeMarker(place, color);
      }

      overlay.setMap(map);
      markerPool.set(place.id, { overlay, visible: true });
    }
  }
}

/**
 * 특정 마커에 'selected' CSS 클래스를 추가한다.
 * @param {string} placeId
 */
export function selectMarker(placeId) {
  clearSelection();
  selectedId = placeId;

  const entry = markerPool.get(placeId);
  if (!entry) return;

  const content = entry.overlay.getContent();
  if (content instanceof HTMLElement) {
    const marker = content.querySelector('.theme-marker, .trip-marker');
    if (marker) marker.classList.add('selected');
  }
}

/**
 * 모든 마커에서 'selected' CSS 클래스를 제거한다.
 */
export function clearSelection() {
  if (selectedId) {
    const entry = markerPool.get(selectedId);
    if (entry) {
      const content = entry.overlay.getContent();
      if (content instanceof HTMLElement) {
        const marker = content.querySelector('.theme-marker, .trip-marker');
        if (marker) marker.classList.remove('selected');
      }
    }
    selectedId = null;
  }
}

/**
 * 모든 마커를 숨긴다.
 */
export function hideAll() {
  for (const [, entry] of markerPool) {
    if (entry.visible) {
      entry.overlay.setMap(null);
      entry.visible = false;
    }
  }
}

/**
 * 풀에 있는 모든 마커를 표시한다.
 */
export function showAll() {
  const map = getMap();
  if (!map) return;

  for (const [, entry] of markerPool) {
    if (!entry.visible) {
      entry.overlay.setMap(map);
      entry.visible = true;
    }
  }
}

/**
 * 마커 풀을 완전히 비운다. 지도 변경 시 호출한다.
 */
function clearPool() {
  for (const [, entry] of markerPool) {
    entry.overlay.setMap(null);
  }
  markerPool.clear();
  selectedId = null;
}

// ---------- Store 이벤트 구독 ----------

/**
 * 지도 데이터가 변경되면 풀을 초기화하고 새 마커를 표시한다.
 */
store.on('map:changed', ({ mapData, viewMode }) => {
  clearPool();

  if (!mapData || !mapData.places || mapData.places.length === 0) return;

  if (viewMode === 'trip') {
    // 여행 모드: 첫 번째 일차의 장소를 표시
    renderTripDay(0, mapData);
  } else {
    // 테마 모드: 모든 장소 표시, 라벨 기반 색상 매핑
    const colorMap = buildThemeColorMap(mapData.places);
    updateMarkers(mapData.places, {
      mode: 'theme',
      colorMap
    });
  }
});

/**
 * 필터가 적용되면 필터링된 장소만 표시한다.
 */
store.on('places:filtered', (filteredPlaces) => {
  const colorMap = buildThemeColorMap(filteredPlaces);
  updateMarkers(filteredPlaces, {
    mode: 'theme',
    colorMap
  });
});

/**
 * 장소가 선택되면 마커를 선택 상태로 표시한다.
 */
store.on('place:selected', (place) => {
  selectMarker(place.id);
});

/**
 * 장소 선택이 해제되면 마커 선택을 초기화한다.
 */
store.on('place:deselected', () => {
  clearSelection();
});

/**
 * 여행 일차가 변경되면 해당 일차의 마커를 표시한다.
 */
store.on('day:changed', (dayIndex) => {
  const mapData = store.state.currentMap;
  if (!mapData || store.state.viewMode !== 'trip') return;
  renderTripDay(dayIndex, mapData);
});

// ---------- 내부 헬퍼 ----------

/**
 * 여행 일차별 마커를 렌더링한다.
 * dayIndex가 0이면 전체 일정을 표시한다.
 * @param {number} dayIndex - 일차 인덱스 (0: 전체)
 * @param {Object} mapData - 지도 데이터
 */
function renderTripDay(dayIndex, mapData) {
  if (!mapData.days) return;

  const allPlaces = mapData.places || [];
  const resolvePlaces = [];
  const orderMap = new Map();
  const colorMap = new Map();

  if (dayIndex === 0) {
    // 전체 일정: 모든 일차의 장소를 순서대로 표시
    let globalOrder = 1;
    mapData.days.forEach((day, di) => {
      const dayColor = CONFIG.themeColors[di % CONFIG.themeColors.length];
      if (day.places) {
        for (const dp of day.places) {
          const place = allPlaces.find(p => p.id === dp.placeId);
          if (!place) continue;
          resolvePlaces.push(place);
          orderMap.set(place.id, globalOrder++);
          colorMap.set(place.id, dayColor);
        }
      }
    });
  } else {
    // 특정 일차
    const day = mapData.days[dayIndex - 1];
    if (!day || !day.places) return;
    const dayColor = CONFIG.themeColors[(dayIndex - 1) % CONFIG.themeColors.length];
    day.places.forEach((dp, i) => {
      const place = allPlaces.find(p => p.id === dp.placeId);
      if (!place) return;
      resolvePlaces.push(place);
      orderMap.set(place.id, i + 1);
      colorMap.set(place.id, dayColor);
    });
  }

  updateMarkers(resolvePlaces, {
    mode: 'trip',
    orderMap,
    colorMap
  });
}

/**
 * 테마 모드에서 장소의 첫 번째 라벨 기반으로 색상을 매핑한다.
 * @param {Array<Object>} places
 * @returns {Map<string, string>}
 */
function buildThemeColorMap(places) {
  const colorMap = new Map();
  const labelColorCache = new Map();
  let colorIndex = 0;

  for (const place of places) {
    if (place.labels && place.labels.length > 0) {
      const firstLabel = place.labels[0];
      if (!labelColorCache.has(firstLabel)) {
        // 라벨 정보에 색상이 있으면 사용, 없으면 테마 색상 순환
        const info = getLabelInfo(firstLabel);
        const color = (info.color && info.color !== '#9E9E9E')
          ? info.color
          : CONFIG.themeColors[colorIndex++ % CONFIG.themeColors.length];
        labelColorCache.set(firstLabel, color);
      }
      colorMap.set(place.id, labelColorCache.get(firstLabel));
    } else {
      colorMap.set(place.id, CONFIG.themeColors[0]);
    }
  }

  return colorMap;
}
