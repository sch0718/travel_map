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
    
    // 선택된 마커가 있으면 원래 스타일로 복원
    if (typeof selectedMarker !== 'undefined' && selectedMarker) {
        selectedMarker.setZIndex(1);
        selectedMarker = null;
    }
    
    // 장소 정보 패널 닫기
    hidePlaceInfoPanel();
    
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
                const currentPlace = getPlaceById(place.placeId);
                const nextPlaceObj = getPlaceById(nextPlace.placeId);
                
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
 * 여행 일차 표시 함수
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
        const place = getPlaceById(dayPlace.placeId);
        if (!place) return;
        
        const placeItem = document.createElement('li');
        placeItem.className = 'place-item trip-place';
        
        // 다음 장소와의 이동 정보 계산
        let distanceInfo = '';
        let transportationIcon = '';
        
        if (index < sortedPlaces.length - 1) {
            const nextPlace = getPlaceById(sortedPlaces[index + 1].placeId);
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
            <div class="place-time">${dayPlace.timeEstimate || ''}</div>
            <div class="place-title">${place.title}</div>
            ${dayPlace.memo ? `<div class="place-memo">${dayPlace.memo}</div>` : ''}
            ${distanceInfo}
        `;
        
        // 상세 정보 (펼쳤을 때만 보임)
        const detailsHTML = `
            <div class="place-details">
                ${place.address ? `<div class="place-address">📍 ${place.address}</div>` : ''}
                ${place.description ? `<div class="place-description">📝 ${place.description}</div>` : ''}
                ${place.labels && place.labels.length > 0 ? `
                    <div class="place-labels">
                        ${place.labels.map(label => 
                            `<span class="place-label-small">${label}</span>`
                        ).join('')}
                    </div>
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
        
        // 장소 아이템 클릭 시 지도에 표시 (토글 버튼 제외)
        placeItem.addEventListener('click', (e) => {
            // 토글 버튼 클릭이 아닌 경우에만 지도에 표시
            if (e.target !== toggleButton) {
                moveToPlace(place.id);
            }
        });
        
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
        
        // 장소 아이템에 테마 색상 테두리 적용
        placeItem.style.borderLeft = `3px solid var(--primary-color)`;
        
        // 라벨 HTML 생성 - 요약 시 보이는 라벨
        const labelsHTML = place.labels.length > 0 
            ? `<div class="place-labels">
                ${place.labels.map(label => 
                    `<span class="place-label-small">${label}</span>`
                ).join('')}
               </div>`
            : '';
        
        // 상세 정보 HTML - 펼쳤을 때만 보임
        const detailsHTML = `
            <div class="place-details">
                ${place.address ? `<div class="place-address">📍 ${place.address}</div>` : ''}
                ${place.description ? `<div class="place-description">📝 ${place.description}</div>` : ''}
                ${place.urls ? `
                    <div class="place-links">
                        ${place.urls.naver ? `<a href="${place.urls.naver}" target="_blank">네이버 지도</a>` : ''}
                        ${place.urls.kakao ? `<a href="${place.urls.kakao}" target="_blank">카카오 지도</a>` : ''}
                    </div>
                ` : ''}
            </div>
        `;
        
        // 기본 HTML 구성 (요약 정보)
        placeItem.innerHTML = `
            <div class="place-title">${place.title}</div>
            ${labelsHTML}
            <button class="toggle-details">↓</button>
            ${detailsHTML}
        `;
        
        // 확장/축소 토글 버튼 이벤트
        const toggleButton = placeItem.querySelector('.toggle-details');
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation(); // 부모 요소 클릭 이벤트 전파 방지
            const details = this.nextElementSibling;
            
            // 펼침 상태 클래스로 확인하여 토글
            const isExpanded = placeItem.classList.contains('expanded');
            
            if (isExpanded) {
                // 접기
                placeItem.classList.remove('expanded');
                this.textContent = '↓';
            } else {
                // 펼치기
                placeItem.classList.add('expanded');
                this.textContent = '↑';
            }
        });
        
        // 장소 아이템 클릭 이벤트 (제목 부분만)
        const titleElement = placeItem.querySelector('.place-title');
        titleElement.addEventListener('click', function() {
            // 선택된 장소 스타일 적용
            document.querySelectorAll('.place-item').forEach(item => {
                item.classList.remove('selected');
            });
            placeItem.classList.add('selected');
            
            // 지도에서 해당 장소로 이동
            panToPlace(place);
            showPlaceMarkerInfo(place);
        });
        
        placesList.appendChild(placeItem);
    });
}

/**
 * 장소 정보 패널 표시 함수
 * @param {Object} place - 장소 데이터
 */
function showPlaceInfoPanel(place) {
    // 장소 정보 패널 내용 업데이트
    const titleElement = document.getElementById('place-title');
    titleElement.textContent = place.title;
    
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
    
    // 패널 헤더 색상 설정
    const placeInfoHeader = document.querySelector('.place-info-header');
    placeInfoHeader.style.borderBottom = `2px solid var(--primary-color)`;
    placeInfoHeader.style.backgroundColor = `var(--primary-color)10`;
    
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
                    
                    // 모든 마커가 보이도록 지도 범위 조정
                    if (markers && markers.length > 0) {
                        setMapBounds(markers.map(marker => marker.place));
                    }
                }
            }, 300); // 패널 전환 애니메이션 시간(300ms)과 동일하게 설정
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
                
                // 모든 마커가 보이도록 지도 범위 조정
                if (markers && markers.length > 0) {
                    setMapBounds(markers.map(marker => marker.place));
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
            }
        }, 400);
    } else {
        // 브레이크포인트 변경이 아닌 일반적인 크기 변경의 경우 간단히 relayout만 호출
        if (typeof map !== 'undefined' && map) {
            setTimeout(() => {
                map.relayout();
            }, 100);
        }
    }
}

/**
 * 현재 여행 일정 설정 함수
 * @param {string} tripId - 여행 일정 ID
 */
function setCurrentTrip(tripId) {
    // 기존 마커와 경로 제거
    removeAllMarkers();
    
    // 여행 일정 ID로 여행 일정 객체 찾기
    const trip = dataStore.trips.find(t => t.id === tripId);
    if (!trip) {
        console.error('존재하지 않는 여행 일정:', tripId);
        return;
    }
    
    // 여행 정보 UI 업데이트
    updateTripInfo(trip);
    
    // 첫 번째 일차 표시
    if (trip.days.length > 0) {
        showTripDay(trip, 0);
    }
}

// UI 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initUI); 