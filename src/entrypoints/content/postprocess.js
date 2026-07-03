import { contentBlock, contentMemo } from './filters';
import { app } from './messaging';
import { config, keyEnum, normalizeKey } from './state';

export let postprocessing = {};

postprocessing.blurImage = function () {
    if(config.blurImage === false) return;
    var target = $('.gallview_contents').children('.inner');
    var select = $(target).find('img, video');
    target.find('img').removeAttr('onclick');
    select.attr('blur', 'y');
    select.on('click', function (event) {
        $(this).attr('blur', 'n');
        event.preventDefault();
        event.stopPropagation();
    });

};
postprocessing.forceReloadImage = function () {
    if(config.autoRefreshImage === false) return;
    var target = $('.writing_view_box').find('img[src^=http][onclick^="javascript"]');
    $.each(target, function (index, item) {
        var replace = $('.appending_file').children().eq(index).children().attr('href');
        $(item).attr('src', replace);
    })
};
postprocessing.avoidServiceCode = function () {
    //for write page
    $('.write_infobox').focus().trigger('click');
    $('#subject').focus().trigger('click')
    $('.write_infobox').focus().trigger('click');
    $('#subject').focus().trigger('click').keydown(function (event) {
        if(normalizeKey(event) === keyEnum.TAB) {
            event.preventDefault();
            $('#tx_canvas_wysiwyg').focus();
        }
    });

    // avoiding service_code:undefine
    document.querySelectorAll('div').forEach(function (element) {
        element.dispatchEvent(new MouseEvent('mouseover', {bubbles: true, cancelable: true, view: window}));
    });

    $(document).on('click', '.btn_blue.btn_svc.write', function (event) {
        app.sendToBackground('write');
    });
};

postprocessing.setBackgroundColorForDarkMode = function () {
    if($('#css-darkmode').index() < 0) {
        return 'white'
    }
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
