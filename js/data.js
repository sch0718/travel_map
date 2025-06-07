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
    filteredPlaces: [],
    transportations: [],
    viewMode: 'trip', // 기본 보기 모드: 'theme' 또는 'trip'
    // 라벨 정보 (아이콘, 설명 등) - labels.json에서 로드됨
    labelInfo: {},
    // 기본 테마 색상 팔레트 - 눈에 편하고 예쁘며 널리 사용되는 20가지 색상
    themeColors: [
        // 블루계열
        "#4285F4", // 구글 블루
        "#3F51B5", // 인디고
        "#2196F3", // 라이트 블루
        "#03A9F4", // 시안
        "#89ABE3", // 하늘 블루
        
        // 그린계열
        "#34A853", // 구글 그린
        "#009688", // 틸 그린
        "#4CAF50", // 그린
        "#8BC34A", // 라이트 그린
        "#A7BEAE", // 부드러운 세이지 그린
        "#5B7065", // 숲속 그린
        "#B8D8D8", // 차분한 민트
        "#C4DFDF", // 파스텔 틸
        "#00BCD4", // 틸
        
        // 옐로우계열
        "#FBBC05", // 구글 옐로우
        "#CDDC39", // 라임
        "#FFEB3B", // 옐로우
        "#FFC107", // 앰버
        "#F5E6CC", // 베이지 크림
        
        // 레드/오렌지계열
        "#EA4335", // 구글 레드
        "#FF9800", // 오렌지
        "#FF5722", // 딥 오렌지
        "#D09683", // 테라코타 핑크
        
        // 핑크/퍼플계열
        "#673AB7", // 딥 퍼플
        "#E5D1FA", // 라벤더 미스트
        "#EAC4D5", // 로즈 쿼츠
        "#E9D5DA", // 소프트 핑크
        
        // 무채색계열
        "#795548", // 브라운
        "#9E9E9E", // 그레이
        "#607D8B"  // 블루 그레이
    ]
};

/**
 * 데이터 초기화 함수
 * 모든 필요한 데이터를 로드하고 초기 설정을 수행합니다.
 */
async function initData() {
    try {
        // 로딩 상태 표시
        showLoading(true);
        
        console.log('데이터 로드 시작');
        
        // 각 데이터 로드 함수를 개별적으로 실행하고 오류 처리
        try {
            await loadMapFiles();
            console.log('맵 데이터 로드 성공');
        } catch (mapError) {
            console.error('맵 데이터 로드 실패:', mapError);
            showError('맵 데이터를 불러오는 중 오류가 발생했습니다.', mapError);
        }
        
        try {
            await loadTransportations();
            console.log('이동수단 데이터 로드 성공');
        } catch (transError) {
            console.error('이동수단 데이터 로드 실패:', transError);
            showError('이동수단 데이터를 불러오는 중 오류가 발생했습니다.', transError);
        }
        
        try {
            await loadLabels();
            console.log('라벨 데이터 로드 성공');
        } catch (labelError) {
            console.error('라벨 데이터 로드 실패:', labelError);
            showError('라벨 데이터를 불러오는 중 오류가 발생했습니다.', labelError);
        }
        
        console.log('데이터 로드 완료:', {
            themes: dataStore.themes?.length || 0,
            trips: dataStore.trips?.length || 0,
            transportations: dataStore.transportations?.length || 0
        });
        
        // 데이터가 하나도 로드되지 않았으면 오류 표시
        if (
            (!dataStore.themes || dataStore.themes.length === 0) &&
            (!dataStore.trips || dataStore.trips.length === 0)
        ) {
            showError('테마 또는 여행 데이터를 로드하지 못했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.');
            return;
        }
        
        // 테마 선택 드롭다운 초기화
        initThemeSelector();
        
        // 기본 테마 설정 (첫 번째 테마)
        if (dataStore.themes && dataStore.themes.length > 0) {
            setCurrentTheme(dataStore.themes[0].id);
        } else if (dataStore.trips && dataStore.trips.length > 0) {
            // 테마가 없으면 첫 번째 여행으로 초기화
            setCurrentTrip(dataStore.trips[0].id);
        }
        
        // 로딩 상태 해제
        showLoading(false);
    } catch (error) {
        console.error('데이터 초기화 오류:', error);
        showError('데이터를 불러오는 중 오류가 발생했습니다.', error);
    }
}

/**
 * 모든 맵 데이터 파일 로드
 * days 필드 유무에 따라 테마/여행 구분
 */
