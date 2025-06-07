/**
 * 지도 관리 모듈
 * 카카오 맵 API를 사용하여 지도를 초기화하고 마커를 표시하는 기능을 제공합니다.
 */

// 지도 관련 변수 (전역 스코프로 변경)
var map; // 카카오 맵 객체
var markers = []; // 지도에 표시된 마커 배열
var selectedMarker = null; // 현재 선택된 마커

/**
 * 지도 초기화 함수
 * 카카오 맵을 생성하고 기본 설정을 적용합니다.
 */
function initMap() {
    try {
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
        setMapBounds(markers.map(marker => marker.place));
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
 * 마커 업데이트 함수
 * 주어진 장소 데이터를 기반으로 지도에 마커를 표시합니다.
 * @param {Array} places - 장소 데이터 배열
 * @param {Object} trip - 여행 일정 객체 (선택적)
 */
function updateMapMarkers(places, trip = null) {
    // 기존 마커 제거
    removeAllMarkers();
    
    // 마커가 없으면 종료
    if (!places || places.length === 0) {
        console.log('표시할 장소가 없습니다.');
        return;
    }
    
    // 마커 생성 및 표시
    places.forEach(place => {
        addMarker(place, trip);
    });
    
    // 모든 마커가 보이도록 지도 범위 조정
    setMapBounds(places);
    
    console.log('마커 업데이트 완료:', places.length);
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
 * 마커 추가 함수
 * 단일 장소에 대한 마커를 생성하고 지도에 추가합니다.
 * @param {Object} place - 장소 데이터
 * @param {Object} trip - 여행 일정 객체 (선택적)
 */
function addMarker(place, trip = null) {
    // 장소 위치 좌표
    const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
    
    // 마커 이미지 또는 커스텀 오버레이 생성
    const markerObj = createMarkerImage(place, trip);
    
    // markerObj가 커스텀 오버레이인지 확인
    if (markerObj instanceof kakao.maps.CustomOverlay) {
        // 커스텀 오버레이 경우
        markerObj.setMap(map);
        
        // 마커에 장소 데이터 저장
        markerObj.place = place;
        
        // 마커 객체를 markers 배열에 추가
        markers.push(markerObj);
        
        return markerObj;
    } else {
        // 기존 마커 이미지 경우 (kakao.maps.MarkerImage)
        const marker = new kakao.maps.Marker({
            position: position,
            image: markerObj,
            title: place.title,
            clickable: true
        });
        
        // 마커에 장소 데이터 저장
        marker.place = place;
        
        // 마커를 지도에 표시
        marker.setMap(map);
        
        // 마커 클릭 이벤트 설정
        kakao.maps.event.addListener(marker, 'click', function() {
            // 선택된 마커가 있으면 원래 스타일로 복원
            if (selectedMarker) {
                selectedMarker.setZIndex(1);
            }
            
            // 현재 마커를 선택된 마커로 설정
            selectedMarker = marker;
            selectedMarker.setZIndex(10);
            
            // 마커의 화면상 위치 계산
            const projection = map.getProjection();
            const markerPosition = projection.containerPointFromCoords(marker.getPosition());
            
            // 장소 정보 패널 표시 (마커 위치 전달)
            showPlaceInfoPanel(place, markerPosition);
        });
        
        // 마커 배열에 추가
        markers.push(marker);
        
        return marker;
    }
}

/**
 * 마커 이미지 생성 함수
 * 장소 데이터를 기반으로 적절한 마커 이미지를 생성합니다.
 * @param {Object} place - 장소 데이터
 * @param {Object} trip - 여행 일정 객체 (선택적)
 * @param {number} order - 마커에 표시할 순서 번호 (선택적)
 * @returns {kakao.maps.MarkerImage|kakao.maps.CustomOverlay} - 마커 이미지 객체 또는 커스텀 오버레이
 */
function createMarkerImage(place, trip = null, order = null) {
    // 테마 색상 가져오기 (여행 모드가 아닌 경우에만)
    let markerColor = 'var(--primary-color)'; // 기본 색상
    
    if (!trip && dataStore.currentTheme) {
        markerColor = getThemeColor(dataStore.currentTheme.id);
    } else if (trip) {
        // 여행 모드일 경우 여행 색상 사용
        markerColor = 'var(--active-day-color)'; // 여행 모드 기본 색상
    }
    
    // 여행 일정 마커인 경우 숫자 표시
    if (order !== null) {
        // 숫자 마커를 생성하기 위한 HTML Content 사용
        const content = `<button class="custom-marker" data-place-id="${place.id}" style="
            background: ${markerColor}; 
            color: white; 
            border-radius: 50%; 
            font-weight: bold; 
            text-align: center; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            border: 2px solid white;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            cursor: pointer;
            position: absolute;
            transform: translate(-50%, -50%);
            z-index: 5;
        ">${order}</button>`;
        
        // 커스텀 오버레이 사용 (MarkerImage 대신)
        return new kakao.maps.CustomOverlay({
            content: content,
            position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
            zIndex: 5
        });
    }
    
    // 테마 기반 마커 생성 (커스텀 오버레이로 구현)
    // 장소 유형에 따라 아이콘 결정 - getPlaceIcon 함수 사용
    let icon = window.getPlaceIcon ? getPlaceIcon(place) : '📍';
    
    // 마커를 HTML로 생성 - 버튼 요소로 만들어 클릭 이벤트 처리 쉽게
    const content = `<button class="custom-marker" data-place-id="${place.id}" style="
        background: ${markerColor};
        width: 36px; 
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg) translate(-50%, -100%);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        border: 2px solid white;
        cursor: pointer;
        position: absolute;
        z-index: 3;
    ">
        <span style="
            transform: rotate(45deg);
            font-size: 16px;
        ">${icon}</span>
    </button>`;
    
    // 커스텀 오버레이 생성
    return new kakao.maps.CustomOverlay({
        content: content,
        position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
        zIndex: 3
    });
}

/**
 * 모든 마커 제거 함수
 * 지도에 표시된 모든 마커를 제거합니다.
 */
function removeAllMarkers() {
    // 모든 마커 제거
    markers.forEach(marker => {
        marker.setMap(null);
    });
    
    // 마커 배열 초기화
    markers = [];
    selectedMarker = null;
    
    // 경로 선 제거
    if (window.currentPolyline) {
        window.currentPolyline.setMap(null);
        window.currentPolyline = null;
    }
}

/**
 * 지도 범위 설정 함수
 * 모든 마커가 보이도록 지도 범위를 조정합니다.
 * @param {Array} places - 장소 데이터 배열
 */
function setMapBounds(places) {
    // 장소가 없으면 종료
    if (!places || places.length === 0) {
        return;
    }
    
    // LatLngBounds 객체 생성
    const bounds = new kakao.maps.LatLngBounds();
    
    // 모든 장소의 좌표를 bounds에 추가
    places.forEach(place => {
        bounds.extend(new kakao.maps.LatLng(place.location.lat, place.location.lng));
    });
    
    // 지도 범위 설정
    map.setBounds(bounds);
}

/**
 * 특정 장소로 지도 이동 함수
 * @param {string} placeId - 장소 ID
 */
function moveToPlace(placeId) {
    // 장소 ID로 장소 객체 찾기
    const place = getPlaceById(placeId);
    if (!place) {
        console.error('존재하지 않는 장소:', placeId);
        return;
    }
    
    // 지도 중심 이동
    map.setCenter(new kakao.maps.LatLng(place.location.lat, place.location.lng));
    
    // 줌 레벨 조정 (더 가깝게)
    map.setLevel(3);
    
    // 해당 마커 찾기
    const marker = markers.find(m => m.place.id === place.id);
    if (marker) {
        // 이전 선택 마커 처리
        if (selectedMarker) {
            selectedMarker.setZIndex(1);
        }
        
        // 현재 마커를 선택된 마커로 설정
        selectedMarker = marker;
        selectedMarker.setZIndex(10);
        
        // 마커의 화면상 위치 계산
        const projection = map.getProjection();
        const markerPosition = projection.containerPointFromCoords(
            marker.getPosition ? marker.getPosition() : 
            new kakao.maps.LatLng(place.location.lat, place.location.lng)
        );
        
        // 장소 정보 패널 표시 (마커 위치 전달)
        showPlaceInfoPanel(place, markerPosition);
    } else {
        // 마커를 찾을 수 없는 경우 패널만 표시
        showPlaceInfoPanel(place);
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

// 지도 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initMap); 