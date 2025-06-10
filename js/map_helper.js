/**
 * 지도 헬퍼 모듈
 * 새로 생성된 개별 지도 페이지에서 사용할 추가 기능을 제공합니다.
 * ui.js, map.js, data.js의 주요 기능을 포함하여 독립적으로 동작합니다.
 */

// 지도 관련 변수
var map; // 카카오 맵 객체
var markers = []; // 지도에 표시된 마커 배열
var selectedMarker = null; // 현재 선택된 마커
var mapControls = { zoomControl: null, mapTypeControl: null }; // 지도 컨트롤 참조 저장

// 마커 아이콘 오버레이 스타일 정의
const markerIconStyle = `
<style>
.marker-icon-overlay {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 14px;
    height: 14px;
    transform: translate(-45%, -32px);
    z-index: 10;
    pointer-events: none;
    transition: transform 0.2s ease;
}
</style>
`;

// 스타일을 head에 추가
document.head.insertAdjacentHTML('beforeend', markerIconStyle);

// 전역 데이터 저장소 (각 페이지별 간소화된 버전)
const pageDataStore = {
    places: [],
    filteredPlaces: [],
    labelInfo: {},
    currentMapData: null, // 현재 로드된 맵 데이터 저장
    mapDataType: 'theme', // 맵 데이터 타입: 'theme' 또는 'trip'
    themeColors: [
        "#4285F4", "#3F51B5", "#2196F3", "#03A9F4", "#89ABE3", 
        "#34A853", "#009688", "#4CAF50", "#8BC34A", "#A7BEAE", 
        "#5B7065", "#B8D8D8", "#C4DFDF", "#00BCD4", "#FBBC05", 
        "#CDDC39", "#FFEB3B", "#FFC107", "#F5E6CC", "#EA4335", 
        "#FF9800", "#FF5722", "#D09683", "#673AB7", "#E5D1FA", 
        "#EAC4D5", "#E9D5DA", "#795548", "#9E9E9E", "#607D8B"
    ]
};

/**
 * 카카오 맵 API 로드 및 초기화 함수
 * API가 로드되면 애플리케이션 초기화를 시작합니다.
 */
function loadKakaoMapAPI() {
    console.log('카카오맵 API 로드 확인 중...');
    
    // 이미 로드되었는지 확인
    if (window.kakao && window.kakao.maps) {
        console.log('카카오맵 API가 이미 로드되어 있습니다.');
        initApplication();
        return;
    }
    
    // API가 아직 로드되지 않은 경우 스크립트 로드
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=5cda008d02047bd5e619b759494363c4&autoload=false';
    script.onload = function() {
        console.log('카카오맵 API 스크립트 로드 완료');
        
        // 지도 API 초기화
        kakao.maps.load(function() {
            console.log('카카오맵 API 초기화 완료');
            initApplication();
        });
    };
    
    // 에러 처리
    script.onerror = function() {
        console.error('카카오맵 API 로드 실패');
        alert('카카오맵 API 로드에 실패했습니다. 페이지를 새로고침 해주세요.');
    };
    
    document.head.appendChild(script);
}

/**
 * UI 초기화 함수 (ui.js에서 가져옴)
 */
function initUI() {
    console.log('UI 초기화 중...');
    
    // DOM 요소 캐싱 및 이벤트 리스너 설정
    setupEventListeners();
    
    // 초기 화면 설정
    handleResize();
    
    console.log('UI 초기화 완료');
}

/**
 * 지도 초기화 함수 (map.js에서 가져옴)
 */
