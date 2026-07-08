import { delegate, qsa } from './dom';
import { contentBlock } from './filters';
import { config } from './state';
import type { OpenConfigMessage } from '../../lib/messages';
import {
    getAutoRefreshRate,
    getRightPanelVisibility,
    saveAutoRefreshRate,
    saveRightPanelVisibility,
    updateConfig,
    type RightPanelVisibility,
} from '../../lib/storage';

interface AutoRefreshElement extends HTMLElement {
    intervalID?: ReturnType<typeof setInterval>;
}

function getReversePanelVisibility(visibility: RightPanelVisibility): RightPanelVisibility {
    return visibility === 'show' ? 'hide' : 'show';
}

function applyRightPanelVisibility(visibility: RightPanelVisibility) {
    qsa<HTMLElement>('.right_content').forEach((element) => {
        element.style.display = visibility === 'show' ? 'block' : 'none';
    });
    document.querySelector('#io-rptg')?.setAttribute('t', getReversePanelVisibility(visibility));
}

function createNavNode(
    id: string,
    label: string,
    options: { className?: string; display?: boolean; t?: string } = {},
) {
    const node = document.createElement('div');
    node.className = ['nav-node', options.className].filter(Boolean).join(' ');
    node.id = id;
    if (options.t !== undefined) node.setAttribute('t', options.t);

    const icon = document.createElement('div');
    icon.className = 'icon';
    node.append(icon);

    if (options.display) {
        const display = document.createElement('div');
        display.className = 'display';
        node.append(display);
    }

    const span = document.createElement('span');
    span.textContent = label;
    node.append(span);
    return node;
}

function getEyeLabel(isShowingBlocked: boolean) {
    return isShowingBlocked ? '차단 글 숨기기' : '차단 글 보기';
}

/**
 * 차단 글 보기/숨기기 상태를 토글하고 관련 UI(외부 버튼·네비게이터 아이콘)를 동기화한다.
 * 외부 버튼(#viewToggle) 유무와 무관하게 동작하도록 독립 함수로 분리했다.
 */
function toggleBlacklistView() {
    config.blacklist_view = config.blacklist_view !== true;
    // 새로고침 후에도 유지되도록 저장소에 반영한다.
    updateConfig({ blacklist_view: config.blacklist_view }).catch(() => {
        /* 저장소 접근 실패 시 현재 화면 상태만 유지 */
    });
    contentBlock.toContent('fade');
    contentBlock.toComment('fade');

    document.querySelector('#viewToggle')?.classList.toggle('on', config.blacklist_view);

    const eye = document.querySelector('#io-eye');
    if (eye) {
        eye.classList.toggle('on', config.blacklist_view);
        const label = eye.querySelector('span');
        if (label) label.textContent = getEyeLabel(config.blacklist_view);
    }
}

function createMenuBlock(id: string, label: string, className?: string) {
    const block = document.createElement('div');
    block.className = ['menu-block', className].filter(Boolean).join(' ');
    block.id = id;
    block.textContent = label;
    return block;
}

function createOptionNode() {
    const node = createNavNode('io-opt', '세부 설정');
    const slideMenu = document.createElement('div');
    slideMenu.id = 'opt-slideMenu';

    const icon = document.createElement('div');
    icon.className = 'icon';

    slideMenu.append(
        icon,
        createMenuBlock('config', '설정'),
    );
    node.querySelector('.icon')?.after(slideMenu);
    return node;
}

function createNavigator(eyeState: string, panelState: string) {
    const nav = document.createElement('div');
    nav.id = 'dcs_nav';
    nav.append(
        createNavNode('io-progress', '로딩 현황', { t: '0', display: true }),
        createNavNode('io-autoRefresh', '자동 새로고침', { t: '0' }),
        createNavNode('io-eye', getEyeLabel(eyeState === 'on'), { className: eyeState }),
        createOptionNode(),
        createNavNode('io-rptg', '우측 패널 최소/최대화', { t: panelState }),
    );
    return nav;
}

