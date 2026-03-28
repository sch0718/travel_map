export const CONFIG = {
  kakaoMapKey: '5cda008d02047bd5e619d759494363c4',

  defaultCenter: { lat: 33.3617, lng: 126.5292 },
  defaultZoom: 10,

  dataBasePath: 'data/',
  manifestPath: 'data/manifest.json',

  clusterGridSize: 60,
  clusterMinCount: 3,

  searchDebounceMs: 300,
  toastDurationMs: 3000,

  polylineColor: '#3490dc',
  polylineWidth: 3,

  themeColors: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#73C6B6',
    '#E59866', '#A3E4D7', '#D7BDE2', '#F9E79F', '#AED6F1',
    '#FAD7A0', '#A9DFBF', '#F5B7B1', '#ABB2B9', '#A2D9CE',
    '#EDBB99', '#D5F5E3', '#E8DAEF', '#FDEBD0', '#D6EAF8'
  ]
};

export function getBaseUrl() {
  const { pathname } = window.location;
  const lastSlash = pathname.lastIndexOf('/');
  return pathname.substring(0, lastSlash + 1);
}

export function resolveDataPath(relativePath) {
  return getBaseUrl() + CONFIG.dataBasePath + relativePath;
}

export function resolveManifestPath() {
  return getBaseUrl() + CONFIG.manifestPath;
}
