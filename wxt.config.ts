import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  hooks: {
    // content.css는 chrome-extension://__MSG_@@extension_id__ URL을
    // 사용하므로 Vite 번들을 우회해 public 사본을 manifest css로 직접 주입한다.
    'build:manifestGenerated'(_wxt, manifest) {
      const contentScript = manifest.content_scripts?.find((cs) =>
        cs.js?.some((file) => file.includes('content')),
      );
      if (contentScript) {
        contentScript.css = [
          'css/content.css',
          ...(contentScript.css ?? []),
        ];
      }
    },
  },
  manifest: {
    name: 'DCSimpler_mv3',
    short_name: 'dcsimpler_mv3',
    description:
      '디시인사이드 갤질을 위한 다양한 부가기능을 제공하는 익스텐션입니다. (MV3로 마이그레이션)',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA248o78e3hTF2VYXtYqJHrMV22CrlVCgfSCCw6CahaeEh1C+ALeIbx9WwjHaAUInKwtiGzjmMXuaiRiSUPAqpjPnc4JWmiKDjAG3Z2TQMbpTwfqGaueneE+ZUaZwsOcCTsvBWa5o+nK7tKT/bRPReW8irIQSj66HQt+NGoZzn3nKJNfU0zF7xYTa4Mo3H6YGgSENCacsyBP7OHUWAyDpK1laJ50FajXb/gCFYjr1JClndvEwLDKx7QWiSh0dg0VE5Ai4hPTYpOuMFwPSbGwJZcJvSfBMwZExIO6tYIT4AEa7lzEFxcHUBygfaulTQOKBElOXKMJUSpLxYj62Ehr3T3wIDAQAB',
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