function initMap() {
    try {
        console.log('지도 초기화 시작');
        
        // 이미 초기화된 지도가 있는지 확인
        if (map) {
            console.log('이미 초기화된 지도가 있습니다. 기존 지도를 재활용합니다.');
            // 기존 지도 크기 재조정만 수행
            forceMapRelayout();
            return;
        }
        
        // 지도를 표시할 div 요소 가져오기
        const container = document.getElementById('map');
        
        // 지도 컨테이너가 보이는 상태인지 확인
        if (container) {
            // 지도 생성 전 컨테이너 크기 확인 및 처리
            ensureContainerSize(container);
            
            // 지도의 초기 옵션 설정
            const options = {
                center: new kakao.maps.LatLng(33.3617, 126.5292), // 한라산 중심
                level: 9 // 확대 레벨 (1~14, 숫자가 클수록 축소)
            };
            
            // 지도 생성
            map = new kakao.maps.Map(container, options);
            
            // 지도 컨트롤 추가
            addMapControls();
            
            // 지도 이벤트 리스너 설정
            setMapEventListeners();
            
            // 지도 생성 후 약간의 지연을 두고 relayout 호출하여 초기 렌더링 보장
            setTimeout(() => {
                if (map) {
                    console.log('초기 지도 리레이아웃 실행');
                    forceMapRelayout();
                }
            }, 100);
            
            console.log('지도 초기화 완료');
        } else {
            console.error('지도 컨테이너 요소를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('지도 초기화 중 오류 발생:', error);
    }
}

/**
 * 라벨 데이터를 로드하는 함수
 * @returns {Promise<Object>} - 로드된 라벨 데이터
 */
async function loadLabelsData() {
    try {
        console.log('라벨 데이터 로드 시작');
        const response = await fetch('data/system/labels.json');
        if (!response.ok) {
            throw new Error(`라벨 데이터 로드 실패: ${response.status} ${response.statusText}`);
        }
        
        const labelsData = await response.json();
        
        // 라벨 정보를 labelInfo 객체로 변환
        if (labelsData && labelsData.labels && Array.isArray(labelsData.labels)) {
            // 각 라벨을 이름을 키로 하는 객체로 변환
            labelsData.labels.forEach(label => {
                pageDataStore.labelInfo[label.name] = {
                    icon: label.icon || "mdi:tag",
                    color: label.color || "#9E9E9E",
                    description: label.description || label.name
                };
            });
            console.log('라벨 데이터 로드 완료:', Object.keys(pageDataStore.labelInfo).length);
        } else {
            console.warn('유효한 라벨 데이터가 없습니다.');
        }
        
        return labelsData;
    } catch (error) {
        console.error('라벨 데이터 로드 오류:', error);
        // 오류가 발생해도 앱 실행은 계속됨
        return { labels: [] };
    }
}

/**
 * 앱 초기화 함수 - 순차적 실행 보장
 */
async function initApplication() {
    try {
        console.log('앱 초기화 시작');
        
        // 먼저 라벨 데이터 로드
        await loadLabelsData();
        
        // UI 초기화
        initUI();
        
        // 지도 초기화 (이미 초기화된 경우 forceMapRelayout만 실행됨)
        initMap();
        
        // 현재 URL에 따라 적절한 데이터 로드
        const currentUrl = window.location.pathname;
        let dataPath = '';
        
        if (currentUrl.includes('jeju_food.html')) {
            dataPath = 'data/maps/jeju_food.json';
        } else if (currentUrl.includes('jeju_trip_202506.html')) {
            dataPath = 'data/maps/jeju_trip_202506.json';
        } else {
            console.error('알 수 없는 페이지입니다. 데이터를 로드할 수 없습니다.');
            return;
        }
        
        // 특정 데이터 파일 로드
        await loadSpecificMapData(dataPath);
        
        console.log('앱 초기화 완료');
    } catch (error) {
        console.error('앱 초기화 실패:', error);
    }
}

/**
 * 지도 강제 리레이아웃 함수
 * 지도 컨테이너의 크기를 강제로 변경하고 다시 원래대로 돌려서 리렌더링을 보장합니다.
 */
function forceMapRelayout() {
    if (!map) return;
    
    const container = document.getElementById('map');
    if (!container) return;
    
    // 원래 크기 저장
    const originalWidth = container.style.width;
    const originalHeight = container.style.height;
    
    // 컨테이너 영역 강제 새로고침을 위한 크기 변경
    container.style.width = '100%';
    container.style.height = '100%';
    
    // 강제 리플로우 발생
    void container.offsetWidth;
    
    // 지도 리레이아웃 호출
    map.relayout();
    
    // 현재 표시 중인 마커들이 모두 보이도록 지도 범위 재조정
    if (markers && markers.length > 0) {
        // 마커에서 장소 위치 정보 추출
        const positions = [];
        markers.forEach(marker => {
            if (marker && marker.getPosition) {
                positions.push({
                    location: {
                        lat: marker.getPosition().getLat(),
                        lng: marker.getPosition().getLng()
                    }
                });
            }
        });
        
        if (positions.length > 0) {
            setMapBounds(positions);
        }
    } else if (pageDataStore.filteredPlaces && pageDataStore.filteredPlaces.length > 0) {
        // 마커가 없는 경우 현재 필터링된 장소 목록 사용
        setMapBounds(pageDataStore.filteredPlaces);
    }
}

/**
 * 지도 컨테이너 크기 확인 및 처리 함수
 * 컨테이너 크기가 0이면 기본 크기를 설정합니다.
 * @param {HTMLElement} container - 지도 컨테이너 요소
 */
function ensureContainerSize(container) {
    // 컨테이너 크기가 0이면 기본 크기 설정
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
        console.warn('지도 컨테이너 크기가 0입니다. 기본 크기를 설정합니다.');
        // 기본 크기 설정
        if (rect.width === 0) {
            container.style.width = '100%';
        }
        if (rect.height === 0) {
            container.style.height = '400px';
        }
    }
}

/**
 * 지도 컨트롤 추가 함수
 * 줌 컨트롤, 타입 변경 컨트롤 등을 추가합니다.
 */
function addMapControls() {
    // 기존에 추가된 컨트롤이 있으면 제거
    removeMapControls();
    
    // 줌 컨트롤 추가
    mapControls.zoomControl = new kakao.maps.ZoomControl();
    map.addControl(mapControls.zoomControl, kakao.maps.ControlPosition.RIGHT);
    
    // 지도 타입 컨트롤 추가
    mapControls.mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapControls.mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
    
    console.log('지도 컨트롤 추가 완료');
}

/**
 * 지도 컨트롤 제거 함수
 * 기존에 추가된 지도 컨트롤을 제거합니다.
 */
function removeMapControls() {
    // 줌 컨트롤 제거
    if (mapControls.zoomControl) {
        map.removeControl(mapControls.zoomControl);
        mapControls.zoomControl = null;
    }
    
    // 지도 타입 컨트롤 제거
    if (mapControls.mapTypeControl) {
        map.removeControl(mapControls.mapTypeControl);
        mapControls.mapTypeControl = null;
    }
}

/**
 * 지도 이벤트 리스너 설정 함수
 * 지도의 다양한 이벤트에 대한 처리를 설정합니다.
 */
function setMapEventListeners() {
    // 지도 클릭 이벤트
    kakao.maps.event.addListener(map, 'click', function() {
        // 선택된 마커가 있으면 원래 스타일로 복원
        if (selectedMarker) {
            selectedMarker.setZIndex(1);
            // 원래 마커 스타일로 복원하는 코드 (필요시 구현)
            selectedMarker = null;
        }
        
        // 장소 정보 패널 닫기
        hidePlaceInfoPanel();
    });
    
    // 지도 드래그 종료 이벤트
    kakao.maps.event.addListener(map, 'dragend', function() {
        console.log('지도 이동 완료');
        // 선택된 마커가 화면에 보이는지 확인
        checkMarkerVisibility();
    });
    
    // 지도 줌 변경 이벤트
    kakao.maps.event.addListener(map, 'zoom_changed', function() {
        console.log('지도 줌 레벨 변경:', map.getLevel());
        // 선택된 마커가 화면에 보이는지 확인
        checkMarkerVisibility();
    });
    
    // 지도 이동 및 줌 변경 후 유휴 상태 이벤트
    kakao.maps.event.addListener(map, 'idle', function() {
        // 선택된 마커가 있고 정보 패널이 표시 중이면 위치 업데이트
        updateInfoPanelPosition();
    });
}

/**
 * 선택된 마커가 현재 지도 화면에 보이는지 확인하는 함수
 */
function checkMarkerVisibility() {
    // 선택된 마커가 있고 정보 패널이 표시 중인 경우
    if (selectedMarker && document.getElementById('place-info-panel').style.display === 'block') {
        // 지도의 현재 바운드 영역 가져오기
        const bounds = map.getBounds();
        let markerPosition;
        
        // 마커 타입에 따라 위치 가져오기
        if (selectedMarker instanceof kakao.maps.Marker) {
            // 일반 마커인 경우
            markerPosition = selectedMarker.getPosition();
        } else if (selectedMarker instanceof kakao.maps.CustomOverlay) {
            // 커스텀 오버레이인 경우
            const place = selectedMarker.place;
            if (!place) return;
            
            markerPosition = new kakao.maps.LatLng(place.location.lat, place.location.lng);
        } else {
            return; // 알 수 없는 마커 타입
        }
        
        // 마커가 지도 화면에 보이는지 확인
        if (!bounds.contain(markerPosition)) {
            console.log('선택된 마커가 화면에서 벗어남 - 정보 패널 닫기');
            hidePlaceInfoPanel();
        } else {
            // 마커가 화면에 보이는 경우 위치 업데이트만 수행
            updateInfoPanelPosition();
        }
    }
}

/**
 * 정보 패널 위치 업데이트 함수
 * 지도 이동이나 줌 레벨 변경 시 선택된 마커의 정보 패널 위치를 업데이트
 */
function updateInfoPanelPosition() {
    // 선택된 마커가 있고 해당 장소 정보 패널이 표시 중인지 확인
    if (selectedMarker && document.getElementById('place-info-panel').style.display === 'block') {
        // 선택된 마커의 장소 정보 가져오기
        const place = selectedMarker.place;
        if (!place) return;
        
        // 마커의 화면상 위치 계산
        const projection = map.getProjection();
        let markerPosition;
        
        // 마커 타입에 따라 위치 계산 방법 다르게 적용
        if (selectedMarker instanceof kakao.maps.Marker) {
            // 일반 마커인 경우
            markerPosition = projection.containerPointFromCoords(selectedMarker.getPosition());
        } else if (selectedMarker instanceof kakao.maps.CustomOverlay) {
            // 커스텀 오버레이인 경우
            const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
            markerPosition = projection.containerPointFromCoords(position);
        } else {
            return; // 알 수 없는 마커 타입
        }
        
        // 마커 위치에 맞게 패널 위치 업데이트
        showPlaceInfoPanel(place, markerPosition);
    }
}

/**
 * 이벤트 리스너 설정 함수
 * UI 이벤트 처리를 위한 리스너를 설정합니다.
 */
function setupEventListeners() {
    console.log('이벤트 리스너 설정 중...');
    
    // 창 크기 변경 이벤트
    window.addEventListener('resize', handleResize);
    
    // 사이드 패널 토글 버튼
    const togglePanelButton = document.getElementById('toggle-panel');
    if (togglePanelButton) {
        togglePanelButton.addEventListener('click', function() {
            document.querySelector('.side-panel').classList.toggle('collapsed');
            
            // 버튼 텍스트 변경
            this.textContent = document.querySelector('.side-panel').classList.contains('collapsed') ? '◀' : '▶';
            
            // 토글 후 지도 크기 재조정
            setTimeout(forceMapRelayout, 300);
        });
    }
    
    // 장소 정보 패널 닫기 버튼
    const closePlaceInfoButton = document.getElementById('close-place-info');
    if (closePlaceInfoButton) {
        closePlaceInfoButton.addEventListener('click', function() {
            hidePlaceInfoPanel();
        });
    }
    
    // 모바일 패널 핸들
    const mobilePanelHandle = document.getElementById('mobile-panel-handle');
    if (mobilePanelHandle) {
        // 터치 이벤트 처리
        let startY = 0;
        let currentPanelHeight = 0;
        const sidePanel = document.querySelector('.side-panel');
        
        mobilePanelHandle.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            currentPanelHeight = sidePanel.offsetHeight;
            
            // 트랜지션 임시 제거
            sidePanel.style.transition = 'none';
        });
        
        mobilePanelHandle.addEventListener('touchmove', function(e) {
            const deltaY = startY - e.touches[0].clientY;
            const newHeight = currentPanelHeight + deltaY;
            
            // 최소/최대 높이 제한
            const minHeight = 100; // 최소 높이
            const maxHeight = window.innerHeight * 0.8; // 최대 높이 (화면의 80%)
            
            if (newHeight >= minHeight && newHeight <= maxHeight) {
                sidePanel.style.height = `${newHeight}px`;
            }
        });
        
        mobilePanelHandle.addEventListener('touchend', function() {
            // 트랜지션 복원
            sidePanel.style.transition = '';
            
            // 패널 높이에 따라 접기/펴기 결정
            const threshold = window.innerHeight * 0.3; // 30% 기준
            
            if (sidePanel.offsetHeight < threshold) {
                sidePanel.style.height = '80px'; // 접기
            } else {
                sidePanel.style.height = '50%'; // 펴기
            }
            
            // 지도 크기 재조정
            setTimeout(forceMapRelayout, 300);
        });
    }

    // 검색 버튼 클릭 이벤트
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', handlePageSearch);
    }
    
    // 검색 입력창 엔터 키 이벤트
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handlePageSearch();
            }
        });
    }
    
    console.log('이벤트 리스너 설정 완료');
}

