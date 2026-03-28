/**
 * loading.js
 * 로딩 오버레이의 표시/숨김을 관리한다.
 */
import { store } from '../store.js';

let overlay = null;

/**
 * 로딩 UI를 초기화한다.
 * 오버레이 요소를 찾거나 생성하고 store 이벤트를 구독한다.
 */
export function initLoading() {
  overlay = document.querySelector('.loading-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'loading-overlay';

    const spinner = document.createElement('div');
    spinner.className = 'loading-overlay__spinner';
    overlay.appendChild(spinner);

    const text = document.createElement('span');
    text.className = 'loading-overlay__text';
    text.textContent = '불러오는 중...';
    overlay.appendChild(text);

    document.body.appendChild(overlay);
  }

  // 초기 상태
  setVisible(store.state.loadingCount > 0);

  store.on('loading:changed', onLoadingChanged);
}

/**
 * loading:changed 이벤트 핸들러.
 * @param {boolean} isLoading
 */
function onLoadingChanged(isLoading) {
  setVisible(isLoading);
}

/**
 * 오버레이 표시 상태를 설정한다.
 * @param {boolean} visible
 */
function setVisible(visible) {
  if (!overlay) return;

  if (visible) {
    overlay.classList.add('loading-overlay--active');
    overlay.style.display = '';
  } else {
    overlay.classList.remove('loading-overlay--active');
    overlay.style.display = 'none';
  }
}
