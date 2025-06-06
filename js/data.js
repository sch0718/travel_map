/**
 * 데이터 관리 모듈
 * 장소, 테마, 여행 일정 데이터를 로드하고 처리하는 기능을 제공합니다.
 */

// 데이터 저장소
const dataStore = {
    places: [],
    themes: [],
    trips: [],
    currentTheme: null,
    currentTrip: null,
    filteredPlaces: []
};

/**
 * 데이터 초기화 함수
 * 모든 필요한 데이터를 로드하고 초기 설정을 수행합니다.
 */
async function initData() {
    try {
        // 로딩 상태 표시
        showLoading(true);
        
        // 장소, 테마, 여행 데이터 로드
        await Promise.all([
            loadPlaces(),
            loadThemes(),
            loadTrips()
        ]);
        
        console.log('데이터 로드 완료:', {
            places: dataStore.places.length,
            themes: dataStore.themes.length,
            trips: dataStore.trips.length
        });
        
        // 테마 선택 드롭다운 초기화
        initThemeSelector();
        
        // 기본 테마 설정 (첫 번째 테마)
        if (dataStore.themes.length > 0) {
            setCurrentTheme(dataStore.themes[0].id);
        }
        
        // 로딩 상태 해제
        showLoading(false);
    } catch (error) {
        console.error('데이터 초기화 오류:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

/**
 * 장소 데이터 로드
 */
async function loadPlaces() {
    try {
        const response = await fetch('data/places.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dataStore.places = data.places || [];
    } catch (error) {
        console.error('장소 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 테마 데이터 로드
 */
async function loadThemes() {
    try {
        const response = await fetch('data/themes.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dataStore.themes = data.themes || [];
    } catch (error) {
        console.error('테마 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 여행 일정 데이터 로드
 */
async function loadTrips() {
    try {
        const response = await fetch('data/trips.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dataStore.trips = data.trips || [];
    } catch (error) {
        console.error('여행 일정 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * ID로 장소 찾기
 * @param {string} placeId - 장소 ID
 * @returns {Object|null} - 찾은 장소 객체 또는 null
 */
function getPlaceById(placeId) {
    return dataStore.places.find(place => place.id === placeId) || null;
}

/**
 * ID로 테마 찾기
 * @param {string} themeId - 테마 ID
 * @returns {Object|null} - 찾은 테마 객체 또는 null
 */
function getThemeById(themeId) {
    return dataStore.themes.find(theme => theme.id === themeId) || null;
}

/**
 * ID로 여행 일정 찾기
 * @param {string} tripId - 여행 일정 ID
 * @returns {Object|null} - 찾은 여행 일정 객체 또는 null
 */
function getTripById(tripId) {
    return dataStore.trips.find(trip => trip.id === tripId) || null;
}

/**
 * 현재 테마 설정
 * @param {string} themeId - 테마 ID
 */
function setCurrentTheme(themeId) {
    // 여행 모드였다면 초기화
    dataStore.currentTrip = null;
    
    // 테마 설정
    const theme = getThemeById(themeId);
    if (!theme) {
        console.error('존재하지 않는 테마:', themeId);
        return;
    }
    
    dataStore.currentTheme = theme;
    
    // 테마에 속한 장소들 필터링
    dataStore.filteredPlaces = theme.places.map(placeId => getPlaceById(placeId)).filter(Boolean);
    
    // 테마 정보 업데이트
    updateThemeInfo(theme);
    
    // 카테고리 필터 업데이트
    updateCategoryFilters(theme);
    
    // 장소 목록 업데이트
    updatePlacesList(dataStore.filteredPlaces);
    
    // 지도 마커 업데이트
    updateMapMarkers(dataStore.filteredPlaces);
}

/**
 * 현재 여행 일정 설정
 * @param {string} tripId - 여행 일정 ID
 */
function setCurrentTrip(tripId) {
    // 테마 모드였다면 초기화
    dataStore.currentTheme = null;
    
    // 여행 일정 설정
    const trip = getTripById(tripId);
    if (!trip) {
        console.error('존재하지 않는 여행 일정:', tripId);
        return;
    }
    
    dataStore.currentTrip = trip;
    
    // 여행 일정에 속한 모든 장소 ID 추출
    const placeIds = new Set();
    trip.days.forEach(day => {
        day.places.forEach(place => {
            placeIds.add(place.placeId);
        });
    });
    
    // 여행 일정에 속한 장소들 필터링
    dataStore.filteredPlaces = Array.from(placeIds).map(placeId => getPlaceById(placeId)).filter(Boolean);
    
    // 여행 일정 정보 업데이트
    updateTripInfo(trip);
    
    // 장소 목록 업데이트 (일정별로 정렬)
    updatePlacesList(dataStore.filteredPlaces, trip);
    
    // 지도 마커 업데이트
    updateMapMarkers(dataStore.filteredPlaces, trip);
}

/**
 * 카테고리로 장소 필터링
 * @param {string} category - 카테고리 이름
 * @param {string} value - 카테고리 값
 * @param {boolean} isChecked - 체크 여부
 */
function filterPlacesByCategory(category, value, isChecked) {
    if (!dataStore.currentTheme) return;
    
    // 현재 테마에 속한 모든 장소
    const themePlaces = dataStore.currentTheme.places.map(placeId => getPlaceById(placeId)).filter(Boolean);
    
    // 활성화된 필터 수집
    const activeFilters = collectActiveFilters();
    
    // 필터가 없으면 모든 장소 표시
    if (Object.keys(activeFilters).length === 0) {
        dataStore.filteredPlaces = themePlaces;
    } else {
        // 필터 적용
        dataStore.filteredPlaces = themePlaces.filter(place => {
            // 모든 활성화된 카테고리에 대해 검사
            for (const [category, values] of Object.entries(activeFilters)) {
                // 해당 카테고리의 값이 하나라도 일치하는지 확인
                const hasMatch = values.some(value => 
                    place.labels.includes(value)
                );
                
                // 일치하는 값이 없으면 필터링에서 제외
                if (values.length > 0 && !hasMatch) {
                    return false;
                }
            }
            
            // 모든 필터를 통과한 경우
            return true;
        });
    }
    
    // 장소 목록 업데이트
    updatePlacesList(dataStore.filteredPlaces);
    
    // 지도 마커 업데이트
    updateMapMarkers(dataStore.filteredPlaces);
}

/**
 * 활성화된 필터 수집
 * @returns {Object} - 카테고리별 활성화된 필터 값
 */
function collectActiveFilters() {
    const activeFilters = {};
    const checkboxes = document.querySelectorAll('#category-list input[type="checkbox"]:checked');
    
    checkboxes.forEach(checkbox => {
        const category = checkbox.dataset.category;
        const value = checkbox.value;
        
        if (!activeFilters[category]) {
            activeFilters[category] = [];
        }
        
        activeFilters[category].push(value);
    });
    
    return activeFilters;
}

/**
 * 장소 검색
 * @param {string} query - 검색어
 */
function searchPlaces(query) {
    if (!query || query.trim() === '') {
        // 검색어가 없으면 현재 테마/여행의 모든 장소 표시
        if (dataStore.currentTheme) {
            setCurrentTheme(dataStore.currentTheme.id);
        } else if (dataStore.currentTrip) {
            setCurrentTrip(dataStore.currentTrip.id);
        }
        return;
    }
    
    // 검색어 정규화
    const normalizedQuery = query.trim().toLowerCase();
    
    // 장소 검색 (제목, 설명, 주소, 라벨에서 검색)
    const searchResults = dataStore.places.filter(place => {
        return (
            place.title.toLowerCase().includes(normalizedQuery) ||
            place.description.toLowerCase().includes(normalizedQuery) ||
            place.address.toLowerCase().includes(normalizedQuery) ||
            place.labels.some(label => label.toLowerCase().includes(normalizedQuery))
        );
    });
    
    // 결과를 현재 테마/여행의 장소로 제한 (선택적)
    let filteredResults = searchResults;
    if (dataStore.currentTheme) {
        const themePlaceIds = new Set(dataStore.currentTheme.places);
        filteredResults = searchResults.filter(place => themePlaceIds.has(place.id));
    } else if (dataStore.currentTrip) {
        const tripPlaceIds = new Set();
        dataStore.currentTrip.days.forEach(day => {
            day.places.forEach(place => {
                tripPlaceIds.add(place.placeId);
            });
        });
        filteredResults = searchResults.filter(place => tripPlaceIds.has(place.id));
    }
    
    // 검색 결과 업데이트
    dataStore.filteredPlaces = filteredResults;
    
    // 장소 목록 업데이트
    updatePlacesList(filteredResults);
    
    // 지도 마커 업데이트
    updateMapMarkers(filteredResults);
}

/**
 * 로딩 상태 표시
 * @param {boolean} isLoading - 로딩 중 여부
 */
function showLoading(isLoading) {
    // 로딩 표시 구현 (MVP에서는 생략)
    console.log('로딩 상태:', isLoading);
}

/**
 * 오류 메시지 표시
 * @param {string} message - 오류 메시지
 */
function showError(message) {
    // 오류 메시지 표시 구현 (MVP에서는 콘솔에만 출력)
    console.error('오류:', message);
    alert(message); // 임시로 alert 사용
}

// 데이터 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initData); 