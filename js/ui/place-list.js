/**
 * place-list.js
 * 사이드 패널의 장소 목록 렌더링 및 상호작용
 * 테마 모드: 필터링된 장소를 라벨과 함께 표시
 * 여행 모드: 일차별 장소를 순서, 이동수단, 거리와 함께 표시
 */
import { store } from '../store.js';
import { createElement, batchUpdate, $, $$ } from '../utils/dom.js';
import { getLabelInfo } from '../services/data-loader.js';
import { haversineDistance, formatDistance, estimateDuration } from '../utils/geo.js';

let placesContainer = null;
let listTitle = null;

/** 현재 펼쳐진 장소 ID */
let expandedPlaceId = null;

/**
 * 장소 목록 UI를 초기화한다.
 * store 이벤트를 구독하고 DOM 요소를 캐시한다.
 */
export function initPlaceList() {
  placesContainer = $('#places');
  listTitle = $('#places-list-title');

  if (!placesContainer) {
    console.warn('place-list.js: #places 요소를 찾을 수 없습니다.');
    return;
  }

  store.on('map:changed', onMapChanged);
  store.on('places:filtered', onPlacesFiltered);
  store.on('day:changed', onDayChanged);
}

/**
 * map:changed 이벤트 핸들러.
 * 뷰 모드에 따라 장소 목록을 새로 렌더링한다.
 */
function onMapChanged({ mapData, viewMode }) {
  expandedPlaceId = null;

  if (!mapData) {
    clearList();
    return;
  }

  if (viewMode === 'trip') {
    renderTripPlaces(mapData, store.state.currentDay || 0);
  } else {
    renderThemePlaces(store.state.filteredPlaces);
  }
}

/**
 * places:filtered 이벤트 핸들러.
 * 테마 모드일 때 필터 결과를 다시 렌더링한다.
 * @param {Array} places
 */
function onPlacesFiltered(places) {
  if (store.state.viewMode !== 'trip') {
    renderThemePlaces(places);
  }
}

/**
 * day:changed 이벤트 핸들러.
 * 여행 모드에서 선택된 일차의 장소를 렌더링한다.
 * @param {number} dayIndex
 */
function onDayChanged(dayIndex) {
  if (store.state.viewMode !== 'trip') return;
  const mapData = store.state.currentMap;
  if (mapData) {
    renderTripPlaces(mapData, dayIndex);
  }
}

/**
 * 장소 목록을 비운다.
 */
function clearList() {
  if (placesContainer) placesContainer.innerHTML = '';
  if (listTitle) listTitle.textContent = '장소 목록';
}

/**
 * 테마 모드에서 장소 목록을 렌더링한다.
 * @param {Array} places
 */
function renderThemePlaces(places) {
  if (!placesContainer) return;

  if (listTitle) {
    listTitle.textContent = `장소 목록 (${places.length})`;
  }

  batchUpdate(placesContainer, (fragment) => {
    for (const place of places) {
      fragment.appendChild(createThemePlaceItem(place));
    }

    if (places.length === 0) {
      fragment.appendChild(createElement('li', {
        className: 'place-item place-item--empty',
        textContent: '표시할 장소가 없습니다.'
      }));
    }
  });
}

/**
 * 테마 모드 장소 항목을 생성한다.
 * @param {object} place
 * @returns {HTMLElement}
 */
function createThemePlaceItem(place) {
  const isExpanded = expandedPlaceId === place.id;

  const li = createElement('li', {
    className: `place-item${isExpanded ? ' place-item--expanded' : ''}`,
    dataset: { placeId: place.id }
  });

  // 헤더 영역 (클릭으로 선택 및 펼치기)
  const header = createElement('div', { className: 'place-item__header' });

  const title = createElement('span', {
    className: 'place-item__title',
    textContent: place.title
  });
  header.appendChild(title);

  // 라벨 배지 (축약)
  if (place.labels && place.labels.length > 0) {
    const badges = createElement('span', { className: 'place-item__labels' });
    for (const labelName of place.labels.slice(0, 3)) {
      badges.appendChild(createLabelBadge(labelName));
    }
    if (place.labels.length > 3) {
      badges.appendChild(createElement('span', {
        className: 'label-badge label-badge--more',
        textContent: `+${place.labels.length - 3}`
      }));
    }
    header.appendChild(badges);
  }

  header.addEventListener('click', () => {
    handlePlaceClick(place.id);
  });

  li.appendChild(header);

  // 상세 영역 (펼쳐진 경우)
  if (isExpanded) {
    li.appendChild(createPlaceDetails(place));
  }

  return li;
}

