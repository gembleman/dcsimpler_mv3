// CSS(content.css)는 chrome-extension://__MSG_@@extension_id__ URL을
// 그대로 보존해야 하므로 번들하지 않고 public/css에서 manifest css로 주입한다 (wxt.config.ts 훅 참고)
import { startDcsimpler } from './main';

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
