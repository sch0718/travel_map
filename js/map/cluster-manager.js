/**
 * cluster-manager.js
 * 그리드 기반 마커 클러스터링 모듈
 * 줌 레벨에 따라 가까운 마커들을 클러스터로 묶어 표시한다.
 * 테마 모드에서만 동작하며, 여행 모드에서는 비활성화된다.
 */
import { CONFIG } from '../config.js';
import { store } from '../store.js';
import { getMap } from './map-manager.js';

/** 클러스터 오버레이 목록 */
let clusterOverlays = [];

/** 클러스터링 활성화 상태 */
let enabled = false;

/** Kakao Maps 이벤트 리스너 참조 */
let zoomListener = null;
let idleListener = null;

/**
 * 클러스터링을 활성화한다.
 * zoom_changed와 idle 이벤트에 구독하여 자동으로 클러스터를 재계산한다.
 */
export function enable() {
  if (enabled) return;
  enabled = true;

  const map = getMap();
  if (!map) return;

  const { kakao } = window;

  zoomListener = kakao.maps.event.addListener(map, 'zoom_changed', () => {
    recalculate();
  });

  idleListener = kakao.maps.event.addListener(map, 'idle', () => {
    recalculate();
  });

  recalculate();
}

/**
 * 클러스터링을 비활성화한다.
 * 이벤트 리스너를 제거하고 모든 클러스터 오버레이를 삭제한다.
 */
export function disable() {
  if (!enabled) return;
  enabled = false;

  const map = getMap();
  const { kakao } = window;

  if (map && zoomListener) {
    kakao.maps.event.removeListener(zoomListener);
    zoomListener = null;
  }
  if (map && idleListener) {
    kakao.maps.event.removeListener(idleListener);
    idleListener = null;
  }

  clearClusters();
}

/**
 * 현재 지도 영역과 줌 레벨에 따라 클러스터를 재계산한다.
 */
function recalculate() {
  if (!enabled) return;

  const map = getMap();
  if (!map) return;

  clearClusters();

  const places = store.state.filteredPlaces || [];
  if (places.length === 0) return;

  const { kakao } = window;
  const bounds = map.getBounds();
  const projection = map.getProjection();

  // 현재 지도 영역 안의 장소만 필터
  const visiblePlaces = places.filter(place => {
    if (!place.location) return false;
    const latlng = new kakao.maps.LatLng(place.location.lat, place.location.lng);
    return bounds.contain(latlng);
  });

  if (visiblePlaces.length === 0) return;

  // 그리드 셀에 장소를 분배
  const gridSize = CONFIG.clusterGridSize || 60;
  const grid = new Map();

  for (const place of visiblePlaces) {
    const latlng = new kakao.maps.LatLng(place.location.lat, place.location.lng);
    const point = projection.pointFromCoords(latlng);
    const cellX = Math.floor(point.x / gridSize);
    const cellY = Math.floor(point.y / gridSize);
    const key = `${cellX}_${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key).push({ place, point, latlng });
  }

  const minCount = CONFIG.clusterMinCount || 3;

  // 그리드 셀별로 클러스터 또는 개별 마커 처리
  for (const [, items] of grid) {
    if (items.length >= minCount) {
      // 클러스터 생성: 셀 내 마커들의 중심 좌표 계산
      let sumX = 0;
      let sumY = 0;
      for (const item of items) {
        sumX += item.point.x;
        sumY += item.point.y;
      }
      const avgPoint = { x: sumX / items.length, y: sumY / items.length };
      const centerCoords = projection.coordsFromPoint(avgPoint);

      createClusterOverlay(centerCoords, items.length, items.map(i => i.place));
    }
    // minCount 미만이면 개별 마커가 이미 marker-manager에서 표시됨
  }
}

/**
 * 클러스터 오버레이를 생성하여 지도에 추가한다.
 * @param {kakao.maps.LatLng} position - 클러스터 중심 좌표
 * @param {number} count - 클러스터에 포함된 마커 수
 * @param {Array<Object>} places - 클러스터에 포함된 장소 배열
 */
function createClusterOverlay(position, count, places) {
  const map = getMap();
  if (!map) return;

  const { kakao } = window;

  // 크기 등급 결정
  let sizeClass = 'cluster-marker';
  if (count >= 20) {
    sizeClass += ' cluster-marker--large';
  } else if (count >= 10) {
    sizeClass += ' cluster-marker--medium';
  }

  const content = document.createElement('div');
  content.innerHTML = `
    <div class="${sizeClass}">
      <span class="cluster-marker__count">${count}</span>
    </div>
  `;

  // 클러스터 클릭 시 해당 영역으로 확대
  content.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomToCluster(places);
  });

  const overlay = new kakao.maps.CustomOverlay({
    position,
    content,
    yAnchor: 0.5,
    zIndex: 10,
    clickable: true
  });

  overlay.setMap(map);
  clusterOverlays.push(overlay);
}

/**
 * 클러스터에 포함된 장소들이 모두 보이도록 지도를 확대한다.
 * @param {Array<Object>} places - 장소 배열
 */
function zoomToCluster(places) {
  const map = getMap();
  if (!map || places.length === 0) return;

  const { kakao } = window;
  const bounds = new kakao.maps.LatLngBounds();

  for (const place of places) {
    if (place.location) {
      bounds.extend(new kakao.maps.LatLng(place.location.lat, place.location.lng));
    }
  }

  map.setBounds(bounds, 40);
}

/**
 * 모든 클러스터 오버레이를 지도에서 제거한다.
 */
function clearClusters() {
  for (const overlay of clusterOverlays) {
    overlay.setMap(null);
  }
  clusterOverlays = [];
}

// ---------- Store 이벤트 구독 ----------

/**
 * 지도 데이터가 변경되면 모드에 따라 클러스터링을 활성화/비활성화한다.
 */
store.on('map:changed', ({ viewMode }) => {
  if (viewMode === 'theme') {
    enable();
  } else {
    disable();
  }
});

/**
 * 필터가 적용되면 클러스터를 재계산한다.
 */
store.on('places:filtered', () => {
  if (enabled) {
    recalculate();
  }
});
