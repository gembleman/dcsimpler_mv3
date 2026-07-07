// MV3 service worker — 구 background.js 대체.
// MV2 대비 변경점:
// - localStorage → chrome.storage.local (전역 config 캐시 제거, 매 이벤트마다 조회)
// - tabs.executeScript(code) → content script 메시지 위임 / scripting.executeScript({func})
// - tabs.insertCSS → scripting.insertCSS
// - 설치 시 alert → 옵션 페이지 열기로 대체, requestUpdateCheck 제거(웹스토어가 처리)
import { getConfig, ensureConfig } from '@/lib/storage';
import { pruneHistory, increaseStat } from '@/lib/stats';

const STAT_FLAGS = ['view', 'write', 'reply'];

const GALL_BOARD_URL_REGEX =
  '^https://gall\\.dcinside\\.com/(?:board|(?:mgallery|mini|person)/+board)/(?:lists|view|write|modify)';

interface AutoInsertImageData {
  filename: string;
  filetype: string;
  filebyte: string;
}

function isAutoInsertImageData(value: unknown): value is AutoInsertImageData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<AutoInsertImageData>;
  return (
    typeof data.filename === 'string' &&
    typeof data.filetype === 'string' &&
    typeof data.filebyte === 'string'
  );
}

// 프리프로세싱 CSS (구 preprocessing.*)
const PREPROCESS_CSS = {
  upScale: () =>
    '.gall_tit {font-size: 14px !important;} .gall_list td {padding: 3.5px 4px 3.5px 4px !important;}',
  minimizeLayout: (config) =>
    config.minimizeLayout_filter + '{display:none !important}',
  blurImage: () =>
    '.gallview_contents > .inner img, .gallview_contents > .inner video{filter:blur(6px);-webkit-filter:blur(6px);}',
  alignLeftContentWriter: () =>
    '.wrapGL td.gall_writer.ub-writer {text-align: left;}',
};

function dataUrlToFile(dataurl, filename) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// 글쓰기 페이지에서 에디터 초기화 + r_key/갤러리 id 수집 (isolated world)
function collectWritePageInfo() {
  const editor = document.getElementById('tx_canvas_wysiwyg') as HTMLIFrameElement | null;
  if (editor) {
    let doc = editor.contentDocument ?? editor.contentWindow?.document;
    if (!doc) return;
    doc.body.innerHTML = '';
  }
  const status = document.getElementById('upload_status') as HTMLInputElement | null;
  if (status) status.value = 'Y';
  return {
    rKey: (document.getElementById('r_key') as HTMLInputElement | null)?.value,
    gallId: (document.getElementById('id') as HTMLInputElement | null)?.value,
  };
}

// 업로드된 이미지를 에디터에 첨부 (page world — 페이지의 Editor 객체 사용)
function attachUploadedImage(mockdata) {
  const sidebar = window.Editor?.getSidebar?.();
  const execAttach = sidebar?.getAttacher?.('image', window)?.attachHandler;
  if (typeof execAttach !== 'function') return false;
  execAttach(mockdata);
  document.getElementById('subject')?.focus();
  return true;
}

async function autoInsertImage(details) {
  const config = await getConfig();
  if (config.autoInsertImage === false) return;

  const { autoInsertImageData: data } =
    await chrome.storage.local.get('autoInsertImageData');
  if (!isAutoInsertImageData(data)) return;

  let injection;
  try {
    [injection] = await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: collectWritePageInfo,
    });
  } catch (e) {
    console.log('Write page inspection failed.', e);
    return;
  }
  const pageInfo = injection?.result;
  if (!pageInfo?.rKey || !pageInfo?.gallId) return;

  let uploaded;
  try {
    const formData = new FormData();
    formData.append('r_key', pageInfo.rKey);
    formData.append('upload_ing', 'N');
    formData.append('files[]', dataUrlToFile(data.filebyte, data.filename));
    const postUrl = `https://upimg.dcinside.com/upimg_file.php?id=${pageInfo.gallId}&r_key=${pageInfo.rKey}`;
    const res = await fetch(postUrl, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    uploaded = (await res.json())?.files?.[0];
  } catch (e) {
    console.log('Image transfer failed.', e);
    return;
  }
  if (!uploaded) {
    console.log('Image transfer failed: empty upload response.');
    return;
  }

  let imageUrl = null;
  for (const key of Object.keys(uploaded)) {
    if (key.includes('web') && key.includes('url')) imageUrl = uploaded[key];
  }
  if (imageUrl == null) imageUrl = uploaded.url;
  if (!imageUrl) {
    console.log('Image transfer failed: uploaded image URL is missing.');
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      world: 'MAIN',
      func: attachUploadedImage,
      args: [
        {
          imageurl: imageUrl,
          filename: uploaded.name,
          filesize: uploaded.size,
          imagealign: 'L',
          originalurl: uploaded.url,
          thumburl: uploaded._s_url,
          file_temp_no: uploaded.file_temp_no,
        },
      ],
    });
  } catch (e) {
    console.log('Image attach failed.', e);
  }
}

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
      increaseStat(request)
        .then(() => sendResponse({ baz: 'success' }))
        .catch((e) => {
          console.log('Stat update failed.', e);
          sendResponse({ baz: 'fail' });
        });
      return true;
    }
    return false;
  });

  // Alt+S — 글 등록. MV3는 코드 문자열 주입이 불가하므로 content script에 위임
  chrome.commands.onCommand.addListener((command) => {
    if (command !== 'write') return;
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id || !tab.url) return;
      const cond = tab.url.match(
        /https:\/\/gall\.dcinside\.com\/(?:board|(?:mgallery|mini|person)\/+board)\/(?:lists|view|write)/g,
      );
      if (cond) chrome.tabs.sendMessage(tab.id, { flag: 'command:write' });
    });
  });

  // 프리프로세싱 CSS 주입 (구 webNavigation.onCommitted + tabs.insertCSS)
  chrome.webNavigation.onCommitted.addListener(
    async (details) => {
      // 직계 자식 프레임(dcs_iframe)은 제외 — MV2 동작(parentFrameId !== 0) 유지
      if (details.parentFrameId === 0) return;
      const config = await getConfig();
      const css = Object.entries(PREPROCESS_CSS)
        .filter(([key]) => config[key])
        .map(([, cssOf]) => cssOf(config))
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
    (details) => {
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