/**
 * 여행 모드에서 일차별 장소 목록을 렌더링한다.
 * 순서 번호, 이동수단 정보, 거리를 포함한다.
 * @param {object} mapData
 * @param {number} dayIndex
 */
function renderTripPlaces(mapData, dayIndex) {
  if (!placesContainer) return;
  if (!mapData.days) {
    clearList();
    return;
  }

  const allPlaces = mapData.places || [];

  // dayIndex 0 = 전체, 1+ = 특정 일차
  if (dayIndex === 0) {
    // 전체 일정 표시
    if (listTitle) {
      const totalPlaces = mapData.days.reduce((sum, d) => sum + (d.places?.length || 0), 0);
      listTitle.textContent = `전체 일정 (${totalPlaces}곳)`;
    }
    batchUpdate(placesContainer, (fragment) => {
      for (const day of mapData.days) {
        const dayHeader = createElement('li', {
          className: 'place-item__day-header',
          textContent: `Day ${day.day}${day.date ? ` (${day.date})` : ''}`
        });
        fragment.appendChild(dayHeader);

        const dayPlaces = day.places || [];
        for (let i = 0; i < dayPlaces.length; i++) {
          const dp = dayPlaces[i];
          const place = allPlaces.find(p => p.id === dp.placeId);
          if (!place) continue;
          if (i > 0) {
            const prevPlace = allPlaces.find(p => p.id === dayPlaces[i - 1].placeId);
            if (prevPlace) {
              fragment.appendChild(createRouteInfo(prevPlace, place, dp.transportation || mapData.transportation));
            }
          }
          fragment.appendChild(createTripPlaceItem(place, dp, i + 1));
        }
      }
    });
    return;
  }

  const day = mapData.days[dayIndex - 1];
  if (!day) {
    clearList();
    return;
  }

  const dayPlaces = day.places || [];

  if (listTitle) {
    listTitle.textContent = `Day ${day.day} 장소 (${dayPlaces.length})`;
  }

  batchUpdate(placesContainer, (fragment) => {
    for (let i = 0; i < dayPlaces.length; i++) {
      const dp = dayPlaces[i];
      const place = allPlaces.find(p => p.id === dp.placeId);
      if (!place) continue;

      // 이전 장소와의 이동 정보 표시
      if (i > 0) {
        const prevDp = dayPlaces[i - 1];
        const prevPlace = allPlaces.find(p => p.id === prevDp.placeId);
        if (prevPlace) {
          fragment.appendChild(createRouteInfo(prevPlace, place, dp.transportation || mapData.transportation));
        }
      }

      fragment.appendChild(createTripPlaceItem(place, dp, i + 1));
    }

    if (dayPlaces.length === 0) {
      fragment.appendChild(createElement('li', {
        className: 'place-item place-item--empty',
        textContent: '이 날의 장소가 없습니다.'
      }));
    }
  });
}

/**
 * 여행 모드 장소 항목을 생성한다.
 * @param {object} place - 장소 데이터
 * @param {object} dayPlace - 일차별 장소 정보 (order, memo, timeEstimate, transportation)
 * @param {number} order - 순서 번호
 * @returns {HTMLElement}
 */
