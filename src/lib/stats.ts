// 사용 통계(history) 관리 — 구 egyptian.js 포팅.
// 데이터 형태: { "d7/3": { gallId: { name, view, reply, write } } }

export type StatFlag = 'view' | 'write' | 'reply';

export interface GalleryStat {
  name: string;
  view: number;
  reply: number;
  write: number;
}

export type DayStats = Record<string, GalleryStat>;
export type HistoryStore = Record<string, DayStats>;
export type StatTotals = Pick<GalleryStat, StatFlag>;

export interface StatRequest {
  id?: string;
  name?: string;
  flag: StatFlag;
}

export function isHistoryStore(value: unknown): value is HistoryStore {
  return typeof value === 'object' && value !== null;
}

function dayKey(date: Date) {
  return 'd' + (date.getMonth() + 1) + '/' + date.getDate();
}

export function todayKey() {
  return dayKey(new Date());
}

/** 오늘부터 과거 range일까지의 빈 키 골격을 만든다 (차트 라벨 순서 보존용). */
function setupRange(range: number): HistoryStore {
  const obj: HistoryStore = {};
  const date = new Date();
  for (let i = 0; i < range; i++) {
    obj[dayKey(date)] = {};
    date.setDate(date.getDate() - 1);
  }
  return obj;
}

let historyMutationQueue: Promise<unknown> = Promise.resolve();

function enqueueHistoryMutation<T>(task: () => Promise<T>) {
  const next = historyMutationQueue.then(task, task);
  historyMutationQueue = next.catch(() => {});
  return next;
}

/** 최근 range일 범위 밖의 기록을 버리고 키 순서를 재정렬한다 (구 egypt.sync). */
export function pruneHistory(range = 30) {
  return enqueueHistoryMutation(async () => {
    const { history } = await chrome.storage.local.get('history');
    const skeleton = setupRange(range);
    const storedHistory = isHistoryStore(history) ? history : {};
    for (const key of Object.keys(storedHistory)) {
      if (key in skeleton) skeleton[key] = storedHistory[key];
    }
    await chrome.storage.local.set({ history: skeleton });
    return skeleton;
  });
}

/** view/write/reply 카운트 증가 (구 egypt.increase2). */
export function increaseStat({ id, name = '', flag }: StatRequest) {
  // 갤러리 id를 못 읽은 페이지의 요청은 무시한다 (history[...]["undefined"] 누적 방지).
  if (id == null || id === '' || id === 'undefined') return Promise.resolve();
  return enqueueHistoryMutation(async () => {
    const { history: storedHistory } = await chrome.storage.local.get('history');
    const history = isHistoryStore(storedHistory) ? storedHistory : {};
    const today = todayKey();
    if (!history[today]) history[today] = {};
    if (!history[today][id]) {
      history[today][id] = { name, view: 0, reply: 0, write: 0 };
    }
    history[today][id][flag]++;
    await chrome.storage.local.set({ history });
  });
}

export function clearHistory(range = 30) {
  return enqueueHistoryMutation(async () => {
    await chrome.storage.local.set({ history: setupRange(range) });
  });
}

export function groupByDay(history: HistoryStore = {}): Record<string, StatTotals> {
  const o: Record<string, StatTotals> = {};
  for (const [date, gallIds] of Object.entries(history)) {
    if (!o[date]) o[date] = { view: 0, write: 0, reply: 0 };
    for (const value of Object.values(gallIds)) {
      o[date].view += value.view;
      o[date].write += value.write;
      o[date].reply += value.reply;
    }
  }
  return o;
}

export function groupByGall(history: HistoryStore = {}): Record<string, GalleryStat> {
  const o: Record<string, GalleryStat> = {};
  for (const gallIds of Object.values(history)) {
    for (const [id, value] of Object.entries(gallIds)) {
      if (!o[id]) o[id] = { name: '', view: 0, write: 0, reply: 0 };
      if (o[id].name === '' && value.name) o[id].name = value.name;
      o[id].view += value.view;
      o[id].write += value.write;
      o[id].reply += value.reply;
    }
  }
  return o;
}

