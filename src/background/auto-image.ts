import { getConfig } from '@/lib/storage';

interface AutoInsertImageData {
  filename: string;
  filetype: string;
  filebyte: string;
}

interface UploadedImageData {
  [key: string]: unknown;
  name?: string;
  size?: number;
  url?: string;
  _s_url?: string;
  file_temp_no?: string;
}

type WritePageInfo = {
  rKey?: string;
  gallId?: string;
};

type UploadedImageAttachment = {
  imageurl: string;
  filename?: string;
  filesize?: number;
  imagealign: 'L';
  originalurl?: string;
  thumburl?: string;
  file_temp_no?: string;
};

function isAutoInsertImageData(value: unknown): value is AutoInsertImageData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Partial<AutoInsertImageData>;
  return (
    typeof data.filename === 'string' &&
    typeof data.filetype === 'string' &&
    typeof data.filebyte === 'string'
  );
}

function dataUrlToFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mime = arr[0]?.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
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
    doc.body.replaceChildren();
  }
  const status = document.getElementById('upload_status') as HTMLInputElement | null;
  if (status) status.value = 'Y';
  return {
    rKey: (document.getElementById('r_key') as HTMLInputElement | null)?.value,
    gallId: (document.getElementById('id') as HTMLInputElement | null)?.value,
  };
}

// 업로드된 이미지를 에디터에 첨부 (page world - 페이지의 Editor 객체 사용)
function attachUploadedImage(mockdata: unknown) {
  const sidebar = window.Editor?.getSidebar?.();
  const execAttach = sidebar?.getAttacher?.('image', window)?.attachHandler;
  if (typeof execAttach !== 'function') return false;
  execAttach(mockdata);
  document.getElementById('subject')?.focus();
  return true;
}

async function inspectWritePage(tabId: number): Promise<Required<WritePageInfo> | null> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: collectWritePageInfo,
    });
    const pageInfo = injection?.result;
    return pageInfo?.rKey && pageInfo?.gallId
      ? { rKey: pageInfo.rKey, gallId: pageInfo.gallId }
      : null;
  } catch (e) {
    console.log('Write page inspection failed.', e);
    return null;
  }
}

async function uploadAutoInsertImage(data: AutoInsertImageData, pageInfo: Required<WritePageInfo>): Promise<UploadedImageData | null> {
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
    const uploadResponse = await res.json() as { files?: UploadedImageData[] };
    return uploadResponse.files?.[0] ?? null;
  } catch (e) {
    console.log('Image transfer failed.', e);
    return null;
  }
}

function getUploadedImageUrl(uploaded: UploadedImageData): string | null {
  for (const key of Object.keys(uploaded)) {
    const value = uploaded[key];
    if (key.includes('web') && key.includes('url') && typeof value === 'string') return value;
  }
  return uploaded.url ?? null;
}

function toUploadedImageAttachment(uploaded: UploadedImageData, imageUrl: string): UploadedImageAttachment {
  return {
    imageurl: imageUrl,
    filename: uploaded.name,
    filesize: uploaded.size,
    imagealign: 'L',
    originalurl: uploaded.url,
    thumburl: uploaded._s_url,
    file_temp_no: uploaded.file_temp_no,
  };
}

async function attachUploadedImageToTab(tabId: number, uploaded: UploadedImageData, imageUrl: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: attachUploadedImage,
      args: [toUploadedImageAttachment(uploaded, imageUrl)],
    });
  } catch (e) {
    console.log('Image attach failed.', e);
  }
}

export async function autoInsertImage(details: { tabId: number }) {
  const config = await getConfig();
  if (config.autoInsertImage === false) return;

  const { autoInsertImageData: data } =
    await chrome.storage.local.get('autoInsertImageData');
  if (!isAutoInsertImageData(data)) return;

  const pageInfo = await inspectWritePage(details.tabId);
  if (!pageInfo?.rKey || !pageInfo?.gallId) return;

  const uploaded = await uploadAutoInsertImage(data, pageInfo);
  if (!uploaded) {
    console.log('Image transfer failed: empty upload response.');
    return;
  }

  const imageUrl = getUploadedImageUrl(uploaded);
  if (!imageUrl) {
    console.log('Image transfer failed: uploaded image URL is missing.');
    return;
  }

  await attachUploadedImageToTab(details.tabId, uploaded, imageUrl);
}
