export type PageCallType = 'view' | 'lists' | 'write' | 'modify' | string;

export interface PageContext {
    [segment: string]: unknown;
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

export function createPageContext(locationRef: Location = location): PageContext {
    let context = parsePathname2(locationRef.pathname);
    context.pathname = parsePathname(locationRef.pathname).reverse();
    context.calltype = context.pathname[0];
    context.query = parseQuery(locationRef.search);
    const url = new URL(locationRef.href);
    url.searchParams.delete('page');
    url.searchParams.delete('exception_mode');
    url.hash = '';
    context.url.regular = url.toString().replace(/\?$/, '');
    const queryGlue = context.url.regular.includes('?') ? '&' : '?';
    context.url.goNormal = context.url.regular + queryGlue + 'page=1';
    context.url.goRecommend = context.url.regular + queryGlue + 'page=1&exception_mode=recommend';
    context.url.goNotice = context.url.regular + queryGlue + 'page=1&exception_mode=notice';
    return context;

    function parsePathname2(str: string): PageContext {
        return str.replace(/^\/+|\/+$/g, '').split('/').reduce((acc, cuv) => (acc[cuv] = true, acc), {
            pathname: [],
            calltype: '',
            query: {},
            url: {
                regular: '',
                goNormal: '',
                goRecommend: '',
                goNotice: '',
            },
        } as PageContext);
    }

    function parsePathname(str: string): string[] {
        return str.replace(/^\/+|\/+$/g, '').split('/');
    }

    function parseQuery(str: string): Record<string, string> {
        let query: Record<string, string> = {};
        new URLSearchParams(str.replace(/^\?/, '')).forEach(function (value, key) {
            query[key] = value;
        });
        return query;
    }
}
