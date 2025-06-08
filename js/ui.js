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
let viewModeSelector;
let themeViewBtn;
let tripViewBtn;

/**
 * UI 초기화 함수
 * UI 요소 캐싱 및 이벤트 리스너 설정
 */
function initUI() {
    console.log('UI 초기화 중...');
    
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
    viewModeSelector = document.getElementById('view-mode-selector');
    themeViewBtn = document.getElementById('theme-view-btn');
    tripViewBtn = document.getElementById('trip-view-btn');
    
    // 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 화면 설정
    handleResize();
    
    // 라벨 툴팁 설정
    setupLabelTooltips();
    
    // 변경 이벤트를 위한 옵저버 설정
    setupMutationObserver();
    
    console.log('UI 초기화 완료');
}

/**
 * 테마/여행 선택기 초기화 함수
 */
function initThemeSelector() {
    // 모든 옵션 및 옵션그룹 제거 후 기본 옵션 추가
    themeSelect.innerHTML = '<option value="">테마/여행 선택</option>';
    
    // 테마 옵션 추가 (메타데이터 인덱스 기반)
    if (dataStore.themeIndex && dataStore.themeIndex.length > 0) {
        const themesOptgroup = document.createElement('optgroup');
        themesOptgroup.label = '테마';
        
        dataStore.themeIndex.forEach(theme => {
            const option = document.createElement('option');
            option.value = `${theme.id}`;
            option.textContent = theme.title;
            if (theme.placesCount > 0) {
                option.textContent += ` (${theme.placesCount}개 장소)`;
            }
            themesOptgroup.appendChild(option);
        });
        
        themeSelect.appendChild(themesOptgroup);
    }
    
    // 여행 일정 옵션 추가 (메타데이터 인덱스 기반)
    if (dataStore.tripIndex && dataStore.tripIndex.length > 0) {
        const tripsOptgroup = document.createElement('optgroup');
        tripsOptgroup.label = '여행 일정';
        
        dataStore.tripIndex.forEach(trip => {
            const option = document.createElement('option');
            option.value = `${trip.id}`;
            option.textContent = trip.title;
            if (trip.placesCount > 0) {
                option.textContent += ` (${trip.placesCount}개 장소)`;
            }
            tripsOptgroup.appendChild(option);
        });
        
        themeSelect.appendChild(tripsOptgroup);
    }
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
    
    // 테마/여행 보기 모드 선택 버튼 이벤트
    themeViewBtn.addEventListener('click', () => {
        setViewModeUI('theme');
    });
    
    tripViewBtn.addEventListener('click', () => {
        setViewModeUI('trip');
    });
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
 * 테마/여행 변경 처리 함수
 */
async function handleThemeChange() {
    const selectedValue = themeSelect.value;
    
    // 선택된 값이 없으면 종료
    if (!selectedValue || selectedValue === '') {
        return;
    }
    
    // 선택된 마커가 있으면 원래 스타일로 복원
    if (typeof selectedMarker !== 'undefined' && selectedMarker) {
        selectedMarker.setZIndex(1);
        selectedMarker = null;
    }
    
    // 장소 정보 패널 닫기
    hidePlaceInfoPanel();
    
    // 로딩 표시
    showLoading(true);
    
    try {
        // 메타데이터에서 타입 확인
        const isTrip = dataStore.tripIndex.some(t => t.id === selectedValue);
        const isTheme = dataStore.themeIndex.some(t => t.id === selectedValue);
        
        if (isTrip) {
            // 여행 데이터 로드 (아직 로드되지 않은 경우)
            if (!dataCache.isTripCached(selectedValue)) {
                await loadTripData(selectedValue);
            }
            
            const selectedTrip = getTripById(selectedValue);
            if (selectedTrip) {
                setCurrentTrip(selectedValue);
                // 여행인 경우 보기 모드 선택기 표시
                viewModeSelector.style.display = 'flex';
                // 기본적으로 여행 모드 선택
                setViewModeUI('trip');
            } else {
                showError(`여행 데이터를 찾을 수 없습니다: ${selectedValue}`);
            }
        } else if (isTheme) {
            // 테마 데이터 로드 (아직 로드되지 않은 경우)
            if (!dataCache.isThemeCached(selectedValue)) {
                await loadThemeData(selectedValue);
            }
            
            const selectedTheme = getThemeById(selectedValue);
            if (selectedTheme) {
                setCurrentTheme(selectedTheme);
                // 테마인 경우 보기 모드 선택기 숨김
                viewModeSelector.style.display = 'none';
            } else {
                showError(`테마 데이터를 찾을 수 없습니다: ${selectedValue}`);
            }
        } else {
            showError(`선택한 항목이 테마 또는 여행 목록에 없습니다: ${selectedValue}`);
        }
    } catch (error) {
        console.error('테마/여행 변경 중 오류 발생:', error);
        showError('테마 또는 여행 데이터를 로드하는 중 오류가 발생했습니다.');
    } finally {
        showLoading(false);
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
    if (!theme || !theme.places || theme.places.length === 0) {
        return;
    }
    
    // 라벨 정보 수집 및 카테고리화
    const uniqueLabels = new Set();
    const labelCounts = {}; // 각 라벨이 사용된 횟수를 저장할 객체
    
    // 모든 장소의 라벨 수집 및 사용 횟수 계산
    theme.places.forEach(place => {
        if (place.labels && Array.isArray(place.labels)) {
            place.labels.forEach(label => {
                uniqueLabels.add(label);
                // 라벨 사용 횟수 증가
                labelCounts[label] = (labelCounts[label] || 0) + 1;
            });
        }
    });
    
    // 라벨이 없으면 종료
    if (uniqueLabels.size === 0) {
        return;
    }
    
    // 카테고리 스크롤 컨테이너 생성 (클래스명 변경)
    const categoriesContainer = document.createElement('div');
    categoriesContainer.className = 'categories-scroll-container';
    
    // 왼쪽 스크롤 버튼 추가
    const leftScrollBtn = document.createElement('div');
    leftScrollBtn.className = 'category-scroll-btn left';
    leftScrollBtn.innerHTML = '&lt;';
    leftScrollBtn.addEventListener('click', () => scrollCategoryList('left'));
    categoriesContainer.appendChild(leftScrollBtn);
    
    // 오른쪽 스크롤 버튼 추가
    const rightScrollBtn = document.createElement('div');
    rightScrollBtn.className = 'category-scroll-btn right';
    rightScrollBtn.innerHTML = '&gt;';
    rightScrollBtn.addEventListener('click', () => scrollCategoryList('right'));
    categoriesContainer.appendChild(rightScrollBtn);
    
    // 카테고리 값 목록 (가로 스크롤 컨테이너)
    const valuesList = document.createElement('div');
    valuesList.className = 'category-values';
    
    // 정렬된 라벨 목록 생성 (사용 빈도순으로 정렬, 동일 빈도일 경우 가나다순)
    const sortedLabels = Array.from(uniqueLabels).sort((a, b) => {
        // 사용 빈도가 다르면 빈도순으로 정렬 (내림차순)
        if (labelCounts[b] !== labelCounts[a]) {
            return labelCounts[b] - labelCounts[a];
        }
        // 사용 빈도가 같으면 가나다순으로 정렬
        return a.localeCompare(b, 'ko');
    });
    
    // 각 라벨에 대한 체크박스 생성
    sortedLabels.forEach(value => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `category-${value.replace(/\s+/g, '-')}`;
        checkbox.value = value;
        checkbox.dataset.category = '장소 유형';
        
        // 체크박스 변경 이벤트 리스너
        checkbox.addEventListener('change', function() {
            filterPlacesByCategory('장소 유형', value, this.checked);
        });
        
        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = value;
        
        // 개발용: 사용 횟수를 툴팁으로 표시 (나중에 제거 가능)
        label.title = `${labelCounts[value]}개 장소에서 사용됨`;
        
        categoryItem.appendChild(checkbox);
        categoryItem.appendChild(label);
        valuesList.appendChild(categoryItem);
    });
    
    // 스크롤 이벤트 리스너 추가
    valuesList.addEventListener('scroll', () => {
        updateScrollButtonsVisibility(valuesList, leftScrollBtn, rightScrollBtn);
    });
    
    categoriesContainer.appendChild(valuesList);
    categoryList.appendChild(categoriesContainer);
    
    // 초기 스크롤 버튼 상태 업데이트
    updateScrollButtonsVisibility(valuesList, leftScrollBtn, rightScrollBtn);
    
    // 리사이즈 이벤트에서 스크롤 버튼 상태 업데이트
    window.addEventListener('resize', () => {
        updateScrollButtonsVisibility(valuesList, leftScrollBtn, rightScrollBtn);
    });
}

/**
 * 카테고리 목록 스크롤 함수
 * @param {string} direction - 스크롤 방향 ('left' 또는 'right')
 */
function scrollCategoryList(direction) {
    const valuesContainer = document.querySelector('.category-values');
    if (!valuesContainer) return;
    
    const scrollAmount = 150; // 스크롤 양 (픽셀)
    
    if (direction === 'left') {
        valuesContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        valuesContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    
    // 스크롤 후 버튼 상태 업데이트
    setTimeout(() => {
        const leftBtn = document.querySelector('.category-scroll-btn.left');
        const rightBtn = document.querySelector('.category-scroll-btn.right');
        if (leftBtn && rightBtn) {
            updateScrollButtonsVisibility(valuesContainer, leftBtn, rightBtn);
        }
    }, 300);
}

/**
 * 스크롤 버튼 가시성 업데이트 함수
 * @param {HTMLElement} container - 스크롤 컨테이너
 * @param {HTMLElement} leftBtn - 왼쪽 스크롤 버튼
 * @param {HTMLElement} rightBtn - 오른쪽 스크롤 버튼
 */
function updateScrollButtonsVisibility(container, leftBtn, rightBtn) {
    if (!container || !leftBtn || !rightBtn) return;
    
    // 모든 항목이 표시될 경우 두 버튼 모두 숨김
    if (container.scrollWidth <= container.clientWidth) {
        leftBtn.style.display = 'none';
        rightBtn.style.display = 'none';
        return;
    } else {
        leftBtn.style.display = 'flex';
        rightBtn.style.display = 'flex';
    }
    
    // 왼쪽 버튼 상태 업데이트
    if (container.scrollLeft <= 5) { // 약간의 여유 허용
        leftBtn.style.opacity = '0';
        leftBtn.style.pointerEvents = 'none';
    } else {
        leftBtn.style.opacity = '0.8';
        leftBtn.style.pointerEvents = 'auto';
    }
    
    // 오른쪽 버튼 상태 업데이트
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    if (container.scrollLeft >= maxScrollLeft - 5) { // 약간의 여유 허용
        rightBtn.style.opacity = '0';
        rightBtn.style.pointerEvents = 'none';
    } else {
        rightBtn.style.opacity = '0.8';
        rightBtn.style.pointerEvents = 'auto';
    }
}

/**
 * 테마 정보 업데이트 함수
 * @param {Object} theme - 테마 객체
 */
function updateThemeInfo(theme) {
    // 테마 정보 업데이트
    const themeTitle = document.getElementById('theme-title');
    themeTitle.textContent = theme.title;
    themeTitle.style.borderLeft = `4px solid var(--primary-color)`;
    themeTitle.style.paddingLeft = '10px';
    
    document.getElementById('theme-description').textContent = theme.description;
    
    // 테마 헤더 배경색 살짝 반영 (투명도 낮게)
    const themeInfo = document.querySelector('.theme-info');
    themeInfo.style.borderBottom = `2px solid var(--primary-color)`;
    themeInfo.style.backgroundColor = `var(--primary-color)10`;
    
    // 장소 목록 제목을 '장소'로 설정
    document.getElementById('places-list-title').textContent = '장소';
    
    // 장소의 라벨을 기반으로 카테고리 필터 생성
    updateCategoryFilters(theme);
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
    dayTabs.className = 'day-buttons';
    
    trip.days.forEach((day, index) => {
        const dayTab = document.createElement('button');
        dayTab.className = 'day-tab';
        dayTab.textContent = `${day.day}일차`;
        
        // 1일차일 경우 기본적으로 활성화
        if (index === 0) {
            dayTab.classList.add('active');
        }
        
        dayTab.addEventListener('click', () => {
            // 클릭한 탭 활성화 및 다른 탭 비활성화
            document.querySelectorAll('.day-tab').forEach(tab => tab.classList.remove('active'));
            dayTab.classList.add('active');
            
            showTripDay(trip, index);
        });
        dayTabs.appendChild(dayTab);
    });
    
    categoryList.appendChild(dayTabs);
    
    // 이동 거리와 시간 정보 추가
    calculateTripDistances(trip);
    
    // 기본적으로 첫 번째 일차 표시
    if (trip.days.length > 0) {
        showTripDay(trip, 0);
    }
    
    // 장소 목록에 일정 일차만 표시하도록 UI 업데이트
    document.getElementById('places-list-title').textContent = '일정';
}

/**
 * 여행 일정의 장소 간 이동 거리와 시간 계산
 * @param {Object} trip - 여행 일정 객체
 */
function calculateTripDistances(trip) {
    trip.days.forEach(day => {
        const sortedPlaces = [...day.places].sort((a, b) => a.order - b.order);
        
        sortedPlaces.forEach((place, index) => {
            if (index < sortedPlaces.length - 1) {
                const nextPlace = sortedPlaces[index + 1];
                // trip.places 배열에서 직접 장소 객체를 찾음
                const currentPlace = trip.places.find(p => p.id === place.placeId);
                const nextPlaceObj = trip.places.find(p => p.id === nextPlace.placeId);
                
                if (currentPlace && nextPlaceObj) {
                    // 두 장소 간의 직선 거리 계산 (km)
                    const distance = calculateDistance(
                        currentPlace.location.lat, 
                        currentPlace.location.lng,
                        nextPlaceObj.location.lat, 
                        nextPlaceObj.location.lng
                    );
                    
                    // 거리에 따른 소요 시간 추정 (차량 이동 기준, 시속 40km 가정)
                    const durationMinutes = Math.round(distance / 40 * 60);
                    
                    // 이동 정보 저장
                    place.distance = `약 ${distance.toFixed(1)}km`;
                    place.duration = `(${Math.floor(durationMinutes / 60) > 0 ? 
                        Math.floor(durationMinutes / 60) + '시간 ' : ''}${durationMinutes % 60}분)`;
                }
            }
        });
    });
}

/**
 * 두 지점 간의 거리 계산 (Haversine 공식)
 * @param {number} lat1 - 첫 번째 지점의 위도
 * @param {number} lon1 - 첫 번째 지점의 경도
 * @param {number} lat2 - 두 번째 지점의 위도
 * @param {number} lon2 - 두 번째 지점의 경도
 * @returns {number} - km 단위 거리
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반경 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    const distance = R * c; // 킬로미터 단위
    return distance;
}

/**
 * 각도를 라디안으로 변환
 * @param {number} deg - 각도
 * @returns {number} - 라디안
 */
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * 여행 일정의 특정 일차 표시 함수
 * @param {Object} trip - 여행 일정 객체
 * @param {number} dayIndex - 일차 인덱스
 */
function showTripDay(trip, dayIndex) {
    // 선택된 마커가 있으면 원래 스타일로 복원
    if (typeof selectedMarker !== 'undefined' && selectedMarker) {
        selectedMarker.setZIndex(1);
        selectedMarker = null;
    }
    
    // 장소 정보 패널 닫기
    hidePlaceInfoPanel();
    
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
    
    sortedPlaces.forEach((dayPlace, index) => {
        // trip.places 배열에서 해당 placeId를 가진 장소를 찾음
        const place = trip.places.find(p => p.id === dayPlace.placeId);
        if (!place) return;
        
        const placeItem = document.createElement('li');
        placeItem.className = 'place-item trip-place';
        
        // 다음 장소와의 이동 정보 계산
        let distanceInfo = '';
        let transportationIcon = '';
        
        if (index < sortedPlaces.length - 1) {
            const nextPlace = trip.places.find(p => p.id === sortedPlaces[index + 1].placeId);
            if (nextPlace) {
                // 이동수단 정보가 있는 경우
                if (dayPlace.transportation) {
                    const transportation = getTransportationById(dayPlace.transportation);
                    if (transportation) {
                        transportationIcon = `
                            <div class="transportation-icon">
                                <iconify-icon icon="${transportation.iconifyIcon}" width="20" height="20"></iconify-icon>
                                <span>${transportation.type}</span>
                            </div>
                        `;
                    }
                }
                
                // 거리 정보가 있는 경우
                if (dayPlace.distance) {
                    distanceInfo = `
                        <div class="place-distance">
                            ${transportationIcon}
                            <span>${dayPlace.distance || ''} ${dayPlace.duration || ''}</span>
                        </div>
                    `;
                } else if (transportationIcon) {
                    // 거리 정보는 없지만 이동수단 정보는 있는 경우
                    distanceInfo = `
                        <div class="place-distance">
                            ${transportationIcon}
                        </div>
                    `;
                }
            }
        }
        
        // 기본 요약 정보
        const basicInfoHTML = `
            <div class="place-order">${dayPlace.order}</div>
            <div class="place-info-row">
                <div class="place-time">${dayPlace.timeEstimate || ''}</div>
                <div class="place-title">${place.title}</div>
            </div>
            ${dayPlace.memo ? `<div class="place-memo">${dayPlace.memo}</div>` : ''}
            ${distanceInfo}
        `;
        
        // 상세 정보 (펼쳤을 때만 보임)
        const detailsHTML = `
            <div class="place-details">
                ${place.address ? `<div class="place-address">📍 ${place.address}</div>` : ''}
                ${place.description ? `<div class="place-description">📝 ${place.description}</div>` : ''}
                ${place.labels && place.labels.length > 0 ? `
                    <div class="place-labels-container"></div>
                ` : ''}
                ${place.urls ? `
                    <div class="place-links">
                        ${place.urls.naver ? `<a href="${place.urls.naver}" target="_blank">네이버 지도</a>` : ''}
                        ${place.urls.kakao ? `<a href="${place.urls.kakao}" target="_blank">카카오 지도</a>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        // 전체 HTML 구성
        placeItem.innerHTML = `
            ${basicInfoHTML}
            <button class="toggle-details">↓</button>
            ${detailsHTML}
        `;
        
        // 확장/축소 토글 버튼 이벤트
        const toggleButton = placeItem.querySelector('.toggle-details');
        toggleButton.addEventListener('click', (e) => {
            e.stopPropagation(); // 부모 요소 클릭 이벤트 중단
            placeItem.classList.toggle('expanded');
            toggleButton.textContent = placeItem.classList.contains('expanded') ? '↑' : '↓';
        });
        
        // 장소 아이템 클릭 이벤트 (제목 부분만)
        const placeTitle = placeItem.querySelector('.place-title');
        placeTitle.addEventListener('click', function() {
            // 선택된 장소 스타일 적용
            document.querySelectorAll('.place-item').forEach(item => {
                item.classList.remove('selected');
            });
            placeItem.classList.add('selected');
            
            // 지도에서 해당 장소로 이동
            moveToPlace(place.id);
        });
        
        placesList.appendChild(placeItem);
    });
    
    // 지도에 경로 표시
    showTripPath(trip, dayIndex);
    
    // 라벨을 동적으로 추가
    const labelsContainers = document.querySelectorAll('.place-labels-container');
    labelsContainers.forEach((container, idx) => {
        const placeId = sortedPlaces[idx].placeId;
        const place = trip.places.find(p => p.id === placeId);
        
        if (place && place.labels && place.labels.length > 0) {
            // 클래스 이름 변경하여 올바른 컨테이너 클래스 사용
            container.className = 'place-labels';
            
            // 각 라벨에 대해 라벨 요소 생성하여 추가
            place.labels.forEach(label => {
                const labelElement = createLabelElement(label, true);
                container.appendChild(labelElement);
            });
        }
    });
    
    // 라벨 툴팁 이벤트 설정 (명시적 호출)
    setTimeout(setupLabelTooltips, 100);
}

/**
 * 장소의 라벨에 따라 적절한 아이콘을 반환하는 함수
 * @param {Object} place - 장소 객체
 * @returns {string} - 이모지 아이콘
 */
function getPlaceIcon(place) {
    let icon = '📍'; // 기본 아이콘
    
    if (!place || !place.labels) return icon;
    
    if (place.labels.includes('숙소')) {
        icon = '🏨';
    } else if (place.labels.includes('맛집') || place.labels.includes('음식')) {
        icon = '🍽️';
    } else if (place.labels.includes('관광지')) {
        icon = '🏞️';
    } else if (place.labels.includes('카페')) {
        icon = '☕';
    } else if (place.labels.includes('해변') || place.labels.includes('바다')) {
        icon = '🏖️';
    } else if (place.labels.includes('산')) {
        icon = '⛰️';
    } else if (place.labels.includes('공항') || place.labels.includes('교통')) {
        icon = '🚗';
    }
    
    return icon;
}

/**
 * 장소 목록 업데이트
 * @param {Array} places 장소 데이터 배열
 * @param {Object} trip 여행 데이터 (선택적)
 */
function updatePlacesList(places, trip = null) {
    try {
        // 장소 목록 컨테이너 요소
        const placesList = document.getElementById('places');
        if (!placesList) {
            console.error('장소 목록 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        // 목록 초기화
        placesList.innerHTML = '';
        
        // 장소 데이터 확인
        if (!places || !Array.isArray(places) || places.length === 0) {
            placesList.innerHTML = '<li class="empty-list">표시할 장소가 없습니다.</li>';
            return;
        }
        
        // 장소 목록 요소 생성
        const fragment = document.createDocumentFragment();
        
        // 여행 모드인 경우 일자별로 그룹화
        if (trip && trip.days) {
            // 일자별 헤더와 장소 목록 생성
            trip.days.forEach((day, dayIndex) => {
                if (day.places && day.places.length > 0) {
                    // 일자 헤더 생성
                    const dayHeader = document.createElement('li');
                    dayHeader.className = 'day-header';
                    dayHeader.innerHTML = `
                        <h4>${day.date || `Day ${dayIndex + 1}`}</h4>
                        <span class="place-count">${day.places.length}개 장소</span>
                    `;
                    fragment.appendChild(dayHeader);
                    
                    // 일자의 장소 목록 생성
                    day.places.forEach((place, placeIndex) => {
                        const listItem = createPlaceListItem(place, trip, dayIndex, placeIndex);
                        fragment.appendChild(listItem);
                    });
                }
            });
        } else {
            // 일반 테마 모드: 장소 목록 생성
            places.forEach((place) => {
                const listItem = createPlaceListItem(place);
                fragment.appendChild(listItem);
            });
        }
        
        // 생성된 요소 추가
        placesList.appendChild(fragment);
        
    } catch (error) {
        console.error('장소 목록 업데이트 중 오류 발생:', error);
        document.getElementById('places').innerHTML = '<li class="error">장소 목록을 불러오는 중 오류가 발생했습니다.</li>';
    }
}

/**
 * 장소 목록 아이템 생성
 * @param {Object} place 장소 데이터
 * @param {Object} trip 여행 데이터 (선택적)
 * @param {Number} dayIndex 일차 인덱스 (선택적)
 * @param {Number} placeIndex 장소 인덱스 (선택적)
 * @returns {HTMLElement} 장소 목록 아이템
 */
function createPlaceListItem(place, trip = null, dayIndex = -1, placeIndex = -1) {
    try {
        // 장소 데이터 유효성 검사
        if (!place || !place.title) {
            console.warn('유효하지 않은 장소 데이터:', place);
            return document.createElement('li');
        }
        
        // 목록 아이템 요소 생성
        const listItem = document.createElement('li');
        listItem.className = 'place-item';
        listItem.dataset.placeId = place.id;
        
        // 순서 번호 (여행 모드에서만 표시)
        let orderHTML = '';
        if (trip && dayIndex >= 0 && placeIndex >= 0) {
            orderHTML = `<span class="place-order">${placeIndex + 1}</span>`;
        }
        
        // 장소 아이콘 (라벨 기반)
        let iconHTML = '<iconify-icon icon="mdi:map-marker" class="place-icon"></iconify-icon>';
        if (place.labels && place.labels.length > 0) {
            // 첫 번째 라벨 기준 아이콘 설정
            const primaryLabel = place.labels[0];
            const labelInfo = window.dataStore && window.dataStore.labelInfo ? 
                              window.dataStore.labelInfo[primaryLabel] : null;
            
            if (labelInfo && labelInfo.icon) {
                iconHTML = `<iconify-icon icon="${labelInfo.icon}" class="place-icon"></iconify-icon>`;
            }
        }
        
        // 라벨 HTML 생성
        let labelsHTML = '';
        if (place.labels && place.labels.length > 0) {
            labelsHTML = '<div class="place-labels">';
            place.labels.slice(0, 3).forEach(label => {
                const labelElement = createLabelElement(label);
                const tempDiv = document.createElement('div');
                tempDiv.appendChild(labelElement);
                labelsHTML += tempDiv.innerHTML;
            });
            
            // 라벨이 3개 이상이면 "+" 표시 추가
            if (place.labels.length > 3) {
                labelsHTML += `<span class="more-labels">+${place.labels.length - 3}</span>`;
            }
            
            labelsHTML += '</div>';
        }
        
        // 장소 HTML 구성
        listItem.innerHTML = `
            ${orderHTML}
            <div class="place-info">
                <div class="place-header">
                    ${iconHTML}
                    <span class="place-name">${place.title}</span>
                </div>
                ${labelsHTML}
                <div class="place-address">${place.address || ''}</div>
            </div>
        `;
        
        // 클릭 이벤트 추가
        listItem.addEventListener('click', () => {
            // 지도에 해당 장소 중심으로 이동
            if (place.location && typeof window.mapModule !== 'undefined') {
                const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
                window.mapModule.showPlaceInfo(place);
                map.panTo(position);
                map.setLevel(3); // 적절한 줌 레벨 설정
            }
        });
        
        return listItem;
    } catch (error) {
        console.error('장소 목록 아이템 생성 중 오류 발생:', error, place);
        const errorItem = document.createElement('li');
        errorItem.className = 'place-item error';
        errorItem.textContent = '장소 정보를 표시할 수 없습니다.';
        return errorItem;
    }
}

/**
 * 장소 정보 패널 표시 함수
 * @param {Object} place - 장소 정보 객체
 * @param {Object} markerPosition - 마커의 화면상 위치 (x, y 좌표)
 */
async function showPlaceInfoPanel(place, markerPosition) {
    if (!place || !place.id) {
        console.error('유효하지 않은 장소 정보:', place);
        return;
    }
    
    // 로딩 상태 표시 (기본 정보로 패널 먼저 표시)
    const placeInfoHeader = document.querySelector('.place-info-header');
    const titleElement = document.getElementById('place-title');
    titleElement.innerHTML = ''; // 내용 초기화
    
    // 패널 표시 전에 일단 보이게 설정 (크기 계산을 위해)
    placeInfoPanel.style.display = 'block';
    
    // 기본 정보로 일단 패널 표시
    titleElement.textContent = place.title || place.name || '장소 이름 없음';
    document.getElementById('place-address').textContent = place.address || '주소 로딩 중...';
    document.getElementById('place-description').textContent = place.description || '상세 정보를 불러오는 중...';
    document.getElementById('place-labels').innerHTML = '';
    
    // 패널 위치 조정
    positionPlaceInfoPanel(place, markerPosition);
    
    try {
        // 장소 상세 정보 비동기 로드
        const detailedPlace = await loadPlaceDetails(place.id);
        
        if (!detailedPlace) {
            console.warn(`장소 ID ${place.id}에 대한 상세 정보를 찾을 수 없습니다. 기본 정보만 표시합니다.`);
            // 기본 정보만으로 계속 표시
            updatePlaceInfoPanelContent(place, true);
            return;
        }
        
        // 로드된 상세 정보로 패널 업데이트
        updatePlaceInfoPanelContent(detailedPlace);
    } catch (error) {
        console.error('장소 상세 정보 로드 실패:', error);
        // 기본 정보만으로 계속 표시
        updatePlaceInfoPanelContent(place, true);
    }
    
    // 장소 정보 패널 내부 클릭 이벤트가 지도로 전파되는 것을 방지
    if (!placeInfoPanel._hasClickHandler) {
        placeInfoPanel.addEventListener('click', function(e) {
            // 이벤트 전파 방지
            e.stopPropagation();
        });
        placeInfoPanel._hasClickHandler = true;
    }
}

/**
 * 장소 정보 패널 내용 업데이트 함수
 * @param {Object} place - 장소 정보 객체
 * @param {boolean} isBasicInfo - 기본 정보만 있는 경우 true
 */
function updatePlaceInfoPanelContent(place, isBasicInfo = false) {
    if (!place) {
        console.error('장소 정보가 없습니다.');
        return;
    }
    
    // 타이틀 업데이트
    const titleElement = document.getElementById('place-title');
    titleElement.innerHTML = ''; // 내용 초기화
    
    // 테마 모드일 경우 아이콘 추가
    if (dataStore.currentTheme && !dataStore.currentTrip) {
        // 아이콘 스팬 생성
        const iconSpan = document.createElement('span');
        iconSpan.className = 'place-icon';
        iconSpan.textContent = getPlaceIcon(place);
        iconSpan.style.marginRight = '8px';
        
        // 제목에 아이콘 추가
        titleElement.appendChild(iconSpan);
    }
    
    // 제목 텍스트 추가
    const titleText = document.createTextNode(place.title || place.name || '이름 없음');
    titleElement.appendChild(titleText);
    
    // 기본 정보 업데이트
    document.getElementById('place-address').textContent = place.address || '주소 정보 없음';
    document.getElementById('place-description').textContent = place.description || '설명 정보 없음';
    
    if (isBasicInfo) {
        // 기본 정보만 있는 경우 스타일 변경
        document.getElementById('place-description').classList.add('info-loading-failed');
    } else {
        document.getElementById('place-description').classList.remove('info-loading-failed');
    }
    
    // 라벨/태그 목록 업데이트
    const labelsContainer = document.getElementById('place-labels');
    labelsContainer.innerHTML = '';
    
    if (place.labels && place.labels.length > 0) {
        place.labels.forEach(label => {
            if (label) { // 유효한 라벨인 경우에만 생성
                const labelElement = createLabelElement(label, false);
                labelsContainer.appendChild(labelElement);
            }
        });
        
        if (labelsContainer.children.length === 0) {
            labelsContainer.innerHTML = '<span class="no-labels">라벨 없음</span>';
        }
    } else {
        labelsContainer.innerHTML = '<span class="no-labels">라벨 없음</span>';
    }
    
    // 외부 링크 업데이트
    const naverLink = document.getElementById('naver-map-link');
    const kakaoLink = document.getElementById('kakao-map-link');
    
    // 기본적으로 링크 숨김
    naverLink.style.display = 'none';
    kakaoLink.style.display = 'none';
    
    // 좌표 기반 지도 링크 생성
    if (place.location && place.location.lat && place.location.lng) {
        const lat = place.location.lat;
        const lng = place.location.lng;
        const placeName = encodeURIComponent(place.title || place.name || '장소');
        
        // 네이버 지도 링크 생성
        naverLink.href = `https://map.naver.com/v5/search/${placeName}?c=${lng},${lat},15,0,0,0,dh`;
        naverLink.style.display = 'inline-block';
        
        // 카카오 지도 링크 생성
        kakaoLink.href = `https://map.kakao.com/link/map/${placeName},${lat},${lng}`;
        kakaoLink.style.display = 'inline-block';
    }
    
    // URL이 직접 제공된 경우 우선 사용
    if (place.urls) {
        if (place.urls.naver) {
            naverLink.href = place.urls.naver;
            naverLink.style.display = 'inline-block';
        }
        
        if (place.urls.kakao) {
            kakaoLink.href = place.urls.kakao;
            kakaoLink.style.display = 'inline-block';
        }
    }
    
    // 패널 헤더 색상 설정
    const placeInfoHeader = document.querySelector('.place-info-header');
    placeInfoHeader.style.borderBottom = `2px solid var(--primary-color)`;
    placeInfoHeader.style.backgroundColor = `var(--primary-color)10`;
    
    // 라벨 툴팁 이벤트 설정
    setupLabelTooltips();
}

/**
 * 장소 정보 패널 위치 조정 함수
 * @param {Object} place - 장소 정보 객체
 * @param {Object} markerPosition - 마커의 화면상 위치 (x, y 좌표)
 */
function positionPlaceInfoPanel(place, markerPosition) {
    // 마커 위치가 제공된 경우 위치 조정
    if (markerPosition) {
        // 지도 컨테이너의 크기와 위치
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer.getBoundingClientRect();
        
        // 팝업의 크기
        const panelWidth = placeInfoPanel.offsetWidth;
        const panelHeight = placeInfoPanel.offsetHeight;
        
        // 마커 위치가 지도의 어느 영역에 있는지 확인 (좌상, 우상, 좌하, 우하)
        const isRightHalf = markerPosition.x > mapRect.width / 2;
        const isBottomHalf = markerPosition.y > mapRect.height / 2;
        
        // 팝업 위치 계산
        let left, top;
        
        // 가로 위치 계산
        if (isRightHalf) {
            // 마커가 오른쪽 영역에 있으면 팝업은 마커 왼쪽에 표시
            left = markerPosition.x - panelWidth - 10; // 간격 축소 (20px → 10px)
        } else {
            // 마커가 왼쪽 영역에 있으면 팝업은 마커 오른쪽에 표시
            left = markerPosition.x + 10; // 간격 축소 (20px → 10px)
        }
        
        // 마커 타입 감지 - 클릭된 마커의 DOM 요소를 확인
        let isCustomNumberMarker = false;
        
        // 마커 타입을 확인하는 방법
        // 1. place.order가 있으면 숫자 마커
        // 2. dataStore.currentTrip이 있으면 숫자 마커 가능성 높음
        // 3. DOM에서 클릭된 마커 요소를 확인
        if (place.order !== undefined || (dataStore.currentTrip && dataStore.currentDay !== undefined)) {
            isCustomNumberMarker = true;
        } else {
            // 선택적으로 DOM에서 확인 (성능상 필요한 경우만)
            const markerElements = document.querySelectorAll('.custom-marker');
            for (const elem of markerElements) {
                if (elem.getAttribute('data-place-id') === place.id) {
                    isCustomNumberMarker = /^\d+$/.test(elem.textContent.trim());
                    break;
                }
            }
        }
        
        // 세로 위치 계산 (마커 타입에 따라 최적화)
        if (isBottomHalf) {
            if (isCustomNumberMarker) {
                // 숫자 마커의 경우 (크기: 30px)
                top = markerPosition.y - panelHeight - 5; // 숫자 마커 바로 위에 표시
            } else {
                // 일반 마커의 경우 (높이: 36px)
                top = markerPosition.y - panelHeight - 8; // 일반 마커 위에 표시
            }
        } else {
            if (isCustomNumberMarker) {
                // 숫자 마커의 경우
                top = markerPosition.y + 20; // 숫자 마커 아래에 표시
            } else {
                // 일반 마커의 경우
                top = markerPosition.y + 25; // 일반 마커 아래에 표시
            }
        }
        
        // 팝업이 지도 영역을 벗어나지 않도록 보정
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + panelWidth > mapRect.width) left = mapRect.width - panelWidth;
        if (top + panelHeight > mapRect.height) top = mapRect.height - panelHeight;
        
        // 계산된 위치로 팝업 위치 설정
        placeInfoPanel.style.left = left + 'px';
        placeInfoPanel.style.top = top + 'px';
    } else {
        // 마커 위치가 제공되지 않은 경우 중앙 배치
        placeInfoPanel.style.left = '50%';
        placeInfoPanel.style.top = '50%';
        placeInfoPanel.style.transform = 'translate(-50%, -50%)';
    }
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
    // 토글 전에 원래 상태 저장
    const wasCollapsed = sidePanel.classList.contains('collapsed');
    
    // 데스크톱에서 사이드 패널 접기/펼치기
    if (window.innerWidth >= 1024) {
        sidePanel.classList.toggle('collapsed');
        
        // 토글 버튼 방향 변경 - 현재 상태에 맞는 아이콘으로 표시
        if (sidePanel.classList.contains('collapsed')) {
            // 패널이 접힌 상태(패널이 보이지 않음) -> 패널을 펼치는 아이콘(왼쪽 화살표)
            togglePanelButton.textContent = '◀';
            console.log('패널 접힘 상태 - 왼쪽 화살표(◀) 표시: 패널 펼치기 동작');
        } else {
            // 패널이 펼쳐진 상태(패널이 보임) -> 패널을 접는 아이콘(오른쪽 화살표)
            togglePanelButton.textContent = '▶';
            console.log('패널 펼침 상태 - 오른쪽 화살표(▶) 표시: 패널 접기 동작');
        }
        
        // 사이드 패널 전환 후 CSS transition이 완료될 때 지도 영역 리사이즈 트리거
        if (wasCollapsed !== sidePanel.classList.contains('collapsed')) {
            // 지도 컨테이너 요소 가져오기
            const mapContainer = document.getElementById('map');
            
            // 패널 토글 후 바로 초기 스타일 설정 - CSS만으로는 해결이 안되는 경우를 위한 보험
            if (sidePanel.classList.contains('collapsed')) {
                // 패널이 접힌 경우, 지도 영역을 전체 화면으로 확장
                mapContainer.style.width = '100%';
            } else {
                // 패널이 펼쳐진 경우, 지도 영역을 축소
                mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
            }
            
            // CSS transition이 완료될 때까지 기다린 후 지도 크기 조정
            setTimeout(() => {
                if (map) {
                    map.relayout();
                    
                    // 마커가 있으면 모두 보이도록 지도 범위 조정
                    if (markers && markers.length > 0) {
                        setMapBounds(markers.map(marker => marker.place));
                    }
                    
                    // 선택된 마커가 있고 팝업이 열려있으면 팝업 위치 업데이트
                    if (typeof updateInfoPanelPosition === 'function') {
                        updateInfoPanelPosition();
                    }
                }
            }, 300);
        }
    }
    // 태블릿에서 사이드 패널 표시/숨김
    else if (window.innerWidth >= 768) {
        sidePanel.classList.toggle('show');
        
        // 지도 컨테이너 요소 가져오기
        const mapContainer = document.getElementById('map');
        
        // 사이드 패널 상태에 따라 지도 크기 조절
        if (sidePanel.classList.contains('show')) {
            mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
        } else {
            mapContainer.style.width = '100%';
        }
        
        // 지도 크기 조정
        setTimeout(() => {
            if (map) {
                map.relayout();
                
                // 마커가 있으면 모두 보이도록 지도 범위 조정
                if (markers && markers.length > 0) {
                    setMapBounds(markers.map(marker => marker.place));
                }
                
                // 선택된 마커가 있고 팝업이 열려있으면 팝업 위치 업데이트
                if (typeof updateInfoPanelPosition === 'function') {
                    updateInfoPanelPosition();
                }
            }
        }, 300);
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
    const prevWidth = window.prevWidth || width;
    window.prevWidth = width;
    
    // 지도 컨테이너 요소 가져오기
    const mapContainer = document.getElementById('map');
    
    // 모바일 화면 (768px 미만)
    if (width < 768) {
        // 사이드 패널을 하단에서 올라오는 형태로 변경
        sidePanel.classList.remove('collapsed');
        sidePanel.classList.remove('show');
        mobilePanelHandle.style.display = 'block';
        
        // 모바일에서는 지도가 전체 너비 차지
        if (mapContainer) {
            mapContainer.style.width = '100%';
        }
    } 
    // 태블릿 화면 (768px 이상 1024px 미만)
    else if (width < 1024) {
        // 사이드 패널 기본적으로 숨김, 토글 버튼으로 표시
        sidePanel.classList.remove('collapsed');
        mobilePanelHandle.style.display = 'none';
        
        // 태블릿에서 사이드 패널이 보이면 지도 크기 조절
        if (mapContainer) {
            if (sidePanel.classList.contains('show')) {
                mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
            } else {
                mapContainer.style.width = '100%';
            }
        }
    } 
    // 데스크톱 화면 (1024px 이상)
    else {
        // 사이드 패널 기본적으로 표시
        sidePanel.classList.remove('show');
        mobilePanelHandle.style.display = 'none';
        
        // 토글 버튼 텍스트 초기화 - 패널 상태에 맞는 아이콘으로 설정
        if (sidePanel.classList.contains('collapsed')) {
            // 패널이 접힌 상태 -> 펼치기 아이콘(왼쪽 화살표)
            togglePanelButton.textContent = '◀';
            console.log('리사이즈: 패널 접힘 상태 - 왼쪽 화살표(◀) 표시: 패널 펼치기 동작');
        } else {
            // 패널이 펼쳐진 상태 -> 접기 아이콘(오른쪽 화살표)
            togglePanelButton.textContent = '▶';
            console.log('리사이즈: 패널 펼침 상태 - 오른쪽 화살표(▶) 표시: 패널 접기 동작');
        }
        
        // 데스크톱에서 사이드 패널이 접혀있으면 지도 크기 조절
        if (mapContainer) {
            if (sidePanel.classList.contains('collapsed')) {
                mapContainer.style.width = '100%';
            } else {
                mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
            }
        }
    }
    
    // 화면 크기 변경이 중요한 범위(breakpoint 근처)에서 발생했을 때만 리레이아웃 수행
    // 레이아웃이 실제로 변경되었는지 확인 (모바일/태블릿/데스크탑 전환)
    const isBreakpointChange = 
        (prevWidth < 768 && width >= 768) || 
        (prevWidth >= 768 && width < 768) ||
        (prevWidth < 1024 && width >= 1024) || 
        (prevWidth >= 1024 && width < 1024);
    
    if (isBreakpointChange) {
        console.log('화면 크기 변경으로 지도 리레이아웃 실행');
        
        // 화면 크기 변경 후 약간의 지연을 두고 지도 리레이아웃 실행
        setTimeout(() => {
            if (typeof map !== 'undefined' && map) {
                // 강제 리플로우 트리거
                if (mapContainer) {
                    const currentWidth = mapContainer.offsetWidth;
                    mapContainer.style.width = (currentWidth - 1) + 'px';
                    void mapContainer.offsetWidth; // 강제 리플로우
                    
                    // 현재 모드에 맞게 스타일 다시 설정
                    if (width < 768) {
                        mapContainer.style.width = '100%';
                    } else if (width < 1024) {
                        if (sidePanel.classList.contains('show')) {
                            mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
                        } else {
                            mapContainer.style.width = '100%';
                        }
                    } else {
                        if (sidePanel.classList.contains('collapsed')) {
                            mapContainer.style.width = '100%';
                        } else {
                            mapContainer.style.width = 'calc(100% - var(--side-panel-width))';
                        }
                    }
                }
                
                // 지도 리레이아웃 실행
                map.relayout();
                
                // 마커가 있으면 모두 보이도록 지도 범위 조정
                if (markers && markers.length > 0) {
                    setMapBounds(markers.map(marker => marker.place));
                }
                
                // 선택된 마커가 있고 팝업이 열려있으면 팝업 위치 업데이트
                if (typeof updateInfoPanelPosition === 'function') {
                    updateInfoPanelPosition();
                }
            }
        }, 400);
    } else {
        // 브레이크포인트 변경이 아닌 일반적인 크기 변경의 경우 간단히 relayout만 호출
        if (typeof map !== 'undefined' && map) {
            setTimeout(() => {
                map.relayout();
                
                // 선택된 마커가 있고 팝업이 열려있으면 팝업 위치 업데이트
                if (typeof updateInfoPanelPosition === 'function') {
                    updateInfoPanelPosition();
                }
            }, 100);
        }
    }
}

/**
 * 현재 여행 일정 설정 함수
 * @param {string} tripId - 여행 일정 ID
 */
function setCurrentTrip(tripId) {
    try {
        // 여행 ID로 여행 데이터 가져오기
        const trip = getTripById(tripId);
        if (!trip) {
            throw new Error(`여행 데이터를 찾을 수 없습니다: ${tripId}`);
        }
        
        console.log('여행 설정:', trip.title);
        
        // 여행 데이터 저장
        dataStore.currentTrip = trip;
        dataStore.currentTheme = null; // 테마 초기화
        
        // 여행에 맞게 UI 업데이트
        updateTripInfo(trip);
        
        // 보기 모드 선택기 표시
        viewModeSelector.style.display = 'flex';
        
        // 기본적으로 여행 모드 선택
        setViewModeUI('trip');
        
        // 라벨 툴팁 이벤트 설정 (명시적 호출)
        setTimeout(setupLabelTooltips, 100);
    } catch (error) {
        console.error('여행 설정 오류:', error);
        showError('여행 데이터를 설정하는 중 오류가 발생했습니다.');
    }
}

/**
 * 현재 테마 설정
 * @param {Object} theme 테마 데이터
 */
function setCurrentTheme(theme) {
    if (!theme) {
        console.error('setCurrentTheme: 유효하지 않은 테마 객체가 전달되었습니다.', theme);
        return;
    }
    
    console.log('테마 설정 시작:', theme.title || '제목 없음', theme);
    
    try {
        // 전역 데이터 스토어에 현재 테마 설정
        dataStore.currentTheme = theme;
        dataStore.currentTrip = null; // 테마 모드에서는 여행 데이터 초기화
        dataStore.currentView = 'theme';
        
        // 테마 제목과 설명 업데이트
        document.getElementById('theme-title').textContent = theme.title || '제목 없음';
        document.getElementById('theme-description').textContent = theme.description || '설명 없음';
        
        // 테마에 속한 장소들 표시
        console.log(`테마 설정: ${theme.title}`);
        
        // 지도 초기화 상태 확인 후 일정 시간 대기
        const waitForMap = () => {
            const isMapReady = typeof window.mapModule !== 'undefined' && 
                              typeof window.mapModule.isMapInitialized === 'function' && 
                              window.mapModule.isMapInitialized() && 
                              typeof map !== 'undefined' && 
                              typeof kakao !== 'undefined' && 
                              typeof kakao.maps !== 'undefined';
            
            if (isMapReady) {
                console.log('지도가 준비되었습니다. 마커를 업데이트합니다.');
                // 마커 업데이트
                updateMapMarkers(theme.places);
                // 카테고리 필터 업데이트
                updateCategoryFilters(theme);
                // 장소 목록 업데이트
                updatePlacesList(theme.places);
                
                // 마커가 있으면 지도 범위 조정
                setMapBounds(theme.places);
            } else {
                console.warn('지도가 아직 초기화되지 않았습니다. 5초 후에 다시 시도합니다.');
                // 지도 초기화를 위해 5초 대기 후 재시도
                setTimeout(waitForMap, 5000);
            }
        };
        
        // 지도 초기화 확인 시작
        waitForMap();
        
        return true;
    } catch (error) {
        console.error('테마 설정 오류:', error);
        showError('테마 데이터를 설정하는 중 오류가 발생했습니다.');
        return false;
    }
}

/**
 * 보기 모드 UI 설정 함수
 * @param {string} mode - 'theme' 또는 'trip'
 */
function setViewModeUI(mode) {
    // 애니메이션 효과를 위한 클래스 추가/제거
    if (mode === 'theme') {
        // 테마 버튼 활성화
        themeViewBtn.classList.add('active');
        tripViewBtn.classList.remove('active');
        
        // 활성화 효과 추가
        themeViewBtn.style.transition = 'all 0.3s ease';
        themeViewBtn.style.transform = 'translateY(-1px)';
        
        // 비활성화 효과 추가
        tripViewBtn.style.transition = 'all 0.3s ease';
        tripViewBtn.style.transform = 'translateY(0)';
    } else {
        // 여행 버튼 활성화
        themeViewBtn.classList.remove('active');
        tripViewBtn.classList.add('active');
        
        // 활성화 효과 추가
        tripViewBtn.style.transition = 'all 0.3s ease';
        tripViewBtn.style.transform = 'translateY(-1px)';
        
        // 비활성화 효과 추가
        themeViewBtn.style.transition = 'all 0.3s ease';
        themeViewBtn.style.transform = 'translateY(0)';
    }
    
    // 토스트 메시지 표시
    const message = mode === 'theme' ? '테마 모드로 전환되었습니다.' : '여행 모드로 전환되었습니다.';
    showToast(message);
    
    // 장소 정보 패널 닫기 (모드 변경 시 항상 팝업 닫기)
    hidePlaceInfoPanel();
    
    // 데이터 모듈의 보기 모드 설정 함수 호출
    setViewMode(mode);
}

/**
 * 토스트 메시지 표시 함수
 * @param {string} message - 표시할 메시지
 * @param {number} duration - 메시지 표시 시간 (밀리초)
 */
function showToast(message, duration = 2000) {
    // 기존 토스트 메시지 제거
    const existingToast = document.getElementById('toast-message');
    if (existingToast) {
        document.body.removeChild(existingToast);
    }
    
    // 새 토스트 메시지 생성
    const toast = document.createElement('div');
    toast.id = 'toast-message';
    toast.textContent = message;
    
    // 스타일 설정
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '4px';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    
    // 문서에 추가
    document.body.appendChild(toast);
    
    // 애니메이션 효과
    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);
    
    // 자동 제거
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, duration);
}

/**
 * 라벨 툴팁 설정 함수
 * 라벨에 마우스를 올렸을 때 툴팁을 표시합니다.
 */
function setupLabelTooltips() {
    // 디바운스 처리를 위한 타이머
    let debounceTimer = null;
    
    // MutationObserver 생성
    const observer = new MutationObserver(function() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
            setupLabelTooltips();
        }, 100);
    });
    
    // 옵션 설정
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 모든 라벨 요소에 이벤트 추가 - 더 구체적인 선택자 사용
    document.querySelectorAll('.place-label').forEach(label => {
        // 이미 이벤트가 설정되어 있다면 건너뛰기
        if (label.dataset.hasTooltipEvent === 'true') return;
        
        // 마우스 진입 이벤트
        label.addEventListener('mouseenter', function(e) {
            const tooltipText = this.querySelector('.label-tooltip');
            if (tooltipText) {
                // 현재 마우스가 들어온 라벨 외에 다른 툴팁은 모두 숨기기
                hideGlobalTooltip();
                positionTooltip(this, tooltipText);
            }
        });
        
        // 마우스 이탈 이벤트
        label.addEventListener('mouseleave', hideGlobalTooltip);
        
        // 클릭 이벤트에서 이벤트 전파 처리
        label.addEventListener('click', function(e) {
            // 클릭 이벤트를 통과시켜 부모 요소(팝업 등)에서 처리할 수 있도록 함
            // 툴팁만 표시하고 이벤트 전파는 중단하지 않음
        });
        
        // 이벤트 설정 표시
        label.dataset.hasTooltipEvent = 'true';
    });
}

