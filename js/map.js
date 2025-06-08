/**
 * 지도 관리 모듈
 * 카카오 맵 API를 사용하여 지도를 초기화하고 마커를 표시하는 기능을 제공합니다.
 */

// 전역 mapModule 객체 생성 (기본 초기화)
window.mapModule = {
    initialized: false,
    isMapInitialized: function() {
        return mapInitialized;
    }
};

// 전역 변수
let map; // 카카오맵 객체
let markers = []; // 마커 배열
let infoWindows = []; // 인포윈도우 배열
let markerClusterer = null; // 마커 클러스터러
let mapInitialized = false; // 지도 초기화 여부
let markerImageCache = {};
let selectedMarker = null;
let infowindow = null;
let currentInfoWindow = null;

/**
 * 지도 초기화 함수
 * 카카오맵 인스턴스를 생성하고 기본 설정을 적용합니다.
 */
function initMap() {
    console.log('지도 초기화 중...');
    
    try {
        // 지도 컨테이너 요소
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('지도 컨테이너를 찾을 수 없습니다.');
            return false;
        }
        
        // 지도 컨테이너 크기 확인 및 설정
        const rect = mapContainer.getBoundingClientRect();
        console.log('지도 컨테이너 크기:', rect.width, 'x', rect.height);
        
        // 컨테이너 크기가 너무 작으면 기본 크기 설정
        if (rect.width < 10 || rect.height < 10) {
            console.warn('지도 컨테이너 크기가 너무 작습니다. 기본 크기를 설정합니다.');
            mapContainer.style.width = '100%';
            mapContainer.style.height = '100%';
            
            // 레이아웃 강제 재계산 (크기 변경 적용을 위해)
            void mapContainer.offsetWidth;
        }
        
        // 초기 지도 중심 좌표 (제주도 중심)
        const initialCenter = new kakao.maps.LatLng(33.3846, 126.5535);
        
        // 지도 생성 옵션
        const mapOptions = {
            center: initialCenter,       // 지도 중심 좌표
            level: 10,                   // 초기 줌 레벨 (1~14, 숫자가 클수록 넓은 영역)
            mapTypeId: kakao.maps.MapTypeId.ROADMAP  // 지도 종류 (ROADMAP, SKYVIEW, HYBRID)
        };
        
        // 지도 객체 생성
        map = new kakao.maps.Map(mapContainer, mapOptions);
        
        // 줌 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
        
        // 타입 컨트롤 추가 (일반지도/스카이뷰 전환)
        const mapTypeControl = new kakao.maps.MapTypeControl();
        map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
        
        // 지도 이벤트 리스너 등록
        kakao.maps.event.addListener(map, 'zoom_changed', function() {
            console.log('지도 줌 레벨 변경:', map.getLevel());
        });
        
        kakao.maps.event.addListener(map, 'dragend', function() {
            console.log('지도 이동 완료');
        });
        
        // 마커 클러스터러 초기화
        initMarkerClusterer();
        
        // 마커 이미지 프리로딩
        preloadMarkerImages();
        
        // 지도 초기화 완료 표시
        mapInitialized = true;
        window.mapModule.initialized = true;
        
        console.log('지도 초기화 완료');
        
        // 초기 레이아웃 적용을 위한 강제 리레이아웃
        setTimeout(() => {
            console.log('초기 지도 리레이아웃 실행');
            map.relayout();
            
            // 추가적인 안전 조치: 윈도우 리사이즈 이벤트 발생시켜 레이아웃 재조정
            window.dispatchEvent(new Event('resize'));
        }, 500);
        
        // 화면 크기가 변할 때 지도 영역 리레이아웃
        window.addEventListener('resize', function() {
            // 디바운싱 구현: 300ms 이내 연속 호출 시 마지막 1회만 실행
            if (this.resizeTimer) {
                clearTimeout(this.resizeTimer);
            }
            
            this.resizeTimer = setTimeout(function() {
                console.log('초기 지도 리레이아웃 실행');
                map.relayout();
            }, 300);
        });
        
        return true;
    } catch (error) {
        console.error('지도 초기화 중 오류 발생:', error);
        return false;
    }
}

/**
 * 강제 지도 리레이아웃 함수
 * 지도 컨테이너 크기 변경 시 지도를 올바르게 표시하기 위해 리레이아웃을 수행합니다.
 */
