import { pageContext } from './context';
import { keyEnum, normalizeKey } from './state';

export function bindHotkeys() {      // 핫키바인딩을 아이프레임과 통합할 것
        $("html").keydown(function(event) { //단축키 : c댓글이동, w글작성 q차단토글 r새로고침 t상단으로
            var key = normalizeKey(event);

            //c : go reply panel
            if(key === keyEnum.C && !event.ctrlKey && !$(event.target).is("input, textarea")) {
                if (pageContext.lists && document.querySelector('#dcs_dialog')) {
                    $(document.getElementById('dcs_iframe').contentWindow.document).find("textarea").focus();
                }
                else if (pageContext.view) {
                    $('#avoiding_c').focus(); // avoding keyInput when hotkey 'C'
                    setTimeout(function () {$('body').find("textarea").focus();},10);
                }
            }
            //w : go write page
            else if(key === keyEnum.W && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) $('#btn_write').trigger("click");
            }
            //q : toggle blacklistView
            else if(key === keyEnum.Q && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea")) $('#viewToggle').trigger("click");
            }
            //r : refresh gallery
            else if(key === keyEnum.R && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) $('.btn_normal').first().trigger("click");
            }
            //t : go page top
            else if(key === keyEnum.T && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) $('html, body').animate({scrollTop : 0}, 400);
            }
            // a : back page list
            else if(key === keyEnum.A && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) {
                    var prev = $('body').find('.bottom_paging_box').children('em').prev();
                    if(prev.end().length === 0) prev = $('body').find('.bottom_paging_box').children('a').first();
                    prev.click();
                }
            }
            // s: forward page list
            else if(key === keyEnum.S && !event.ctrlKey) {
                if(!$(event.target).is("input, textarea, .ui-dialog")) {
                    var next = $('body').find('.bottom_paging_box').children('em').next();
                    if(next.end().length === 0) next = $('body').find('.bottom_paging_box').children('a').last();
                    next.click();
                }
            }
        });
}