/**
 * 전역 툴팁 숨기기
 */
function hideGlobalTooltip() {
    const container = document.getElementById('global-tooltip-container');
    if (container) {
        // 콘텐츠만 지우고 컨테이너는 유지
        container.innerHTML = '';
        
        // 애니메이션 중이면 취소
        if (window._tooltipHideTimeout) {
            clearTimeout(window._tooltipHideTimeout);
            window._tooltipHideTimeout = null;
        }
    }
}

/**
 * 장소 라벨 요소 생성
 * @param {string} label 라벨 이름
 * @returns {HTMLElement} 라벨 요소
 */
function createLabelElement(label) {
    const labelSpan = document.createElement('span');
    labelSpan.className = 'place-label';
    labelSpan.textContent = label;
    
    try {
        // 라벨 정보 가져오기
        if (window.dataStore && window.dataStore.labelInfo) {
            const labelInfo = window.dataStore.labelInfo[label];
            
            // 라벨 정보가 있고 색상이 정의되어 있으면 적용
            if (labelInfo && labelInfo.color) {
                labelSpan.style.backgroundColor = labelInfo.color;
            } else {
                // 기본 색상 적용
                labelSpan.style.backgroundColor = '#6c757d'; // 기본 회색
            }
        } else {
            // 기본 색상 적용
            labelSpan.style.backgroundColor = '#6c757d'; // 기본 회색
        }
    } catch (error) {
        console.warn(`라벨(${label}) 스타일 적용 중 오류:`, error);
        // 오류 발생 시 기본 색상 적용
        labelSpan.style.backgroundColor = '#6c757d'; // 기본 회색
    }
    
    return labelSpan;
}

