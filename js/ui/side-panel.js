/**
 * side-panel.js
 * 사이드 패널의 접기/펼치기 및 모바일 터치 핸들링
 */
import { store } from '../store.js';
import { $ } from '../utils/dom.js';

let sidePanel = null;
let toggleButton = null;
let mobileHandle = null;

/** 터치 추적용 상태 */
let touchStartY = 0;
let touchStartTime = 0;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 0.3;

/**
 * 사이드 패널을 초기화한다.
 * 토글 버튼, 모바일 핸들의 이벤트를 설정하고 store 이벤트를 구독한다.
 */
export function initSidePanel() {
  sidePanel = $('.side-panel');
  toggleButton = $('#toggle-panel');
  mobileHandle = $('#mobile-panel-handle');

  if (!sidePanel) {
    console.warn('side-panel.js: .side-panel 요소를 찾을 수 없습니다.');
    return;
  }

  setupToggleButton();
  setupMobileHandle();

  store.on('panel:toggled', onPanelToggled);

  // 모바일에서는 기본적으로 접힌 상태
  const isMobile = window.innerWidth <= 768;
  if (isMobile && !store.state.panelCollapsed) {
    store.setState({ panelCollapsed: true });
  }
  applyPanelState(store.state.panelCollapsed);
}

/**
 * 데스크탑 토글 버튼을 설정한다.
 */
function setupToggleButton() {
  if (!toggleButton) return;

  toggleButton.addEventListener('click', () => {
    store.togglePanel();
  });
}

/**
 * 모바일 핸들의 터치 이벤트를 설정한다.
 * 위로 스와이프하면 패널을 펼치고, 아래로 스와이프하면 접는다.
 */
function setupMobileHandle() {
  if (!mobileHandle) return;

  mobileHandle.addEventListener('touchstart', onTouchStart, { passive: true });
  mobileHandle.addEventListener('touchend', onTouchEnd, { passive: true });

  // 탭하면 토글
  mobileHandle.addEventListener('click', () => {
    store.togglePanel();
  });
}

/**
 * @param {TouchEvent} e
 */
function onTouchStart(e) {
  const touch = e.touches[0];
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
}

/**
 * @param {TouchEvent} e
 */
function onTouchEnd(e) {
  const touch = e.changedTouches[0];
  const deltaY = touchStartY - touch.clientY;
  const elapsed = Date.now() - touchStartTime;
  const velocity = Math.abs(deltaY) / elapsed;

  const isSwipe = Math.abs(deltaY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
  if (!isSwipe) return;

  const isCollapsed = store.state.panelCollapsed;

  if (deltaY > 0 && isCollapsed) {
    // 위로 스와이프 → 펼치기
    store.togglePanel();
  } else if (deltaY < 0 && !isCollapsed) {
    // 아래로 스와이프 → 접기
    store.togglePanel();
  }
}

/**
 * panel:toggled 이벤트 핸들러.
 * @param {boolean} collapsed
 */
function onPanelToggled(collapsed) {
  applyPanelState(collapsed);
}

/**
 * 패널 DOM 상태를 갱신한다.
 * @param {boolean} collapsed
 */
function applyPanelState(collapsed) {
  if (!sidePanel) return;

  sidePanel.classList.toggle('collapsed', collapsed);
  sidePanel.classList.toggle('expanded', !collapsed);

  if (toggleButton) {
    toggleButton.textContent = collapsed ? '◀' : '▶';
    toggleButton.setAttribute('aria-label', collapsed ? '패널 펼치기' : '패널 접기');
  }
}
