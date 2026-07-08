// MV3 service worker — 구 background.js 대체.
// MV2 대비 변경점:
// - localStorage → chrome.storage.local (전역 config 캐시 제거, 매 이벤트마다 조회)
// - tabs.executeScript(code) → content script 메시지 위임 / scripting.executeScript({func})
// - tabs.insertCSS → scripting.insertCSS
// - 설치 시 alert → 옵션 페이지 열기로 대체, requestUpdateCheck 제거(웹스토어가 처리)
import { getConfig, ensureConfig } from '@/lib/storage';
import type { AppConfig } from '@/lib/default-config';
import { pruneHistory, increaseStat } from '@/lib/stats';
import { autoInsertImage } from '@/background/auto-image';
import {
  isConfigRequestMessage,
  isOpenConfigMessage,
  isStatRequestMessage,
  type ContentRequestMessage,
  type StatResponseMessage,
} from '@/lib/messages';

const GALL_BOARD_URL_REGEX =
  '^https://gall\\.dcinside\\.com/(?:board|(?:mgallery|mini|person)/+board)/(?:lists|view|write|modify)';

type PreprocessConfigKey =
  | 'upScale'
  | 'minimizeLayout'
  | 'blurImage'
  | 'alignLeftContentWriter';

type RuntimeInstalledDetails = {
  reason: string;
};

type WebNavigationCommittedDetails = {
  parentFrameId: number;
  tabId: number;
  frameId: number;
};

type WebNavigationFrameDetails = {
  frameId: number;
  tabId: number;
};

// 프리프로세싱 CSS (구 preprocessing.*)
const PREPROCESS_CSS = {
  upScale: (_config: AppConfig) =>
    '.gall_tit {font-size: 14px !important;} .gall_list td {padding: 3.5px 4px 3.5px 4px !important;}',
  minimizeLayout: (config: AppConfig) =>
    config.minimizeLayout_filter + '{display:none !important}',
  blurImage: (_config: AppConfig) =>
    '.gallview_contents > .inner img, .gallview_contents > .inner video{filter:blur(6px);-webkit-filter:blur(6px);}',
  alignLeftContentWriter: (_config: AppConfig) =>
    '.wrapGL td.gall_writer.ub-writer {text-align: left;}',
} satisfies Record<PreprocessConfigKey, (config: AppConfig) => string>;

const PREPROCESS_CONFIG_KEYS = Object.keys(PREPROCESS_CSS) as PreprocessConfigKey[];

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details: RuntimeInstalledDetails) => {
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

  chrome.runtime.onMessage.addListener(
    (
      request: unknown,
      _sender: unknown,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (isConfigRequestMessage(request)) {
        getConfig().then(sendResponse);
        return true; // async 응답
      }
      if (isOpenConfigMessage(request)) {
        chrome.runtime.openOptionsPage();
        return false;
      }
      if (isStatRequestMessage(request)) {
        increaseStat(request)
          .then(() => {
            const response: StatResponseMessage = { baz: 'success' };
            sendResponse(response);
          })
          .catch((e) => {
            console.log('Stat update failed.', e);
            const response: StatResponseMessage = { baz: 'fail' };
            sendResponse(response);
          });
        return true;
      }
      return false;
    },
  );

  // Alt+S — 글 등록. MV3는 코드 문자열 주입이 불가하므로 content script에 위임
  chrome.commands.onCommand.addListener(async (command: string) => {
    if (command !== 'write') return;
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      const tab = tabs[0];
      if (!tab?.id || !tab.url) return;
      const cond = tab.url.match(
        /https:\/\/gall\.dcinside\.com\/(?:board|(?:mgallery|mini|person)\/+board)\/(?:lists|view|write)/g,
      );
      if (cond) {
        const message: ContentRequestMessage = { flag: 'command:write' };
        await chrome.tabs.sendMessage(tab.id, message).catch(() => {
          /* content script가 없는 탭이면 무시 */
        });
      }
    } catch (e) {
      console.log('Command handling failed.', e);
    }
  });

  // 프리프로세싱 CSS 주입 (구 webNavigation.onCommitted + tabs.insertCSS)
  chrome.webNavigation.onCommitted.addListener(
    async (details: WebNavigationCommittedDetails) => {
      // 직계 자식 프레임(dcs_iframe)은 제외 — MV2 동작(parentFrameId !== 0) 유지
      if (details.parentFrameId === 0) return;
      const config = await getConfig();
      const css = PREPROCESS_CONFIG_KEYS
        .filter((key) => config[key])
        .map((key) => PREPROCESS_CSS[key](config))
        .join('\n');
      if (!css) return;
      chrome.scripting
        .insertCSS({
          target: { tabId: details.tabId, frameIds: [details.frameId] },
          css,
        })
        .catch(() => {
          /* 탭이 닫혔거나 접근 불가한 프레임 — 무시 */
        });
    },
    { url: [{ urlMatches: GALL_BOARD_URL_REGEX }] },
  );

  // 고정짤방 자동 삽입 (구 autoInsertImage)
  chrome.webNavigation.onDOMContentLoaded.addListener(
    (details: WebNavigationFrameDetails) => {
      if (details.frameId !== 0) return;
      autoInsertImage(details).catch((e) => {
        console.log('Auto image insertion failed.', e);
      });
    },
    {
      url: [
        {
          urlMatches:
            'gall\\.dcinside\\.com/(?:board|(?:mgallery|mini|person)/+board)/write/',
        },
      ],
    },
  );
});
