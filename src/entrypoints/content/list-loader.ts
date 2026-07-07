import { fetching } from './common';
import { pageContext } from './context';
import { parseHtml, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { manipulateDOM } from './page-ui';
import { config } from './state';

let listLoaderDependencies: any = { loadArticleViaDialog: null };

export function setListLoaderDependencies(dependencies) {
    listLoaderDependencies = { ...listLoaderDependencies, ...dependencies };
}

function escapeRegExp(value) {
    return value.replace(/[\^$.*+?()[]{}|]/g, '\$&');
}

function keywordHighlighting() {
    let keywordElement: any = document.querySelector('input[type="hidden"][name="s_keyword"], input[name="s_keyword"]');
    let keyword = keywordElement ? keywordElement.value : undefined;
    if (keyword && keyword != '' && keyword != 'null') {
        let keywordRegex = new RegExp(escapeRegExp(keyword));
        qsa('.gall_tit').forEach(function(gallTitle){
            let anchor = gallTitle.querySelector('a:first-child');
            if (!anchor) return;
            let tmpSubject = anchor.cloneNode(true);
            qsa('.icon_img', tmpSubject).forEach((icon) => icon.remove());
            tmpSubject = tmpSubject.innerHTML;
            if (tmpSubject.match(keywordRegex)) {
                var subject = tmpSubject.replace(keyword, '<span class="mark">'+ keyword +'</span>');
                anchor.innerHTML = anchor.innerHTML.replace(tmpSubject, subject);
            }
        });
    }
}

let listController = function () {
    this.controller = null;
    this.signal = null;
};

var lc = new listController();

export let loadList = async function (requestURL?: string) {
    manipulateDOM.setProgress(0);
    if(lc.controller) lc.controller.abort();
    if(requestURL == null) requestURL = location.href;
    lc.controller = new AbortController();
    lc.signal = lc.controller.signal;
    try {
        let res = await fetching(requestURL, lc);
        if(!res.ok) {
            manipulateDOM.setProgress(-1);
            throw new Error(res.status);
        }

        manipulateDOM.setProgress(1);
        history.replaceState({data: 'getLists'}, 'title', requestURL);
        let listDocument = parseHtml(await res.text());

        var newList: any = listDocument.querySelector('.gall_list');
        if (newList) {
            newList = newList.cloneNode(true);
            newList.classList.add('onload');
        }
        var newPagenation = listDocument.querySelectorAll('.bottom_paging_box')[1]?.innerHTML ?? '';

        const leftContent = document.querySelector('.left_content');
        const wrap = leftContent?.querySelector('.wrapGL');
        if (leftContent && wrap && newList) {
            leftContent.querySelectorAll('head').forEach((head) => head.remove());
            wrap.replaceChildren(newList);
            const paging = leftContent.querySelectorAll('.bottom_paging_box')[0];
            if (paging) {
                paging.innerHTML = newPagenation;
                qsa('a', paging).forEach((anchor) => {
                    anchor.setAttribute('onclick', 'return false;');
                    anchor.setAttribute('class', 'dcs_pagenationChild');
                });
            }
        }

        contentBlock.toContent();
        contentMemo.toContent();

        qsa('.left_content .ub-content .gall_tit a').forEach(function (anchor) {
            anchor.setAttribute('onclick', 'return false;');
            anchor.addEventListener('click', function (evt) {
                this.blur();
                const clickedIcon = evt.target instanceof Element && evt.target.classList[0] === 'icon_img';
                const href = this.getAttribute('href');
                if (clickedIcon || !pageContext.lists) window.location.href = href;
                else config.directView === true ? listLoaderDependencies.loadArticleViaDialog(href) : window.location.href = href;
            });
        });
        if(pageContext.query['s_keyword']) keywordHighlighting();
    } catch (error) {
        console.warn(error);
        manipulateDOM.setProgress(-2);
    }
}
