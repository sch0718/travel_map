/**
 * category-filter.js
 * 현재 맵 장소들의 라벨을 기반으로 필터 칩을 생성하고 관리한다.
 * 빈도순으로 정렬되며 가로 스크롤 가능한 컨테이너에 표시된다.
 */
import { store } from '../store.js';
import { createElement, batchUpdate, $ } from '../utils/dom.js';
import { getLabelInfo } from '../services/data-loader.js';

let categoryContainer = null;

/** 현재 활성화된 라벨 이름 집합 */
let activeLabels = new Set();

/**
 * 카테고리 필터를 초기화한다.
 * DOM 요소를 캐시하고 store 이벤트를 구독한다.
 */
export function initCategoryFilter() {
  categoryContainer = $('#category-list');

  if (!categoryContainer) {
    console.warn('category-filter.js: #category-list 요소를 찾을 수 없습니다.');
    return;
  }

  store.on('map:changed', onMapChanged);
}

/**
 * map:changed 이벤트 핸들러.
 * 새 맵의 장소들에서 사용된 라벨을 추출하여 필터 칩을 생성한다.
 */
function onMapChanged({ mapData }) {
  activeLabels.clear();

  if (!mapData || !mapData.places) {
    if (categoryContainer) categoryContainer.innerHTML = '';
    return;
  }

  const labelCounts = countLabels(mapData.places);
  renderFilterChips(labelCounts);
}

/**
 * 장소 배열에서 라벨 빈도를 계산한다.
 * @param {Array} places
 * @returns {Array<{name: string, count: number}>} 빈도순 정렬된 라벨 배열
 */
function countLabels(places) {
  const counts = new Map();

  for (const place of places) {
    if (!place.labels) continue;
    for (const label of place.labels) {
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 필터 칩을 렌더링한다.
 * @param {Array<{name: string, count: number}>} labelCounts
 */
function renderFilterChips(labelCounts) {
  if (!categoryContainer) return;

  batchUpdate(categoryContainer, (fragment) => {
    // 전체 보기 칩
    const allChip = createChip('전체', 'mdi:filter-off', null, true);
    allChip.addEventListener('click', () => {
      activeLabels.clear();
      updateChipStates();
      store.applyFilters([]);
    });
    fragment.appendChild(allChip);

    // 각 라벨 칩
    for (const { name, count } of labelCounts) {
      const info = getLabelInfo(name);
      const chip = createChip(`${info.name} (${count})`, info.icon, info.color, false);
      chip.dataset.label = name;

      chip.addEventListener('click', () => {
        toggleLabel(name);
      });

      fragment.appendChild(chip);
    }
  });
}

/**
 * 필터 칩 요소를 생성한다.
 * @param {string} text - 표시 텍스트
 * @param {string} icon - Iconify 아이콘 이름
 * @param {string|null} color - 테마 색상
 * @param {boolean} isActive - 초기 활성 상태
 * @returns {HTMLElement}
 */
function createChip(text, icon, color, isActive) {
  const chip = createElement('button', {
    className: `category-chip${isActive ? ' category-chip--active' : ''}`,
    type: 'button'
  });

  if (color) {
    chip.style.setProperty('--chip-color', color);
  }

  if (icon) {
    const iconEl = createElement('iconify-icon', {
      icon: icon,
      style: { marginRight: '4px', fontSize: '16px' }
    });
    chip.appendChild(iconEl);
  }

  chip.appendChild(document.createTextNode(text));

  return chip;
}

/**
 * 라벨 활성 상태를 토글하고 필터를 적용한다.
 * @param {string} labelName
 */
function toggleLabel(labelName) {
  if (activeLabels.has(labelName)) {
    activeLabels.delete(labelName);
  } else {
    activeLabels.add(labelName);
  }

  updateChipStates();
  store.applyFilters([...activeLabels]);
}

/**
 * 모든 칩의 활성 상태를 현재 activeLabels에 맞게 갱신한다.
 */
function updateChipStates() {
  if (!categoryContainer) return;

  const chips = categoryContainer.querySelectorAll('.category-chip');
  for (const chip of chips) {
    const label = chip.dataset.label;
    if (label === undefined) {
      // "전체" 칩: 활성 필터가 없을 때 active
      chip.classList.toggle('category-chip--active', activeLabels.size === 0);
    } else {
      chip.classList.toggle('category-chip--active', activeLabels.has(label));
    }
  }
}
