/**
 * settings.js
 * 설정 모달: GitHub 설정, Google Drive 설정, 연결 테스트, 저장/로드 기능
 */
import { store } from '../store.js';
import { createElement, $ } from '../utils/dom.js';
import { showToast } from './toast.js';

let modal = null;
let backdrop = null;

/** 입력 필드 참조 */
let fields = {};

/**
 * 설정 UI를 초기화한다.
 * 모달을 동적으로 생성하고 'settings:open' 이벤트를 구독한다.
 */
export function initSettings() {
  createModal();

  store.on('settings:open', openModal);
}

/**
 * 설정 모달 DOM을 생성한다.
 */
function createModal() {
  // 배경 오버레이
  backdrop = createElement('div', { className: 'settings-backdrop' });
  backdrop.style.display = 'none';
  backdrop.addEventListener('click', closeModal);

  // 모달
  modal = createElement('div', { className: 'settings-modal' });
  modal.addEventListener('click', (e) => e.stopPropagation());

  // 헤더
  const header = createElement('div', { className: 'settings-modal__header' });
  header.appendChild(createElement('h2', { textContent: '설정' }));

  const closeBtn = createElement('button', {
    className: 'settings-modal__close',
    textContent: '\u00D7',
    type: 'button'
  });
  closeBtn.addEventListener('click', closeModal);
  header.appendChild(closeBtn);
  modal.appendChild(header);

  // 본문
  const body = createElement('div', { className: 'settings-modal__body' });

  // GitHub 섹션
  body.appendChild(createSectionTitle('GitHub 설정', 'mdi:github'));
  body.appendChild(createField('github-owner', 'Owner', 'GitHub 사용자/조직명', 'text'));
  body.appendChild(createField('github-repo', 'Repository', '저장소 이름', 'text'));
  body.appendChild(createField('github-branch', 'Branch', '브랜치 이름', 'text'));
  body.appendChild(createField('github-token', 'Token', 'Personal Access Token', 'password'));

  // GitHub 버튼 그룹
  const githubBtnGroup = createElement('div', { className: 'settings-modal__btn-group' });

  const testBtn = createElement('button', {
    className: 'settings-modal__btn settings-modal__btn--secondary',
    type: 'button',
    textContent: '연결 테스트'
  });
  testBtn.addEventListener('click', testGitHubConnection);
  githubBtnGroup.appendChild(testBtn);

  const saveGhBtn = createElement('button', {
    className: 'settings-modal__btn settings-modal__btn--secondary',
    type: 'button',
    textContent: 'GitHub에 저장'
  });
  saveGhBtn.addEventListener('click', handleSaveToGitHub);
  githubBtnGroup.appendChild(saveGhBtn);

  body.appendChild(githubBtnGroup);

  // Google Drive 섹션
  body.appendChild(createSectionTitle('Google Drive 설정', 'mdi:google-drive'));
  body.appendChild(createField('gdrive-apiKey', 'API Key', 'Google API Key', 'text'));
  body.appendChild(createField('gdrive-clientId', 'Client ID', 'OAuth Client ID', 'text'));

  // Google Drive 버튼 그룹
  const gdriveBtnGroup = createElement('div', { className: 'settings-modal__btn-group' });

  const loadGdBtn = createElement('button', {
    className: 'settings-modal__btn settings-modal__btn--secondary',
    type: 'button',
    textContent: 'Google Drive에서 불러오기'
  });
  loadGdBtn.addEventListener('click', handleLoadFromGDrive);
  gdriveBtnGroup.appendChild(loadGdBtn);

  body.appendChild(gdriveBtnGroup);

  modal.appendChild(body);

  // 푸터
  const footer = createElement('div', { className: 'settings-modal__footer' });

  const cancelBtn = createElement('button', {
    className: 'settings-modal__btn settings-modal__btn--cancel',
    type: 'button',
    textContent: '취소'
  });
  cancelBtn.addEventListener('click', closeModal);
  footer.appendChild(cancelBtn);

  const saveBtn = createElement('button', {
    className: 'settings-modal__btn settings-modal__btn--primary',
    type: 'button',
    textContent: '저장'
  });
  saveBtn.addEventListener('click', handleSave);
  footer.appendChild(saveBtn);

  modal.appendChild(footer);

  // DOM에 추가
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

/**
 * 섹션 제목 요소를 생성한다.
 * @param {string} text
 * @param {string} icon
 * @returns {HTMLElement}
 */
function createSectionTitle(text, icon) {
  const title = createElement('h3', { className: 'settings-modal__section-title' });

  const iconEl = createElement('iconify-icon', {
    icon: icon,
    style: { marginRight: '8px', fontSize: '20px' }
  });
  title.appendChild(iconEl);
  title.appendChild(document.createTextNode(text));

  return title;
}

/**
 * 라벨 + 입력 필드 묶음을 생성한다.
 * @param {string} id - 필드 식별자 (fields 맵에 저장)
 * @param {string} label - 라벨 텍스트
 * @param {string} placeholder
 * @param {string} type - input 타입
 * @returns {HTMLElement}
 */
function createField(id, label, placeholder, type) {
  const group = createElement('div', { className: 'settings-modal__field' });

  const labelEl = createElement('label', {
    className: 'settings-modal__label',
    textContent: label
  });
  labelEl.setAttribute('for', `settings-${id}`);
  group.appendChild(labelEl);

  const input = createElement('input', {
    id: `settings-${id}`,
    className: 'settings-modal__input',
    type: type,
    placeholder: placeholder,
    autocomplete: 'off'
  });
  group.appendChild(input);

  fields[id] = input;

  return group;
}

/**
 * 모달을 열고 현재 설정 값을 입력 필드에 반영한다.
 */
function openModal() {
  if (!modal || !backdrop) return;

  const { github, gdrive } = store.state.settings;

  if (fields['github-owner']) fields['github-owner'].value = github.owner || '';
  if (fields['github-repo']) fields['github-repo'].value = github.repo || '';
  if (fields['github-branch']) fields['github-branch'].value = github.branch || 'main';
  if (fields['github-token']) fields['github-token'].value = github.token || '';
  if (fields['gdrive-apiKey']) fields['gdrive-apiKey'].value = gdrive.apiKey || '';
  if (fields['gdrive-clientId']) fields['gdrive-clientId'].value = gdrive.clientId || '';

  backdrop.style.display = '';
  // 애니메이션 트리거
  requestAnimationFrame(() => {
    backdrop.classList.add('settings-backdrop--active');
  });
}

/**
 * 모달을 닫는다.
 */
function closeModal() {
  if (!backdrop) return;

  backdrop.classList.remove('settings-backdrop--active');

  const onEnd = () => {
    backdrop.style.display = 'none';
    backdrop.removeEventListener('transitionend', onEnd);
  };
  backdrop.addEventListener('transitionend', onEnd);

  // fallback
  setTimeout(() => {
    backdrop.style.display = 'none';
  }, 400);
}

/**
 * 설정 저장 핸들러.
 * 입력 값을 수집하여 store에 저장한다.
 */
function handleSave() {
  const settings = {
    github: {
      owner: (fields['github-owner']?.value || '').trim(),
      repo: (fields['github-repo']?.value || '').trim(),
      branch: (fields['github-branch']?.value || 'main').trim(),
      token: (fields['github-token']?.value || '').trim()
    },
    gdrive: {
      apiKey: (fields['gdrive-apiKey']?.value || '').trim(),
      clientId: (fields['gdrive-clientId']?.value || '').trim()
    }
  };

  store.saveSettings(settings);
  showToast('설정이 저장되었습니다.', 'success');
  closeModal();
}

/**
 * GitHub 연결 테스트.
 * API를 호출하여 저장소 정보를 가져온다.
 */
async function testGitHubConnection() {
  const owner = (fields['github-owner']?.value || '').trim();
  const repo = (fields['github-repo']?.value || '').trim();
  const token = (fields['github-token']?.value || '').trim();

  if (!owner || !repo) {
    showToast('Owner와 Repository를 입력해주세요.', 'warning');
    return;
  }

  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });

    if (response.ok) {
      const data = await response.json();
      showToast(`연결 성공: ${data.full_name} (${data.private ? '비공개' : '공개'})`, 'success');
    } else if (response.status === 404) {
      showToast('저장소를 찾을 수 없습니다. Owner와 Repository를 확인해주세요.', 'error');
    } else if (response.status === 401) {
      showToast('인증 실패. Token을 확인해주세요.', 'error');
    } else {
      showToast(`GitHub API 오류: ${response.status}`, 'error');
    }
  } catch (err) {
    showToast(`연결 실패: ${err.message}`, 'error');
  }
}

