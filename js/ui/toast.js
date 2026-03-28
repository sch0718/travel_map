/**
 * toast.js
 * 토스트 알림을 표시하고 자동으로 사라지게 한다.
 * 여러 토스트가 스택으로 쌓인다.
 */
import { CONFIG } from '../config.js';

let toastContainer = null;

/**
 * 토스트 컨테이너가 없으면 생성한다.
 */
function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return;

  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

/**
 * 토스트 메시지를 표시한다.
 * @param {string} message - 표시할 메시지
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - 토스트 유형
 */
export function showToast(message, type = 'info') {
  ensureContainer();

  const icons = {
    info: 'mdi:information',
    success: 'mdi:check-circle',
    warning: 'mdi:alert',
    error: 'mdi:alert-circle'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  // 아이콘
  const icon = document.createElement('iconify-icon');
  icon.setAttribute('icon', icons[type] || icons.info);
  icon.className = 'toast__icon';
  toast.appendChild(icon);

  // 메시지 텍스트
  const text = document.createElement('span');
  text.className = 'toast__message';
  text.textContent = message;
  toast.appendChild(text);

  // 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast__close';
  closeBtn.textContent = '\u00D7';
  closeBtn.addEventListener('click', () => {
    dismissToast(toast);
  });
  toast.appendChild(closeBtn);

  // 컨테이너에 추가 (애니메이션 진입)
  toastContainer.appendChild(toast);

  // requestAnimationFrame으로 애니메이션 트리거
  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  // 자동 해제
  const duration = CONFIG.toastDurationMs || 3000;
  const timer = setTimeout(() => {
    dismissToast(toast);
  }, duration);

  // 마우스 호버 시 타이머 일시 정지
  toast.addEventListener('mouseenter', () => {
    clearTimeout(timer);
  });

  toast.addEventListener('mouseleave', () => {
    setTimeout(() => {
      dismissToast(toast);
    }, 1000);
  });
}

/**
 * 토스트를 애니메이션과 함께 제거한다.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.classList.remove('toast--visible');
  toast.classList.add('toast--exit');

  toast.addEventListener('transitionend', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, { once: true });

  // 트랜지션이 발생하지 않는 경우의 fallback
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 500);
}