async function loadMapFiles() {
    try {
        console.log('맵 파일 로드 시작');
        
        // data/maps 디렉토리의 콘텐츠 요청 시도
        try {
            const response = await fetch('data/maps/');
            
            if (response.ok) {
                // HTML 응답에서 파일 목록 추출 (디렉토리 목록 활성화된 서버)
                const html = await response.text();
                const fileRegex = /href="([^"]+\.json)"/g;
                const mapFiles = [];
                let match;
                
                while ((match = fileRegex.exec(html)) !== null) {
                    mapFiles.push(match[1]);
                }
                
                if (mapFiles.length > 0) {
                    console.log('디렉토리 목록에서 발견된 JSON 파일:', mapFiles);
                    await loadMapFilesFromList(mapFiles);
                    return;
                } else {
                    console.log('디렉토리에서 JSON 파일을 찾을 수 없습니다.');
                }
            } else {
                console.log('디렉토리 목록을 가져올 수 없습니다:', response.status);
            }
        } catch (dirError) {
            console.log('디렉토리 스캔 오류:', dirError.message);
        }
        
        // 서버가 디렉토리 목록을 제공하지 않는 경우, 직접 파일 로드를 시도하지 않음
        console.error('맵 데이터를 로드할 수 없습니다.');
        throw new Error('맵 데이터를 로드할 수 없습니다. 서버가 디렉토리 목록을 제공하도록 설정하거나 웹 서버를 사용하세요.');
        
    } catch (error) {
        console.error('맵 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 파일 목록에서 맵 파일 로드
 * @param {Array<string>} mapFiles - 로드할 맵 파일 목록
 */
async function loadMapFilesFromList(mapFiles) {
    // 각 파일 로드
    const filePromises = mapFiles.map(async file => {
        try {
            // 파일 경로 정규화 (URL에서 파일명만 추출)
            const fileName = file.split('/').pop();
            const filePath = `data/maps/${fileName}`;
            console.log('파일 로드 시도:', filePath);
            
            const fileResponse = await fetch(filePath);
            if (!fileResponse.ok) {
                console.error(`${fileName} 로드 실패: ${fileResponse.status} ${fileResponse.statusText}`);
                return null;
            }
            
            const data = await fileResponse.json();
            console.log(`${fileName} 데이터 로드 성공:`, {
                id: data.id,
                title: data.title,
                hasDays: !!data.days && Array.isArray(data.days) && data.days.length > 0
            });
            
            return data;
        } catch (fileError) {
            console.error(`파일 로드 오류 (${file}):`, fileError);
            return null;
        }
    });
    
    // 모든 파일 로드 기다리기
    const allMapData = (await Promise.all(filePromises)).filter(Boolean);
    console.log('로드된 맵 데이터 총 개수:', allMapData.length);
    
    if (allMapData.length === 0) {
        throw new Error('로드된 맵 데이터가 없습니다. 파일이 올바른 경로에 있는지 확인하세요.');
    }
    
    // days 필드 유무로 테마와 여행 데이터 구분
    dataStore.themes = allMapData.filter(data => {
        const hasDays = !!data.days && Array.isArray(data.days) && data.days.length > 0;
        console.log(`맵 데이터 분류 (${data.id}): ${hasDays ? '여행' : '테마'}`);
        return !hasDays;
    });
    
    dataStore.trips = allMapData.filter(data => {
        const hasDays = !!data.days && Array.isArray(data.days) && data.days.length > 0;
        return hasDays;
    });
    
    console.log('테마 데이터 로드 완료:', dataStore.themes.length);
    console.log('여행 데이터 로드 완료:', dataStore.trips.length);
}

/**
 * 이동수단 데이터 로드
 */
async function loadTransportations() {
    try {
        const response = await fetch('data/system/transportations.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dataStore.transportations = data.transportations || [];
        console.log('이동수단 데이터 로드 완료:', dataStore.transportations.length);
    } catch (error) {
        console.error('이동수단 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 라벨 데이터 로드
 */
async function loadLabels() {
    try {
        const response = await fetch('data/system/labels.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 라벨 데이터를 labelInfo에 설정
        if (data.labels && Array.isArray(data.labels)) {
            // 기존 labelInfo 초기화
            dataStore.labelInfo = {};
            
            // labels.json의 모든 라벨 정보 추가
            data.labels.forEach(label => {
                dataStore.labelInfo[label.name] = {
                    icon: label.icon,
                    description: label.description,
                    color: label.color
                };
            });
        }
        
        console.log('라벨 데이터 로드 완료:', Object.keys(dataStore.labelInfo).length);
    } catch (error) {
        console.error('라벨 데이터 로드 오류:', error);
        // 라벨 로드 실패 시 기본 라벨 정보 설정
        setDefaultLabelInfo();
        throw error;
    }
}

/**
 * 기본 라벨 정보 설정 (라벨 로드 실패 시 폴백)
 */
function setDefaultLabelInfo() {
    dataStore.labelInfo = {
        "맛집": { icon: "mdi:food", color: "#FF5722", description: "맛있는 음식을 제공하는 장소" },
        "카페": { icon: "mdi:coffee", color: "#795548", description: "커피와 디저트를 즐길 수 있는 곳" },
        "관광지": { icon: "mdi:camera", color: "#2196F3", description: "주요 관광 명소" },
        "쇼핑": { icon: "mdi:shopping", color: "#9C27B0", description: "쇼핑을 즐길 수 있는 장소" },
        "숙소": { icon: "mdi:bed", color: "#4CAF50", description: "숙박 시설" },
        "자연": { icon: "mdi:tree", color: "#8BC34A", description: "자연을 즐길 수 있는 장소" }
    };
    console.log('기본 라벨 정보 설정됨');
}

/**
 * ID로 장소 찾기
 * @param {string} placeId - 장소 ID
 * @returns {Object|null} - 찾은 장소 객체 또는 null
 */
function getPlaceById(placeId) {
    // 모든 테마와 여행 데이터에서 장소 찾기
    let place = null;
    
    // 먼저 테마에서 찾기
    for (const theme of dataStore.themes) {
        if (theme.places && Array.isArray(theme.places)) {
            place = theme.places.find(p => p.id === placeId);
            if (place) return place;
        }
    }
    
    // 여행에서 찾기
    for (const trip of dataStore.trips) {
        if (trip.places && Array.isArray(trip.places)) {
            place = trip.places.find(p => p.id === placeId);
            if (place) return place;
        }
    }
    
    return null;
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
    
    // 테마에 있는 장소 목록 사용
    // 이제 places 배열이 테마 자체에 포함되어 있음
    dataStore.filteredPlaces = theme.places || [];
    
    // 테마에 정의된 라벨 정보가 있다면 기본 라벨 정보와 병합
    if (theme.labelInfo && typeof theme.labelInfo === 'object') {
        console.log('테마에 정의된 라벨 정보 발견:', Object.keys(theme.labelInfo).length);
        
        // 테마의 라벨 정보로 오버라이드 (기존 라벨은 유지하면서)
        Object.keys(theme.labelInfo).forEach(labelName => {
            dataStore.labelInfo[labelName] = {
                ...dataStore.labelInfo[labelName], // 기존 라벨 정보 (있을 경우)
                ...theme.labelInfo[labelName]      // 테마에 정의된 라벨 정보 (오버라이드)
            };
        });
    }
    
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
    
    // 여행 일정에 있는 장소 목록 사용
    // 이제 places 배열이 여행 일정 자체에 포함되어 있음
    dataStore.filteredPlaces = trip.places || [];
    
    // 여행에 정의된 라벨 정보가 있다면 기본 라벨 정보와 병합
    if (trip.labelInfo && typeof trip.labelInfo === 'object') {
        console.log('여행에 정의된 라벨 정보 발견:', Object.keys(trip.labelInfo).length);
        
        // 여행의 라벨 정보로 오버라이드 (기존 라벨은 유지하면서)
        Object.keys(trip.labelInfo).forEach(labelName => {
            dataStore.labelInfo[labelName] = {
                ...dataStore.labelInfo[labelName], // 기존 라벨 정보 (있을 경우)
                ...trip.labelInfo[labelName]       // 여행에 정의된 라벨 정보 (오버라이드)
            };
        });
    }
    
    // 현재 뷰 모드에 따라 다르게 표시
    if (dataStore.viewMode === 'theme') {
        // 테마 모드로 표시 (라벨 기반 카테고리로)
        displayThemeView();
    } else {
        // 여행 모드로 표시 (일정별로)
        updateTripInfo(trip);
        
        // 첫번째 일차의 경로 표시 - 기본값
        if (trip.days.length > 0) {
            showTripDay(trip, 0);
        }
    }
}

/**
 * 카테고리별 장소 필터링
 * @param {string} category - 카테고리 이름
 * @param {string} value - 카테고리 값
 * @param {boolean} isChecked - 체크 여부
 */
function filterPlacesByCategory(category, value, isChecked) {
    // 현재 표시 중인 데이터 소스 (테마 또는 여행)
    const currentData = dataStore.currentTheme || dataStore.currentTrip;
    if (!currentData) return;
    
    console.log('필터링 시작:', category, value, isChecked, '현재 데이터:', currentData.title);
    
    // 활성화된 필터 수집
    const activeFilters = collectActiveFilters();
    console.log('활성화된 필터:', activeFilters);
    
    // 필터가 없으면 모든 장소 표시
    if (Object.keys(activeFilters).length === 0) {
        // 현재 데이터에 속한 모든 장소 표시
        dataStore.filteredPlaces = currentData.places || [];
    } else {
        // 필터 적용
        dataStore.filteredPlaces = currentData.places.filter(place => {
            // 모든 활성화된 카테고리에 대해 검사
            for (const [category, values] of Object.entries(activeFilters)) {
                if (values.length === 0) continue; // 값이 없으면 스킵
                
                // 장소에 라벨이 없는 경우 제외
                if (!place.labels || !Array.isArray(place.labels)) {
                    return false;
                }
                
                // 해당 카테고리의 값이 하나라도 일치하는지 확인
                const hasMatch = values.some(value => 
                    place.labels.includes(value)
                );
                
                // 일치하는 값이 없으면 필터링에서 제외
                if (!hasMatch) {
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
    
    // 로그 출력
    console.log(`필터링 결과: ${dataStore.filteredPlaces.length}개 장소 표시`);
}

/**
 * 활성화된 필터 수집
 * @returns {Object} - 카테고리별 활성화된 필터 값
 */
function collectActiveFilters() {
    const activeFilters = {};
    
    // 다양한 선택자를 사용하여 모든 체크된 카테고리 체크박스 찾기
    const selectors = [
        '.categories-scroll-container input[type="checkbox"]:checked',
        '#category-list input[type="checkbox"]:checked'
    ];
    
    // 모든 선택자를 순회하며 체크된 체크박스 수집
    selectors.forEach(selector => {
        const checkboxes = document.querySelectorAll(selector);
        
        checkboxes.forEach(checkbox => {
            const category = checkbox.dataset.category;
            const value = checkbox.value;
            
            if (!category || !value) return; // 유효하지 않은 데이터 건너뛰기
            
            if (!activeFilters[category]) {
                activeFilters[category] = [];
            }
            
            // 중복 방지
            if (!activeFilters[category].includes(value)) {
                activeFilters[category].push(value);
            }
        });
    });
    
    return activeFilters;
}

/**
 * 장소 검색
 * @param {string} query - 검색어
 * @description 장소의 제목(title)과 주소(address)만 검색 대상으로 합니다.
 * 여행 모드에서 검색 시 자동으로 테마 모드로 전환됩니다.
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
    
    // 여행 모드일 경우 테마 모드로 전환
    if (dataStore.currentTrip && dataStore.viewMode === 'trip') {
        console.log('검색을 위해 테마 모드로 전환합니다.');
        
        // UI 변경 (UI 모듈 함수 호출)
        setViewModeUI('theme');
        
        // 테마 모드로 변경 (이미 setViewModeUI에서 호출하므로 중복 호출 제거)
        // setViewMode('theme');
        
        // 사용자에게 알림 (이미 setViewModeUI에서 토스트 메시지로 표시하므로 제거)
        // alert('검색을 위해 테마 모드로 전환합니다.');
    }
    
    // 검색어 정규화
    const normalizedQuery = query.trim().toLowerCase();
    
    // 현재 선택된 테마/여행의 장소만 검색
    let placesToSearch = [];
    
    if (dataStore.currentTheme) {
        // 현재 테마의 장소만 사용
        placesToSearch = dataStore.currentTheme.places || [];
    } else if (dataStore.currentTrip) {
        // 여행의 모든 장소 사용 (이제 테마 모드로 전환되었으므로)
        placesToSearch = dataStore.currentTrip.places || [];
    } else {
        // 선택된 테마/여행이 없으면 검색 결과 없음
        showError("검색하려면 먼저 테마나 여행을 선택해주세요.");
        return;
    }
    
    // 장소 검색 (제목과 주소만 검색 대상으로 함)
    const searchResults = placesToSearch.filter(place => {
        return (
            place.title.toLowerCase().includes(normalizedQuery) ||
            place.address.toLowerCase().includes(normalizedQuery)
        );
    });
    
    // 검색 결과 업데이트
    dataStore.filteredPlaces = searchResults;
    
    // 장소 목록 업데이트
    updatePlacesList(searchResults);
    
    // 지도 마커 업데이트
    updateMapMarkers(searchResults);
    
    // 검색 결과 알림
    if (searchResults.length === 0) {
        alert(`"${query}" 검색 결과가 없습니다.`);
    } else {
        console.log(`검색 결과: ${searchResults.length}개의 장소를 찾았습니다.`);
    }
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
 * @param {Error} [error] - 오류 객체 (선택적)
 */
function showError(message, error) {
    // 오류 메시지 표시 구현
    console.error('오류:', message);
    if (error) {
        console.error('오류 상세:', error);
        
        // 스택 트레이스가 있으면 표시
        if (error.stack) {
            console.error('스택 트레이스:', error.stack);
        }
        
        // 오류 메시지에 상세 정보 추가
        message = `${message} (${error.message || '알 수 없는 오류'})`;
    }
    
    // 경고창 표시
    alert(message);
}

/**
 * 이동수단 정보 가져오기 함수
 * @param {string} id - 이동수단 ID
 * @returns {Object} - 이동수단 객체
 */
function getTransportationById(id) {
    return dataStore.transportations.find(t => t.id === id);
}

/**
 * 테마 색상 가져오기
 * @param {string} themeId - 테마 ID
 * @returns {string} - 색상 코드
 */
function getThemeColor(themeId) {
    const theme = getThemeById(themeId);
    
    // 테마에 지정된 색상이 있으면 사용
    if (theme && theme.color) {
        return theme.color;
    }
    
    // 없으면 기본 색상 중 하나를 ID를 기반으로 반환
    const colorIndex = themeId ? parseInt(themeId.replace(/\D/g, '')) % dataStore.themeColors.length : 0;
    return dataStore.themeColors[colorIndex] || dataStore.themeColors[0];
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
    return dataStore.labelInfo[labelName] || defaultInfo;
}

/**
 * 현재 선택된 데이터가 여행인지 확인
 * @returns {boolean} - 여행이면 true, 테마면 false
 */
function isCurrentTrip() {
    return !!dataStore.currentTrip;
}

/**
 * 보기 모드 설정
 * @param {string} mode - 'theme' 또는 'trip'
 */
function setViewMode(mode) {
    if (mode !== 'theme' && mode !== 'trip') {
        console.error('유효하지 않은 보기 모드:', mode);
        return;
    }
    
    dataStore.viewMode = mode;
    
    // 현재 선택된 데이터가 여행이면서 모드가 테마이면 테마처럼 표시
    if (isCurrentTrip()) {
        if (mode === 'theme') {
            // 테마 모드로 표시 (일정 없이 모든 장소 표시)
            displayThemeView();
        } else {
            // 여행 모드로 표시 (일정별로 장소 표시)
            displayTripView();
        }
    }
}

/**
 * 테마 보기 모드로 표시
 */
function displayThemeView() {
    if (!dataStore.currentTrip) return;
    
    // 여행의 모든 장소를 테마처럼 표시
    const allPlaces = dataStore.currentTrip.places || [];
    dataStore.filteredPlaces = allPlaces; // 필터링된 장소 목록 초기화
    
    // 지도와 장소 목록 업데이트
    updateMapMarkers(allPlaces);
    updatePlacesList(allPlaces);
    
    // 장소 목록 제목을 '장소'로 설정 (일정 대신)
    document.getElementById('places-list-title').textContent = '장소';
    
    // 카테고리 필터 생성 (여행 데이터를 테마처럼 취급)
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';
    
    // UI 모듈의 updateCategoryFilters 함수 호출
    // 이 함수는 카테고리 스크롤 컨테이너와 필터 체크박스를 생성함
    updateCategoryFilters(dataStore.currentTrip);
    
    console.log('테마 보기 모드 적용 완료');
}

/**
 * 여행 보기 모드로 표시
 */
function displayTripView() {
    if (!dataStore.currentTrip) return;
    
    // 여행 일정에 따라 장소 표시
    updateTripInfo(dataStore.currentTrip);
}

// 데이터 모듈 초기화 (DOM 로드 후)
document.addEventListener('DOMContentLoaded', initData); 