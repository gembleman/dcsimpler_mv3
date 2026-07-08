import type { AppConfig, BlacklistFilter, BlacklistFilterKey } from '@/lib/default-config';
import type { VisitedGallery } from '@/lib/storage';
import { qs } from '@/lib/dom';

// '' 은 전체 갤러리(공통) 필터를, 그 외 문자열은 해당 갤러리 ID의 필터를 가리킨다.
export type BlacklistScope = string;

function emptyFilter(): BlacklistFilter {
    return { id: 'a^', ip: 'a^', nickname: 'a^', keyword: 'a^' };
}

/** 사용자가 갤러리 URL을 통째로 붙여넣어도 갤러리 ID만 뽑아낸다. */
export function normalizeGalleryId(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const idParam = trimmed.match(/[?&]id=([^&#]+)/);
    if (idParam) return decodeURIComponent(idParam[1]);
    return trimmed;
}

let currentScope: BlacklistScope = '';

export function getCurrentScope(): BlacklistScope {
    return currentScope;
}

export function setCurrentScope(scope: BlacklistScope): void {
    currentScope = scope;
}

/** 현재 스코프에 해당하는 필터 객체를 반환한다. 갤러리 필터가 없으면 즉석에서 만든다. */
export function getScopedFilter(config: AppConfig, scope: BlacklistScope = currentScope): BlacklistFilter {
    if (scope === '') return config.blacklist_filter;
    let filter = config.blacklist_filter_by_gallery[scope];
    if (!filter) {
        filter = emptyFilter();
        config.blacklist_filter_by_gallery[scope] = filter;
    }
    return filter;
}

/** 갤러리 필터가 4개 키 모두 비어 있으면(a^) 저장소를 오염시키지 않도록 맵에서 제거한다. */
export function pruneEmptyScope(config: AppConfig, scope: BlacklistScope): void {
    if (scope === '') return;
    const filter = config.blacklist_filter_by_gallery[scope];
    if (!filter) return;
    const keys: BlacklistFilterKey[] = ['id', 'ip', 'nickname', 'keyword'];
    const allEmpty = keys.every((key) => !filter[key] || filter[key] === 'a^');
    if (allEmpty) delete config.blacklist_filter_by_gallery[scope];
}

type GalleryOption = { id: string; name: string };

/** 방문 갤러리 목록과 필터가 설정된 갤러리를 합쳐 드롭다운에 표시할 목록을 만든다. */
export function collectGalleryOptions(config: AppConfig, visited: VisitedGallery[]): GalleryOption[] {
    const names = new Map<string, string>();
    // 최근 방문 갤러리를 먼저 담아 방문 순서(앞이 최신)를 유지한다.
    for (const { id, name } of visited) {
        if (id && !names.has(id)) names.set(id, name || id);
    }
    // 방문 목록에 없지만 필터만 설정된 갤러리도 빠짐없이 노출한다.
    for (const id of Object.keys(config.blacklist_filter_by_gallery)) {
        if (!names.has(id)) names.set(id, id);
    }
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
}

/** 드롭다운(select) 옵션을 갱신한다. 필터가 설정된 갤러리는 ● 표시를 붙인다. */
export function renderScopeSelect(config: AppConfig, visited: VisitedGallery[]): void {
    const select = qs<HTMLSelectElement>('.blacklist-scope-select');
    if (!select) return;
    const previous = select.value;
    const options = collectGalleryOptions(config, visited);

    select.textContent = '';
    const common = document.createElement('option');
    common.value = '';
    common.textContent = '전체 갤러리 (공통)';
    select.append(common);

    for (const { id, name } of options) {
        const option = document.createElement('option');
        option.value = id;
        const hasFilter = id in config.blacklist_filter_by_gallery;
        option.textContent = (hasFilter ? '● ' : '') + name + ' (' + id + ')';
        select.append(option);
    }

    select.value = [...select.options].some((o) => o.value === previous) ? previous : currentScope;
}
