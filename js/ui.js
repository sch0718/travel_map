/**
 * UI 관리 모듈
 * 사용자 인터페이스 조작 및 이벤트 처리 기능을 제공합니다.
 */

// DOM 요소 캐싱
let themeSelect;
let categoryList;
let placesList;
let searchInput;
let searchButton;
let togglePanelButton;
let sidePanel;
let placeInfoPanel;
let mobilePanelHandle;

/**
 * UI 초기화 함수
 * UI 요소 캐싱 및 이벤트 리스너 설정
 */
function initUI() {
    // DOM 요소 캐싱
    themeSelect = document.getElementById('theme-select');
    categoryList = document.getElementById('category-list');
    placesList = document.getElementById('places');
    searchInput = document.getElementById('search-input');
    searchButton = document.getElementById('search-button');
    togglePanelButton = document.getElementById('toggle-panel');
    sidePanel = document.querySelector('.side-panel');
    placeInfoPanel = document.getElementById('place-info-panel');
    mobilePanelHandle = document.getElementById('mobile-panel-handle');
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    console.log('UI 초기화 완료');
}

/**
 * 이벤트 리스너 설정 함수
 */
function setupEventListeners() {
    // 테마/여행 선택 변경 이벤트
    themeSelect.addEventListener('change', handleThemeChange);
    
    // 검색 이벤트
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 사이드 패널 토글 이벤트
    togglePanelButton.addEventListener('click', toggleSidePanel);
    
    // 장소 정보 패널 닫기 버튼 이벤트
    document.getElementById('close-place-info').addEventListener('click', hidePlaceInfoPanel);
    
    // 모바일 패널 핸들 터치/클릭 이벤트
    mobilePanelHandle.addEventListener('click', toggleMobilePanel);
    
    // 모바일에서 터치 이벤트 처리
    setupTouchEvents();
    
    // 반응형 처리를 위한 리사이즈 이벤트
    window.addEventListener('resize', handleResize);
    
    // 초기 화면 크기에 맞게 UI 조정
    handleResize();
}

/**
 * 터치 이벤트 설정 함수
 * 모바일 환경에서 스와이프 제스처 처리
 */
function setupTouchEvents() {
    let touchStartY = 0;
    let touchEndY = 0;
    
    // 터치 시작 위치 기록
    mobilePanelHandle.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    }, false);
    
    // 터치 종료 위치 기록 및 스와이프 처리
    mobilePanelHandle.addEventListener('touchend', function(e) {
        touchEndY = e.changedTouches[0].clientY;
        handleSwipeGesture();
    }, false);
    
    // 스와이프 제스처 처리
    function handleSwipeGesture() {
        const swipeDistance = touchStartY - touchEndY;
        
        // 위로 스와이프하면 패널 열기
        if (swipeDistance > 50) {
            showMobilePanel();
        }
        // 아래로 스와이프하면 패널 닫기
        else if (swipeDistance < -50) {
            hideMobilePanel();
        }
    }
}

/**
 * 테마/여행 선택기 초기화 함수
 */
function initThemeSelector() {
    // 기존 옵션 제거 (첫 번째 기본 옵션 제외)
    while (themeSelect.options.length > 1) {
        themeSelect.remove(1);
    }
    
    // 테마 옵션 추가
    if (dataStore.themes.length > 0) {
        const themesOptgroup = document.createElement('optgroup');
        themesOptgroup.label = '테마';
        
        dataStore.themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = `theme:${theme.id}`;
            option.textContent = theme.title;
            themesOptgroup.appendChild(option);
        });
        
        themeSelect.appendChild(themesOptgroup);
    }
    
    // 여행 일정 옵션 추가
    if (dataStore.trips.length > 0) {
        const tripsOptgroup = document.createElement('optgroup');
        tripsOptgroup.label = '여행 일정';
        
        dataStore.trips.forEach(trip => {
            const option = document.createElement('option');
            option.value = `trip:${trip.id}`;
            option.textContent = trip.title;
            tripsOptgroup.appendChild(option);
        });
        
        themeSelect.appendChild(tripsOptgroup);
    }
}

/**
 * 테마/여행 변경 처리 함수
 */
function handleThemeChange() {
    const selectedValue = themeSelect.value;
    
    // 선택된 값이 없으면 종료
    if (!selectedValue || selectedValue === '') {
        return;
    }
    
    // 테마 또는 여행 일정 ID 추출
    const [type, id] = selectedValue.split(':');
    
    // 테마 또는 여행 일정에 따라 처리
    if (type === 'theme') {
        setCurrentTheme(id);
    } else if (type === 'trip') {
        setCurrentTrip(id);
    }
}

/**
 * 검색 처리 함수
 */
function handleSearch() {
    const query = searchInput.value.trim();
    searchPlaces(query);
}

