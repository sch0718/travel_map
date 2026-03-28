/**
 * trip-view.js
 * 여행 모드에서 일차 탭과 여행 정보 바를 관리한다.
 */
import { store } from '../store.js';
import { createElement, batchUpdate, $ } from '../utils/dom.js';

let tripInfoContainer = null;
let dayTabsContainer = null;

/**
 * 여행 보기 UI를 초기화한다.
 * 동적으로 컨테이너를 생성하고 store 이벤트를 구독한다.
 */
export function initTripView() {
  ensureContainers();

  store.on('map:changed', onMapChanged);
  store.on('day:changed', onDayChanged);
}

/**
 * 여행 정보 바와 일차 탭 컨테이너가 없으면 생성한다.
 * .panel-content 내의 .theme-info 뒤에 삽입한다.
 */
function ensureContainers() {
  tripInfoContainer = $('#trip-info-bar');
  dayTabsContainer = $('#day-tabs');

  if (!tripInfoContainer) {
    tripInfoContainer = createElement('div', {
      id: 'trip-info-bar',
      className: 'trip-info-bar'
    });
    tripInfoContainer.style.display = 'none';

    const themeInfo = $('.theme-info');
    if (themeInfo && themeInfo.parentNode) {
      themeInfo.parentNode.insertBefore(tripInfoContainer, themeInfo.nextSibling);
    }
  }

  if (!dayTabsContainer) {
    dayTabsContainer = createElement('div', {
      id: 'day-tabs',
      className: 'day-tabs'
    });
    dayTabsContainer.style.display = 'none';

    if (tripInfoContainer && tripInfoContainer.parentNode) {
      tripInfoContainer.parentNode.insertBefore(dayTabsContainer, tripInfoContainer.nextSibling);
    }
  }
}

/**
 * map:changed 이벤트 핸들러.
 * 여행 맵이면 여행 정보와 일차 탭을 표시하고, 테마 맵이면 숨긴다.
 * @param {{ mapData: object, viewMode: string }}
 */
function onMapChanged({ mapData, viewMode }) {
  if (!tripInfoContainer || !dayTabsContainer) return;

  if (viewMode === 'trip' && mapData && Array.isArray(mapData.days)) {
    renderTripInfo(mapData);
    renderDayTabs(mapData);
    tripInfoContainer.style.display = '';
    dayTabsContainer.style.display = '';
  } else {
    tripInfoContainer.style.display = 'none';
    dayTabsContainer.style.display = 'none';
  }
}

/**
 * day:changed 이벤트 핸들러.
 * 활성 탭을 갱신한다.
 * @param {number} dayIndex
 */
function onDayChanged(dayIndex) {
  updateActiveTab(dayIndex);
}

/**
 * 여행 정보 바를 렌더링한다.
 * 날짜 범위, 이동수단, 총 장소 수 등을 표시한다.
 * @param {object} mapData
 */
function renderTripInfo(mapData) {
  if (!tripInfoContainer) return;

  const items = [];

  // 날짜 범위
  if (mapData.startDate || mapData.endDate) {
    const start = mapData.startDate || '?';
    const end = mapData.endDate || '?';
    items.push({ icon: 'mdi:calendar-range', text: `${start} ~ ${end}` });
  }

  // 이동수단
  if (mapData.transportation) {
    const transportLabels = {
      car: '자동차',
      bus: '버스',
      walking: '도보',
      bicycle: '자전거',
      taxi: '택시',
      subway: '지하철'
    };
    const label = transportLabels[mapData.transportation] || mapData.transportation;
    items.push({ icon: 'mdi:car', text: label });
  }

  // 총 일수
  if (mapData.days) {
    items.push({ icon: 'mdi:counter', text: `${mapData.days.length}일` });
  }

  // 총 장소 수
  if (mapData.places) {
    items.push({ icon: 'mdi:map-marker', text: `${mapData.places.length}곳` });
  }

  batchUpdate(tripInfoContainer, (fragment) => {
    for (const item of items) {
      const span = createElement('span', { className: 'trip-info-bar__item' });

      const icon = createElement('iconify-icon', {
        icon: item.icon,
        style: { marginRight: '4px', fontSize: '16px' }
      });
      span.appendChild(icon);
      span.appendChild(document.createTextNode(item.text));

      fragment.appendChild(span);
    }
  });
}

/**
 * 일차 탭을 렌더링한다.
 * @param {object} mapData
 */
function renderDayTabs(mapData) {
  if (!dayTabsContainer || !mapData.days) return;

  const currentDay = store.state.currentDay || 0;

  batchUpdate(dayTabsContainer, (fragment) => {
    // "전체" 탭 (dayIndex=0)
    const allTab = createElement('button', {
      className: `day-tab${currentDay === 0 ? ' day-tab--active' : ''}`,
      type: 'button',
      dataset: { dayIndex: '0' },
      textContent: '전체'
    });
    allTab.addEventListener('click', () => store.setDay(0));
    fragment.appendChild(allTab);

    // 각 일차 탭 (dayIndex=1,2,3,...)
    for (let i = 0; i < mapData.days.length; i++) {
      const day = mapData.days[i];
      const dayIndex = i + 1;
      const isActive = dayIndex === currentDay;

      const tab = createElement('button', {
        className: `day-tab${isActive ? ' day-tab--active' : ''}`,
        type: 'button',
        dataset: { dayIndex: String(dayIndex) }
      });

      const label = createElement('span', {
        className: 'day-tab__label',
        textContent: `Day ${day.day}`
      });
      tab.appendChild(label);

      if (day.date) {
        const date = createElement('span', {
          className: 'day-tab__date',
          textContent: day.date
        });
        tab.appendChild(date);
      }

      tab.addEventListener('click', () => {
        store.setDay(dayIndex);
      });

      fragment.appendChild(tab);
    }
  });
}

/**
 * 활성 탭을 갱신한다.
 * @param {number} dayIndex
 */
function updateActiveTab(dayIndex) {
  if (!dayTabsContainer) return;

  const tabs = dayTabsContainer.querySelectorAll('.day-tab');
  for (const tab of tabs) {
    const idx = parseInt(tab.dataset.dayIndex, 10);
    tab.classList.toggle('day-tab--active', idx === dayIndex);
  }
}
