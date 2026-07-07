// chrome.storage.local 기반 저장 계층 (구 lsmm.js / localStorage 대체)
import { defaultConfig, type AppConfig } from './default-config';

// 구버전에서 최근방문목록 셀렉터가 실제 요소와 맞지 않던(.visit_history → 실제 #visit_history)
// 저장 설정을 교정한다. 사용자가 편집한 나머지 필터는 그대로 둔다.
function migrateConfig(config: AppConfig): AppConfig {
  const filter = config.minimizeLayout_filter;
  if (typeof filter === 'string' && /\.visit_history(?![\w-])/.test(filter)) {
    config.minimizeLayout_filter = filter.replace(/\.visit_history(?![\w-])/g, '#visit_history');
  }
  return config;
}

export async function getConfig(): Promise<AppConfig> {
  const { config } = await chrome.storage.local.get('config');
  return migrateConfig({ ...defaultConfig, ...(config ?? {}) });
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ config });
}

/** 기본값과 병합해 저장소에 반영한다 (설치/업데이트 시 새 키 보충). */
export async function ensureConfig(): Promise<AppConfig> {
  const merged = await getConfig();
  await saveConfig(merged);
  return merged;
}
