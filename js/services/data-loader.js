import { resolveDataPath, resolveManifestPath } from '../config.js';
import { store } from '../store.js';

/**
 * 데이터 로더 서비스
 * manifest.json을 기반으로 모든 맵 파일과 시스템 데이터를 로드합니다.
 * Promise.allSettled를 사용하여 개별 파일 실패가 전체 로드를 막지 않습니다.
 */

/** @type {Map<string, object>} 이미 가져온 데이터의 캐시 (URL → parsed JSON) */
const cache = new Map();

/**
 * 캐시를 활용하여 JSON 파일을 fetch합니다.
 * @param {string} url - 가져올 JSON 파일의 URL
 * @returns {Promise<object>} 파싱된 JSON 데이터
 */
async function fetchJson(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  const data = await response.json();
  cache.set(url, data);
  return data;
}

/**
 * 시스템 데이터(라벨, 이동수단)를 병렬 로드합니다.
 * @param {object} systemPaths - manifest의 system 객체 ({ labels, transportations })
 * @returns {Promise<{ labels: object, transportations: Array }>}
 */
async function loadSystemData(systemPaths) {
  const results = { labels: {}, transportations: [] };

  if (!systemPaths) {
    console.warn('manifest에 system 경로가 정의되지 않았습니다.');
    return results;
  }

  const tasks = [];

  if (systemPaths.labels) {
    tasks.push(
      fetchJson(resolveDataPath(systemPaths.labels))
        .then(data => {
          if (Array.isArray(data.labels)) {
            const labelMap = {};
            for (const label of data.labels) {
              labelMap[label.name] = {
                name: label.name,
                description: label.description,
                icon: label.icon,
                color: label.color
              };
            }
            results.labels = labelMap;
          }
        })
        .catch(err => console.error('라벨 데이터 로드 실패:', err))
    );
  }

  if (systemPaths.transportations) {
    tasks.push(
      fetchJson(resolveDataPath(systemPaths.transportations))
        .then(data => {
          results.transportations = data.transportations || [];
        })
        .catch(err => console.error('이동수단 데이터 로드 실패:', err))
    );
  }

  await Promise.all(tasks);
  return results;
}

/**
 * manifest에 나열된 모든 맵 파일을 병렬 로드합니다.
 * Promise.allSettled를 사용하여 개별 파일 실패에도 나머지 파일은 정상 로드됩니다.
 * @param {string[]} mapFileNames - 맵 파일 이름 배열 (예: ["jeju_food.json"])
 * @returns {Promise<object[]>} 성공적으로 로드된 맵 데이터 배열
 */
async function loadMapFiles(mapFileNames) {
  if (!Array.isArray(mapFileNames) || mapFileNames.length === 0) {
    console.warn('로드할 맵 파일이 없습니다.');
    return [];
  }

  const promises = mapFileNames.map(fileName =>
    fetchJson(resolveDataPath('maps/' + fileName))
  );

  const results = await Promise.allSettled(promises);
  const loaded = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      loaded.push(result.value);
    } else {
      console.error(`맵 파일 로드 실패 (${mapFileNames[index]}):`, result.reason);
    }
  });

  return loaded;
}

/**
 * 맵 데이터 배열을 테마와 여행으로 분류합니다.
 * days 필드가 있는 맵은 여행(trip), 없으면 테마(theme)로 분류됩니다.
 * @param {object[]} maps - 맵 데이터 배열
 * @returns {{ themes: object[], trips: object[] }}
 */
function classifyMaps(maps) {
  const themes = [];
  const trips = [];

  for (const map of maps) {
    if (Array.isArray(map.days)) {
      trips.push(map);
    } else {
      themes.push(map);
    }
  }

  return { themes, trips };
}

/**
 * 모든 데이터를 로드하고 store에 반영합니다.
 * 1. manifest.json을 가져옵니다.
 * 2. 시스템 데이터(라벨, 이동수단)를 병렬 로드합니다.
 * 3. 모든 맵 파일을 병렬 로드합니다.
 * 4. 맵을 테마/여행으로 분류합니다.
 * 5. store를 업데이트합니다.
 * 6. 첫 번째 사용 가능한 맵을 자동 선택합니다.
 * @returns {Promise<void>}
 */
export async function loadAllData() {
  store.setLoading(true);

  try {
    // 1. manifest 로드
    const manifestUrl = resolveManifestPath();
    const manifest = await fetchJson(manifestUrl);
    console.log('manifest 로드 완료:', manifest);

    // 2. 시스템 데이터 + 맵 파일 병렬 로드
    const [systemData, maps] = await Promise.all([
      loadSystemData(manifest.system),
      loadMapFiles(manifest.maps)
    ]);

    // 3. 맵 분류
    const { themes, trips } = classifyMaps(maps);
    console.log(`맵 분류 완료 - 테마: ${themes.length}개, 여행: ${trips.length}개`);

    // 4. store 업데이트
    store.setState({
      themes,
      trips,
      labels: systemData.labels,
      transportations: systemData.transportations
    });

    // 5. 첫 번째 사용 가능한 맵 자동 선택
    if (themes.length > 0) {
      store.setCurrentMap(themes[0]);
    } else if (trips.length > 0) {
      store.setCurrentMap(trips[0]);
    }
  } catch (err) {
    console.error('데이터 로드 중 오류 발생:', err);
    throw err;
  } finally {
    store.setLoading(false);
  }
}

/**
 * 외부에서 이미 파싱된 맵 데이터를 store에 추가합니다.
 * Google Drive나 파일 임포트 등에서 사용됩니다.
 * @param {object} mapData - 파싱된 맵 JSON 데이터
 */
export function addMapToStore(mapData) {
  const isTrip = Array.isArray(mapData.days);

  if (isTrip) {
    const existing = store.state.trips.find(t => t.id === mapData.id);
    if (existing) {
      const updated = store.state.trips.map(t => t.id === mapData.id ? mapData : t);
      store.setState({ trips: updated });
    } else {
      store.setState({ trips: [...store.state.trips, mapData] });
    }
  } else {
    const existing = store.state.themes.find(t => t.id === mapData.id);
    if (existing) {
      const updated = store.state.themes.map(t => t.id === mapData.id ? mapData : t);
      store.setState({ themes: updated });
    } else {
      store.setState({ themes: [...store.state.themes, mapData] });
    }
  }

  store.setCurrentMap(mapData);
}

/**
 * 라벨 이름으로 라벨 정보를 조회합니다.
 * store의 labels 맵에서 O(1) 조회합니다.
 * @param {string} labelName - 라벨 이름
 * @returns {{ name: string, description: string, icon: string, color: string }}
 */
export function getLabelInfo(labelName) {
  return store.state.labels[labelName] || {
    name: labelName,
    description: labelName,
    icon: 'mdi:tag',
    color: '#9E9E9E'
  };
}

/**
 * fetch 캐시를 초기화합니다.
 * 데이터를 강제로 다시 로드해야 할 때 사용합니다.
 */
export function clearCache() {
  cache.clear();
}
