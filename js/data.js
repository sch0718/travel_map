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
    // 테마 및 여행 메타데이터 인덱스
    themeIndex: [],
    tripIndex: [],
    // 현재 로드된 테마/여행 ID 추적
    loadedThemes: new Set(),
    loadedTrips: new Set(),
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

// 맵 메타데이터 캐시
const mapMetaCache = {
    fileMap: {}  // 파일명과 ID 매핑 객체
};

// 데이터 캐시 관리
const dataCache = {
    // 최대 캐시 크기 (동시에 메모리에 유지할 테마/여행 수)
    maxCacheSize: 5,
    
    // 캐시 적용
    cacheTheme(themeId, themeData) {
        if (dataStore.loadedThemes.size >= this.maxCacheSize) {
            this.evictLeastRecentTheme();
        }
        dataStore.loadedThemes.add(themeId);
        return themeData;
    },
    
    // 가장 오래된 테마 제거
    evictLeastRecentTheme() {
        if (dataStore.loadedThemes.size === 0) return;
        
        // LRU 정책: 가장 오래 사용되지 않은 테마 제거
        const oldestThemeId = Array.from(dataStore.loadedThemes)[0];
        dataStore.loadedThemes.delete(oldestThemeId);
        
        // 테마 데이터에서 해당 테마만 제거 (연결된 장소는 유지)
        if (dataStore.themes) {
            dataStore.themes = dataStore.themes.filter(t => t.id !== oldestThemeId);
        }
        
        console.log(`캐시에서 테마 제거됨: ${oldestThemeId}`);
    },
    
    // 여행 캐시 관리
    cacheTrip(tripId, tripData) {
        if (dataStore.loadedTrips.size >= this.maxCacheSize) {
            this.evictLeastRecentTrip();
        }
        dataStore.loadedTrips.add(tripId);
        return tripData;
    },
    
    // 가장 오래된 여행 제거
    evictLeastRecentTrip() {
        if (dataStore.loadedTrips.size === 0) return;
        
        const oldestTripId = Array.from(dataStore.loadedTrips)[0];
        dataStore.loadedTrips.delete(oldestTripId);
        
        if (dataStore.trips) {
            dataStore.trips = dataStore.trips.filter(t => t.id !== oldestTripId);
        }
        
        console.log(`캐시에서 여행 제거됨: ${oldestTripId}`);
    },
    
    // 캐시 히트 여부 확인
    isThemeCached(themeId) {
        return dataStore.loadedThemes.has(themeId);
    },
    
    isTripCached(tripId) {
        return dataStore.loadedTrips.has(tripId);
    }
};

// Web Worker 관리
let dataWorker = null;

/**
 * Web Worker 초기화 함수
 * 데이터 처리를 별도 스레드로 분리하여 UI 응답성을 향상시킵니다.
 */
function initDataWorker() {
    // Web Worker 지원 확인
    if (window.Worker) {
        try {
            dataWorker = new Worker('js/dataWorker.js');
            
            // 메시지 핸들러 설정
            dataWorker.onmessage = function(e) {
                const { type, data, error } = e.data;
                
                switch (type) {
                    case 'filterComplete':
                        // 필터링 결과 처리
                        handleFilterResults(data);
                        break;
                    case 'searchComplete':
                        // 검색 결과 처리
                        handleSearchResults(data);
                        break;
                    case 'error':
                        console.error('Web Worker 오류:', error);
                        showError('데이터 처리 중 오류가 발생했습니다.', error);
                        break;
                }
            };
            
            console.log('Data Worker 초기화 완료');
            return true;
        } catch (error) {
            console.error('Web Worker 초기화 실패:', error);
            return false;
        }
    } else {
        console.warn('Web Worker가 지원되지 않습니다. 대체 구현 사용');
        return false;
    }
}

/**
 * 필터 결과 처리 함수
 * Worker로부터 받은 필터링 결과를 처리합니다.
 * @param {Array} filteredPlaces - 필터링된 장소 배열
 */