/**
 * 카테고리 필터 업데이트 함수
 * @param {Object} theme - 테마 객체
 */
function updateCategoryFilters(theme) {
    // 카테고리 목록 초기화
    categoryList.innerHTML = '';
    
    // 테마가 없으면 종료
    if (!theme || !theme.categories) {
        return;
    }
    
    // 각 카테고리 그룹에 대해 필터 생성
    theme.categories.forEach(category => {
        // 카테고리 그룹 제목
        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = category.name;
        categoryList.appendChild(categoryTitle);
        
        // 카테고리 값 목록
        const valuesList = document.createElement('div');
        valuesList.className = 'category-values';
        
        // 각 카테고리 값에 대한 체크박스 생성
        category.values.forEach(value => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `category-${value.replace(/\s+/g, '-')}`;
            checkbox.value = value;
            checkbox.dataset.category = category.name;
            
            // 체크박스 변경 이벤트 리스너
            checkbox.addEventListener('change', function() {
                filterPlacesByCategory(category.name, value, this.checked);
            });
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = value;
            
            categoryItem.appendChild(checkbox);
            categoryItem.appendChild(label);
            valuesList.appendChild(categoryItem);
        });
        
        categoryList.appendChild(valuesList);
    });
}

/**
 * 테마 정보 업데이트 함수
 * @param {Object} theme - 테마 객체
 */
function updateThemeInfo(theme) {
    // 테마 정보 업데이트
    document.getElementById('theme-title').textContent = theme.title;
    document.getElementById('theme-description').textContent = theme.description;
}

/**
 * 여행 일정 정보 업데이트 함수
 * @param {Object} trip - 여행 일정 객체
 */
function updateTripInfo(trip) {
    // 여행 정보 업데이트
    document.getElementById('theme-title').textContent = trip.title;
    document.getElementById('theme-description').textContent = 
        `${trip.description} (${trip.startDate} ~ ${trip.endDate})`;
    
    // 카테고리 목록 대신 일정 표시
    categoryList.innerHTML = '';
    
    // 일자별 탭 생성
    const dayTabs = document.createElement('div');
    dayTabs.className = 'day-tabs';
    
    trip.days.forEach((day, index) => {
        const dayTab = document.createElement('button');
        dayTab.className = 'day-tab';
        dayTab.textContent = `${day.day}일차`;
        dayTab.addEventListener('click', () => showTripDay(trip, index));
        dayTabs.appendChild(dayTab);
    });
    
    categoryList.appendChild(dayTabs);
    
    // 기본적으로 첫 번째 일차 표시
    if (trip.days.length > 0) {
        showTripDay(trip, 0);
    }
}

/**
 * 여행 일차 표시 함수
 * @param {Object} trip - 여행 일정 객체
 * @param {number} dayIndex - 일차 인덱스
 */
