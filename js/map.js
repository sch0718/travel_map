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
        // 필요한 경우 추가 동작 구현
    });
    
    // 지도 줌 변경 이벤트
    kakao.maps.event.addListener(map, 'zoom_changed', function() {
        console.log('지도 줌 레벨 변경:', map.getLevel());
        // 필요한 경우 추가 동작 구현
    });
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
 * 마커 추가 함수
 * 단일 장소에 대한 마커를 생성하고 지도에 추가합니다.
 * @param {Object} place - 장소 데이터
 * @param {Object} trip - 여행 일정 객체 (선택적)
 */
function addMarker(place, trip = null) {
    // 장소 위치 좌표
    const position = new kakao.maps.LatLng(place.location.lat, place.location.lng);
    
    // 마커 이미지 설정
    const markerImage = createMarkerImage(place, trip);
    
    // 마커 생성
    const marker = new kakao.maps.Marker({
        position: position,
        image: markerImage,
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
            // 원래 마커 스타일로 복원하는 코드 (필요시 구현)
        }
        
        // 현재 마커를 선택된 마커로 설정
        selectedMarker = marker;
        selectedMarker.setZIndex(10);
        
        // 장소 정보 패널 표시
        showPlaceInfoPanel(place);
    });
    
    // 마커 배열에 추가
    markers.push(marker);
    
    return marker;
}

/**
 * 마커 이미지 생성 함수
 * 장소 데이터를 기반으로 적절한 마커 이미지를 생성합니다.
 * @param {Object} place - 장소 데이터
 * @param {Object} trip - 여행 일정 객체 (선택적)
 * @returns {kakao.maps.MarkerImage} - 마커 이미지 객체
 */
function createMarkerImage(place, trip = null, order = null) {
    // 기본 마커 이미지 URL (카카오 맵 기본 마커 사용)
    let imageUrl = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
    let imageSize = new kakao.maps.Size(24, 35);
    
    // 여행 일정 마커인 경우 숫자 표시
    if (order !== null) {
        // 숫자 마커를 생성하기 위한 HTML Content 사용
        const content = `<div style="
            background: #FF8859; 
            color: white; 
            padding: 5px 10px; 
            border-radius: 50%; 
            font-weight: bold; 
            text-align: center; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            border: 2px solid white;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        ">${order}</div>`;
        
        // 커스텀 오버레이 사용 (MarkerImage 대신)
        return new kakao.maps.CustomOverlay({
            content: content,
            position: new kakao.maps.LatLng(place.location.lat, place.location.lng),
            zIndex: 5
        });
    }
    
    // 카테고리별 마커 이미지 설정 (MVP에서는 단순화)
    if (place.labels.includes('숙소')) {
        imageUrl = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
    } else if (place.labels.includes('맛집') || place.labels.includes('음식')) {
        imageUrl = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
    } else if (place.labels.includes('관광지')) {
        imageUrl = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
    }
    
    // 마커 이미지 생성
    const markerImage = new kakao.maps.MarkerImage(imageUrl, imageSize);
    
    return markerImage;
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
        // 마커 클릭 이벤트 트리거 (장소 정보 패널 표시)
        kakao.maps.event.trigger(marker, 'click');
    }
}

/**
 * 여행 경로 표시 함수
 * 여행 일정의 장소들을 선으로 연결하여 표시합니다.
 * @param {Object} trip - 여행 일정 객체
 * @param {number} dayIndex - 일차 인덱스
 */
function showTripPath(trip, dayIndex) {
    // 기존 마커와 선 제거
    removeAllMarkers();
    
    // 기존 경로 선 제거
    if (window.currentPolyline) {
        window.currentPolyline.setMap(null);
    }
    
    // 여행 데이터가 없거나 해당 일차가 없으면 종료
    if (!trip || !trip.days[dayIndex]) {
        console.error('유효하지 않은 여행 일정 또는 일차');
        return;
    }
    
    // 해당 일차의 장소 데이터 (순서대로 정렬)
    const dayPlaces = [...trip.days[dayIndex].places].sort((a, b) => a.order - b.order);
    
    // 장소가 2개 미만이면 경로를 그릴 수 없음
    if (dayPlaces.length < 2) {
        console.log('경로를 그릴 장소가 충분하지 않습니다.');
        
        // 단일 장소라도 마커는 표시
        if (dayPlaces.length === 1) {
            const place = getPlaceById(dayPlaces[0].placeId);
            if (place) {
                // 숫자 마커 생성
                const overlay = createMarkerImage(place, trip, dayPlaces[0].order);
                overlay.setMap(map);
                markers.push(overlay);
            }
        }
        
        return;
    }
    
    // 경로를 위한 좌표 배열 생성
    const linePath = [];
    
    // 장소 순서대로 좌표 추가 및 마커 생성
    dayPlaces.forEach(dayPlace => {
        const place = getPlaceById(dayPlace.placeId);
        if (place) {
            // 경로에 좌표 추가
            linePath.push(new kakao.maps.LatLng(place.location.lat, place.location.lng));
            
            // 숫자 마커 생성
            const overlay = createMarkerImage(place, trip, dayPlace.order);
            overlay.setMap(map);
            
            // 마커 클릭 이벤트 (기존 마커 대신 오버레이에 적용)
            kakao.maps.event.addListener(overlay, 'click', function() {
                showPlaceInfoPanel(place);
            });
            
            // 마커 배열에 추가
            markers.push(overlay);
        }
    });
    
    // 경로 선 생성
    const polyline = new kakao.maps.Polyline({
        path: linePath,
        strokeWeight: 3,
        strokeColor: '#db4040',
        strokeOpacity: 0.7,
        strokeStyle: 'solid'
    });
    
    // 경로 선을 지도에 표시
    polyline.setMap(map);
    
    // 현재 경로 선 저장 (나중에 제거하기 위해)
    window.currentPolyline = polyline;
    
    // 모든 장소가 보이도록 지도 범위 조정
    const places = dayPlaces.map(dayPlace => getPlaceById(dayPlace.placeId)).filter(Boolean);
    setMapBounds(places);
}

// 지도 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initMap); 