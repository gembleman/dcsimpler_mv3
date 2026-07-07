// chrome.storage.local 기반 저장 계층 (구 lsmm.js / localStorage 대체)
import { defaultConfig, type AppConfig } from './default-config';
import { isObjectRecord } from './type-guards';

export type RightPanelVisibility = 'show' | 'hide';

const RIGHT_PANEL_VISIBILITY_KEY = 'rightPanelVisibility';
const BOOLEAN_CONFIG_KEYS = [
  'autoRefreshImage',
  'blacklist',
  'blacklist_view',
  'blacklist_notice',
  'blurImage',
  'directView',
  'minimizeLayout',
  'addRightSideVisitHistory',
  'upScale',
  'userMemo',
  'autoInsertImage',
  'alignLeftContentWriter',
] as const satisfies readonly (keyof AppConfig)[];
const STRING_CONFIG_KEYS = ['minimizeLayout_filter', 'userMemo_filter'] as const satisfies readonly (keyof AppConfig)[];
const BLACKLIST_FILTER_KEYS = ['id', 'ip', 'nickname', 'keyword'] as const satisfies readonly (keyof AppConfig['blacklist_filter'])[];

// 구버전에서 최근방문목록 셀렉터가 실제 요소와 맞지 않던(.visit_history → 실제 #visit_history)
// 저장 설정을 교정한다. 사용자가 편집한 나머지 필터는 그대로 둔다.
function migrateConfig(config: AppConfig): AppConfig {
  const filter = config.minimizeLayout_filter;
  if (typeof filter === 'string' && /\.visit_history(?![\w-])/.test(filter)) {
    config.minimizeLayout_filter = filter.replace(/\.visit_history(?![\w-])/g, '#visit_history');
  }
  return config;
}

function isRightPanelVisibility(value: unknown): value is RightPanelVisibility {
  return value === 'show' || value === 'hide';
}

export function normalizeConfig(value: unknown): AppConfig {
  const source = isObjectRecord(value) ? value : {};
  const config: AppConfig = {
    ...defaultConfig,
    blacklist_filter: { ...defaultConfig.blacklist_filter },
  };

  for (const key of BOOLEAN_CONFIG_KEYS) {
    const candidate = source[key];
    if (typeof candidate === 'boolean') config[key] = candidate;
  }

  for (const key of STRING_CONFIG_KEYS) {
    const candidate = source[key];
    if (typeof candidate === 'string') config[key] = candidate;
  }

  const blacklistFilter = source.blacklist_filter;
  if (isObjectRecord(blacklistFilter)) {
    for (const key of BLACKLIST_FILTER_KEYS) {
      const candidate = blacklistFilter[key];
      if (typeof candidate === 'string') config.blacklist_filter[key] = candidate;
    }
  }

  return migrateConfig(config);
}

export async function getConfig(): Promise<AppConfig> {
  const { config } = await chrome.storage.local.get('config');
  return normalizeConfig(config);
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ config: normalizeConfig(config) });
}

/** 기본값과 병합해 저장소에 반영한다 (설치/업데이트 시 새 키 보충). */
export async function ensureConfig(): Promise<AppConfig> {
  const merged = await getConfig();
  await saveConfig(merged);
  return merged;
}

export async function getRightPanelVisibility(): Promise<RightPanelVisibility> {
  const stored = await chrome.storage.local.get(RIGHT_PANEL_VISIBILITY_KEY);
  const value = stored[RIGHT_PANEL_VISIBILITY_KEY];
  return isRightPanelVisibility(value) ? value : 'show';
}

export async function saveRightPanelVisibility(value: RightPanelVisibility): Promise<void> {
  await chrome.storage.local.set({ [RIGHT_PANEL_VISIBILITY_KEY]: value });
}
