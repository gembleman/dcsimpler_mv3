import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  hooks: {
    // content.css / jquery-ui.css는 chrome-extension://__MSG_@@extension_id__ URL을
    // 사용하므로 Vite 번들을 우회해 public 사본을 manifest css로 직접 주입한다.
    'build:manifestGenerated'(_wxt, manifest) {
      const contentScript = manifest.content_scripts?.find((cs) =>
        cs.js?.some((file) => file.includes('content')),
      );
      if (contentScript) {
        contentScript.css = [
          'css/jquery-ui.css',
          'css/content.css',
          ...(contentScript.css ?? []),
        ];
      }
    },
  },
  manifest: {
    name: 'DCSimpler',
    short_name: 'dcsimpler',
    description:
      '디시인사이드 갤질을 위한 다양한 부가기능을 제공하는 익스텐션입니다.',
    // MV3의 author는 {email} 사전형이라 기존 문자열 값은 제거
    // 확장 ID 고정용 (웹스토어 ID: kgpiejjjpjkcijopeabfleliifbhfnci)
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn6eBCDQsVf8MNTfQMzFux65Q9OS7cci8crLgWJpR/8zJ5RHT6WNQ2Ko/qwf5dlIwfhTxAzqOKXgHMzxFtds5zlgKw0fiAaaOymaivsyPA57g2hX3Eft61MjCAt2m9kTKOhyAyynNHDGRSQ1gul+8tIb5cK2PpK05B636ePM0cQN/iGmDTcUHuJ+V7coNfBJ47SABO79F/NuQe2lELGrNmtX69AXj7Yv1tBiOfDzAhyMa+q+hijkIhCQEVyvQUJeg/1yD2R/3bHWCJLBnVhzQ72gGl7pke+mvNBQ5pYUiMRFY+2LNJqgObD3PagaSNNxnKILuy9/B0FQ8Txu2UJOSkwIDAQAB',
    permissions: [
      'storage',
      'scripting',
      'activeTab',
      'webNavigation',
      'declarativeNetRequest',
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'static_rules',
          enabled: true,
          path: 'rules.json',
        },
      ],
    },
    host_permissions: [
      'https://gall.dcinside.com/*',
      'https://sites.google.com/view/dcsimpler/*',
      'https://upimg.dcinside.com/*',
    ],
    commands: {
      write: {
        description: '글 작성',
        suggested_key: { default: 'Alt+S' },
      },
    },
    icons: {
      16: 'icon/icon16.png',
      48: 'icon/icon48.png',
      128: 'icon/icon128.png',
    },
    action: {
      default_icon: {
        16: 'icon/icon16.png',
        48: 'icon/icon48.png',
        128: 'icon/icon128.png',
      },
    },
    web_accessible_resources: [
      {
        resources: ['images/*'],
        matches: ['https://gall.dcinside.com/*'],
      },
    ],
  },
});
