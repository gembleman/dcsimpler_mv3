export let pageContext;

export function setPageContext(nextContext) {
    pageContext = nextContext;
}

export function createPageContext(locationRef = location) {
    let context = {};
    context = parsePathname2(locationRef.pathname);
    context.pathname = parsePathname(locationRef.pathname).reverse();
    context.calltype = context.pathname[0];
    context.query = parseQuery(locationRef.search);
    context.url = {};
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

    function parsePathname2(str) {
        return str.replace(/^\/+|\/+$/g, '').split('/').reduce((acc, cuv) => (acc[cuv] = true, acc), {});
    }

    function parsePathname(str) {
        return str.replace(/^\/+|\/+$/g, '').split('/');
    }

    function parseQuery(str) {
        let query = {};
        new URLSearchParams(str.replace(/^\?/, '')).forEach(function (value, key) {
            query[key] = value;
        });
        return query;
    }
}
