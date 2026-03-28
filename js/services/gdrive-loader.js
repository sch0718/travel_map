import { store } from '../store.js';
import { addMapToStore } from './data-loader.js';

/**
 * Google Drive Picker API 연동 서비스
 * Google API 클라이언트와 Picker 라이브러리를 필요 시 로드하고,
 * 사용자가 Drive에서 JSON 파일을 선택하여 맵 데이터를 가져올 수 있도록 합니다.
 */

/** Google API 스크립트 로드 여부 */
let gapiLoaded = false;

/** Google Identity Services 스크립트 로드 여부 */
let gisLoaded = false;

/** 현재 OAuth 액세스 토큰 */
let accessToken = null;

/** Google API 스크립트 로드용 Promise (중복 로드 방지) */
let gapiLoadPromise = null;

/** GIS 스크립트 로드용 Promise (중복 로드 방지) */
let gisLoadPromise = null;

/**
 * 외부 스크립트를 동적으로 로드합니다.
 * @param {string} src - 스크립트 URL
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`스크립트 로드 실패: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Google API 클라이언트 라이브러리(gapi)를 로드하고 초기화합니다.
 * 한 번만 로드되며 이후 호출은 캐시된 Promise를 반환합니다.
 * @returns {Promise<void>}
 */
async function ensureGapiLoaded() {
  if (gapiLoaded) return;

  if (!gapiLoadPromise) {
    gapiLoadPromise = loadScript('https://apis.google.com/js/api.js')
      .then(() => {
        return new Promise((resolve, reject) => {
          window.gapi.load('client:picker', {
            callback: () => {
              gapiLoaded = true;
              resolve();
            },
            onerror: () => reject(new Error('gapi client:picker 로드 실패'))
          });
        });
      });
  }

  await gapiLoadPromise;
}

/**
 * Google Identity Services(GIS) 라이브러리를 로드합니다.
 * 한 번만 로드되며 이후 호출은 캐시된 Promise를 반환합니다.
 * @returns {Promise<void>}
 */
async function ensureGisLoaded() {
  if (gisLoaded) return;

  if (!gisLoadPromise) {
    gisLoadPromise = loadScript('https://accounts.google.com/gsi/client')
      .then(() => {
        gisLoaded = true;
      });
  }

  await gisLoadPromise;
}

/**
 * OAuth2 액세스 토큰을 요청합니다.
 * 사용자에게 Google 로그인 및 Drive 읽기 권한 동의를 요청합니다.
 * @param {string} clientId - Google OAuth2 클라이언트 ID
 * @returns {Promise<string>} 액세스 토큰
 */
function requestAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response) => {
        if (response.error) {
          reject(new Error(`OAuth 오류: ${response.error}`));
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken);
      },
      error_callback: (error) => {
        reject(new Error(`OAuth 초기화 오류: ${error.message || error.type}`));
      }
    });

    tokenClient.requestAccessToken();
  });
}

/**
 * Google Drive에서 파일 콘텐츠를 가져옵니다.
 * @param {string} fileId - Google Drive 파일 ID
 * @param {string} token - OAuth2 액세스 토큰
 * @returns {Promise<object>} 파싱된 JSON 데이터
 */
async function fetchFileContent(fileId, token) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    throw new Error(`Drive 파일 읽기 실패: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Google Drive Picker를 표시하고, 사용자가 선택한 JSON 파일을 가져옵니다.
 * @param {string} apiKey - Google API 키
 * @param {string} token - OAuth2 액세스 토큰
 * @returns {Promise<object|null>} 선택한 파일의 파싱된 JSON 데이터, 취소 시 null
 */
function showPicker(apiKey, token) {
  return new Promise((resolve, reject) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes('application/json')
      .setMode(window.google.picker.DocsViewMode.LIST);

    const picker = new window.google.picker.PickerBuilder()
      .setAppId(apiKey)
      .setDeveloperKey(apiKey)
      .setOAuthToken(token)
      .addView(view)
      .setTitle('맵 데이터 JSON 파일 선택')
      .setCallback(async (data) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const fileId = data.docs[0].id;
          const fileName = data.docs[0].name;
          console.log(`Drive 파일 선택됨: ${fileName} (${fileId})`);

          try {
            const content = await fetchFileContent(fileId, token);
            resolve(content);
          } catch (err) {
            reject(err);
          }
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}

/**
 * Google Drive Picker를 열어 JSON 파일을 선택하고 맵 데이터를 로드합니다.
 *
 * 동작 흐름:
 * 1. store에서 API Key와 Client ID 설정을 확인합니다.
 * 2. Google API 및 GIS 라이브러리를 필요 시 로드합니다.
 * 3. OAuth2 액세스 토큰을 요청합니다.
 * 4. Drive Picker를 표시합니다.
 * 5. 선택된 파일의 JSON을 파싱하여 store에 추가합니다.
 *
 * @returns {Promise<object|null>} 로드된 맵 데이터, 취소 또는 실패 시 null
 * @throws {Error} 설정 미완료 또는 API 오류 시
 */
export async function openGoogleDrivePicker() {
  const { apiKey, clientId } = store.state.settings.gdrive;

  if (!apiKey || !clientId) {
    const msg = 'Google Drive 설정이 완료되지 않았습니다. 설정에서 API Key와 Client ID를 입력하세요.';
    console.error(msg);
    store.emit('toast:show', { message: msg, type: 'error' });
    throw new Error(msg);
  }

  store.setLoading(true);

  try {
    // Google API 라이브러리 병렬 로드
    await Promise.all([
      ensureGapiLoaded(),
      ensureGisLoaded()
    ]);

    // 기존 토큰이 없으면 새로 요청
    if (!accessToken) {
      accessToken = await requestAccessToken(clientId);
    }

    // Picker 표시 및 파일 선택 대기
    const mapData = await showPicker(apiKey, accessToken);

    if (!mapData) {
      console.log('Google Drive Picker에서 선택이 취소되었습니다.');
      return null;
    }

    // 데이터 유효성 기본 검사
    if (!mapData.id || !mapData.title) {
      throw new Error('선택한 파일이 유효한 맵 데이터 형식이 아닙니다. id와 title 필드가 필요합니다.');
    }

    // store에 맵 데이터 추가 및 선택
    addMapToStore(mapData);

    console.log(`Google Drive에서 맵 로드 완료: ${mapData.title}`);
    store.emit('toast:show', {
      message: `"${mapData.title}" 맵을 Google Drive에서 로드했습니다.`,
      type: 'success'
    });

    return mapData;
  } catch (err) {
    // 토큰 만료 등으로 실패 시 토큰 초기화
    if (err.message && err.message.includes('401')) {
      accessToken = null;
    }
    console.error('Google Drive 파일 로드 오류:', err);
    store.emit('toast:show', {
      message: `Google Drive 로드 실패: ${err.message}`,
      type: 'error'
    });
    throw err;
  } finally {
    store.setLoading(false);
  }
}

/**
 * Google Drive 연동이 설정되어 있는지 확인합니다.
 * @returns {boolean}
 */
export function isGDriveConfigured() {
  const { apiKey, clientId } = store.state.settings.gdrive;
  return !!(apiKey && clientId);
}

/**
 * 현재 캐시된 OAuth 액세스 토큰을 무효화합니다.
 * 사용자 로그아웃 시 호출합니다.
 */
export function revokeAccess() {
  if (accessToken && window.google && window.google.accounts) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      console.log('Google Drive 액세스 토큰이 해제되었습니다.');
    });
  }
  accessToken = null;
}
