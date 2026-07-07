export type KnownPageCallType = 'view' | 'lists' | 'write' | 'modify';
export type PageCallType = KnownPageCallType | string;

export interface PageContext {
    [segment: string]: unknown;
    segments: Record<string, true>;
    pathname: string[];
    calltype: PageCallType;
    query: Record<string, string>;
    url: {
        regular: string;
        goNormal: string;
        goRecommend: string;
        goNotice: string;
    };
}

export let pageContext: PageContext;

export function setPageContext(nextContext: PageContext) {
    pageContext = nextContext;
}

function parsePathname(str: string): string[] {
    return str.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

function createSegmentFlags(pathname: string[]): Record<string, true> {
    return pathname.reduce<Record<string, true>>((acc, segment) => {
        acc[segment] = true;
        return acc;
    }, {});
}

function parseQuery(str: string): Record<string, string> {
    const query: Record<string, string> = {};
    new URLSearchParams(str.replace(/^\?/, '')).forEach(function (value, key) {
        query[key] = value;
    });
    return query;
}

function createListUrls(locationRef: Location): PageContext['url'] {
    const url = new URL(locationRef.href);
    url.searchParams.delete('page');
    url.searchParams.delete('exception_mode');
    url.hash = '';
    const regular = url.toString().replace(/\?$/, '');
    const queryGlue = regular.includes('?') ? '&' : '?';
    return {
        regular,
        goNormal: regular + queryGlue + 'page=1',
        goRecommend: regular + queryGlue + 'page=1&exception_mode=recommend',
        goNotice: regular + queryGlue + 'page=1&exception_mode=notice',
    };
}

export function createPageContext(locationRef: Location = location): PageContext {
    const pathname = parsePathname(locationRef.pathname).reverse();
    const segments = createSegmentFlags(pathname);
    return {
        ...segments,
        segments,
        pathname,
        calltype: pathname[0] ?? '',
        query: parseQuery(locationRef.search),
        url: createListUrls(locationRef),
    };
}