function forceMapRelayout() {
    if (map) {
        console.log('지도 레이아웃 재설정');
        map.relayout();
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
    // 줌 컨트롤 추가
    const zoomControl = new kakao.maps.ZoomControl();
    map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
    
    // 지도 타입 컨트롤 추가
    const mapTypeControl = new kakao.maps.MapTypeControl();
    map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
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
        // 선택된 마커가 있고 정보 패널이 표시 중이면 위치 업데이트
        updateInfoPanelPosition();
    });
    
    // 지도 줌 변경 이벤트
    kakao.maps.event.addListener(map, 'zoom_changed', function() {
        console.log('지도 줌 레벨 변경:', map.getLevel());
        // 선택된 마커가 있고 정보 패널이 표시 중이면 위치 업데이트
        updateInfoPanelPosition();
    });
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
 * 마커 클러스터러 초기화
 */
function initMarkerClusterer() {
    try {
        // 카카오맵 API 로드 여부 확인
        if (typeof kakao === 'undefined' || typeof kakao.maps === 'undefined') {
            console.warn('카카오맵 API가 로드되지 않아 마커 클러스터러를 초기화할 수 없습니다.');
            return false;
        }
        
        // 마커 클러스터러 라이브러리 로드 여부 확인
        if (typeof kakao.maps.MarkerClusterer === 'undefined') {
            console.warn('MarkerClusterer 라이브러리가 로드되지 않았습니다. 클러스터링 없이 마커를 표시합니다.');
            
            // 클러스터러 없이도 마커가 표시될 수 있도록 빈 클러스터러 객체 생성
            markerClusterer = {
                addMarkers: function(markers) {
                    // 클러스터러가 없을 때는 각 마커를 직접 지도에 표시
                    markers.forEach(marker => {
                        if (marker && marker.setMap) {
                            marker.setMap(map);
                        }
                    });
                    return true;
                },
                clear: function() {
                    // 구현 불필요 (removeAllMarkers 함수에서 처리)
                    return true;
                }
            };
            
            console.log('대체 마커 표시 방식 초기화 완료');
            return true;
        }
        
        // 마커 클러스터러 생성
        markerClusterer = new kakao.maps.MarkerClusterer({
            map: map,
            averageCenter: true,
            minLevel: 6,  // 클러스터링 시작 줌 레벨
            calculator: [10, 30, 50],  // 클러스터 크기별 마커 개수
            styles: [
                {
                    width: '36px', height: '36px',
                    background: 'rgba(66, 133, 244, 0.8)',
                    borderRadius: '18px',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: '36px'
                },
                {
                    width: '48px', height: '48px',
                    background: 'rgba(52, 168, 83, 0.8)',
                    borderRadius: '24px',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: '48px'
                },
                {
                    width: '60px', height: '60px',
                    background: 'rgba(251, 188, 5, 0.8)',
                    borderRadius: '30px',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: '60px'
                },
                {
                    width: '72px', height: '72px',
                    background: 'rgba(234, 67, 53, 0.8)',
                    borderRadius: '36px',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: '72px'
                }
            ]
        });
        
        console.log('마커 클러스터러 초기화 완료');
        return true;
    } catch (error) {
        console.error('마커 클러스터러 초기화 중 오류 발생:', error);
        console.warn('마커 클러스터링 기능이 비활성화됩니다. 개별 마커만 표시됩니다.');
        
        // 오류 발생 시에도 마커가 표시될 수 있도록 빈 클러스터러 객체 생성
        markerClusterer = {
            addMarkers: function(markers) {
                // 클러스터러가 없을 때는 각 마커를 직접 지도에 표시
                markers.forEach(marker => {
                    if (marker && marker.setMap) {
                        marker.setMap(map);
                    }
                });
                return true;
            },
            clear: function() {
                // 구현 불필요 (removeAllMarkers 함수에서 처리)
                return true;
            }
        };
        
        return true; // 대체 구현이 성공했으므로 true 반환
    }
}

/**
 * 마커 이미지 프리로딩 함수
 * 자주 사용하는 마커 이미지를 미리 로드하여 렌더링 성능을 향상시킵니다.
 */
