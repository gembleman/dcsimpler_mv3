import { pageContext } from './context';
import { delegate, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { bindHotkeys } from './hotkeys';
import type { OpenConfigMessage } from '../../lib/messages';
import { observeCommentMutations } from './comment-observer';
import { mountImageRefreshButton, mountNavigator, mountOuterButtons } from './page-ui-controls';
import { mountVisitHistory } from './page-ui-visit-history';

interface PageUiDependencies {
    loadList: (requestURL?: string) => void | Promise<void>;
}

type ProgressStatus = -2 | -1 | 0 | 1;
type ProgressLabel = 'loading' | 'success' | 'fail' | 'error' | 'fatalError';
type ManipulateMethodName =
    | 'wrapLists'
    | 'arrayTab'
    | 'navigator'
    | 'visitHistory'
    | 'outerButton'
    | 'imageRefreshBtn'
    | 'hotkeybinding'
    | 'globalListener'
    | 'observeComment';

let pageUiDependencies: PageUiDependencies = { loadList: () => undefined };


export function setPageUiDependencies(dependencies: Partial<PageUiDependencies>) {
    pageUiDependencies = { ...pageUiDependencies, ...dependencies };
}

export const manipulateDOM = {
    wrapLists: () => {
        const gallList = document.querySelector('.gall_list');
        if (!gallList || gallList.parentElement?.classList.contains('wrapGL')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'wrapGL';
        gallList.parentNode?.insertBefore(wrapper, gallList);
        wrapper.append(gallList);
    },
    arrayTab: () => {
        qsa('.array_tab').forEach((tab) => {
            Array.from(tab.children).filter((child) => child.tagName === 'BUTTON').forEach((button) => button.remove());
            tab.append(createArrayTabButtons(''));
            const dialogFixer = document.createElement('div');
            dialogFixer.className = 'dialog-fixer';
            dialogFixer.textContent = ' fixer ';
            tab.prepend(dialogFixer);
        });
        qsa('.list_bottom_btnbox .fl, .view_bottom_btnbox .fl').forEach((box) => {
            Array.from(box.children).filter((child) => child.tagName === 'BUTTON').forEach((button) => button.remove());
            const tab = document.createElement('div');
            tab.className = 'array_tab left_box';
            tab.append(createArrayTabButtons('goTop'));
            box.append(tab);
        });

        delegate(document, 'click', '.btn_normal, .btn_recommend, .btn_notice', arraytabListener);
        delegate(document, 'click', '.btn_config', function () {
            const message: OpenConfigMessage = { flag: 'openConfig' };
            chrome.runtime.sendMessage(message);
        });

        function arraytabListener (this: HTMLElement, event: Event) {
            const className = this.classList[0];
            qsa('.array_tab > button').forEach((button) => button.classList.remove('on'));
            qsa('.array_tab .'+className).forEach((button) => button.classList.add('on'));
            if (this.getAttribute('tag') === 'goTop') document.querySelector('.btn_normal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

            let classList = this.classList;
            if (classList.contains('btn_normal')) pageUiDependencies.loadList(pageContext.url.goNormal);
            else if (classList.contains('btn_recommend')) pageUiDependencies.loadList(pageContext.url.goRecommend);
            else if (classList.contains('btn_notice')) pageUiDependencies.loadList(pageContext.url.goNotice);
        }

        function createArrayTabButtons (moveTarget: string) {
            const fragment = document.createDocumentFragment();
            const exceptionMode = pageContext.query['exception_mode'];
            const isExceptionMode = !!exceptionMode;

            fragment.append(
                createArrayTabButton('btn_normal', '전체글', !isExceptionMode, moveTarget),
                createArrayTabButton('btn_recommend', '개념글', exceptionMode === 'recommend', moveTarget),
                createArrayTabButton('btn_notice', '공지', exceptionMode === 'notice', moveTarget),
                createArrayTabButton('btn_config', '설정', false),
            );
            return fragment;
        }

        function createArrayTabButton (className: string, label: string, active: boolean, moveTarget?: string) {
            const button = document.createElement('button');
            button.type = 'button';
            button.name = 'button';
            button.className = active ? `${className} on` : className;
            if (moveTarget !== undefined) button.setAttribute('tag', moveTarget);
            button.textContent = label;
            return button;
        }
    },
    navigator: mountNavigator,
    setProgress: (status: ProgressStatus) => {
        const label: ProgressLabel = status === 0? 'loading' : status === 1? 'success' : status === -1? 'fail' : status === -2? 'error' : 'fatalError';
        document.querySelector('#dcs_nav #io-progress')?.setAttribute('t', label);
    },
    visitHistory: mountVisitHistory,
    outerButton: mountOuterButtons,
    imageRefreshBtn: mountImageRefreshButton,
    hotkeybinding: bindHotkeys,
    globalListener: () => {
        delegate(document, 'click', '.dcs_pagenationChild', function () {
            pageUiDependencies.loadList(this.getAttribute('href') ?? undefined);
        });
    },
    observeComment: () => {
        const commentRoot = document.querySelector('.view_comment');
        if (!commentRoot) return;
        observeCommentMutations(commentRoot, function () {
            contentBlock.toComment();
            contentMemo.toComment();
        });
    },
    set: (option: Partial<Record<ManipulateMethodName, boolean>>) => {
        let tag = Object.keys(option) as ManipulateMethodName[];
        for(let i=0, j=tag.length ; i<j ; i++) {
            option[tag[i]] ? manipulateDOM[tag[i]]() : null;
        }
    },
    run: {
        lists: () => {
            manipulateDOM.set({ wrapLists: true, arrayTab: true, navigator: true, outerButton: true, visitHistory: true, globalListener: true, hotkeybinding: true });
        },
        view: () => {
            manipulateDOM.set({ wrapLists: true, arrayTab: true, navigator: true, outerButton: true, visitHistory: true, imageRefreshBtn: true, globalListener: true, hotkeybinding: true, observeComment: true });
        }
    }
};
