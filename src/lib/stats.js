// 사용 통계(history) 관리 — 구 egyptian.js 포팅.
// 데이터 형태: { "d7/3": { gallId: { name, view, reply, write } } }

function dayKey(date) {
  return 'd' + (date.getMonth() + 1) + '/' + date.getDate();
}

export function todayKey() {
  return dayKey(new Date());
}

/** 오늘부터 과거 range일까지의 빈 키 골격을 만든다 (차트 라벨 순서 보존용). */
function setupRange(range) {
  const obj = {};
  const date = new Date();
  for (let i = 0; i < range; i++) {
    obj[dayKey(date)] = {};
    date.setDate(date.getDate() - 1);
  }
  return obj;
}

/** 최근 range일 범위 밖의 기록을 버리고 키 순서를 재정렬한다 (구 egypt.sync). */
export async function pruneHistory(range = 30) {
  const { history } = await chrome.storage.local.get('history');
  const skeleton = setupRange(range);
  for (const key of Object.keys(history ?? {})) {
    if (key in skeleton) skeleton[key] = history[key];
  }
  await chrome.storage.local.set({ history: skeleton });
  return skeleton;
}

/** view/write/reply 카운트 증가 (구 egypt.increase2). */
export async function increaseStat({ id, name, flag }) {
  const { history = {} } = await chrome.storage.local.get('history');
  const today = todayKey();
  if (!history[today]) history[today] = {};
  if (!history[today][id]) {
    history[today][id] = { name, view: 0, reply: 0, write: 0 };
  }
  history[today][id][flag]++;
  await chrome.storage.local.set({ history });
}

export async function clearHistory(range = 30) {
  await chrome.storage.local.set({ history: setupRange(range) });
}