function showTripDay(trip, dayIndex) {
    // 탭 활성화 상태 변경
    const dayTabs = document.querySelectorAll('.day-tab');
    dayTabs.forEach((tab, i) => {
        if (i === dayIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // 선택된 일차의 장소 목록 표시
    const day = trip.days[dayIndex];
    
    // 장소 목록 업데이트
    placesList.innerHTML = '';
    
    // 일차 정보 헤더
    const dayInfo = document.createElement('div');
    dayInfo.className = 'day-info';
    dayInfo.innerHTML = `<h4>${day.date} (${day.day}일차)</h4>`;
    if (day.memo) {
        dayInfo.innerHTML += `<p>${day.memo}</p>`;
    }
    placesList.appendChild(dayInfo);
    
    // 일차의 장소 목록 (방문 순서대로 정렬)
    const sortedPlaces = [...day.places].sort((a, b) => a.order - b.order);
    
    sortedPlaces.forEach(dayPlace => {
        const place = getPlaceById(dayPlace.placeId);
        if (!place) return;
        
        const placeItem = document.createElement('li');
        placeItem.className = 'place-item trip-place';
        placeItem.innerHTML = `
            <div class="place-order">${dayPlace.order}</div>
            <div class="place-content">
                <div class="place-title">${place.title}</div>
                <div class="place-time">${dayPlace.timeEstimate || ''}</div>
                <div class="place-memo">${dayPlace.memo || ''}</div>
            </div>
        `;
        
        // 장소 클릭 이벤트
        placeItem.addEventListener('click', () => moveToPlace(place.id));
        
        placesList.appendChild(placeItem);
    });
    
    // 지도에 경로 표시
    showTripPath(trip, dayIndex);
}

/**
 * 장소 목록 업데이트 함수
 * @param {Array} places - 장소 데이터 배열
 * @param {Object} trip - 여행 일정 객체 (선택적)
 */
function updatePlacesList(places, trip = null) {
    // 여행 일정 모드인 경우 별도 처리
    if (trip) {
        return;
    }
    
    // 장소 목록 초기화
    placesList.innerHTML = '';
    
    // 장소가 없으면 메시지 표시
    if (!places || places.length === 0) {
        const noPlaceItem = document.createElement('li');
        noPlaceItem.className = 'no-places';
        noPlaceItem.textContent = '표시할 장소가 없습니다.';
        placesList.appendChild(noPlaceItem);
        return;
    }
    
    // 각 장소에 대한 항목 생성
    places.forEach(place => {
        const placeItem = document.createElement('li');
        placeItem.className = 'place-item';
        placeItem.innerHTML = `
            <div class="place-title">${place.title}</div>
            <div class="place-labels">
                ${place.labels.slice(0, 3).map(label => 
                    `<span class="place-label-small">${label}</span>`
                ).join('')}
            </div>
        `;
        
        // 장소 클릭 이벤트
        placeItem.addEventListener('click', () => moveToPlace(place.id));
        
        placesList.appendChild(placeItem);
    });
}

/**
 * 장소 정보 패널 표시 함수
 * @param {Object} place - 장소 데이터
 */
function showPlaceInfoPanel(place) {
    // 장소 정보 패널 내용 업데이트
    document.getElementById('place-title').textContent = place.title;
    document.getElementById('place-address').textContent = place.address;
    document.getElementById('place-description').textContent = place.description;
    
    // 라벨/태그 목록 업데이트
    const labelsContainer = document.getElementById('place-labels');
    labelsContainer.innerHTML = '';
    
    place.labels.forEach(label => {
        const labelElement = document.createElement('span');
        labelElement.className = 'place-label';
        labelElement.textContent = label;
        labelsContainer.appendChild(labelElement);
    });
    
    // 외부 링크 업데이트
    const naverLink = document.getElementById('naver-map-link');
    const kakaoLink = document.getElementById('kakao-map-link');
    
    if (place.urls && place.urls.naver) {
        naverLink.href = place.urls.naver;
        naverLink.style.display = 'inline-block';
    } else {
        naverLink.style.display = 'none';
    }
    
    if (place.urls && place.urls.kakao) {
        kakaoLink.href = place.urls.kakao;
        kakaoLink.style.display = 'inline-block';
    } else {
        kakaoLink.style.display = 'none';
    }
    
    // 패널 표시
    placeInfoPanel.style.display = 'block';
}

/**
 * 장소 정보 패널 숨김 함수
 */
function hidePlaceInfoPanel() {
    placeInfoPanel.style.display = 'none';
}

/**
 * 사이드 패널 토글 함수
 */
function toggleSidePanel() {
    // 데스크톱에서 사이드 패널 접기/펼치기
    if (window.innerWidth >= 1024) {
        sidePanel.classList.toggle('collapsed');
        
        // 토글 버튼 방향 변경
        if (sidePanel.classList.contains('collapsed')) {
            togglePanelButton.textContent = '▶';
        } else {
            togglePanelButton.textContent = '◀';
        }
    } 
    // 태블릿에서 사이드 패널 표시/숨김
    else if (window.innerWidth >= 768) {
        sidePanel.classList.toggle('show');
    }
}

/**
 * 모바일 패널 토글 함수
 */
function toggleMobilePanel() {
    if (sidePanel.classList.contains('show')) {
        hideMobilePanel();
    } else {
        showMobilePanel();
    }
}

/**
 * 모바일 패널 표시 함수
 */
function showMobilePanel() {
    sidePanel.classList.add('show');
    mobilePanelHandle.style.display = 'none';
}

/**
 * 모바일 패널 숨김 함수
 */
function hideMobilePanel() {
    sidePanel.classList.remove('show');
    mobilePanelHandle.style.display = 'block';
}

/**
 * 화면 크기 변경 처리 함수
 */
function handleResize() {
    const width = window.innerWidth;
    
    // 모바일 화면 (768px 미만)
    if (width < 768) {
        // 사이드 패널을 하단에서 올라오는 형태로 변경
        sidePanel.classList.remove('collapsed');
        sidePanel.classList.remove('show');
        mobilePanelHandle.style.display = 'block';
    } 
    // 태블릿 화면 (768px 이상 1024px 미만)
    else if (width < 1024) {
        // 사이드 패널 기본적으로 숨김, 토글 버튼으로 표시
        sidePanel.classList.remove('collapsed');
        mobilePanelHandle.style.display = 'none';
    } 
    // 데스크톱 화면 (1024px 이상)
    else {
        // 사이드 패널 기본적으로 표시
        sidePanel.classList.remove('show');
        mobilePanelHandle.style.display = 'none';
        
        // 토글 버튼 텍스트 초기화
        togglePanelButton.textContent = '◀';
    }
}

// UI 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initUI); 