import { delegate, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { app } from './messaging';
import { config, keyEnum, normalizeKey } from './state';

function focusAndClick(selector: string): HTMLElement | null {
    const element = document.querySelector<HTMLElement>(selector);
    element?.focus();
    element?.click();
    return element ?? null;
}

function dispatchMouseoverToDivs(): void {
    document.querySelectorAll('div').forEach(function (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
    });
}

function bindSubjectTabFocus(subject: HTMLElement | null): void {
    subject?.addEventListener('keydown', function (event) {
        if(normalizeKey(event) === keyEnum.TAB) {
            event.preventDefault();
            document.querySelector<HTMLElement>('#tx_canvas_wysiwyg')?.focus();
        }
    });
}

function bindWriteSubmitTracking(): void {
    delegate(document, 'click', '.btn_blue.btn_svc.write', function () {
        app.sendToBackground('write');
    });
}

export const postprocessing = {
    dialogBackgroundColor: 'white',
    blurImage() {
        if(config.blurImage === false) return;
        const target = document.querySelector('.gallview_contents > .inner');
        if (!target) return;
        const select = qsa('img, video', target);
        qsa('img', target).forEach((image) => image.removeAttribute('onclick'));
        select.forEach((element) => {
            element.setAttribute('blur', 'y');
            element.addEventListener('click', function (this: Element, event) {
                this.setAttribute('blur', 'n');
                event.preventDefault();
                event.stopPropagation();
            });
        });
    },
    forceReloadImage() {
        if(config.autoRefreshImage === false) return;
        qsa('.writing_view_box img[src^=http][onclick^="javascript"]').forEach(function (item, index) {
            const replace = document.querySelectorAll('.appending_file > *')[index]?.querySelector('[href]')?.getAttribute('href');
            if (replace) item.setAttribute('src', replace);
        });
    },
    avoidServiceCode() {
        focusAndClick('.write_infobox');
        focusAndClick('#subject');
        focusAndClick('.write_infobox');
        bindSubjectTabFocus(focusAndClick('#subject'));
        dispatchMouseoverToDivs();
        bindWriteSubmitTracking();
    },
    setBackgroundColorForDarkMode() {
        if(!document.querySelector('#css-darkmode')) return 'white';
        else return '#121212';
    },
    run: {
        lists() {
            postprocessing.dialogBackgroundColor = postprocessing.setBackgroundColorForDarkMode();
        },
        view() {
            postprocessing.blurImage();
            postprocessing.forceReloadImage();
            contentBlock.toComment();
            contentMemo.toComment();
        },
        write() {
            postprocessing.avoidServiceCode();
        },
    },
};
