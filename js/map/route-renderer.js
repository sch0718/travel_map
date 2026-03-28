/**
 * route-renderer.js
 * 여행 경로를 폴리라인으로 표시하고 거리/소요시간을 계산하는 모듈
 */
import { CONFIG } from '../config.js';
import { store } from '../store.js';
import { getMap } from './map-manager.js';
import { haversineDistance, formatDistance, estimateDuration } from '../utils/geo.js';

/** 현재 표시 중인 폴리라인 */
let currentPolyline = null;

/**
 * 주어진 순서대로 장소를 연결하는 폴리라인을 지도에 표시한다.
 * 기존 폴리라인이 있으면 먼저 제거한다.
 * @param {Array<{location: {lat: number, lng: number}}>} orderedPlaces - 순서가 지정된 장소 배열
 */
export function showRoute(orderedPlaces) {
  clearRoute();

  const map = getMap();
  if (!map || !orderedPlaces || orderedPlaces.length < 2) return;

  const { kakao } = window;

  const path = orderedPlaces
    .filter(p => p && p.location)
    .map(p => new kakao.maps.LatLng(p.location.lat, p.location.lng));

  if (path.length < 2) return;

  currentPolyline = new kakao.maps.Polyline({
    map,
    path,
    strokeWeight: CONFIG.polylineWidth || 3,
    strokeColor: CONFIG.polylineColor || '#3490dc',
    strokeOpacity: 0.8,
    strokeStyle: 'solid'
  });
}

/**
 * 현재 표시 중인 폴리라인을 지도에서 제거한다.
 */
export function clearRoute() {
  if (currentPolyline) {
    currentPolyline.setMap(null);
    currentPolyline = null;
  }
}

/**
 * 연속된 장소 쌍의 거리와 예상 소요시간을 계산한다.
 * 원본 데이터를 변경하지 않고 새로운 배열을 반환한다.
 *
 * @param {Array<{id: string, title: string, location: {lat: number, lng: number}}>} orderedPlaces
 * @returns {Array<{from: Object, to: Object, distance: number, distanceText: string, duration: string}>}
 *   - from/to: 장소 참조 (읽기 전용으로 사용)
 *   - distance: km 단위 거리
 *   - distanceText: 포맷된 거리 문자열
 *   - duration: 예상 소요시간 문자열
 */
export function getRouteInfo(orderedPlaces) {
  if (!orderedPlaces || orderedPlaces.length < 2) return [];

  const segments = [];

  for (let i = 0; i < orderedPlaces.length - 1; i++) {
    const from = orderedPlaces[i];
    const to = orderedPlaces[i + 1];

    if (!from.location || !to.location) continue;

    const distance = haversineDistance(from.location, to.location);

    segments.push({
      from: { id: from.id, title: from.title, location: from.location },
      to: { id: to.id, title: to.title, location: to.location },
      distance,
      distanceText: formatDistance(distance),
      duration: estimateDuration(distance)
    });
  }

  return segments;
}

// ---------- Store 이벤트 구독 ----------

/**
 * 일차가 변경되면 해당 일차의 경로를 표시한다.
 */
/**
 * dayPlace 참조 배열을 실제 장소 객체 배열로 변환한다.
 */
function resolveDayPlaces(dayPlaces, allPlaces) {
  const resolved = [];
  for (const dp of dayPlaces) {
    const place = allPlaces.find(p => p.id === dp.placeId);
    if (place) resolved.push(place);
  }
  return resolved;
}

store.on('day:changed', (dayIndex) => {
  const mapData = store.state.currentMap;
  if (!mapData || store.state.viewMode !== 'trip') {
    clearRoute();
    return;
  }

  if (!mapData.days) {
    clearRoute();
    return;
  }

  const allPlaces = mapData.places || [];

  if (dayIndex === 0) {
    const resolved = [];
    for (const day of mapData.days) {
      if (day.places) {
        resolved.push(...resolveDayPlaces(day.places, allPlaces));
      }
    }
    showRoute(resolved);
  } else {
    const day = mapData.days[dayIndex - 1];
    if (day && day.places) {
      showRoute(resolveDayPlaces(day.places, allPlaces));
    } else {
      clearRoute();
    }
  }
});

store.on('map:changed', ({ mapData, viewMode }) => {
  clearRoute();

  if (viewMode === 'trip' && mapData && mapData.days) {
    const allPlaces = mapData.places || [];
    const resolved = [];
    for (const day of mapData.days) {
      if (day.places) {
        resolved.push(...resolveDayPlaces(day.places, allPlaces));
      }
    }
    showRoute(resolved);
  }
});
