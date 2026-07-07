import { delegate, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { config } from './state';
import type { OpenConfigMessage } from '../../lib/messages';
import {
    getRightPanelVisibility,
    saveRightPanelVisibility,
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

function createOptionNode(loginLabel: string) {
    const node = createNavNode('io-opt', '세부 설정');
    const slideMenu = document.createElement('div');
    slideMenu.id = 'opt-slideMenu';

    const icon = document.createElement('div');
    icon.className = 'icon';
    const login = document.createElement('div');
    login.className = 'menu-block';
    login.id = 'login';
    login.textContent = loginLabel;
    const configButton = document.createElement('div');
    configButton.className = 'menu-block';
    configButton.id = 'config';
    configButton.textContent = '설정';

    slideMenu.append(icon, login, configButton);
    node.querySelector('.icon')?.after(slideMenu);
    return node;
}

function createNavigator(loginLabel: string, eyeState: string, panelState: string) {
    const nav = document.createElement('div');
    nav.id = 'dcs_nav';
    nav.append(
        createNavNode('io-progress', '로딩 현황', { t: '0', display: true }),
        createNavNode('io-autoRefresh', '자동 새로고침', { t: '0', display: true }),
        createNavNode('io-eye', '보기 모드', { className: eyeState, display: true }),
        createOptionNode(loginLabel),
        createNavNode('io-rptg', '우측 패널 최소/최대화', { t: panelState }),
    );
    return nav;
}

export function mountNavigator() {
    const loginCheck = document.querySelector('#login_box .user_info')?.getAttribute('data-alarmid');
    const loginString = loginCheck ? '로그아웃' : '로그인';
    const viewString = config.blacklist_view === true ? 'on' : 'off';
    let rightPanelVisibility: RightPanelVisibility = 'show';

    document.querySelector('.right_box')?.prepend(createNavigator(loginString, viewString, getReversePanelVisibility(rightPanelVisibility)));
    applyRightPanelVisibility(rightPanelVisibility);
    getRightPanelVisibility()
        .then((visibility) => {
            rightPanelVisibility = visibility;
            applyRightPanelVisibility(visibility);
        })
        .catch(() => {
            applyRightPanelVisibility(rightPanelVisibility);
        });

    delegate(document, 'click', '#io-opt', function (evt) {
        const slideMenu = document.querySelector<HTMLElement>('#opt-slideMenu');
        if (slideMenu) slideMenu.style.display = slideMenu.style.display === 'block' ? 'none' : 'block';
        const target = evt.target instanceof Element ? evt.target : null;
        switch (target?.id) {
            case 'login' : {
                const href = document.querySelector('.btn_top_loginout')?.getAttribute('href');
                if (href) window.location.href = href;
                break;
            }
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
    document.querySelector<AutoRefreshElement>('#io-autoRefresh')?.addEventListener('click', function (this: AutoRefreshElement) {
        const refreshRate = Number(window.prompt('자동 새로고침 주기를 설정해주세요 \n 초 단위, 0 이하의 숫자 입력 시 초기화됩니다', '0'));
        if (this.intervalID) clearInterval(this.intervalID);
        if (!isNaN(refreshRate) && refreshRate > 0) {
            this.classList.add('-running');
            this.intervalID = setInterval(function () {
                document.querySelector<HTMLElement>('.btn_normal')?.click();
            }, refreshRate*1000);
        } else {
            this.classList.remove('-running');
        }
    });
}

export function mountOuterButtons() {
    const backTop = document.createElement('a');
    backTop.id = 'backTop';
    backTop.className = 'external-button blue';
    backTop.textContent = 'TOP';

    const viewToggle = document.createElement('a');
    viewToggle.id = 'viewToggle';
    viewToggle.className = config.blacklist_view ? 'external-button on' : 'external-button';

    document.querySelector('.dcwrap')?.append(backTop, viewToggle);
    delegate(document, 'click', '.external-button#viewToggle', toggleContent);
    delegate(document, 'click', '.external-button#backTop', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function toggleContent() {
        if (config.blacklist_view === true) config.blacklist_view = false;
        else if (config.blacklist_view === false) config.blacklist_view = true;
        contentBlock.toContent('fade');
        contentBlock.toComment('fade');
        document.querySelector('#viewToggle')?.classList.toggle('on');
        document.querySelector('#io-eye')?.classList.toggle('on');
    }
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