function handleFilterResults(filteredPlaces) {
    // 로딩 표시 해제
    showLoading(false);
    
    // 필터링된 장소 저장
    dataStore.filteredPlaces = filteredPlaces;
    
    // 지도와 목록 업데이트
    updateMapMarkers(filteredPlaces, isCurrentTrip() ? dataStore.currentTrip : null);
    updatePlacesList(filteredPlaces, isCurrentTrip() ? dataStore.currentTrip : null);
    
    console.log(`필터링 완료: ${filteredPlaces.length}개 장소`);
}

/**
 * 검색 결과 처리 함수
 * Worker로부터 받은 검색 결과를 처리합니다.
 * @param {Array} searchResults - 검색된 장소 배열
 */
function handleSearchResults(searchResults) {
    // 로딩 표시 해제
    showLoading(false);
    
    // 검색 결과 저장
    dataStore.filteredPlaces = searchResults;
    
    // 지도와 목록 업데이트
    updateMapMarkers(searchResults, isCurrentTrip() ? dataStore.currentTrip : null);
    updatePlacesList(searchResults, isCurrentTrip() ? dataStore.currentTrip : null);
    
    console.log(`검색 완료: ${searchResults.length}개 장소 발견`);
}

/**
 * 초기 데이터 로드 및 설정
 */
async function initData() {
    try {
        showLoading(true);
        console.log('데이터 로드 시작');
        
        // 데이터 워커 초기화
        initDataWorker();
        
        // 1. 라벨 데이터 로드
        const labels = await loadLabels();
        console.log('라벨 데이터 로드 성공');
        
        // 2. 이동수단 데이터 로드
        const transportations = await loadTransportations();
        console.log('이동수단 데이터 로드 성공');
        
        // 3. 맵 메타데이터 스캔
        const mapMeta = await scanMapFiles();
        console.log('맵 메타데이터 스캔 성공');
        
        // 초기 데이터 로드 완료
        console.log('초기 데이터 로드 완료:', {
            themeIndex: dataStore.themeIndex.length,
            tripIndex: dataStore.tripIndex.length,
            transportations: dataStore.transportations.length
        });
        
        // 4. 첫 테마 로드 (기본 테마 또는 첫 번째 테마)
        let defaultTheme = null;
        
        if (dataStore.themeIndex && dataStore.themeIndex.length > 0) {
            // 첫 번째 테마 로드
            const firstThemeId = dataStore.themeIndex[0].id;
            defaultTheme = await loadThemeData(firstThemeId);
        }
        
        // 5. 현재 테마 설정 (있는 경우에만)
        if (defaultTheme) {
            setCurrentTheme(defaultTheme);
        }
        
        showLoading(false);
        return true;
        
    } catch (error) {
        console.error('데이터 초기화 오류:', error);
        showError('데이터 초기화 중 오류가 발생했습니다.', error);
        showLoading(false);
        return false;
    }
}

/**
 * 맵 파일 스캔
 * @returns {Promise<Object>} 테마 및 여행 메타데이터 객체
 */
async function scanMapFiles() {
    try {
        const baseUrl = getBaseUrl();
        console.log('현재 베이스 URL:', baseUrl);
        console.log('맵 파일 스캔 시작');
        
        // 맵 파일 목록 확인 (목록 API 또는 정적 목록)
        const mapFiles = [
            'jeju_food.json',  // 테마 예시
            'jeju_trip_202506.json'   // 여행 예시
        ];
        
        // 파일별 메타데이터 추출 (병렬 처리)
        const metaPromises = mapFiles.map(async (fileName) => {
            try {
                // 파일 경로
                const filePath = `${baseUrl}/data/maps/${fileName}`;
                
                // 파일 데이터 가져오기
                const response = await fetch(filePath);
                if (!response.ok) {
                    console.warn(`맵 파일 로드 실패: ${fileName}`, response.status);
                    return null;
                }
                
                // JSON 데이터 파싱
                const mapData = await response.json();
                
                // 메타데이터 추출
                const metaData = {
                    id: mapData.id,
                    title: mapData.title,
                    description: mapData.description || '',
                    created: mapData.created,
                    modified: mapData.modified || mapData.created,
                    type: mapData.days ? 'trip' : 'theme',
                    fileName: fileName,
                    places: (mapData.places && mapData.places.length) || 0
                };
                
                return metaData;
            } catch (error) {
                console.error(`맵 파일 메타데이터 추출 실패: ${fileName}`, error);
                return null;
            }
        });
        
        // 모든 메타데이터 로드 완료 대기
        const metaResults = await Promise.all(metaPromises);
        
        // 유효한 메타데이터만 필터링
        const validMeta = metaResults.filter(meta => meta !== null);
        
        // 테마와 여행으로 분류
        const themes = validMeta.filter(meta => meta.type === 'theme');
        const trips = validMeta.filter(meta => meta.type === 'trip');
        
        // 메타데이터 캐시 저장
        if (!dataStore.themeIndex) dataStore.themeIndex = [];
        if (!dataStore.tripIndex) dataStore.tripIndex = [];
        
        // 중복 방지를 위해 기존 데이터 초기화
        dataStore.themeIndex = [...themes];
        dataStore.tripIndex = [...trips];
        
        console.log('맵 메타데이터 로드 완료:', {
            themes: themes.length,
            trips: trips.length,
            total: validMeta.length
        });
        
        return {
            themes: themes,
            trips: trips
        };
    } catch (error) {
        console.error('맵 파일 스캔 중 오류 발생:', error);
        // 오류가 있어도 최소한의 빈 결과 반환 (앱 실행 유지)
        dataStore.themeIndex = dataStore.themeIndex || [];
        dataStore.tripIndex = dataStore.tripIndex || [];
        return {
            themes: [],
            trips: []
        };
    }
}

