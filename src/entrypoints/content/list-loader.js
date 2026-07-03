import { fetching } from './common';
import { pageContext } from './context';
import { contentBlock, contentMemo } from './filters';
import { manipulateDOM } from './page-ui';
import { config } from './state';

let listLoaderDependencies = {
    loadArticleViaDialog: null
};

export function setListLoaderDependencies(dependencies) {
    listLoaderDependencies = { ...listLoaderDependencies, ...dependencies };
}

function keywordHighlighting() {
    let keyword = $('input:hidden[name=s_keyword]').val();
    if (keyword && keyword != "" && keyword != "null") {
        let escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let keywordRegex = new RegExp(escapedKeyword);
        $('.gall_tit').each(function(){
            let tmp_subject = $('a:first-child', this).clone();
            $('.icon_img', tmp_subject).remove();
            tmp_subject = $(tmp_subject).html();
            if (tmp_subject.match(keywordRegex)) {
                var subject = tmp_subject.replace(keyword, '<span class="mark">'+ keyword +'</span>');
                subject = $('a:first-child', this).html().replace(tmp_subject, subject);
                $('a:first-child', this).html(subject);
            }
        });
    }
}

let listController = function () {
    this.controller = null;
    this.signal = null;
};

var lc = new listController();

export let loadList = async function (requestURL) {
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
        let listHTML = await res.text();

        var newList = $(listHTML).find('.gall_list').addClass('onload').clone();
        var newPagenation = $(listHTML).find('.bottom_paging_box').eq(1).html();

        $('.left_content')
            .find('head').remove().end()
            .find('.wrapGL').html(newList[0]).end()
            .find('.bottom_paging_box').eq(0).html(newPagenation)
            .children('a').attr('onclick', 'return false;').attr('class', 'dcs_pagenationChild');

        contentBlock.toContent();
        contentMemo.toContent();

        $(".left_content .ub-content .gall_tit a").attr('onclick', 'return false;').click(function (evt) {
            $(this).blur();
            if (evt.target.classList[0] === 'icon_img' || !pageContext.lists) {
                window.location.href = $(this).attr('href');
            }
            else config.directView === true ? listLoaderDependencies.loadArticleViaDialog($(this).attr('href')) : window.location.href = $(this).attr('href');
        });
        if(pageContext.query["s_keyword"]) keywordHighlighting();
    } catch (error) {
        console.warn(error);
        manipulateDOM.setProgress(-2);
    }
}
