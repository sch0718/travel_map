import { store } from '../store.js';

/**
 * GitHub Contents API 연동 서비스
 * Personal Access Token(PAT)을 사용하여 맵 데이터를 GitHub 저장소에 저장합니다.
 */

/** GitHub API 기본 URL */
const GITHUB_API = 'https://api.github.com';

/**
 * GitHub 설정이 올바르게 구성되어 있는지 확인합니다.
 * @returns {boolean} owner, repo, token이 모두 설정되어 있으면 true
 */
export function isGitHubConfigured() {
  const { owner, repo, token } = store.state.settings.github;
  return !!(owner && repo && token);
}

/**
 * GitHub API 요청에 사용할 공통 헤더를 생성합니다.
 * @param {string} token - GitHub Personal Access Token
 * @returns {object} fetch 요청에 사용할 headers 객체
 */
function buildHeaders(token) {
  return {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };
}

/**
 * GitHub API에서 파일의 현재 정보(SHA 포함)를 조회합니다.
 * 파일이 존재하지 않으면 null을 반환합니다.
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {string} path - 파일 경로
 * @param {string} branch - 브랜치 이름
 * @param {string} token - PAT
 * @returns {Promise<{ sha: string, content: string } | null>}
 */
async function getFileInfo(owner, repo, path, branch, token) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(token)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub 파일 조회 실패 (${response.status}): ${errorData.message || response.statusText}`
    );
  }

  const data = await response.json();
  return {
    sha: data.sha,
    content: data.content
  };
}

/**
 * GitHub 저장소에 파일을 생성하거나 업데이트합니다.
 * @param {string} owner - 저장소 소유자
 * @param {string} repo - 저장소 이름
 * @param {string} path - 파일 경로
 * @param {string} content - base64 인코딩된 파일 내용
 * @param {string} message - 커밋 메시지
 * @param {string} branch - 브랜치 이름
 * @param {string} token - PAT
 * @param {string|null} sha - 기존 파일의 SHA (업데이트 시 필요, 새 파일이면 null)
 * @returns {Promise<object>} GitHub API 응답 데이터
 */
async function putFile(owner, repo, path, content, message, branch, token, sha) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
  const body = {
    message,
    content,
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `GitHub 파일 저장 실패 (${response.status}): ${errorData.message || response.statusText}`
    );
  }

  return response.json();
}

/**
 * 문자열을 base64로 인코딩합니다.
 * 한글 등 비 ASCII 문자를 올바르게 처리합니다.
 * @param {string} str - 인코딩할 문자열
 * @returns {string} base64 인코딩된 문자열
 */
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * base64 문자열을 디코딩합니다.
 * 한글 등 비 ASCII 문자를 올바르게 처리합니다.
 * @param {string} base64 - 디코딩할 base64 문자열
 * @returns {string} 디코딩된 문자열
 */
function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 맵 데이터를 GitHub 저장소에 저장합니다.
 *
 * 동작 흐름:
 * 1. GitHub 설정(owner, repo, token)을 확인합니다.
 * 2. 기존 파일의 SHA를 조회합니다 (파일이 있으면 업데이트, 없으면 생성).
 * 3. JSON을 base64 인코딩하여 PUT 요청으로 커밋합니다.
 * 4. 커밋 URL을 반환합니다.
 *
 * @param {string} filename - 저장할 파일 이름 (예: "jeju_food.json")
 * @param {object} data - 저장할 맵 데이터 객체
 * @returns {Promise<string>} 커밋 URL
 * @throws {Error} 설정 미완료 또는 API 오류 시
 */
export async function saveToGitHub(filename, data) {
  if (!isGitHubConfigured()) {
    const msg = 'GitHub 설정이 완료되지 않았습니다. 설정에서 owner, repo, token을 입력하세요.';
    console.error(msg);
    store.emit('toast:show', { message: msg, type: 'error' });
    throw new Error(msg);
  }

  const { owner, repo, branch, token } = store.state.settings.github;
  const filePath = `data/maps/${filename}`;
  const jsonContent = JSON.stringify(data, null, 2);
  const encodedContent = toBase64(jsonContent);

  store.setLoading(true);

  try {
    // 기존 파일 SHA 조회
    const existing = await getFileInfo(owner, repo, filePath, branch, token);
    const sha = existing ? existing.sha : null;

    const commitMessage = existing
      ? `update: ${data.title || filename} 맵 데이터 업데이트`
      : `add: ${data.title || filename} 맵 데이터 추가`;

    // 파일 생성 또는 업데이트
    const result = await putFile(
      owner, repo, filePath, encodedContent, commitMessage, branch, token, sha
    );

    const commitUrl = result.commit?.html_url || result.content?.html_url || '';
    console.log(`GitHub 저장 완료: ${filePath}`, commitUrl);

    store.emit('toast:show', {
      message: `"${data.title || filename}"을(를) GitHub에 저장했습니다.`,
      type: 'success'
    });

    return commitUrl;
  } catch (err) {
    console.error('GitHub 저장 오류:', err);
    store.emit('toast:show', {
      message: `GitHub 저장 실패: ${err.message}`,
      type: 'error'
    });
    throw err;
  } finally {
    store.setLoading(false);
  }
}

/**
 * manifest.json에 새 맵 파일을 추가합니다.
 *
 * 동작 흐름:
 * 1. 현재 저장소의 manifest.json을 가져옵니다.
 * 2. maps 배열에 새 파일명이 없으면 추가합니다.
 * 3. 업데이트된 manifest를 커밋합니다.
 *
 * @param {string} newFilename - 추가할 맵 파일 이름 (예: "new_map.json")
 * @returns {Promise<string>} 커밋 URL
 * @throws {Error} 설정 미완료 또는 API 오류 시
 */
export async function updateManifest(newFilename) {
  if (!isGitHubConfigured()) {
    const msg = 'GitHub 설정이 완료되지 않았습니다.';
    store.emit('toast:show', { message: msg, type: 'error' });
    throw new Error(msg);
  }

  const { owner, repo, branch, token } = store.state.settings.github;
  const manifestPath = 'data/manifest.json';

  store.setLoading(true);

  try {
    // 현재 manifest 조회
    const existing = await getFileInfo(owner, repo, manifestPath, branch, token);
    let manifest;

    if (existing) {
      // 줄바꿈이 포함된 base64를 정리하고 디코딩
      const cleanContent = existing.content.replace(/\n/g, '');
      manifest = JSON.parse(fromBase64(cleanContent));
    } else {
      // manifest가 없으면 새로 생성
      manifest = {
        version: 1,
        maps: [],
        system: {
          labels: 'system/labels.json',
          transportations: 'system/transportations.json'
        }
      };
    }

    // 이미 존재하면 추가하지 않음
    if (!Array.isArray(manifest.maps)) {
      manifest.maps = [];
    }

    if (manifest.maps.includes(newFilename)) {
      console.log(`manifest에 이미 "${newFilename}"이(가) 존재합니다.`);
      return '';
    }

    // 새 파일명 추가
    manifest.maps.push(newFilename);

    const encodedContent = toBase64(JSON.stringify(manifest, null, 2));
    const sha = existing ? existing.sha : null;
    const commitMessage = `manifest: ${newFilename} 추가`;

    const result = await putFile(
      owner, repo, manifestPath, encodedContent, commitMessage, branch, token, sha
    );

    const commitUrl = result.commit?.html_url || result.content?.html_url || '';
    console.log(`manifest 업데이트 완료: ${newFilename} 추가됨`, commitUrl);

    store.emit('toast:show', {
      message: `manifest에 "${newFilename}"을(를) 추가했습니다.`,
      type: 'success'
    });

    return commitUrl;
  } catch (err) {
    console.error('manifest 업데이트 오류:', err);
    store.emit('toast:show', {
      message: `manifest 업데이트 실패: ${err.message}`,
      type: 'error'
    });
    throw err;
  } finally {
    store.setLoading(false);
  }
}
