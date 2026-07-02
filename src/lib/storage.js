// chrome.storage.local 기반 저장 계층 (구 lsmm.js / localStorage 대체)
import { defaultConfig } from './default-config';

export async function getConfig() {
  const { config } = await chrome.storage.local.get('config');
  return { ...defaultConfig, ...(config ?? {}) };
}

export async function saveConfig(config) {
  await chrome.storage.local.set({ config });
}

/** 기본값과 병합해 저장소에 반영한다 (설치/업데이트 시 새 키 보충). */
export async function ensureConfig() {
  const merged = await getConfig();
  await saveConfig(merged);
  return merged;
}