/**
 * GitHub에 현재 맵 데이터를 저장한다.
 * github-saver 모듈을 동적으로 로드한다.
 */
async function handleSaveToGitHub() {
  const currentMap = store.state.currentMap;
  if (!currentMap) {
    showToast('저장할 맵이 선택되지 않았습니다.', 'warning');
    return;
  }

  try {
    const { isGitHubConfigured, saveToGitHub } = await import('../services/github-saver.js');

    if (!isGitHubConfigured()) {
      showToast('GitHub 설정을 먼저 완료해주세요.', 'warning');
      return;
    }

    const filename = `${currentMap.id || 'map'}.json`;
    await saveToGitHub(filename, currentMap);
    showToast('GitHub에 저장되었습니다.', 'success');
  } catch (err) {
    showToast(`GitHub 저장 실패: ${err.message}`, 'error');
  }
}

/**
 * Google Drive에서 맵 파일을 불러온다.
 * gdrive-loader 모듈을 동적으로 로드한다.
 */
async function handleLoadFromGDrive() {
  try {
    const { openGoogleDrivePicker } = await import('../services/gdrive-loader.js');
    await openGoogleDrivePicker();
    showToast('Google Drive에서 불러오기를 시작합니다.', 'info');
  } catch (err) {
    showToast(`Google Drive 불러오기 실패: ${err.message}`, 'error');
  }
}