/**
 * 윈도우 크기 변경 이벤트 처리 함수
 */
function handleResize() {
    // 지도 컨테이너 크기 확인
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // 지도 크기 조정
    ensureContainerSize(mapContainer);
    
    // 지도가 초기화되었는지 확인
    if (map) {
        try {
            // 지도 크기 재조정
            setTimeout(() => {
                // 지도 크기 재조정
                map.relayout();
                
                // 모든 마커가 보이도록 지도 범위 조정 (오류 방지를 위한 예외 처리)
                try {
                    // 현재 표시된 마커가 있는 경우
                    if (markers && markers.length > 0) {
                        // 마커에서 위치 정보 추출
                        const positions = [];
                        markers.forEach(marker => {
                            if (marker && marker.getPosition) {
                                positions.push({
                                    location: {
                                        lat: marker.getPosition().getLat(),
                                        lng: marker.getPosition().getLng()
                                    }
                                });
                            }
                        });
                        
                        if (positions.length > 0) {
                            setMapBounds(positions);
                        }
                    } else if (pageDataStore.filteredPlaces && pageDataStore.filteredPlaces.length > 0) {
                        // 마커가 없는 경우 현재 필터링된 장소 목록 사용
                        setMapBounds(pageDataStore.filteredPlaces);
                    }
                } catch (error) {
                    console.error('지도 범위 조정 중 오류 발생:', error);
                    // 오류 발생 시 제주도 중심으로 설정
                    map.setCenter(new kakao.maps.LatLng(33.3616666, 126.5291666));
                    map.setLevel(10);
                }
            }, 100);
        } catch (error) {
            console.error('지도 리사이즈 처리 중 오류 발생:', error);
        }
    }
    
    // 장소 정보 패널 위치 업데이트
    updateInfoPanelPosition();
}

/**
 * 페이지별 특수 이벤트 설정 함수
 * 페이지에 따라 다른 이벤트 처리를 할 때 사용
 */
function setupPageEvents() {
    console.log('페이지별 이벤트 설정 중...');
    
    // 현재 URL 확인
    const currentUrl = window.location.pathname;
    
    // 테마 뷰와 여행 뷰 간 전환 기능 추가
    const viewModeSelector = document.getElementById('view-mode-selector');
    const themeViewBtn = document.getElementById('theme-view-btn');
    const tripViewBtn = document.getElementById('trip-view-btn');
    
    // view-mode-selector가 있으면 표시
    if (viewModeSelector) {
        viewModeSelector.style.display = 'flex';
    }
    
    // 뷰 모드 버튼 이벤트 설정
    if (themeViewBtn && tripViewBtn) {
        themeViewBtn.addEventListener('click', function() {
            // 테마 뷰로 전환
            themeViewBtn.classList.add('active');
            tripViewBtn.classList.remove('active');
            
            // 맵 데이터 타입 업데이트
            pageDataStore.mapDataType = 'theme';
            
            // 테마 뷰에서는 카테고리별로 장소 표시
            if (pageDataStore && pageDataStore.places) {
                displayPlacesOnMap(pageDataStore.places);
            }
        });
        
        tripViewBtn.addEventListener('click', function() {
            // 버튼이 비활성화 상태면 이벤트 무시
            if (this.disabled) {
                console.log('여행 뷰 버튼이 비활성화되어 있습니다.');
                return;
            }
            
            // 여행 뷰로 전환
            tripViewBtn.classList.add('active');
            themeViewBtn.classList.remove('active');
            
            // 맵 데이터 타입 업데이트
            pageDataStore.mapDataType = 'trip';
            
            // 페이지별 여행 뷰 처리
            if (currentUrl.includes('jeju_food.html')) {
                // 맛집 페이지에서는 첫 번째 음식 카테고리 필터링
                if (pageDataStore && pageDataStore.currentMapData) {
                    const firstCategory = Object.keys(pageDataStore.currentMapData.categories || {})[0];
                    if (firstCategory) {
                        filterPlacesByCategory('food_type', firstCategory, true);
                    }
                }
            } else if (currentUrl.includes('jeju_trip_202506.html')) {
                // 여행 페이지에서는 첫 번째 일정 카테고리 필터링
                if (pageDataStore && pageDataStore.currentMapData) {
                    const firstDayCategory = Object.keys(pageDataStore.currentMapData.categories || {})[0];
                    if (firstDayCategory) {
                        filterPlacesByCategory('day', firstDayCategory, true);
                    }
                }
            }
        });
    }
    
    // 페이지별 특수 처리
    if (currentUrl.includes('jeju_food.html')) {
        // 제주 맛집 페이지에 특화된 이벤트 설정
        console.log('제주 맛집 페이지 이벤트 설정');
        
        // 필요한 경우 특정 이벤트 설정
        const foodCategoryButtons = document.querySelectorAll('.category-btn');
        foodCategoryButtons.forEach(button => {
            button.addEventListener('click', function() {
                const category = this.dataset.category;
                // 특정 음식 카테고리 필터링 처리
                filterPlacesByCategory('food_type', category, true);
            });
        });
    } else if (currentUrl.includes('jeju_trip_202506.html')) {
        // 제주 여행 페이지에 특화된 이벤트 설정
        console.log('제주 여행 페이지 이벤트 설정');
        
        // 필요한 경우 여행 일정별 필터 버튼 등 특수 이벤트 설정
        const dayButtons = document.querySelectorAll('.day-btn');
        dayButtons.forEach(button => {
            button.addEventListener('click', function() {
                const day = this.dataset.day;
                // 특정 여행 일자 필터링 처리
                filterPlacesByCategory('day', day, true);
            });
        });
    }
    
    console.log('페이지별 이벤트 설정 완료');
}

/**
 * 장소 목록 업데이트 함수
 * @param {Array} places - 표시할 장소 배열
 */