export function mountNavigator() {
    const viewString = config.blacklist_view === true ? 'on' : 'off';
    let rightPanelVisibility: RightPanelVisibility = 'show';

    document.querySelector('.right_box')?.prepend(createNavigator(viewString, getReversePanelVisibility(rightPanelVisibility)));
    applyRightPanelVisibility(rightPanelVisibility);
    restoreAutoRefresh();
    getRightPanelVisibility()
        .then((visibility) => {
            rightPanelVisibility = visibility;
            applyRightPanelVisibility(visibility);
        })
        .catch(() => {
            applyRightPanelVisibility(rightPanelVisibility);
        });

    delegate(document, 'click', '#io-autoRefresh', function () {
        const element = document.querySelector<AutoRefreshElement>('#io-autoRefresh');
        if (element) toggleAutoRefresh(element);
    });
    delegate(document, 'click', '#io-eye', function () {
        toggleBlacklistView();
    });
    delegate(document, 'click', '#io-opt', function (evt) {
        const slideMenu = document.querySelector<HTMLElement>('#opt-slideMenu');
        if (slideMenu) slideMenu.style.display = slideMenu.style.display === 'block' ? 'none' : 'block';
        const target = evt.target instanceof Element ? evt.target : null;
        switch (target?.id) {
            case 'config' : {
                const message: OpenConfigMessage = { flag: 'openConfig' };
                chrome.runtime.sendMessage(message);
                break;
            }
        }
    });
    delegate(document, 'click', '#io-rptg', function () {
        rightPanelVisibility = getReversePanelVisibility(rightPanelVisibility);
        applyRightPanelVisibility(rightPanelVisibility);
        saveRightPanelVisibility(rightPanelVisibility).catch(() => {
            /* 저장소 접근 실패 시 현재 화면 상태만 유지 */
        });
    });
}

function startAutoRefresh(element: AutoRefreshElement, refreshRate: number) {
    if (element.intervalID) clearInterval(element.intervalID);
    if (refreshRate > 0) {
        element.classList.add('-running');
        element.intervalID = setInterval(function () {
            document.querySelector<HTMLElement>('.btn_normal')?.click();
        }, refreshRate * 1000);
    } else {
        element.classList.remove('-running');
    }
}

/** 저장된 주기를 읽어 자동 새로고침을 복원한다 (갤러리 이동 후 유지용). */
function restoreAutoRefresh() {
    getAutoRefreshRate()
        .then((refreshRate) => {
            const element = document.querySelector<AutoRefreshElement>('#io-autoRefresh');
            if (element && refreshRate > 0) startAutoRefresh(element, refreshRate);
        })
        .catch(() => {
            /* 저장소 접근 실패 시 자동 새로고침을 켜지 않는다 */
        });
}

function toggleAutoRefresh(element: AutoRefreshElement) {
    const refreshRate = Number(window.prompt('자동 새로고침 주기를 설정해주세요 \n 초 단위, 0 이하의 숫자 입력 시 초기화됩니다', '0'));
    const normalizedRate = !isNaN(refreshRate) && refreshRate > 0 ? refreshRate : 0;
    startAutoRefresh(element, normalizedRate);
    saveAutoRefreshRate(normalizedRate).catch(() => {
        /* 저장소 접근 실패 시 현재 화면 상태만 유지 */
    });
}

export function mountOuterButtons() {
    if (config.showOuterButtons === false) return;
    const backTop = document.createElement('a');
    backTop.id = 'backTop';
    backTop.className = 'external-button blue';
    backTop.textContent = 'TOP';

    const viewToggle = document.createElement('a');
    viewToggle.id = 'viewToggle';
    viewToggle.className = config.blacklist_view ? 'external-button on' : 'external-button';

    document.querySelector('.dcwrap')?.append(backTop, viewToggle);
    delegate(document, 'click', '.external-button#viewToggle', function () {
        toggleBlacklistView();
    });
    delegate(document, 'click', '.external-button#backTop', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

export function mountImageRefreshButton() {
    const title = document.querySelector('.title');
    if (!title) return;
    title.querySelector('.refreshBtn')?.remove();
    const button = document.createElement('div');
    button.className = 'refreshBtn';
    button.setAttribute('style', 'float : right; cursor: pointer; padding: 0 0 0 0;');
    button.textContent = '이미지 새로고침';
    title.append(button);

    button.addEventListener('click', function () {
        qsa('.writing_view_box img[src^=https]').forEach(function (item, index) {
            const replace = document.querySelectorAll('.appending_file > *')[index]?.querySelector('[href]')?.getAttribute('href');
            if (replace) item.setAttribute('src', replace);
        });
    });
}