function preloadMarkerImages() {
    console.log('마커 이미지 프리로딩 시작');
    
    try {
        // Iconify 기반 SVG 마커 생성 및 캐싱
        const colors = ['red', 'blue', 'green', 'purple', 'yellow', 'orange'];
        const iconNames = ['map-marker', 'food', 'coffee', 'shopping', 'camera', 'bed'];
        
        // 기본 마커 색상별 생성
        colors.forEach(color => {
            // 색상 코드 매핑
            const colorCode = getColorCode(color);
            
            // SVG 마커 생성
            const svgContent = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="${colorCode}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
            `;
            
            // SVG를 Base64로 인코딩
            const base64Svg = btoa(svgContent);
            const markerUrl = `data:image/svg+xml;base64,${base64Svg}`;
            
            // 캐시에 저장
            markerImageCache[color] = markerUrl;
        });
        
        // 아이콘별 마커 생성
        iconNames.forEach(icon => {
            // 기본 색상 사용
            const colorCode = '#4285F4';
            
            // 아이콘 이름을 Iconify 형식으로 변환
            const iconifyName = `mdi:${icon}`;
            
            // SVG 마커 생성 (아이콘은 별도 로드되므로 플레이스홀더만 생성)
            const svgContent = `
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
                    <path fill="${colorCode}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <foreignObject width="24" height="24" x="0" y="0">
                        <div xmlns="http://www.w3.org/1999/xhtml" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
                            <iconify-icon icon="${iconifyName}" style="color:white;font-size:14px;margin-top:-5px;"></iconify-icon>
                        </div>
                    </foreignObject>
                </svg>
            `;
            
            // SVG를 Base64로 인코딩
            const base64Svg = btoa(svgContent);
            const markerUrl = `data:image/svg+xml;base64,${base64Svg}`;
            
            // 캐시에 저장
            markerImageCache[`icon_${icon}`] = markerUrl;
        });
        
        console.log('마커 이미지 프리로딩 완료');
    } catch (error) {
        console.error('마커 이미지 프리로딩 실패:', error);
    }
}

/**
 * 색상 이름을 색상 코드로 변환하는 함수
 * @param {string} colorName - 색상 이름
 * @returns {string} - 색상 코드
 */
function getColorCode(colorName) {
    const colorMap = {
        'red': '#EA4335',
        'blue': '#4285F4',
        'green': '#34A853',
        'purple': '#673AB7',
        'yellow': '#FBBC05',
        'orange': '#FF9800',
        'gray': '#9E9E9E',
        'teal': '#009688',
        'pink': '#E91E63'
    };
    
    return colorMap[colorName] || '#4285F4'; // 기본값은 파란색
}

/**
 * 지도에 마커 업데이트
 * @param {Array} places 장소 데이터 배열
 * @param {Object} trip 여행 데이터 (선택적)
 */
function updateMapMarkers(places, trip = null) {
    try {
        console.log(`마커 업데이트 시작: ${places ? places.length : 0}개 장소`);
        
        // 지도 초기화 여부 확인 - 정확한 검사
        if (typeof map === 'undefined' || !map) {
            console.error('지도 객체가 초기화되지 않았습니다.');
            
            // 지도 초기화가 지연될 경우 3초 후 다시 시도
            setTimeout(() => {
                if (typeof map !== 'undefined' && map) {
                    console.log('지도 객체가 지연 로드되어 마커 업데이트를 다시 시도합니다.');
                    updateMapMarkers(places, trip);
                }
            }, 3000);
            
            return false;
        }
        
        // 지도 로드 확인 및 디버깅
        console.log(`지도 상태: ${map ? '로드됨' : '로드되지 않음'}`);
        console.log(`카카오맵 상태: ${typeof kakao !== 'undefined' && typeof kakao.maps !== 'undefined' ? '로드됨' : '로드되지 않음'}`);
        
        // 기존 마커 제거
        removeAllMarkers();
        
        // 장소 데이터 검증
        if (!places || !Array.isArray(places) || places.length === 0) {
            console.warn('표시할 장소 데이터가 없습니다.');
            return false;
        }
        
        console.log(`총 ${places.length}개 장소 마커 생성 시작`);
        
        // 마커 클러스터러 확인 및 초기화
        if (!markerClusterer) {
            console.log('마커 클러스터러 초기화 시작');
            const clustererInitResult = initMarkerClusterer();
            
            if (!markerClusterer) {
                console.warn('마커 클러스터러가 초기화되지 않았습니다. 일반 마커로 표시합니다.');
            }
        }
        
        // 대량의 마커 처리를 위한 배치 처리 최적화
        // 일단 일부 마커만 먼저 생성하고 나머지는 비동기로 처리
        const INITIAL_BATCH_SIZE = 100;
        const initialMarkers = [];
        
        // 첫 번째 배치 마커 생성
        const initialPlaces = places.slice(0, Math.min(INITIAL_BATCH_SIZE, places.length));
        for (const place of initialPlaces) {
            const marker = addMarker(place, trip);
            if (marker) {
                initialMarkers.push(marker);
            }
        }
        
        // 첫 번째 배치 마커를 클러스터러에 추가
        if (initialMarkers.length > 0) {
            if (markerClusterer && markerClusterer.addMarkers) {
                markerClusterer.addMarkers(initialMarkers);
                console.log(`마커 클러스터러에 ${initialMarkers.length}개 마커 추가 성공`);
            } else {
                // 클러스터러가 없으면 직접 지도에 표시
                initialMarkers.forEach(marker => {
                    marker.setMap(map);
                });
                console.log(`${initialMarkers.length}개 마커를 지도에 직접 추가 완료`);
            }
        }
        
        console.log(`초기 마커 생성 (${initialMarkers.length}/${places.length})`);
        
        // 남은 마커 비동기 처리
        if (places.length > INITIAL_BATCH_SIZE) {
            const remainingPlaces = places.slice(INITIAL_BATCH_SIZE);
            console.log(`남은 마커 (${remainingPlaces.length}개) 비동기 생성`);
            
            setTimeout(() => {
                const remainingMarkers = [];
                
                for (const place of remainingPlaces) {
                    const marker = addMarker(place, trip);
                    if (marker) {
                        remainingMarkers.push(marker);
                    }
                }
                
                // 남은 마커들을 클러스터러에 추가
                if (remainingMarkers.length > 0) {
                    if (markerClusterer && markerClusterer.addMarkers) {
                        markerClusterer.addMarkers(remainingMarkers);
                        console.log(`추가 마커 ${remainingMarkers.length}개 클러스터러에 추가 완료`);
                    } else {
                        // 클러스터러가 없으면 직접 지도에 표시
                        remainingMarkers.forEach(marker => {
                            marker.setMap(map);
                        });
                        console.log(`추가 ${remainingMarkers.length}개 마커를 지도에 직접 추가 완료`);
                    }
                }
                
                console.log('모든 마커 생성 완료');
                
                // 지도 범위 자동 조정 (모든 마커가 보이도록)
                setMapBounds(places);
                
            }, 100); // 비동기 처리를 위한 지연 시간
        } else {
            // 초기 배치만으로 모든 마커가 처리된 경우
            console.log('모든 마커 생성 완료');
            
            // 지도 범위 자동 조정 (모든 마커가 보이도록)
            setMapBounds(places);
        }
        
        console.log(`마커 업데이트 초기화 완료: ${initialMarkers.length}`);
        return true;
    } catch (error) {
        console.error('마커 업데이트 중 오류 발생:', error);
        return false;
    }
}

/**
 * 문서 로드 완료 후 실행할 이벤트 등록
 */
document.addEventListener('DOMContentLoaded', () => {
    // 커스텀 마커 클릭 이벤트 처리 (이벤트 위임)
    document.addEventListener('click', function(e) {
        // 커스텀 마커 버튼 클릭 확인
        if (e.target.closest('.custom-marker')) {
            const markerElement = e.target.closest('.custom-marker');
            const placeId = markerElement.getAttribute('data-place-id');
            
            if (placeId) {
                const place = getPlaceById(placeId);
                if (place) {
                    // 이전 선택 마커 처리
                    if (selectedMarker) {
                        selectedMarker.setZIndex(1);
                    }
                    
                    // 현재 마커 찾기
                    const currentMarker = markers.find(marker => 
                        marker.place && marker.place.id === placeId
                    );
                    
                    if (currentMarker) {
                        selectedMarker = currentMarker;
                        selectedMarker.setZIndex(10);
                    }
                    
                    // 마커 요소의 위치 계산
                    const markerRect = markerElement.getBoundingClientRect();
                    const mapContainer = document.getElementById('map');
                    const mapRect = mapContainer.getBoundingClientRect();
                    
                    // 마커 중심 위치 계산
                    const markerPosition = {
                        x: markerRect.left + markerRect.width / 2 - mapRect.left,
                        y: markerRect.top - mapRect.top
                    };
                    
                    // 장소 정보 패널 표시 (마커 위치 전달)
                    showPlaceInfoPanel(place, markerPosition);
                }
            }
        }
    });
    
    // 지도 이동 및 줌 변경 이벤트에 대한 팝업 위치 업데이트 리스너 추가
    if (map) {
        kakao.maps.event.addListener(map, 'idle', function() {
            // 지도 이동이나 줌 변경 후 유휴 상태가 되면 위치 업데이트
            updateInfoPanelPosition();
        });
    }
});

/**
 * 마커 생성 함수
 * @param {Object} place - 장소 데이터
 * @param {Object|null} trip - 여행 데이터 (선택적)
 * @param {number|null} order - 여행에서의 순서 (선택적)
 * @returns {kakao.maps.Marker|null} - 생성된 마커 또는 null
 */
function addMarker(place, trip = null, order = null) {
    // 카카오맵 API가 로드되었는지 확인
    if (typeof kakao === 'undefined' || !kakao.maps) {
        console.warn('카카오맵 API가 로드되지 않아 마커를 생성할 수 없습니다.');
        return null;
    }
    
    // 장소 위치 확인
    if (!place || !place.location || !place.location.lat || !place.location.lng) {
        console.warn(`위치 정보가 없는 장소: ${place ? place.name : 'undefined'}`);
        return null;
    }
    
    try {
        // 마커 위치 설정
        const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
        
        // 마커 색상/아이콘 결정
        let markerColor = 'blue'; // 기본 색상
        let iconName = 'map-marker'; // 기본 아이콘
        
        // 라벨에 따른 아이콘 지정
        if (place.labels && place.labels.length > 0) {
            const label = place.labels[0]; // 첫 번째 라벨 사용
            
            // 라벨 정보 조회
            const labelInfo = getLabelInfo(label);
            if (labelInfo) {
                // 라벨에 아이콘이 지정되어 있으면 사용
                if (labelInfo.icon) {
                    iconName = labelInfo.icon;
                }
                
                // 라벨에 색상이 지정되어 있으면 사용
                if (labelInfo.color) {
                    markerColor = labelInfo.color;
                }
            }
        }
        
        // 여행 모드일 경우 순서에 따른 색상 지정
        if (trip && order !== null) {
            // 순서에 따른 색상 변경
            markerColor = getOrderColor(order);
        }
        
        // SVG 마커 생성
        const markerSvg = createMarkerSvg(markerColor, iconName, order);
        const base64Svg = btoa(markerSvg);
        const markerImageUrl = `data:image/svg+xml;base64,${base64Svg}`;
        
        // 마커 이미지 크기 및 옵션 설정
        const imageSize = new kakao.maps.Size(32, 40);
        const imageOption = { offset: new kakao.maps.Point(16, 40) };
        
        // 마커 이미지 생성
        const markerImage = new kakao.maps.MarkerImage(markerImageUrl, imageSize, imageOption);
        
        // 마커 생성
        const marker = new kakao.maps.Marker({
            position: position,
            image: markerImage,
            title: place.name,
            clickable: true
        });
        
        // 지도에 마커 표시
        if (map) {
            marker.setMap(map);
        }
        
        // 마커 클릭 이벤트 추가
        kakao.maps.event.addListener(marker, 'click', function() {
            if (typeof showPlaceInfoPanel === 'function') {
                showPlaceInfoPanel(place);
            }
        });
        
        // 마커 데이터 저장 (나중에 참조를 위해)
        marker.placeData = place;
        
        // 마커 배열에 추가
        markers.push(marker);
        
        return marker;
    } catch (error) {
        console.error(`마커 생성 오류 (${place ? place.name : 'undefined'}):`, error);
        return null;
    }
}

/**
 * SVG 마커 생성 함수
 * @param {string} color - 마커 색상
 * @param {string} iconName - 아이콘 이름
 * @param {number|null} order - 여행에서의 순서 (선택적)
 * @returns {string} - SVG 문자열
 */
function createMarkerSvg(color, iconName, order = null) {
    // 색상 코드로 변환
    const colorCode = getColorCode(color);
    
    // 아이콘 이름을 Iconify 형식으로 변환
    const iconifyName = iconName.includes(':') ? iconName : `mdi:${iconName}`;
    
    // SVG 기본 구조
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 40">
        <path fill="${colorCode}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />`;
    
    // 아이콘 추가
    svg += `<foreignObject width="24" height="24" x="0" y="0">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
            <iconify-icon icon="${iconifyName}" style="color:white;font-size:14px;margin-top:-2px;"></iconify-icon>
        </div>
    </foreignObject>`;
    
    // 순서 표시 (있는 경우)
    if (order !== null) {
        svg += `<text x="12" y="28" text-anchor="middle" fill="white" font-size="10" font-weight="bold">${order}</text>`;
    }
    
    // SVG 닫기
    svg += `</svg>`;
    
    return svg;
}

/**
 * 모든 마커 제거
 */
function removeAllMarkers() {
    try {
        for (let i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
        
        // 마커 클러스터러가 있으면 초기화
        if (markerClusterer) {
            try {
                markerClusterer.clear();
            } catch (error) {
                console.warn('마커 클러스터러 초기화 중 오류 발생:', error);
            }
        }
        
        console.log('모든 마커 제거 완료');
        return true;
    } catch (error) {
        console.error('마커 제거 중 오류 발생:', error);
        return false;
    }
}

/**
 * 지도 영역 설정 함수
 * 전달된 장소들이 모두 보이도록 지도 영역을 조정합니다.
 * @param {Array|null} places - 장소 데이터 배열 (선택적)
 * @param {Array|null} markersToFit - 사용할 마커 배열 (선택적)
 */
function setMapBounds(places = null, markersToFit = null) {
    try {
        if (!map) return;
        
        // 카카오맵 API가 로드되었는지 확인
        if (typeof kakao === 'undefined' || !kakao.maps) {
            console.warn('카카오맵 API가 로드되지 않아 지도 영역을 설정할 수 없습니다.');
            return;
        }
        
        // places가 배열인지 확인
        if (places && !Array.isArray(places)) {
            console.warn('places는 배열이어야 합니다.');
            places = null;
        }
        
        // markersToFit이 배열인지 확인
        if (markersToFit && !Array.isArray(markersToFit)) {
            console.warn('markersToFit은 배열이어야 합니다.');
            markersToFit = null;
        }
        
        // 사용할 마커가 없고 장소도 없으면 종료
        if ((!markersToFit || markersToFit.length === 0) && (!places || places.length === 0)) {
            console.log('지도 영역 설정을 위한 데이터가 없습니다.');
            return;
        }
        
        // 바운드 객체 생성
        const bounds = new kakao.maps.LatLngBounds();
        let hasValidBounds = false;
        
        // 마커를 기준으로 바운드 설정
        if (markersToFit && markersToFit.length > 0) {
            markersToFit.forEach(marker => {
                if (marker && marker.getPosition) {
                    bounds.extend(marker.getPosition());
                    hasValidBounds = true;
                }
            });
        }
        // 장소 데이터를 기준으로 바운드 설정
        else if (places && places.length > 0) {
            places.forEach(place => {
                if (place && place.location && place.location.lat && place.location.lng) {
                    bounds.extend(new kakao.maps.LatLng(place.location.lat, place.location.lng));
                    hasValidBounds = true;
                }
            });
        }
        
        // 바운드가 유효한지 확인
        if (hasValidBounds && !bounds.isEmpty()) {
            // 지도 영역 설정 (애니메이션 적용)
            map.setBounds(bounds, 100);
        } else {
            console.log('유효한 좌표가 없어 지도 영역을 설정할 수 없습니다.');
        }
    } catch (error) {
        console.error('지도 영역 설정 오류:', error);
    }
}

/**
 * 특정 위치로 지도 이동 함수
 * @param {string} placeId - 이동할 장소 ID
 * @param {boolean} zoomIn - 확대 여부 (선택적)
 */
function moveToPlace(placeId, zoomIn = true) {
    try {
        if (!map || !placeId) return;
        
        // 카카오맵 API가 로드되었는지 확인
        if (typeof kakao === 'undefined' || !kakao.maps) {
            console.warn('카카오맵 API가 로드되지 않아 지도 이동을 수행할 수 없습니다.');
            return;
        }
        
        // 마커 배열에서 해당 장소의 마커 찾기
        const marker = markers.find(m => m && m.placeData && m.placeData.id === placeId);
        
        if (marker && marker.getPosition) {
            // 해당 위치로 지도 이동
            map.panTo(marker.getPosition());
            
            // 필요시 확대
            if (zoomIn && map.getLevel() > 3) {
                map.setLevel(3, { animate: true });
            }
            return true;
        } 
        
        // 장소 데이터에서 직접 좌표 찾기 (마커가 없는 경우)
        if (dataStore && dataStore.places) {
            const place = dataStore.places.find(p => p.id === placeId);
            if (place && place.location && place.location.lat && place.location.lng) {
                const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
                map.panTo(position);
                
                // 필요시 확대
                if (zoomIn && map.getLevel() > 3) {
                    map.setLevel(3, { animate: true });
                }
                return true;
            }
        }
        
        console.warn(`장소를 찾을 수 없음: ${placeId}`);
        return false;
    } catch (error) {
        console.error('지도 이동 중 오류:', error);
        return false;
    }
}

/**
 * 여행 일정 경로 표시 함수
 * 특정 일차의 여행 경로를 지도에 표시합니다.
 * @param {Object} trip - 여행 일정 객체
 * @param {number} dayIndex - 일차 인덱스
 */
function showTripPath(trip, dayIndex) {
    // 선택된 마커가 있으면 원래 스타일로 복원
    if (selectedMarker) {
        selectedMarker.setZIndex(1);
        selectedMarker = null;
    }
    
    // 장소 정보 패널 닫기
    hidePlaceInfoPanel();
    
    // 기존 마커 제거
    removeAllMarkers();
    
    // 경로 표시를 위한 좌표 배열
    const linePath = [];
    
    // 해당 일차 정보 가져오기
    const day = trip.days[dayIndex];
    if (!day) {
        console.error('존재하지 않는 일차:', dayIndex);
        return;
    }
    
    // 해당 일차의 장소 정보 가져오기
    const dayPlaces = day.places;
    if (!dayPlaces || dayPlaces.length === 0) {
        console.log('해당 일차에 방문할 장소가 없습니다.');
        return;
    }
    
    // 방문 순서대로 정렬
    const sortedPlaces = [...dayPlaces].sort((a, b) => a.order - b.order);
    
    // 장소 순서대로 좌표 추가 및 마커 생성
    sortedPlaces.forEach(dayPlace => {
        // trip.places 배열에서 직접 장소 정보 가져오기
        const place = trip.places.find(p => p.id === dayPlace.placeId);
        if (place) {
            // 경로에 좌표 추가
            linePath.push(new kakao.maps.LatLng(place.location.lat, place.location.lng));
            
            // 숫자 마커 생성 (커스텀 오버레이)
            const overlay = createMarkerImage(place, trip, dayPlace.order);
            overlay.setMap(map);
            
            // 마커에 장소 데이터 저장
            overlay.place = place;
            
            // 마커 배열에 추가
            markers.push(overlay);
        }
    });
    
    // 경로 선 생성
    const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#3490dc',
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
    });
    
    // 경로 선을 지도에 표시
    polyline.setMap(map);
    
    // 현재 경로 선 저장 (나중에 제거하기 위해)
    window.currentPolyline = polyline;
    
    // 모든 장소가 보이도록 지도 범위 조정
    const places = sortedPlaces
        .map(dayPlace => trip.places.find(p => p.id === dayPlace.placeId))
        .filter(Boolean);
    setMapBounds(places);
}

/**
 * 장소 정보 표시
 * @param {Object} place 장소 데이터
 */
function showPlaceInfo(place) {
    try {
        if (!place) return false;
        
        const placeInfoPanel = document.getElementById('place-info-panel');
        const placeTitle = document.getElementById('place-title');
        const placeAddress = document.getElementById('place-address');
        const placeLabels = document.getElementById('place-labels');
        const placeDescription = document.getElementById('place-description');
        const naverMapLink = document.getElementById('naver-map-link');
        const kakaoMapLink = document.getElementById('kakao-map-link');
        
        // 패널 내용 업데이트
        placeTitle.textContent = place.name || '이름 없음';
        placeAddress.textContent = place.address || '주소 정보 없음';
        placeDescription.textContent = place.description || '설명 없음';
        
        // 라벨 표시
        placeLabels.innerHTML = '';
        if (place.labels && place.labels.length > 0) {
            place.labels.forEach(label => {
                const labelSpan = document.createElement('span');
                labelSpan.className = 'place-label';
                labelSpan.textContent = label;
                
                // 라벨 정보가 있으면 색상 적용
                const labelInfo = getLabelInfo(label);
                if (labelInfo && labelInfo.color) {
                    labelSpan.style.backgroundColor = labelInfo.color;
                }
                
                placeLabels.appendChild(labelSpan);
            });
        } else {
            placeLabels.innerHTML = '<span class="no-labels">라벨 없음</span>';
        }
        
        // 외부 지도 링크 업데이트
        if (place.location) {
            const lat = place.location.lat;
            const lng = place.location.lng;
            const placeName = encodeURIComponent(place.name || '');
            
            naverMapLink.href = `https://map.naver.com/v5/search/${placeName}?c=${lng},${lat},15,0,0,0,dh`;
            kakaoMapLink.href = `https://map.kakao.com/link/map/${placeName},${lat},${lng}`;
        } else {
            naverMapLink.href = '#';
            kakaoMapLink.href = '#';
        }
        
        // 패널 표시
        placeInfoPanel.classList.add('active');
        
        return true;
    } catch (error) {
        console.error('장소 정보 표시 중 오류 발생:', error);
        return false;
    }
}

/**
 * 장소 정보 패널 닫기
 */
function closePlaceInfo() {
    try {
        const placeInfoPanel = document.getElementById('place-info-panel');
        placeInfoPanel.classList.remove('active');
        return true;
    } catch (error) {
        console.error('장소 정보 패널 닫기 중 오류 발생:', error);
        return false;
    }
}

/**
 * 라벨 정보 가져오기
 * @param {String} label 라벨 이름
 * @returns {Object} 라벨 정보 객체
 */
function getLabelInfo(label) {
    try {
        if (!window.dataStore || !window.dataStore.labelInfo) return null;
        return window.dataStore.labelInfo[label] || null;
    } catch (error) {
        console.error('라벨 정보 조회 중 오류 발생:', error);
        return null;
    }
}

// 맵 모듈 기능 확장
window.mapModule.init = initMap;
window.mapModule.updateMapMarkers = updateMapMarkers;
window.mapModule.getMap = function() { return map; };
window.mapModule.panTo = function(lat, lng) {
    if (map) {
        map.panTo(new kakao.maps.LatLng(lat, lng));
    }
};
window.mapModule.setLevel = function(level) {
    if (map) {
        map.setLevel(level);
    }
};
window.mapModule.showPlaceInfo = function(place) {
    if (!place) return;
    
    try {
        // 기존 인포윈도우 닫기
        if (currentInfoWindow) {
            currentInfoWindow.close();
        }
        
        // 위치 확인
        if (!place.location || !place.location.lat || !place.location.lng) {
            console.warn('장소에 위치 정보가 없습니다:', place.name);
            return;
        }
        
        // 인포윈도우 내용 생성
        let content = `
            <div class="info-window">
                <h3>${place.name || '이름 없음'}</h3>
                ${place.address ? `<p>${place.address}</p>` : ''}
                ${place.description ? `<p>${place.description}</p>` : ''}
            </div>
        `;
        
        // 인포윈도우 생성 및 표시
        const infoWindow = new kakao.maps.InfoWindow({
            content: content,
            position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
            removable: true
        });
        
        infoWindow.open(map);
        currentInfoWindow = infoWindow;
        
        // 해당 마커 강조 표시
        markers.forEach(marker => {
            if (marker.placeId === place.id) {
                // 마커 스타일 변경 또는 애니메이션 적용
                // 예: 마커 크기 확대 또는 색상 변경
            }
        });
        
    } catch (error) {
        console.error('장소 정보 표시 중 오류 발생:', error);
    }
};
window.mapModule.closePlaceInfo = function() {
    if (currentInfoWindow) {
        currentInfoWindow.close();
        currentInfoWindow = null;
    }
};
window.mapModule.forceMapRelayout = forceMapRelayout;
window.mapModule.removeAllMarkers = removeAllMarkers;
window.mapModule.moveToPlace = moveToPlace;
window.mapModule.setMapBounds = setMapBounds;
window.mapModule.showTripPath = showTripPath; 