function createTripPlaceItem(place, dayPlace, order) {
  const isExpanded = expandedPlaceId === place.id;

  const li = createElement('li', {
    className: `place-item place-item--trip${isExpanded ? ' place-item--expanded' : ''}`,
    dataset: { placeId: place.id }
  });

  const header = createElement('div', { className: 'place-item__header' });

  // 순서 번호
  const orderBadge = createElement('span', {
    className: 'place-item__order',
    textContent: String(order)
  });
  header.appendChild(orderBadge);

  // 제목
  const title = createElement('span', {
    className: 'place-item__title',
    textContent: place.title
  });
  header.appendChild(title);

  // 예상 시간
  if (dayPlace.timeEstimate) {
    const time = createElement('span', {
      className: 'place-item__time',
      textContent: dayPlace.timeEstimate
    });
    header.appendChild(time);
  }

  header.addEventListener('click', () => {
    handlePlaceClick(place.id);
  });

  li.appendChild(header);

  // 메모
  if (dayPlace.memo) {
    const memo = createElement('div', {
      className: 'place-item__memo',
      textContent: dayPlace.memo
    });
    li.appendChild(memo);
  }

  // 상세 영역 (펼쳐진 경우)
  if (isExpanded) {
    li.appendChild(createPlaceDetails(place));
  }

  return li;
}

/**
 * 두 장소 사이의 이동 정보를 표시하는 요소를 생성한다.
 * @param {object} from - 출발 장소
 * @param {object} to - 도착 장소
 * @param {string} mode - 이동수단
 * @returns {HTMLElement}
 */
function createRouteInfo(from, to, mode) {
  const distance = haversineDistance(from.location, to.location);
  const distText = formatDistance(distance);
  const durationText = estimateDuration(distance, mode || 'car');

  const transportIcons = {
    car: 'mdi:car',
    bus: 'mdi:bus',
    walking: 'mdi:walk',
    bicycle: 'mdi:bicycle',
    taxi: 'mdi:taxi',
    subway: 'mdi:subway-variant'
  };
  const iconName = transportIcons[mode] || 'mdi:arrow-down';

  const div = createElement('li', { className: 'route-info' });

  const icon = createElement('iconify-icon', {
    icon: iconName,
    className: 'route-info__icon'
  });
  div.appendChild(icon);

  const text = createElement('span', {
    className: 'route-info__text',
    textContent: `${distText} · ${durationText}`
  });
  div.appendChild(text);

  return div;
}

/**
 * 장소 상세 정보 영역을 생성한다.
 * @param {object} place
 * @returns {HTMLElement}
 */
function createPlaceDetails(place) {
  const details = createElement('div', { className: 'place-item__details' });

  if (place.address) {
    details.appendChild(createElement('p', {
      className: 'place-item__address',
      textContent: place.address
    }));
  }

  if (place.description) {
    details.appendChild(createElement('p', {
      className: 'place-item__description',
      textContent: place.description
    }));
  }

  // 라벨 배지 (전체)
  if (place.labels && place.labels.length > 0) {
    const labelsDiv = createElement('div', { className: 'place-item__labels-full' });
    for (const labelName of place.labels) {
      labelsDiv.appendChild(createLabelBadge(labelName));
    }
    details.appendChild(labelsDiv);
  }

  return details;
}

/**
 * 라벨 배지 요소를 생성한다.
 * Iconify 아이콘과 CSS-only 툴팁을 포함한다.
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
    style: { marginRight: '2px', fontSize: '14px' }
  });
  badge.appendChild(icon);

  badge.appendChild(document.createTextNode(info.name));

  // CSS-only 툴팁
  if (info.description && info.description !== info.name) {
    const tooltip = createElement('span', {
      className: 'label-badge__tooltip',
      textContent: info.description
    });
    badge.appendChild(tooltip);
  }

  return badge;
}

/**
 * 장소 클릭 핸들러.
 * 같은 장소를 다시 클릭하면 접고, 다른 장소를 클릭하면 선택 및 펼친다.
 * @param {string} placeId
 */
function handlePlaceClick(placeId) {
  if (expandedPlaceId === placeId) {
    // 이미 펼쳐진 장소를 다시 클릭 → 접기
    expandedPlaceId = null;
    store.selectPlace(null);
  } else {
    // 새 장소 선택 → 펼치기
    expandedPlaceId = placeId;
    store.selectPlace(placeId);
  }

  // 현재 뷰 모드에 따라 다시 렌더링
  const { viewMode, currentMap, filteredPlaces, currentDay } = store.state;
  if (viewMode === 'trip' && currentMap) {
    renderTripPlaces(currentMap, currentDay || 0);
  } else {
    renderThemePlaces(filteredPlaces);
  }
}
