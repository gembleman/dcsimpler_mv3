// jquery-ui 등 전역 jQuery를 기대하는 스크립트보다 먼저 평가되어야 한다.
// (엔트리에서 이 모듈을 jquery-ui import보다 위에 둘 것)
import $ from 'jquery';

globalThis.jQuery = $;
globalThis.$ = $;

export default $;
