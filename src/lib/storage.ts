// chrome.storage.local 기반 저장 계층 (구 lsmm.js / localStorage 대체)
import { defaultConfig, type AppConfig, type BlacklistFilter } from './default-config';
import { isObjectRecord } from './type-guards';

export type RightPanelVisibility = 'show' | 'hide';

const RIGHT_PANEL_VISIBILITY_KEY = 'rightPanelVisibility';
const AUTO_REFRESH_RATE_KEY = 'autoRefreshRate';
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
  'showOuterButtons',
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

function normalizeBlacklistFilter(value: unknown): BlacklistFilter {
  const source = isObjectRecord(value) ? value : {};
  const filter: BlacklistFilter = { id: 'a^', ip: 'a^', nickname: 'a^', keyword: 'a^' };
  for (const key of BLACKLIST_FILTER_KEYS) {
    const candidate = source[key];
    if (typeof candidate === 'string') filter[key] = candidate;
  }
  return filter;
}

/** 갤러리별 필터 맵을 정규화한다. 유효한 문자열 키만 남기고 각 값을 필터로 검증한다. */
function normalizeGalleryFilters(value: unknown): Record<string, BlacklistFilter> {
  if (!isObjectRecord(value)) return {};
  const result: Record<string, BlacklistFilter> = {};
  for (const [gallId, filter] of Object.entries(value)) {
    if (!gallId) continue;
    result[gallId] = normalizeBlacklistFilter(filter);
  }
  return result;
}

export function normalizeConfig(value: unknown): AppConfig {
  const source = isObjectRecord(value) ? value : {};
  const config: AppConfig = {
    ...defaultConfig,
    blacklist_filter: { ...defaultConfig.blacklist_filter },
    blacklist_filter_by_gallery: {},
  };

  for (const key of BOOLEAN_CONFIG_KEYS) {
    const candidate = source[key];
    if (typeof candidate === 'boolean') config[key] = candidate;
  }

  for (const key of STRING_CONFIG_KEYS) {
    const candidate = source[key];
    if (typeof candidate === 'string') config[key] = candidate;
  }

  config.blacklist_filter = normalizeBlacklistFilter(source.blacklist_filter);
  config.blacklist_filter_by_gallery = normalizeGalleryFilters(source.blacklist_filter_by_gallery);

  return migrateConfig(config);
}

export async function getConfig(): Promise<AppConfig> {
  const { config } = await chrome.storage.local.get('config');
  return normalizeConfig(config);
}

export async function saveConfig(config: AppConfig): Promise<void> {
  await chrome.storage.local.set({ config: normalizeConfig(config) });
}

/** config의 일부 키만 저장소에 반영한다 (기존 값과 병합). */
export async function updateConfig(patch: Partial<AppConfig>): Promise<AppConfig> {
  const current = await getConfig();
  const next = { ...current, ...patch };
  await saveConfig(next);
  return next;
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

/** 자동 새로고침 주기(초). 0이면 비활성. 갤러리 이동 후에도 유지된다. */
export async function getAutoRefreshRate(): Promise<number> {
  const stored = await chrome.storage.local.get(AUTO_REFRESH_RATE_KEY);
  const value = stored[AUTO_REFRESH_RATE_KEY];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export async function saveAutoRefreshRate(value: number): Promise<void> {
  await chrome.storage.local.set({ [AUTO_REFRESH_RATE_KEY]: value > 0 ? value : 0 });
}

const VISITED_GALLERIES_KEY = 'visitedGalleries';
const VISITED_GALLERIES_LIMIT = 50;

/** 옵션 페이지의 갤러리 선택 목록에서 쓰는 최근 방문 갤러리(사이트 localStorage 미러). */
export interface VisitedGallery {
  id: string;
  name: string;
}

function normalizeVisitedGalleries(value: unknown): VisitedGallery[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: VisitedGallery[] = [];
  for (const entry of value) {
    if (!isObjectRecord(entry)) continue;
    const id = typeof entry.id === 'string' ? entry.id : '';
    const name = typeof entry.name === 'string' ? entry.name : '';
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, name: name || id });
  }
  return result;
}

export async function getVisitedGalleries(): Promise<VisitedGallery[]> {
  const stored = await chrome.storage.local.get(VISITED_GALLERIES_KEY);
  return normalizeVisitedGalleries(stored[VISITED_GALLERIES_KEY]);
}

/** 최근 방문 갤러리 목록을 병합 저장한다. 새 항목을 앞에 두고 중복 id는 제거한다. */
export async function mergeVisitedGalleries(incoming: VisitedGallery[]): Promise<void> {
  const normalizedIncoming = normalizeVisitedGalleries(incoming);
  if (normalizedIncoming.length === 0) return;
  const existing = await getVisitedGalleries();
  const merged = normalizeVisitedGalleries([...normalizedIncoming, ...existing]).slice(0, VISITED_GALLERIES_LIMIT);
  // 병합 결과가 기존과 동일하면 불필요한 쓰기를 건너뛴다.
  if (JSON.stringify(merged) === JSON.stringify(existing)) return;
  await chrome.storage.local.set({ [VISITED_GALLERIES_KEY]: merged });
}