/**
 * 툴팁 위치를 계산하고 설정하는 함수
 * @param {HTMLElement} labelElement - 라벨 요소
 * @param {HTMLElement} tooltipElement - 툴팁 요소
 */
function positionTooltip(labelElement, tooltipElement) {
    if (!tooltipElement) return;
    
    // 전역 툴팁 컨테이너 생성 또는 가져오기
    let tooltipContainer = document.getElementById('global-tooltip-container');
    if (!tooltipContainer) {
        tooltipContainer = document.createElement('div');
        tooltipContainer.id = 'global-tooltip-container';
        tooltipContainer.style.position = 'fixed';
        tooltipContainer.style.zIndex = '10000';
        tooltipContainer.style.pointerEvents = 'none';
        document.body.appendChild(tooltipContainer);
    }
    
    // 기존 툴팁 제거
    tooltipContainer.innerHTML = '';
    
    // 라벨 요소의 위치와 크기 정보
    const rect = labelElement.getBoundingClientRect();
    
    // 새로운 툴팁 생성
    const newTooltip = document.createElement('div');
    newTooltip.className = 'global-tooltip';
    newTooltip.textContent = tooltipElement.textContent;
    newTooltip.style.position = 'fixed';
    newTooltip.style.backgroundColor = '#333';
    newTooltip.style.color = '#fff';
    newTooltip.style.padding = '6px 10px';
    newTooltip.style.borderRadius = '4px';
    newTooltip.style.fontSize = '0.8rem';
    newTooltip.style.maxWidth = '200px';
    newTooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    newTooltip.style.pointerEvents = 'none';
    newTooltip.style.zIndex = '10000';
    
    // 화살표 추가
    const arrow = document.createElement('div');
    arrow.style.position = 'absolute';
    arrow.style.width = '0';
    arrow.style.height = '0';
    newTooltip.appendChild(arrow);
    
    // 툴팁 컨테이너에 추가 (위치 계산을 위해)
    tooltipContainer.appendChild(newTooltip);
    
    // 툴팁 크기 계산
    const tooltipWidth = newTooltip.offsetWidth;
    const tooltipHeight = newTooltip.offsetHeight;
    
    // 기본 위치 계산 (라벨 위)
    let top = rect.top - 10 - tooltipHeight;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    
    // 화면 경계 확인
    if (top < 10) { // 위쪽 경계
        // 라벨 아래에 표시
        top = rect.bottom + 10;
        
        // 화살표를 위쪽으로
        arrow.style.bottom = 'auto';
        arrow.style.top = '-8px';
        arrow.style.left = '50%';
        arrow.style.marginLeft = '-8px';
        arrow.style.borderLeft = '8px solid transparent';
        arrow.style.borderRight = '8px solid transparent';
        arrow.style.borderBottom = '8px solid #333';
    } else {
        // 화살표를 아래쪽으로
        arrow.style.top = 'auto';
        arrow.style.bottom = '-8px';
        arrow.style.left = '50%';
        arrow.style.marginLeft = '-8px';
        arrow.style.borderLeft = '8px solid transparent';
        arrow.style.borderRight = '8px solid transparent';
        arrow.style.borderTop = '8px solid #333';
    }
    
    // 좌우 경계 확인
    if (left < 10) { // 왼쪽 경계
        left = 10;
        arrow.style.left = Math.max(rect.left + rect.width / 2 - left, 10) + 'px';
    } else if (left + tooltipWidth > window.innerWidth - 10) { // 오른쪽 경계
        left = window.innerWidth - tooltipWidth - 10;
        arrow.style.left = Math.min(rect.left + rect.width / 2 - left, tooltipWidth - 20) + 'px';
    } else {
        arrow.style.left = '50%';
        arrow.style.marginLeft = '-8px';
    }
    
    // 최종 위치 설정
    newTooltip.style.top = top + 'px';
    newTooltip.style.left = left + 'px';
}

/**
 * DOM 변경을 감지하는 MutationObserver 설정
 */
function setupMutationObserver() {
    // 기존 옵저버 제거
    if (window._labelObserver) {
        window._labelObserver.disconnect();
    }
    
    // 디바운스 처리를 위한 타이머
    let debounceTimer = null;
    
    // MutationObserver 생성
    const observer = new MutationObserver(function() {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
            setupLabelTooltips();
        }, 100);
    });
    
    // 옵션 설정
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 옵저버 참조 저장
    window._labelObserver = observer;
}

// UI 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initUI);

// 페이지 로드 및 DOM 변경 시 라벨 이벤트 설정을 위한 함수 호출
document.addEventListener('DOMContentLoaded', function() {
    // 초기 설정
    setupLabelTooltips();
    
    // MutationObserver 설정
    setupMutationObserver();
    
    // 일정 시간 후 다시 호출 (비동기 로딩된 콘텐츠 처리)
    setTimeout(setupLabelTooltips, 1000);
});

// 전역 스코프에서 getPlaceIcon 함수 사용 가능하도록 설정
window.getPlaceIcon = getPlaceIcon; 