// MV3 service worker — 구 background.js 대체.
// M1: config 저장/응답, 통계 수집, 옵션 페이지 열기 등 최소 기능.
// M4에서 커맨드(Alt+S), 프리프로세싱 CSS 주입, autoInsertImage를 이식한다.
import { getConfig, ensureConfig } from '@/lib/storage';
import { pruneHistory, increaseStat } from '@/lib/stats';

const STAT_FLAGS = ['view', 'write', 'reply'];

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    ensureConfig();
    if (details.reason === 'install') {
      // MV2에서는 설치 시 alert로 안내했으나 SW에서는 불가 → 옵션 페이지의 도움말로 대체
      chrome.runtime.openOptionsPage();
    } else if (details.reason === 'update') {
      chrome.storage.local.set({ updateChk: true });
    }
  });

  // SW가 깨어날 때마다 가볍게 정합성 유지
  ensureConfig();
  pruneHistory(30);

  chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || typeof request.flag !== 'string') return false;

    if (request.flag === 'request') {
      getConfig().then(sendResponse);
      return true; // async 응답
    }
    if (request.flag === 'openConfig') {
      chrome.runtime.openOptionsPage();
      return false;
    }
    if (STAT_FLAGS.includes(request.flag)) {
      increaseStat(request).then(() => sendResponse({ baz: 'success' }));
      return true;
    }
    return false;
  });
});