/**
 * 백업 파일 목록 반환 (선택적)
 * 서버가 디렉토리 목록을 제공하지 않을 경우 대체 방법
 */
function getBackupFileList() {
    // 미리 알고 있는 파일 목록이나 명명 규칙 기반 추측
    console.log('백업 파일 목록 사용');
    
    // 예: 미리 알려진 파일 목록
    return [
        'theme_1.json', 
        'theme_2.json', 
        'trip_1.json',
        'trip_2.json'
    ];
}

/**
 * 테마 데이터 로드
 * @param {string} themeId 테마 ID
 * @returns {Promise<Object|null>} 테마 데이터 객체 또는 오류 시 null
 */
async function loadThemeData(themeId) {
    try {
        // 이미 로드된 테마인지 확인
        if (dataStore.themes) {
            const existingTheme = dataStore.themes.find(t => t.id === themeId);
            if (existingTheme) {
                console.log(`테마 데이터 이미 로드됨: ${themeId}`);
                return existingTheme;
            }
        }
        
        showLoading(true);
        
        // 테마 데이터 파일 경로 결정
        const baseUrl = getBaseUrl();
        
        // 테마 인덱스에서 파일명 찾기
        let fileName = null;
        
        if (dataStore.themeIndex) {
            const themeInfo = dataStore.themeIndex.find(t => t.id === themeId);
            if (themeInfo && themeInfo.fileName) {
                fileName = themeInfo.fileName;
            }
        }
        
        // 파일명을 찾지 못한 경우 기본 파일명 추측
        if (!fileName) {
            fileName = `${themeId}.json`;
        }
        
        // 테마 데이터 요청
        const response = await fetch(`${baseUrl}/data/maps/${fileName}`);
        
        if (!response.ok) {
            throw new Error(`테마 데이터를 로드할 수 없습니다: ${response.status} ${response.statusText}`);
        }
        
        // 테마 데이터 파싱
        const themeData = await response.json();
        
        // 유효한 테마 데이터인지 검증
        if (!themeData || !themeData.id || !themeData.title) {
            throw new Error(`유효하지 않은 테마 데이터: ${themeId}`);
        }
        
        // 테마 데이터 처리 및 저장
        if (!dataStore.themes) dataStore.themes = [];
        
        // 중복 방지를 위해 기존 테마 제거
        dataStore.themes = dataStore.themes.filter(t => t.id !== themeId);
        
        // 새 테마 추가
        dataStore.themes.push(themeData);
        
        // 테마에 포함된 장소 데이터 처리
        if (themeData.places) {
            processPlaces(themeData.places);
        } else {
            console.warn(`테마에 장소 데이터가 없습니다: ${themeId}`);
        }
        
        console.log(`테마 데이터 로드 완료: ${themeId}`);
        showLoading(false);
        
        return themeData;
    } catch (error) {
        console.error(`테마 데이터 로드 오류: ${themeId}`, error);
        showError(`테마 데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
        showLoading(false);
        return null;
    }
}

/**
 * 여행 데이터 로드 함수
 * @param {string} tripId - 로드할 여행 ID
 * @returns {Object} - 로드된 여행 데이터
 */
async function loadTripData(tripId) {
    // 이미 캐시에 있는지 확인
    if (dataCache.isTripCached(tripId)) {
        console.log(`여행 데이터 이미 로드됨: ${tripId}`);
        return getTripById(tripId);
    }
    
    try {
        showLoading(true);
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        
        // mapMetaCache에서 파일명 찾기
        const fileName = mapMetaCache.fileMap[tripId] || `trip_${tripId}.json`;
        
        const response = await fetch(`${baseUrl}/data/maps/${fileName}`);
        
        if (!response.ok) throw new Error(`여행 데이터를 로드할 수 없습니다: ${tripId}`);
        
        const tripData = await response.json();
        
        // 여행 데이터 처리 및 저장
        if (!dataStore.trips) dataStore.trips = [];
        if (!dataStore.places) dataStore.places = [];
        
        // 중복 방지를 위해 기존 여행 제거
        dataStore.trips = dataStore.trips.filter(t => t.id !== tripId);
        
        // 새 여행 추가
        dataStore.trips.push(tripData);
        
        // 여행에 포함된 장소 데이터 처리
        processPlaces(tripData.places || []);
        
        // 캐시에 여행 추가
        dataCache.cacheTrip(tripId, tripData);
        
        console.log(`여행 데이터 로드 완료: ${tripId}`);
        showLoading(false);
        return tripData;
    } catch (error) {
        console.error(`여행 데이터 로드 오류: ${tripId}`, error);
        showError(`여행 데이터를 불러오는 중 오류가 발생했습니다: ${tripId}`, error);
        showLoading(false);
        throw error;
    }
}

/**
 * 장소 데이터 처리
 * @param {Array} places 처리할 장소 데이터 배열
 */
function processPlaces(places) {
    try {
        if (!places || !Array.isArray(places)) {
            console.warn('처리할 장소 데이터가 없습니다.');
            return;
        }
        
        // 장소 데이터 저장소 초기화
        if (!dataStore.places) {
            dataStore.places = [];
        }
        
        // 새로운 장소 데이터 처리
        let newPlacesCount = 0;
        
        places.forEach(place => {
            // 장소 데이터 유효성 검사
            if (!place || !place.id) {
                console.warn('유효하지 않은 장소 데이터:', place);
                return;
            }
            
            // 이미 존재하는 장소인지 확인
            const existingPlaceIndex = dataStore.places.findIndex(p => p.id === place.id);
            
            if (existingPlaceIndex === -1) {
                // 새로운 장소 추가
                dataStore.places.push(place);
                newPlacesCount++;
            } else {
                // 기존 장소 업데이트 (선택적)
                // 동일한 ID를 가진 장소가 여러 테마에 속할 수 있으므로,
                // 필요한 경우 여기서 기존 장소 정보를 업데이트할 수 있음
                // dataStore.places[existingPlaceIndex] = { ...dataStore.places[existingPlaceIndex], ...place };
            }
        });
        
        console.log(`장소 데이터 처리 완료: ${newPlacesCount}개 추가됨, 총 ${dataStore.places.length}개 장소`);
    } catch (error) {
        console.error('장소 데이터 처리 중 오류 발생:', error);
    }
}

/**
 * 모든 맵 데이터 파일 로드
 * days 필드 유무에 따라 테마/여행 구분
 */
async function loadMapFiles() {
    try {
        console.log('맵 파일 로드 시작');
        
        // 베이스 URL 동적 결정 (GitHub Pages와 로컬 환경 모두 지원)
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        console.log('현재 베이스 URL:', baseUrl);
        
        // data/maps 디렉토리의 콘텐츠 요청 시도
        try {
            // 기존 로직을 유지하되, 베이스 URL을 사용하도록 수정
            const response = await fetch(`${baseUrl}/data/maps/`);
            
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
                    await loadMapFilesFromList(mapFiles, baseUrl);
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
        
        // 서버가 디렉토리 목록을 제공하지 않는 경우
        console.error('맵 데이터를 로드할 수 없습니다.');
        throw new Error('맵 데이터를 로드할 수 없습니다. GitHub Pages에서는 디렉토리 목록을 제공하지 않습니다. 로컬 웹 서버에서 테스트하거나, 인덱스 파일을 사용하세요.');
        
    } catch (error) {
        console.error('맵 데이터 로드 오류:', error);
        throw error;
    }
}

/**
 * 파일 목록에서 맵 파일 로드
 * @param {Array<string>} mapFiles - 로드할 맵 파일 목록
 * @param {string} baseUrl - 기본 URL
 */
async function loadMapFilesFromList(mapFiles, baseUrl) {
    // 베이스 URL이 없으면 동적으로 결정
    if (!baseUrl) {
        baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
    }
    
    // 각 파일 로드
    const filePromises = mapFiles.map(async file => {
        try {
            // 파일 경로 정규화 (URL에서 파일명만 추출)
            const fileName = file.split('/').pop();
            // 절대 경로 사용
            const filePath = `${baseUrl}/data/maps/${fileName}`;
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
        // 베이스 URL 동적 결정
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        
        const response = await fetch(`${baseUrl}/data/system/transportations.json`);
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
        // 베이스 URL 동적 결정
        const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        
        const response = await fetch(`${baseUrl}/data/system/labels.json`);
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
 * @param {Object} theme 테마 객체
 */
function setCurrentTheme(theme) {
    try {
        console.log('테마 설정 시작:', theme.title, theme);
        
        // 테마 유효성 검사
        if (!theme || !theme.id) {
            console.error('유효하지 않은 테마 객체:', theme);
            showError('유효하지 않은 테마 객체가 제공되었습니다.');
            return;
        }
        
        // 전역 데이터에 현재 테마 설정
        dataStore.currentTheme = theme;
        
        // UI 갱신 - 테마 제목
        const themeTitle = document.getElementById('current-theme-title');
        if (themeTitle) {
            themeTitle.textContent = theme.title || '테마 없음';
        }
        
        // 테마 설정 상태 업데이트
        console.log('테마 설정:', theme.title);
        
        // 지도 초기화 여부 확인
        if (!window.mapModule || !window.mapModule.isMapInitialized()) {
            console.warn('지도가 초기화되지 않아 마커를 표시할 수 없습니다.');
            return;
        }
        
        // 테마에 속한 장소들 지도에 표시
        // 테마의 장소 목록이 ID 배열이면 전체 장소에서 필터링
        let placesToShow = [];
        
        if (Array.isArray(theme.places)) {
            if (theme.places.length > 0 && typeof theme.places[0] === 'string') {
                // 장소 ID 배열인 경우
                placesToShow = dataStore.places.filter(place => 
                    theme.places.includes(place.id)
                );
            } else {
                // 장소 객체 배열인 경우
                placesToShow = theme.places;
            }
        } else {
            console.warn('테마에 장소 정보가 없습니다:', theme.id);
        }
        
        console.log(`테마에 속한 장소 수: ${placesToShow.length}`);
        
        // 지도에 마커 업데이트
        window.mapModule.updateMarkers(placesToShow);
        
        // 장소 목록 업데이트
        updatePlacesList(placesToShow);
        
        return true;
    } catch (error) {
        console.error('테마 설정 중 오류 발생:', error);
        showError('테마 설정 중 오류가 발생했습니다.', error);
        return false;
    }
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
    console.log('로딩 상태:', isLoading);
    
    // 로딩 오버레이 표시/숨김
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        if (isLoading) {
            loadingOverlay.style.display = 'flex';
        } else {
            loadingOverlay.style.display = 'none';
        }
    }
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
    
    // 오류 오버레이 표시
    const errorOverlay = document.getElementById('error-overlay');
    const errorMessage = document.getElementById('error-message');
    
    if (errorOverlay && errorMessage) {
        errorMessage.textContent = message;
        errorOverlay.style.display = 'flex';
        
        // 닫기 버튼 이벤트 리스너 추가
        const closeButton = document.getElementById('error-close');
        if (closeButton) {
            closeButton.onclick = function() {
                errorOverlay.style.display = 'none';
            };
        }
    } else {
        // DOM 요소를 찾을 수 없는 경우 대체 수단으로 경고창 사용
        alert(message);
    }
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
 * @param {string} labelName 조회할 라벨 이름
 * @returns {Object} 라벨 정보 객체 또는 기본값
 */
function getLabelInfo(labelName) {
    // 기본 라벨 정보 (fallback)
    const defaultLabelInfo = {
        color: '#6c757d',
        icon: 'mdi:tag',
        description: '라벨 정보 없음'
    };
    
    try {
        // 라벨 정보 조회
        if (dataStore && dataStore.labelInfo && labelName) {
            const labelInfo = dataStore.labelInfo[labelName];
            if (labelInfo) {
                return labelInfo;
            }
        }
        
        // 라벨 정보가 없으면 기본값 반환
        console.warn(`'${labelName}' 라벨 정보를 찾을 수 없습니다. 기본값 사용.`);
        return defaultLabelInfo;
    } catch (error) {
        console.error(`라벨 정보 조회 중 오류 발생 (${labelName}):`, error);
        return defaultLabelInfo;
    }
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

// 장소 세부 정보 캐시
const placeDetailsCache = {};

/**
 * 베이스 URL 가져오기
 * @returns {string} 현재 베이스 URL
 */
function getBaseUrl() {
    // 현재 페이지 위치에서 베이스 URL 계산
    const baseUrl = window.location.origin;
    
    // 개발환경(localhost) 또는 프로덕션 환경에 따라 경로 조정
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return baseUrl;
    } else {
        // GitHub Pages 등의 환경에서는 경로 조정이 필요할 수 있음
        const pathSegments = window.location.pathname.split('/').filter(segment => segment.length > 0);
        if (pathSegments.length > 0) {
            // 첫 번째 경로 세그먼트가 저장소/프로젝트 이름인 경우
            return `${baseUrl}/${pathSegments[0]}`;
        }
        return baseUrl;
    }
}

/**
 * 장소 세부 정보를 비동기적으로 로드합니다.
 * @param {string} placeId 장소 ID
 * @returns {Promise<Object>} 장소 상세 정보 객체
 */
async function loadPlaceDetails(placeId) {
    if (!placeId) {
        console.error('장소 ID가 제공되지 않았습니다.');
        return null;
    }
    
    try {
        // 이미 상세 정보를 로드한 장소인지 확인
        if (placeDetailsCache[placeId]) {
            console.log(`장소 상세 정보 캐시 사용: ${placeId}`);
            return placeDetailsCache[placeId];
        }
        
        console.log(`장소 상세 정보 로드 중: ${placeId}`);
        
        // 먼저 현재 로드된 데이터에서 장소 찾기
        let placeData = null;
        
        // 현재 테마나 여행에서 장소 찾기
        if (dataStore.currentTheme) {
            placeData = dataStore.currentTheme.places.find(p => p.id === placeId);
        } else if (dataStore.currentTrip) {
            placeData = dataStore.currentTrip.places.find(p => p.id === placeId);
        }
        
        // 현재 테마/여행에서 찾지 못했다면 모든 로드된 데이터에서 검색
        if (!placeData) {
            // 전체 places 배열에서 검색
            placeData = dataStore.places.find(p => p.id === placeId);
            
            // 아직도 찾지 못했다면 로드된 모든 테마/여행 데이터에서 검색
            if (!placeData) {
                for (const theme of dataStore.themes) {
                    if (theme.places) {
                        const found = theme.places.find(p => p.id === placeId);
                        if (found) {
                            placeData = found;
                            break;
                        }
                    }
                }
                
                if (!placeData) {
                    for (const trip of dataStore.trips) {
                        if (trip.places) {
                            const found = trip.places.find(p => p.id === placeId);
                            if (found) {
                                placeData = found;
                                break;
                            }
                        }
                    }
                }
            }
        }
        
        if (placeData) {
            // 캐시에 저장
            placeDetailsCache[placeId] = placeData;
            console.log(`장소 상세 정보 로드 완료: ${placeId}`);
            return placeData;
        }
        
        console.warn(`장소 ID ${placeId}를 찾을 수 없습니다.`);
        return null;
    } catch (error) {
        console.error(`장소 상세 정보 로드 실패: ${placeId}`, error);
        showError(`장소 정보를 불러오는 중 오류가 발생했습니다: ${placeId}`, error.message);
        return null;
    }
} 