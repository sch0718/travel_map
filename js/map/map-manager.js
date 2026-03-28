/**
 * map-manager.js
 * Kakao Map 인스턴스를 생성하고 관리하는 모듈
 */
import { CONFIG } from '../config.js';
import { store } from '../store.js';

let map = null;
let resizeObserver = null;

/**
 * 지도를 초기화하고 기본 컨트롤을 추가한다.
 * @param {string} containerId - 지도를 렌더링할 DOM 요소의 ID
 * @returns {kakao.maps.Map} 생성된 지도 인스턴스
 */
export function initMap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Map container element not found: #${containerId}`);
  }

  const { kakao } = window;
  const center = new kakao.maps.LatLng(
    CONFIG.defaultCenter.lat,
    CONFIG.defaultCenter.lng
  );

  map = new kakao.maps.Map(container, {
    center,
    level: CONFIG.defaultZoom
  });

  // 줌 컨트롤 추가
  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);

  // 지도 타입 컨트롤 추가
  const mapTypeControl = new kakao.maps.MapTypeControl();
  map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);

  // 패널 토글 시 지도 relayout 수행 (CSS transition 이후)
  store.on('panel:toggled', () => {
    // CSS transition 완료 후 relayout 호출
    setTimeout(() => relayout(), 320);
  });

  // ResizeObserver로 컨테이너 크기 변경 감지
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (map) {
        map.relayout();
      }
    });
    resizeObserver.observe(container);
  }

  return map;
}

/**
 * 현재 지도 인스턴스를 반환한다.
 * @returns {kakao.maps.Map|null}
 */
export function getMap() {
  return map;
}

/**
 * 지도의 relayout을 수행한다.
 * 컨테이너 크기가 변경되었을 때 호출한다.
 */
export function relayout() {
  if (map) {
    map.relayout();
  }
}

/**
 * 주어진 장소 목록이 모두 보이도록 지도 영역을 자동 조정한다.
 * @param {Array<{location: {lat: number, lng: number}}>} places - 장소 배열
 */
export function setBounds(places) {
  if (!map || !places || places.length === 0) return;

  const { kakao } = window;
  const bounds = new kakao.maps.LatLngBounds();

  for (const place of places) {
    if (place.location) {
      bounds.extend(new kakao.maps.LatLng(place.location.lat, place.location.lng));
    }
  }

  map.setBounds(bounds, 80);
}

/**
 * 지도를 특정 좌표로 부드럽게 이동한다.
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {number} [level] - 줌 레벨 (선택)
 */
export function panTo(lat, lng, level) {
  if (!map) return;

  const { kakao } = window;
  const position = new kakao.maps.LatLng(lat, lng);
  map.panTo(position);

  if (level !== undefined && level !== null) {
    map.setLevel(level);
  }
}
