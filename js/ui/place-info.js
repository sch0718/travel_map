/**
 * place-info.js
 * 선택된 장소의 상세 정보를 플로팅 패널로 표시한다.
 */
import { store } from '../store.js';
import { createElement, $, $$ } from '../utils/dom.js';
import { getLabelInfo } from '../services/data-loader.js';

let infoPanel = null;
let titleEl = null;
let addressEl = null;
let descriptionEl = null;
let labelsEl = null;
let naverLink = null;
let kakaoLink = null;
let closeButton = null;

/**
 * 장소 정보 패널을 초기화한다.
 * DOM 요소를 캐시하고 store 이벤트를 구독한다.
 */
export function initPlaceInfo() {
  infoPanel = $('#place-info-panel');
  titleEl = $('#place-title');
  addressEl = $('#place-address');
  descriptionEl = $('#place-description');
  labelsEl = $('#place-labels');
  naverLink = $('#naver-map-link');
  kakaoLink = $('#kakao-map-link');
  closeButton = $('#close-place-info');

  if (!infoPanel) {
    console.warn('place-info.js: #place-info-panel 요소를 찾을 수 없습니다.');
    return;
  }

  // 닫기 버튼
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      store.selectPlace(null);
    });
  }

  // 패널 외부 클릭으로 닫기 방지 (패널 내부 클릭 이벤트 전파 차단)
  infoPanel.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  store.on('place:selected', onPlaceSelected);
  store.on('place:deselected', onPlaceDeselected);

  // 초기 상태: 숨김
  hidePanel();
}

/**
 * place:selected 이벤트 핸들러.
 * 장소 정보를 패널에 렌더링하고 표시한다.
 * @param {object} place
 */
function onPlaceSelected(place) {
  if (!infoPanel || !place) return;

  // 제목
  if (titleEl) {
    titleEl.textContent = place.title || '';
  }

  // 주소
  if (addressEl) {
    addressEl.textContent = place.address || '';
    addressEl.style.display = place.address ? '' : 'none';
  }

  // 설명
  if (descriptionEl) {
    descriptionEl.textContent = place.description || '';
    descriptionEl.style.display = place.description ? '' : 'none';
  }

  // 라벨
  if (labelsEl) {
    labelsEl.innerHTML = '';
    if (place.labels && place.labels.length > 0) {
      for (const labelName of place.labels) {
        labelsEl.appendChild(createLabelBadge(labelName));
      }
      labelsEl.style.display = '';
    } else {
      labelsEl.style.display = 'none';
    }
  }

  // 네이버 지도 링크
  if (naverLink) {
    const naverUrl = place.urls?.naver;
    if (naverUrl) {
      naverLink.href = naverUrl;
      naverLink.style.display = '';
    } else {
      naverLink.style.display = 'none';
    }
  }

  // 카카오 지도 링크
  if (kakaoLink) {
    const kakaoUrl = place.urls?.kakao;
    if (kakaoUrl) {
      kakaoLink.href = kakaoUrl;
      kakaoLink.style.display = '';
    } else {
      kakaoLink.style.display = 'none';
    }
  }

  showPanel();
}

/**
 * place:deselected 이벤트 핸들러.
 */
function onPlaceDeselected() {
  hidePanel();
}

/**
 * 정보 패널을 표시한다.
 */
function showPanel() {
  if (!infoPanel) return;
  infoPanel.classList.add('active');
  infoPanel.style.display = '';
}

/**
 * 정보 패널을 숨긴다.
 */
function hidePanel() {
  if (!infoPanel) return;
  infoPanel.classList.remove('active');
  infoPanel.style.display = 'none';
}

/**
 * 라벨 배지를 생성한다.
 * @param {string} labelName
 * @returns {HTMLElement}
 */
function createLabelBadge(labelName) {
  const info = getLabelInfo(labelName);

  const badge = createElement('span', {
    className: 'label-badge',
    style: { backgroundColor: info.color + '20', color: info.color, borderColor: info.color }
  });

  const icon = createElement('iconify-icon', {
    icon: info.icon,
    style: { marginRight: '4px', fontSize: '14px' }
  });
  badge.appendChild(icon);

  badge.appendChild(document.createTextNode(info.name));

  return badge;
}
