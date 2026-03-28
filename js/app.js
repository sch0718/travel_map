/**
 * app.js
 * 애플리케이션 엔트리 포인트
 * 모든 모듈을 초기화하고 데이터를 로드한다.
 */
import { store } from './store.js';
import { initMap, setBounds, getMap } from './map/map-manager.js';
import './map/marker-manager.js';
import './map/cluster-manager.js';
import './map/route-renderer.js';
import { loadAllData } from './services/data-loader.js';
import { initHeader } from './ui/header.js';
import { initSidePanel } from './ui/side-panel.js';
import { initPlaceList } from './ui/place-list.js';
import { initPlaceInfo } from './ui/place-info.js';
import { initCategoryFilter } from './ui/category-filter.js';
import { initTripView } from './ui/trip-view.js';
import { initLoading } from './ui/loading.js';
import { initSettings } from './ui/settings.js';
import { showToast } from './ui/toast.js';

async function initApplication() {
  try {
    console.log('Travel Map 앱 초기화 시작');

    // 1. 지도 초기화 (Kakao Maps SDK 필요)
    if (!window.kakao || !window.kakao.maps) {
      console.warn('Kakao Maps SDK를 로드할 수 없습니다. 지도 없이 진행합니다.');
    } else {
      initMap('map');
    }

    // 2. UI 모듈 초기화 (DOM 필요)
    initLoading();
    initSidePanel();
    initHeader();
    initPlaceList();
    initPlaceInfo();
    initCategoryFilter();
    initTripView();
    initSettings();

    // 3. 데이터 로드 (비동기) - 로드 완료 시 store 이벤트로 UI 자동 갱신
    await loadAllData();

    // 5. 현재 맵의 장소로 지도 범위 설정
    const { currentMap } = store.state;
    if (currentMap?.places?.length > 0) {
      setBounds(currentMap.places);
    }

    // 6. 지도 클릭 시 장소 선택 해제
    const map = getMap();
    if (map && window.kakao?.maps) {
      window.kakao.maps.event.addListener(map, 'click', () => {
        store.selectPlace(null);
      });
    }

    console.log('Travel Map 앱 초기화 완료');
  } catch (err) {
    console.error('앱 초기화 실패:', err);
    showToast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
  }
}

// DOMContentLoaded 이후 초기화
function onReady() {
  // Kakao SDK autoload 모드: SDK가 이미 로드되어 있으면 바로 실행
  if (window.kakao?.maps?.load) {
    window.kakao.maps.load(initApplication);
  } else {
    // SDK 없이도 앱은 동작 (지도만 표시 안 됨)
    initApplication();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  onReady();
}
