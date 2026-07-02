// 전역 jQuery 설정이 jquery-ui보다 먼저 평가되어야 한다
import '@/lib/jquery-global';
import 'jquery-ui/dist/jquery-ui.js';
// CSS(content.css, jquery-ui.css)는 chrome-extension://__MSG_@@extension_id__ URL을
// 그대로 보존해야 하므로 번들하지 않고 public/css에서 manifest css로 주입한다 (wxt.config.ts 훅 참고)
import { startDcsimpler } from './legacy';

export default defineContentScript({
  matches: [
    'https://gall.dcinside.com/board/*',
    'https://gall.dcinside.com/mgallery/board/*',
    'https://gall.dcinside.com/mgallery//board/*',
  ],
  runAt: 'document_start',
  main() {
    startDcsimpler();
  },
});
