import { delegate, qsa } from './dom';
import { contentBlock, contentMemo } from './filters';
import { app } from './messaging';
import { config, keyEnum, normalizeKey } from './state';

export let postprocessing = {};

postprocessing.blurImage = function () {
    if(config.blurImage === false) return;
    var target = document.querySelector('.gallview_contents > .inner');
    if (!target) return;
    var select = qsa('img, video', target);
    qsa('img', target).forEach((image) => image.removeAttribute('onclick'));
    select.forEach((element) => {
        element.setAttribute('blur', 'y');
        element.addEventListener('click', function (event) {
            this.setAttribute('blur', 'n');
            event.preventDefault();
            event.stopPropagation();
        });
    });
};
postprocessing.forceReloadImage = function () {
    if(config.autoRefreshImage === false) return;
    qsa('.writing_view_box img[src^=http][onclick^="javascript"]').forEach(function (item, index) {
        var replace = document.querySelectorAll('.appending_file > *')[index]?.querySelector('[href]')?.getAttribute('href');
        if (replace) item.setAttribute('src', replace);
    });
};
postprocessing.avoidServiceCode = function () {
    document.querySelector('.write_infobox')?.focus();
    document.querySelector('.write_infobox')?.click();
    document.querySelector('#subject')?.focus();
    document.querySelector('#subject')?.click();
    document.querySelector('.write_infobox')?.focus();
    document.querySelector('.write_infobox')?.click();
    const subject = document.querySelector('#subject');
    subject?.focus();
    subject?.click();
    subject?.addEventListener('keydown', function (event) {
        if(normalizeKey(event) === keyEnum.TAB) {
            event.preventDefault();
            document.querySelector('#tx_canvas_wysiwyg')?.focus();
        }
    });

    document.querySelectorAll('div').forEach(function (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
    });

    delegate(document, 'click', '.btn_blue.btn_svc.write', function () {
        app.sendToBackground('write');
    });
};

postprocessing.setBackgroundColorForDarkMode = function () {
    if(!document.querySelector('#css-darkmode')) return 'white';
    else return '#121212';
};
postprocessing.run = {};
postprocessing.run.lists = function () {
    postprocessing.dialogBackgroundColor = postprocessing.setBackgroundColorForDarkMode();
};
postprocessing.run.view = function () {
    postprocessing.blurImage();
    postprocessing.forceReloadImage();
    contentBlock.toComment();
    contentMemo.toComment();
};
postprocessing.run.write = function () {
    postprocessing.avoidServiceCode();
};
