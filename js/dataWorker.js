/**
 * 데이터 처리를 위한 Web Worker
 * 검색 및 필터링 작업을 메인 스레드에서 분리하여 UI 응답성을 향상시킵니다.
 */

// 메시지 이벤트 리스너 설정
self.addEventListener('message', function(e) {
    const { type, data } = e.data;
    
    try {
        switch (type) {
            case 'filter':
                handleFilter(data);
                break;
            case 'search':
                handleSearch(data);
                break;
            default:
                throw new Error(`알 수 없는 작업 유형: ${type}`);
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message || '알 수 없는 오류가 발생했습니다.'
        });
    }
});

/**
 * 필터링 작업 처리 함수
 * @param {Object} data - 필터링 작업 데이터
 */
function handleFilter(data) {
    const { places, activeFilters } = data;
    
    // 필터링된 장소 배열
    let filteredPlaces = places;
    
    // 모든 필터 적용
    if (activeFilters && Object.keys(activeFilters).length > 0) {
        filteredPlaces = places.filter(place => {
            // 모든 필터 조건에 대해 검사
            for (const category in activeFilters) {
                const values = activeFilters[category];
                
                // 필터 값이 없으면 계속 진행
                if (!values || values.length === 0) continue;
                
                // 장소가 라벨 필드를 갖고 있고, 카테고리가 '장소 유형'인 경우
                if (category === '장소 유형' && place.labels && Array.isArray(place.labels)) {
                    // 장소 라벨과 필터 값 간의 교집합이 있는지 확인
                    const intersection = place.labels.filter(label => values.includes(label));
                    
                    // 교집합이 없으면 필터링 제외
                    if (intersection.length === 0) {
                        return false;
                    }
                }
                
                // 다른 카테고리에 대한 필터링 로직 추가 가능
                // ...
            }
            
            // 모든 필터를 통과하면 포함
            return true;
        });
    }
    
    // 결과 전송
    self.postMessage({
        type: 'filterComplete',
        data: filteredPlaces
    });
}

/**
 * 검색 작업 처리 함수
 * @param {Object} data - 검색 작업 데이터
 */
function handleSearch(data) {
    const { places, query } = data;
    
    // 검색어가 없으면 모든 장소 반환
    if (!query || query.trim() === '') {
        self.postMessage({
            type: 'searchComplete',
            data: places
        });
        return;
    }
    
    // 검색어 정규화 (소문자 변환 및 공백 제거)
    const normalizedQuery = query.toLowerCase().trim();
    
    // 검색 결과 필터링
    const searchResults = places.filter(place => {
        // 필터링 전에 장소가 유효한지 확인
        if (!place) return false;
        
        // 제목 검색
        if (place.title && place.title.toLowerCase().includes(normalizedQuery)) {
            return true;
        }
        
        // 설명 검색
        if (place.description && place.description.toLowerCase().includes(normalizedQuery)) {
            return true;
        }
        
        // 주소 검색
        if (place.address && place.address.toLowerCase().includes(normalizedQuery)) {
            return true;
        }
        
        // 라벨 검색
        if (place.labels && Array.isArray(place.labels)) {
            for (const label of place.labels) {
                if (label.toLowerCase().includes(normalizedQuery)) {
                    return true;
                }
            }
        }
        
        // 추가 검색 필드 (커스텀 속성 등)
        if (place.customData) {
            for (const key in place.customData) {
                const value = place.customData[key];
                if (typeof value === 'string' && value.toLowerCase().includes(normalizedQuery)) {
                    return true;
                }
            }
        }
        
        return false;
    });
    
    // 결과 정렬 (관련성 기준)
    const sortedResults = sortSearchResults(searchResults, normalizedQuery);
    
    // 결과 전송
    self.postMessage({
        type: 'searchComplete',
        data: sortedResults
    });
}

/**
 * 검색 결과 정렬 함수
 * 검색어와의 관련성에 따라 결과를 정렬합니다.
 * @param {Array} results - 검색 결과 배열
 * @param {string} query - 정규화된 검색어
 * @returns {Array} - 정렬된 검색 결과
 */
function sortSearchResults(results, query) {
    return results.sort((a, b) => {
        // 제목에 검색어가 포함된 경우 우선순위 높음
        const aTitleMatch = a.title && a.title.toLowerCase().includes(query);
        const bTitleMatch = b.title && b.title.toLowerCase().includes(query);
        
        if (aTitleMatch && !bTitleMatch) return -1;
        if (!aTitleMatch && bTitleMatch) return 1;
        
        // 제목 시작 부분에 검색어가 있으면 더 높은 우선순위
        const aTitleStartMatch = a.title && a.title.toLowerCase().startsWith(query);
        const bTitleStartMatch = b.title && b.title.toLowerCase().startsWith(query);
        
        if (aTitleStartMatch && !bTitleStartMatch) return -1;
        if (!aTitleStartMatch && bTitleStartMatch) return 1;
        
        // 기본적으로 제목 알파벳 순 정렬
        return a.title.localeCompare(b.title);
    });
} 