function updatePlacesList(places) {
    console.log('장소 목록 업데이트 중...');
    
    const placesList = document.getElementById('places');
    if (!placesList) {
        console.error('장소 목록 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 목록 초기화
    placesList.innerHTML = '';
    
    // 표시할 장소가 없는 경우
    if (!places || places.length === 0) {
        const noPlacesItem = document.createElement('li');
        noPlacesItem.textContent = '표시할 장소가 없습니다.';
        noPlacesItem.className = 'no-places';
        placesList.appendChild(noPlacesItem);
        return;
    }
    
    // 각 장소에 대한 목록 아이템 생성
    places.forEach(place => {
        const placeItem = document.createElement('li');
        placeItem.className = 'place-item';
        placeItem.dataset.id = place.id;
        
        // 장소명
        const placeTitle = document.createElement('div');
        placeTitle.className = 'place-title';
        placeTitle.textContent = place.title;
        
        // 장소 라벨 (있는 경우)
        const placeLabels = document.createElement('div');
        placeLabels.className = 'place-item-labels';
        
        if (place.labels && place.labels.length > 0) {
            // 최대 3개 라벨만 표시
            const visibleLabels = place.labels.slice(0, 3);
            visibleLabels.forEach(label => {
                // ui.js의 createLabelElement 스타일 적용
                const labelInfo = getLabelInfo(label);
                
                // 라벨 스팬 생성
                const labelSpan = document.createElement('span');
                labelSpan.className = 'place-label small'; // small 클래스 추가
                
                // 라벨 스타일 적용
                labelSpan.style.backgroundColor = labelInfo.color + '20'; // 10% 투명도
                labelSpan.style.color = labelInfo.color;
                labelSpan.style.borderLeftColor = labelInfo.color;
                
                // 아이콘 요소 생성
                const iconElement = document.createElement('span');
                iconElement.className = 'label-icon';
                iconElement.innerHTML = `<iconify-icon icon="${labelInfo.icon}"></iconify-icon>`;
                
                // 텍스트 요소 생성
                const textElement = document.createElement('span');
                textElement.textContent = label;
                
                // 툴크 요소 생성 (숨겨진 상태로 데이터만 저장)
                const tooltipElement = document.createElement('span');
                tooltipElement.className = 'label-tooltip';
                tooltipElement.textContent = labelInfo.description;
                tooltipElement.style.display = 'none'; // 화면에 보이지 않도록 설정
                
                // 요소 조립
                labelSpan.appendChild(iconElement);
                labelSpan.appendChild(textElement);
                labelSpan.appendChild(tooltipElement);
                
                // 이벤트 설정 상태 추적 속성 추가
                labelSpan.dataset.hasTooltipEvent = 'false';
                
                placeLabels.appendChild(labelSpan);
            });
            
            // 더 많은 라벨이 있는 경우 +N 표시
            if (place.labels.length > 3) {
                const moreLabels = document.createElement('span');
                moreLabels.className = 'more-labels';
                moreLabels.textContent = `+${place.labels.length - 3}`;
                placeLabels.appendChild(moreLabels);
            }
        }
        
        // 클릭 이벤트 추가
        placeItem.addEventListener('click', function() {
            // 해당 장소로 지도 이동 및 정보 패널 표시
            const clickedPlace = getPlaceById(this.dataset.id);
            if (clickedPlace) {
                // 해당 장소의 마커 클릭한 것과 동일한 효과
                const position = new kakao.maps.LatLng(
                    clickedPlace.location.lat, 
                    clickedPlace.location.lng
                );
                
                // 지도 이동
                map.setCenter(position);
                
                // 정보 패널 표시
                showPlaceInfoPanel(clickedPlace);
                
                // 선택된 항목 스타일 변경
                const allPlaceItems = document.querySelectorAll('.place-item');
                allPlaceItems.forEach(item => item.classList.remove('selected'));
                this.classList.add('selected');
            }
        });
        
        // 상세 정보 토글 버튼 추가
        const toggleButton = document.createElement('button');
        toggleButton.className = 'toggle-details';
        toggleButton.textContent = '↓';
        
        // 상세 정보 영역 추가
        const detailsElement = document.createElement('div');
        detailsElement.className = 'place-details';
        
        // 주소 추가
        if (place.address) {
            const addressElement = document.createElement('div');
            addressElement.className = 'place-address';
            addressElement.textContent = place.address;
            detailsElement.appendChild(addressElement);
        }
        
        // 설명 추가
        if (place.description) {
            const descriptionElement = document.createElement('div');
            descriptionElement.className = 'place-description';
            descriptionElement.textContent = place.description;
            detailsElement.appendChild(descriptionElement);
        }
        
        // 상세 정보 토글 이벤트 추가
        toggleButton.addEventListener('click', function(e) {
            e.stopPropagation(); // 부모 요소 클릭 이벤트 전파 방지
            
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
        
        // 요소 조합
        placeItem.appendChild(placeTitle);
        placeItem.appendChild(placeLabels);
        placeItem.appendChild(toggleButton);
        placeItem.appendChild(detailsElement);
        placesList.appendChild(placeItem);
    });
    
    console.log('장소 목록 업데이트 완료:', places.length);
}

/**
 * 모든 마커 제거 함수
 */
function removeAllMarkers() {
    console.log('모든 마커 제거 중...');
    
    // 모든 마커 제거
    markers.forEach(marker => {
        // 마커에 연결된 오버레이가 있으면 함께 제거
        if (marker.iconOverlay) {
            marker.iconOverlay.setMap(null);
        }
        marker.setMap(null);
    });
    
    // 마커 배열 초기화
    markers = [];
    
    // 선택된 마커 초기화
    selectedMarker = null;
    
    console.log('모든 마커 제거 완료');
}

/**
 * 특정 맵 데이터 로드 함수
 * @param {string} dataPath - 데이터 파일 경로
 */
async function loadSpecificMapData(dataPath) {
    console.log('지도 데이터 로드 시작:', dataPath);
    
    try {
        // 맵 데이터 로드
        const mapData = await loadMapData(dataPath);
        
        // 전역 데이터 스토어에 저장
        pageDataStore.currentMapData = mapData;
        pageDataStore.places = mapData.places || [];
        pageDataStore.filteredPlaces = [...pageDataStore.places]; // 초기에는 모든 장소 표시
        
        // 맵 데이터 타입 감지 ('trip' 또는 'theme')
        // trip 데이터는 days 필드가 있거나 파일명에 trip이 포함된 경우
        if (mapData.days || 
            mapData.type === 'trip' || 
            dataPath.toLowerCase().includes('trip') ||
            (mapData.categories && Object.keys(mapData.categories).some(cat => cat.toLowerCase().includes('day')))) {
            pageDataStore.mapDataType = 'trip';
        } else {
            pageDataStore.mapDataType = 'theme';
        }
        
        console.log('맵 데이터 타입:', pageDataStore.mapDataType);
        
        // 테마 정보 표시
        displayThemeInfo(mapData);
        
        // 장소 목록 표시
        displayPlaces(pageDataStore.places);
        
        // 지도에 장소 표시
        displayPlacesOnMap(pageDataStore.places);
        
        // 카테고리 필터 업데이트 (존재하는 경우)
        if (mapData.categories) {
            updateCategoryFilters(mapData.categories);
        }
        
        // 뷰 모드 버튼 업데이트
        updateViewModeButtons();
        
        console.log('지도 데이터 로드 완료:', mapData.title || '제목 없음');
        return mapData;
    } catch (error) {
        console.error('지도 데이터 로드 오류:', error);
        alert(`지도 데이터 로드 중 오류가 발생했습니다: ${error.message}`);
        return null;
    }
}

/**
 * 장소 목록 표시 함수
 * @param {Array} places - 표시할 장소 배열
 */
function displayPlaces(places) {
    try {
        // 현재 필터링된 장소 업데이트
        pageDataStore.filteredPlaces = places || [];
        
        // 장소 목록 업데이트
        updatePlacesList(places);
        
        // 장소 목록 제목 업데이트
        const placesListTitle = document.getElementById('places-list-title');
        if (placesListTitle) {
            placesListTitle.textContent = `장소 목록 (${places ? places.length : 0})`;
        }
    } catch (error) {
        console.error('장소 목록 표시 중 오류 발생:', error);
    }
}

/**
 * 지도에 장소 표시 함수
 * @param {Array} places - 표시할 장소 배열
 */
function displayPlacesOnMap(places) {
    try {
        console.log('지도에 장소 표시 중...', places ? places.length : 0);
        
        // 기존 마커 제거
        removeAllMarkers();
        
        // 유효한 장소가 없는 경우
        if (!places || !Array.isArray(places) || places.length === 0) {
            console.log('표시할 장소가 없습니다.');
            return;
        }
        
        // 유효한 장소만 필터링
        const validPlaces = places.filter(place => 
            place && 
            place.location && 
            typeof place.location.lat === 'number' && 
            typeof place.location.lng === 'number'
        );
        
        if (validPlaces.length === 0) {
            console.log('유효한 좌표를 가진 장소가 없습니다.');
            return;
        }
        
        // 새 마커 생성
        validPlaces.forEach(place => {
            try {
                const marker = createMarker(place);
                markers.push(marker);
            } catch (error) {
                console.error(`마커 생성 오류 (${place.title}):`, error);
            }
        });
        
        console.log('생성된 마커 수:', markers.length);
        
        // 모든 마커가 보이도록 지도 범위 조정
        if (markers.length > 0) {
            try {
                setMapBounds(validPlaces);
            } catch (error) {
                console.error('지도 범위 설정 오류:', error);
                // 오류 발생 시 제주도 중심으로 설정
                map.setCenter(new kakao.maps.LatLng(33.3616666, 126.5291666));
                map.setLevel(10);
            }
        }
    } catch (error) {
        console.error('지도에 장소 표시 중 오류 발생:', error);
    }
}

/**
 * 마커 생성 함수
 * @param {Object} place - 장소 데이터
 * @returns {kakao.maps.Marker} - 생성된 마커 객체
 */
function createMarker(place) {
    // 장소 위치 가져오기 (필수)
    if (!place.location || typeof place.location.lat !== 'number' || typeof place.location.lng !== 'number') {
        console.error('유효하지 않은 장소 위치 정보:', place);
        return null;
    }
    
    // 마커 위치 설정
    const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
    
    // 마커 이미지 생성 (라벨 색상 활용)
    let markerImage;
    let iconContent = '';
    let iconColor = '#1976D2';
    
    // 장소에 라벨이 있는 경우 첫 번째 라벨 정보 활용
    if (place.labels && place.labels.length > 0) {
        // 첫 번째 라벨 정보 가져오기
        const labelInfo = getLabelInfo(place.labels[0]);
        iconColor = labelInfo.color;
        
        // 라벨 색상으로 마커 이미지 생성
        markerImage = createMarkerImage(labelInfo.color);
        
        // 아이콘 내용 생성
        iconContent = `<iconify-icon icon="${labelInfo.icon}" style="color: ${labelInfo.color}; font-size: 14px;"></iconify-icon>`;
    } else {
        // 기본 마커 이미지 생성
        markerImage = createMarkerImage('#1976D2');
        iconContent = '<iconify-icon icon="mdi:map-marker" style="color: #1976D2; font-size: 14px;"></iconify-icon>';
    }
    
    // 마커 객체 생성
    const marker = new kakao.maps.Marker({
        position: position,          // 마커 위치
        image: markerImage,          // 마커 이미지
        clickable: true,             // 클릭 가능 설정
        title: place.title || '',    // 마커 타이틀 (툴크)
        zIndex: 1                    // 마커 겹침 순서
    });
    
    // 마커를 지도에 추가
    marker.setMap(map);
    
    // 마커에 장소 정보 저장 (나중에 참조 용이하게)
    marker.place = place;
    marker.iconColor = iconColor;
    
    // 아이콘 오버레이 생성 및 추가
    const iconOverlay = new kakao.maps.CustomOverlay({
        position: position,
        content: `<div class="marker-icon-overlay" data-icon-color="${iconColor}">${iconContent}</div>`,
        zIndex: 2, // 마커보다 위에 표시
    });
    
    // 오버레이를 지도에 추가
    iconOverlay.setMap(map);
    
    // 마커와 오버레이를 연결 (나중에 함께 제거하기 위해)
    marker.iconOverlay = iconOverlay;
    
    // 마커 클릭 이벤트 리스너 등록
    kakao.maps.event.addListener(marker, 'click', function() {
        // 마커의 화면상 위치 계산
        const projection = map.getProjection();
        const markerPosition = projection.containerPointFromCoords(marker.getPosition());
        
        // 장소 정보 패널 표시 (마커 위치 전달)
        showPlaceInfoPanel(place, markerPosition);
        
        // 해당 장소로 지도 중심 이동 (부드럽게)
        map.panTo(position);
        
        // 선택된 마커 설정
        if (selectedMarker) {
            // 이전 선택 마커 스타일 원복
            selectedMarker.setZIndex(1);
        }
        
        // 현재 마커를 선택된 마커로 설정
        selectedMarker = marker;
    });
    
    return marker;
}

/**
 * 마커 이미지 생성 함수
 * @param {string} color - 마커 색상 (기본값: #1976D2)
 * @returns {kakao.maps.MarkerImage} - 생성된 마커 이미지
 */
function createMarkerImage(color = '#1976D2') {
    // SVG 마커 아이콘 정의 (핀 형태, 테두리 얇게, 내부에 구멍)
    const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
            <path fill="${color}" d="M12 0C5.8 0 0.8 5 0.8 11.2c0 4 2.5 7.9 7.2 13.5l3.4 4.5c0.3 0.3 0.9 0.3 1.2 0l3.4-4.5c4.7-5.6 7.2-9.5 7.2-13.5C23.2 5 18.2 0 12 0zm0 16.8c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z"/>
            <circle fill="white" cx="12" cy="9.8" r="7"/>
        </svg>
    `;
    
    // SVG를 Base64로 인코딩
    const base64Marker = btoa(svgMarker);
    
    // 마커 이미지 크기 설정
    const imageSize = new kakao.maps.Size(24, 36);
    
    // 마커 이미지 생성
    return new kakao.maps.MarkerImage(
        'data:image/svg+xml;base64,' + base64Marker,
        imageSize
    );
}

/**
 * 지도 범위 설정 함수
 * @param {Array} places - 장소 배열 (location 속성을 가진 객체들)
 */
function setMapBounds(places) {
    // 장소가 없는 경우 종료
    if (!places || !places.length) return;
    
    // LatLngBounds 객체 생성
    const bounds = new kakao.maps.LatLngBounds();
    let validPositions = 0;
    
    // 모든 장소를 포함하도록 범위 확장
    places.forEach(place => {
        // 유효한 위치 데이터 확인
        if (place && place.location && typeof place.location.lat === 'number' && typeof place.location.lng === 'number') {
            bounds.extend(new kakao.maps.LatLng(
                place.location.lat,
                place.location.lng
            ));
            validPositions++;
        }
    });
    
    // 유효한 위치가 있는 경우에만 범위 설정
    if (validPositions > 0) {
        // 위치가 하나인 경우 중앙에 배치
        if (validPositions === 1) {
            const firstValidPlace = places.find(p => p && p.location && 
                typeof p.location.lat === 'number' && 
                typeof p.location.lng === 'number');
                
            map.setCenter(new kakao.maps.LatLng(
                firstValidPlace.location.lat,
                firstValidPlace.location.lng
            ));
            
            // 중심 설정 후 줌 레벨 조정
            map.setLevel(10);
        } else {
            // 여러 위치가 있는 경우 모두 포함하도록 범위 설정
            map.setBounds(bounds);
        }
    } else {
        console.warn('유효한 위치 데이터가 없습니다. 기본 중심점으로 설정합니다.');
        // 제주도 중심 좌표로 설정 (기본값)
        map.setCenter(new kakao.maps.LatLng(33.3616666, 126.5291666));
        map.setLevel(10); // 적절한 줌 레벨 설정
    }
}

/**
 * 장소 정보 패널 표시 함수
 * @param {Object} place - 표시할 장소 정보
 * @param {Object} markerPosition - 마커의 화면상 좌표 (선택적)
 */
function showPlaceInfoPanel(place, markerPosition) {
    const panel = document.getElementById('place-info-panel');
    const title = document.getElementById('place-title');
    const address = document.getElementById('place-address');
    const description = document.getElementById('place-description');
    const labels = document.getElementById('place-labels');
    const naverLink = document.getElementById('naver-map-link');
    const kakaoLink = document.getElementById('kakao-map-link');
    
    if (!panel || !title || !address || !description || !labels) {
        console.error('장소 정보 패널 요소를 찾을 수 없습니다.');
        return;
    }
    
    // 패널 내용 업데이트
    title.textContent = place.title || '제목 없음';
    address.textContent = place.address || '주소 정보 없음';
    description.textContent = place.description || '설명 없음';
    
    // 라벨 업데이트
    labels.innerHTML = '';
    if (place.labels && place.labels.length > 0) {
        place.labels.forEach(label => {
            // ui.js의 createLabelElement 스타일 적용
            const labelInfo = getLabelInfo(label);
            
            const labelElement = document.createElement('span');
            labelElement.className = 'place-label';
            
            // 라벨 스타일 적용
            labelElement.style.backgroundColor = labelInfo.color + '20'; // 10% 투명도
            labelElement.style.color = labelInfo.color;
            labelElement.style.borderLeftColor = labelInfo.color;
            
            // 아이콘 요소 생성
            const iconElement = document.createElement('span');
            iconElement.className = 'label-icon';
            iconElement.innerHTML = `<iconify-icon icon="${labelInfo.icon}"></iconify-icon>`;
            
            // 텍스트 요소 생성
            const textElement = document.createElement('span');
            textElement.textContent = label;
            
            // 툴크 요소 생성 (숨겨진 상태로 데이터만 저장)
            const tooltipElement = document.createElement('span');
            tooltipElement.className = 'label-tooltip';
            tooltipElement.textContent = labelInfo.description;
            tooltipElement.style.display = 'none'; // 화면에 보이지 않도록 설정
            
            // 요소 조립
            labelElement.appendChild(iconElement);
            labelElement.appendChild(textElement);
            labelElement.appendChild(tooltipElement);
            
            // 이벤트 설정 상태 추적 속성 추가
            labelElement.dataset.hasTooltipEvent = 'false';
            
            labels.appendChild(labelElement);
        });
    } else {
        labels.innerHTML = '<span class="no-labels">라벨 없음</span>';
    }
    
    // 외부 링크 업데이트
    if (place.location) {
        const lat = place.location.lat;
        const lng = place.location.lng;
        
        // 네이버 지도 링크
        naverLink.href = `https://map.naver.com/v5/?c=${lng},${lat},15,0,0,0,dh&entry=plt`;
        
        // 카카오 지도 링크
        kakaoLink.href = `https://map.kakao.com/link/map/${encodeURIComponent(place.title)},${lat},${lng}`;
    }
    
    // 패널 표시 전에 일단 보이게 설정 (크기 계산을 위해)
    panel.style.display = 'block';
    
    // 장소 정보 패널 내부 클릭 이벤트가 지도로 전파되는 것을 방지
    if (!panel._hasClickHandler) {
        panel.addEventListener('click', function(e) {
            // 이벤트 전파 방지
            e.stopPropagation();
        });
        panel._hasClickHandler = true;
    }
    
    // 마커 위치가 제공된 경우 위치 조정
    if (markerPosition) {
        // 지도 컨테이너의 크기와 위치
        const mapContainer = document.getElementById('map');
        const mapRect = mapContainer.getBoundingClientRect();
        
        // 팝업의 크기
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        
        // 마커 위치가 지도의 어느 영역에 있는지 확인 (좌상, 우상, 좌하, 우하)
        const isRightHalf = markerPosition.x > mapRect.width / 2;
        const isBottomHalf = markerPosition.y > mapRect.height / 2;
        
        // 팝업 위치 계산
        let left, top;
        
        // 가로 위치 계산
        if (isRightHalf) {
            // 마커가 오른쪽 영역에 있으면 팝업은 마커 왼쪽에 표시
            left = markerPosition.x - panelWidth;
        } else {
            // 마커가 왼쪽 영역에 있으면 팝업은 마커 오른쪽에 표시
            left = markerPosition.x;
        }
        
        // 마커 타입 감지 - 클릭된 마커의 DOM 요소를 확인
        let isCustomNumberMarker = false;
        
        // 마커 타입을 확인하는 방법
        // 1. place.order가 있으면 숫자 마커
        // 2. pageDataStore.currentTrip이 있으면 숫자 마커 가능성 높음
        // 3. DOM에서 클릭된 마커 요소를 확인
        if (place.order !== undefined || pageDataStore.currentTrip) {
            isCustomNumberMarker = true;
        } else {
            // DOM에서 마커 타입 확인 (숫자 마커인지 여부)
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
                top = markerPosition.y - panelHeight;
            }
        } else {
            if (isCustomNumberMarker) {
                // 숫자 마커의 경우
                top = markerPosition.y + 30; // 숫자 마커 아래에 표시, 간격 확대
            } else {
                // 일반 마커의 경우
                top = markerPosition.y - 10;
            }
        }
        
        // 팝업이 지도 영역을 벗어나지 않도록 보정
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left + panelWidth > mapRect.width) left = mapRect.width - panelWidth;
        if (top + panelHeight > mapRect.height) top = mapRect.height - panelHeight;
        
        // 계산된 위치로 팝업 위치 설정
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    } else {
        // 마커 위치가 제공되지 않은 경우 중앙 배치
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
    }
    
    // 패널 표시
    panel.style.display = 'block';
    panel.classList.add('visible');
}

/**
 * 장소 정보 패널 숨김 함수
 */
function hidePlaceInfoPanel() {
    const panel = document.getElementById('place-info-panel');
    if (panel) {
        panel.style.display = 'none';
        panel.classList.remove('visible');
    }
    
    // 선택된 마커 초기화
    selectedMarker = null;
}

/**
 * 장소 ID로 장소 찾기
 * @param {string} placeId - 장소 ID
 * @returns {Object|null} - 찾은 장소 객체 또는 null
 */
function getPlaceById(placeId) {
    // 현재 로드된 장소에서 찾기
    return pageDataStore.places.find(p => p.id === placeId) || null;
}

/**
 * 라벨 정보 가져오기
 * @param {string} labelName - 라벨 이름
 * @returns {Object} - 라벨 정보 (아이콘, 색상, 설명)
 */
function getLabelInfo(labelName) {
    // 기본 정보
    const defaultInfo = {
        icon: "mdi:tag",
        color: "#9E9E9E",
        description: labelName
    };
    
    // 저장된 라벨 정보가 있으면 반환, 없으면 기본값 반환
    return pageDataStore.labelInfo[labelName] || defaultInfo;
}

// getLabelInfo 함수를 전역으로 노출
window.getLabelInfo = getLabelInfo;

/**
 * 특정 맵 데이터 로드 함수 - 최적화된 버전
 * @param {string} dataPath - 데이터 파일 경로
 * @returns {Promise<Object>} - 로드된 맵 데이터
 */
async function loadMapData(dataPath) {
    try {
        const response = await fetch(dataPath);
        if (!response.ok) {
            throw new Error(`데이터 로드 실패: ${response.status} ${response.statusText}`);
        }
        
        const mapData = await response.json();
        
        // 라벨 정보 추출 및 저장 (있는 경우)
        if (mapData.labelInfo) {
            pageDataStore.labelInfo = mapData.labelInfo;
        }
        
        // 성능 최적화: 장소 객체 참조 중복 제거 및 필요한 데이터만 유지
        if (mapData.places && Array.isArray(mapData.places)) {
            // 장소 데이터 최적화 처리
            optimizePlacesData(mapData.places);
        }
        
        return mapData;
    } catch (error) {
        console.error('맵 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 장소 데이터 최적화 함수
 * @param {Array} places - 장소 데이터 배열
 */
function optimizePlacesData(places) {
    // 장소 데이터에 필요한 속성만 유지하여 메모리 사용량 최적화
    places.forEach(place => {
        // 불필요한 중첩 객체나 큰 데이터 필드 정리
        if (place.details && typeof place.details === 'object') {
            // 필요한 데이터만 상위 객체로 이동하고 중첩 객체 제거
            if (!place.description && place.details.description) {
                place.description = place.details.description;
            }
            delete place.details;
        }
        
        // 사용하지 않는 대용량 필드 제거 (예: 이미지 URL 배열 등)
        if (place.images && place.images.length > 3) {
            // 최대 3개의 이미지만 유지 (필요한 경우)
            place.images = place.images.slice(0, 3);
        }
    });
}

/**
 * 라벨 목록 생성 함수
 * @param {Array} places - 장소 데이터 배열
 * @returns {Array} - 고유한 라벨 목록
 */
function extractUniqueLabels(places) {
    const uniqueLabels = new Set();
    
    if (!places || !Array.isArray(places)) {
        return [];
    }
    
    // 모든 장소의 라벨 수집
    places.forEach(place => {
        if (place.labels && Array.isArray(place.labels)) {
            place.labels.forEach(label => {
                uniqueLabels.add(label);
            });
        }
    });
    
    return Array.from(uniqueLabels).sort();
}

/**
 * 라벨별 장소 필터링 함수
 * @param {Array} places - 장소 데이터 배열
 * @param {string} label - 필터링할 라벨
 * @returns {Array} - 필터링된 장소 배열
 */
function filterPlacesByLabel(places, label) {
    if (!places || !Array.isArray(places) || !label) {
        return [];
    }
    
    return places.filter(place => 
        place.labels && 
        Array.isArray(place.labels) && 
        place.labels.includes(label)
    );
}

/**
 * 주소로 장소 검색 함수
 * @param {string} address - 검색할 주소 키워드
 * @returns {Array} - 검색 결과 장소 배열
 */
function searchPlacesByAddress(address) {
    if (!address || !pageDataStore.places || !Array.isArray(pageDataStore.places)) {
        return [];
    }
    
    const normalizedQuery = address.trim().toLowerCase();
    
    return pageDataStore.places.filter(place => 
        place.address && place.address.toLowerCase().includes(normalizedQuery)
    );
}

/**
 * 장소 객체 생성 함수 (새 장소 추가 시 사용)
 * @param {Object} placeData - 장소 데이터
 * @returns {Object} - 생성된 장소 객체
 */
function createPlaceObject(placeData) {
    // 필수 필드 검증
    if (!placeData.title || !placeData.location || 
        typeof placeData.location.lat !== 'number' || 
        typeof placeData.location.lng !== 'number') {
        throw new Error('장소 생성 실패: 필수 필드 누락');
    }
    
    // 기본 장소 객체 생성
    return {
        id: placeData.id || `place_${Date.now()}`, // 고유 ID 생성
        title: placeData.title,
        address: placeData.address || '',
        description: placeData.description || '',
        location: {
            lat: placeData.location.lat,
            lng: placeData.location.lng
        },
        labels: Array.isArray(placeData.labels) ? [...placeData.labels] : [],
        urls: placeData.urls || {}
    };
}

/**
 * 테마 정보 표시 함수
 * @param {Object} mapData - 맵 데이터 객체
 */
function displayThemeInfo(mapData) {
    try {
        console.log('테마 정보 표시 중...');
        
        if (!mapData) {
            console.error('유효하지 않은 맵 데이터');
            return;
        }
        
        // 테마 제목 및 설명 업데이트
        const titleElement = document.getElementById('theme-title');
        const descriptionElement = document.getElementById('theme-description');
        
        if (titleElement) {
            titleElement.textContent = mapData.title || '제목 없음';
        }
        
        if (descriptionElement) {
            descriptionElement.textContent = mapData.description || '';
        }
        
        // 여행 기간 정보 (있는 경우)
        if (mapData.startDate && mapData.endDate && descriptionElement) {
            const period = ` (${mapData.startDate} ~ ${mapData.endDate})`;
            descriptionElement.textContent += period;
        }
        
        console.log('테마 정보 표시 완료:', mapData.title || '제목 없음');
    } catch (error) {
        console.error('테마 정보 표시 중 오류 발생:', error);
    }
}

/**
 * 카테고리 필터 업데이트 함수
 * @param {Object} categories - 카테고리 정보 객체
 */
function updateCategoryFilters(categories) {
    try {
        console.log('카테고리 필터 업데이트 중...');
        
        const categoryList = document.getElementById('category-list');
        if (!categoryList) {
            console.error('카테고리 목록 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 카테고리 목록 초기화
        categoryList.innerHTML = '';
        
        // 카테고리가 없거나 비어있는 경우
        if (!categories || Object.keys(categories).length === 0) {
            const noCategories = document.createElement('div');
            noCategories.className = 'no-categories';
            noCategories.textContent = '사용 가능한 카테고리가 없습니다.';
            categoryList.appendChild(noCategories);
            return;
        }
        
        // 카테고리 그룹별 처리
        Object.entries(categories).forEach(([categoryGroup, items]) => {
            // 카테고리 그룹 컨테이너
            const groupContainer = document.createElement('div');
            groupContainer.className = 'category-group';
            
            // 그룹 제목
            const groupTitle = document.createElement('h4');
            groupTitle.textContent = categoryGroup;
            groupContainer.appendChild(groupTitle);
            
            // 카테고리 항목 목록
            const itemsList = document.createElement('div');
            itemsList.className = 'category-items';
            
            // 각 카테고리 항목에 대한 체크박스 생성
            items.forEach(item => {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'category-item';
                
                // 체크박스 생성
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `category-${categoryGroup}-${item}`;
                checkbox.value = item;
                checkbox.dataset.category = categoryGroup;
                
                // 라벨 생성
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                
                // 라벨 정보 가져오기
                const labelInfo = getLabelInfo(item);
                
                // 아이콘 추가 (모든 카테고리 항목에 아이콘 추가)
                const iconElement = document.createElement('iconify-icon');
                iconElement.setAttribute('icon', labelInfo.icon || 'mdi:tag');
                iconElement.style.marginRight = '4px';
                iconElement.style.color = labelInfo.color || '#9E9E9E';
                label.appendChild(iconElement);
                
                // 텍스트 노드 추가
                const textNode = document.createTextNode(item);
                label.appendChild(textNode);
                
                // 색상 표시를 위한 원형 마커 추가
                const colorDot = document.createElement('span');
                colorDot.className = 'color-dot';
                colorDot.style.backgroundColor = labelInfo.color || '#9E9E9E';
                label.appendChild(colorDot);
                
                // 이벤트 리스너 추가
                checkbox.addEventListener('change', function() {
                    filterPlacesByCategory(categoryGroup, item, this.checked);
                });
                
                // 요소 조합
                itemContainer.appendChild(checkbox);
                itemContainer.appendChild(label);
                itemsList.appendChild(itemContainer);
            });
            
            // 그룹 컨테이너에 항목 목록 추가
            groupContainer.appendChild(itemsList);
            
            // 전체 카테고리 목록에 그룹 추가
            categoryList.appendChild(groupContainer);
        });
        
        console.log('카테고리 필터 업데이트 완료');
    } catch (error) {
        console.error('카테고리 필터 업데이트 중 오류 발생:', error);
    }
}

/**
 * 카테고리별 장소 필터링 함수
 * @param {string} category - 카테고리 이름
 * @param {string} value - 카테고리 값
 * @param {boolean} isChecked - 체크 여부
 */
function filterPlacesByCategory(category, value, isChecked) {
    try {
        console.log(`카테고리 필터링: ${category} - ${value} (${isChecked ? '활성화' : '비활성화'})`);
        
        // 활성화된 필터 수집
        const activeFilters = collectActiveFilters();
        
        // 필터링 로직
        if (Object.keys(activeFilters).length === 0) {
            // 활성화된 필터가 없으면 모든 장소 표시
            pageDataStore.filteredPlaces = [...pageDataStore.places];
        } else {
            // 필터 적용하여 장소 필터링
            pageDataStore.filteredPlaces = pageDataStore.places.filter(place => {
                // 모든 활성화된 카테고리 필터 검사
                for (const [cat, values] of Object.entries(activeFilters)) {
                    if (values.length === 0) continue; // 해당 카테고리에 활성화된 값이 없으면 스킵
                    
                    // 장소에 라벨이 없으면 필터링에서 제외
                    if (!place.labels || !Array.isArray(place.labels)) {
                        return false;
                    }
                    
                    // 장소 라벨 중 하나라도 현재 카테고리의 활성화된 값과 일치하는지 확인
                    const hasMatch = values.some(val => place.labels.includes(val));
                    
                    // 일치하는 값이 없으면 필터링에서 제외
                    if (!hasMatch) {
                        return false;
                    }
                }
                
                // 모든 필터를 통과한 경우
                return true;
            });
        }
        
        // 필터링된 장소로 UI 업데이트
        displayPlaces(pageDataStore.filteredPlaces);
        displayPlacesOnMap(pageDataStore.filteredPlaces);
        
        console.log(`필터링 결과: ${pageDataStore.filteredPlaces.length}개 장소`);
    } catch (error) {
        console.error('카테고리 필터링 중 오류 발생:', error);
    }
}

/**
 * 활성화된 필터 수집 함수
 * @returns {Object} - 카테고리별 활성화된 필터 값 객체
 */
function collectActiveFilters() {
    const activeFilters = {};
    
    // 체크된 모든 카테고리 체크박스 찾기
    const checkedBoxes = document.querySelectorAll('#category-list input[type="checkbox"]:checked');
    
    checkedBoxes.forEach(checkbox => {
        const category = checkbox.dataset.category;
        const value = checkbox.value;
        
        if (!category || !value) return; // 유효하지 않은 데이터 건너뛰기
        
        // 카테고리 배열 초기화 (필요한 경우)
        if (!activeFilters[category]) {
            activeFilters[category] = [];
        }
        
        // 값 추가 (중복 방지)
        if (!activeFilters[category].includes(value)) {
            activeFilters[category].push(value);
        }
    });
    
    return activeFilters;
}

/**
 * 장소 검색 함수
 * @param {string} query - 검색어
 */
function searchPlacesInPage(query) {
    try {
        console.log('장소 검색 중:', query);
        
        if (!query || query.trim() === '') {
            // 검색어가 없으면 모든 장소 표시
            displayPlaces(pageDataStore.places);
            displayPlacesOnMap(pageDataStore.places);
            return;
        }
        
        // 검색어 정규화
        const normalizedQuery = query.trim().toLowerCase();
        
        // 장소 검색
        const searchResults = pageDataStore.places.filter(place => {
            return (
                (place.title && place.title.toLowerCase().includes(normalizedQuery)) ||
                (place.address && place.address.toLowerCase().includes(normalizedQuery)) ||
                (place.description && place.description.toLowerCase().includes(normalizedQuery))
            );
        });
        
        // 검색 결과 없음
        if (searchResults.length === 0) {
            alert(`"${query}" 검색 결과가 없습니다.`);
            return;
        }
        
        // 검색 결과 표시
        pageDataStore.filteredPlaces = searchResults;
        displayPlaces(searchResults);
        displayPlacesOnMap(searchResults);
        
        console.log(`검색 결과: ${searchResults.length}개 장소`);
    } catch (error) {
        console.error('장소 검색 중 오류 발생:', error);
    }
}

/**
 * 검색 이벤트 처리 함수
 */
function handlePageSearch() {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    if (!searchInput || !searchButton) {
        console.error('검색 UI 요소를 찾을 수 없습니다.');
        return;
    }
    
    const query = searchInput.value.trim();
    searchPlacesInPage(query);
}

// 필요한 함수들을 전역으로 노출
window.getPlaceById = getPlaceById;
window.getLabelInfo = getLabelInfo;
window.searchPlacesInPage = searchPlacesInPage;
window.filterPlacesByCategory = filterPlacesByCategory;
window.displayPlaces = displayPlaces;
window.displayPlacesOnMap = displayPlacesOnMap;
window.loadKakaoMapAPI = loadKakaoMapAPI;
window.pageDataStore = pageDataStore;
window.removeAllMarkers = removeAllMarkers;
window.updatePlacesList = updatePlacesList;
window.hidePlaceInfoPanel = hidePlaceInfoPanel;
window.showPlaceInfoPanel = showPlaceInfoPanel;
window.handlePageSearch = handlePageSearch;
window.updateCategoryFilters = updateCategoryFilters;
window.displayThemeInfo = displayThemeInfo;
window.updateViewModeButtons = updateViewModeButtons;

// DOM이 로드된 후 이벤트 설정
document.addEventListener('DOMContentLoaded', function() {
    // 페이지 이벤트 설정
    setupPageEvents();
    
    // loadMapData 함수를 window 객체에 노출하여 HTML 인라인 스크립트에서 사용 가능하게 함
    window.loadMapData = loadMapData;
    
    // 페이지 초기화 함수도 window 객체에 노출
    if (typeof window.loadSpecificMapData === 'undefined') {
        window.loadSpecificMapData = loadSpecificMapData;
    }
    
    // 성능 최적화를 위해 페이지 URL을 확인하여 적절한 데이터 파일을 자동 로드
    const currentUrl = window.location.pathname;
    
    // 자동 데이터 파일 매핑 (URL 경로에 따라 데이터 파일 결정)
    if (currentUrl.includes('jeju_food.html')) {
        // jeju_food.html 페이지에서 loadSpecificMapData 함수를 직접 호출하는 경우를 위한 조건 처리
        if (typeof window.loadKakaoMapAPIComplete === 'undefined') {
            window.loadKakaoMapAPIComplete = true;
            console.log('페이지 자동 데이터 로드 설정 완료: jeju_food.html');
        }
    } else if (currentUrl.includes('jeju_trip_202506.html')) {
        // jeju_trip_202506.html 페이지는 이미 loadKakaoMapAPI를 호출하므로 별도 처리 필요 없음
        console.log('페이지 자동 데이터 로드 설정 완료: jeju_trip_202506.html');
    } else {
        // 기타 다른 페이지에 대한 처리
        console.log('알 수 없는 페이지 - 데이터 자동 로드 없음');
    }
});

/**
 * 뷰 모드 버튼 상태 업데이트 함수
 * 맵 데이터 타입에 따라 적절한 버튼을 활성화하고 다른 버튼을 비활성화합니다.
 */
function updateViewModeButtons() {
    const themeViewBtn = document.getElementById('theme-view-btn');
    const tripViewBtn = document.getElementById('trip-view-btn');
    
    if (!themeViewBtn || !tripViewBtn) {
        console.warn('뷰 모드 버튼을 찾을 수 없습니다.');
        return;
    }
    
    // 기존 active 클래스 제거
    themeViewBtn.classList.remove('active');
    tripViewBtn.classList.remove('active');
    
    // 버튼 초기화 (모두 활성화)
    themeViewBtn.disabled = false;
    tripViewBtn.disabled = false;
    themeViewBtn.style.cursor = 'pointer';
    tripViewBtn.style.cursor = 'pointer';
    themeViewBtn.style.opacity = '1';
    tripViewBtn.style.opacity = '1';
    
    // 맵 데이터 타입에 따라 적절한 버튼 활성화 및 다른 버튼 비활성화
    if (pageDataStore.mapDataType === 'trip') {
        // 여행 데이터일 경우, 여행 버튼 활성화
        tripViewBtn.classList.add('active');
        console.log('여행 뷰 모드 활성화');
    } else {
        // 테마 데이터일 경우, 테마 버튼 활성화하고 여행 버튼 비활성화
        themeViewBtn.classList.add('active');
        // 여행 버튼 비활성화
        tripViewBtn.disabled = true;
        tripViewBtn.style.cursor = 'not-allowed';
        tripViewBtn.style.opacity = '0.5';
        console.log('테마 뷰 모드 활성화 (여행 뷰 버튼 비활성화)');
    }
}

/**
 * 장소 목록 표시 함수
 * @param {Array} places - 표시할 장소 배열
 */