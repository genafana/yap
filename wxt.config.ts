import { defineConfig } from 'wxt';

const extensionName = 'YAP Lamp Design';
const hostPermissions = ['*://*.yaplakal.com/*', '*://*.yap.ru/*'];

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  outDir: '.output',
  targetBrowsers: ['chrome', 'firefox', 'edge', 'opera', 'safari'],
  webExt: {
    disabled: true
  },
  manifest: {
    name: extensionName,
    short_name: 'YAP Lamp',
    description: 'Cross-browser extension for YAP UI customization.',
    version: '0.1.0',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: hostPermissions,
    action: {
      default_title: extensionName
    },
    web_accessible_resources: [
      {
        resources: ['config.json', 'groups.json'],
        matches: hostPermissions
      }
    ],
    browser_specific_settings: {
      gecko: {
        id: 'lamp-design@yaplakal.local',
        strict_min_version: '121.0',
        data_collection_permissions: {
          required: ['none']
        }
      }
    }
  },
  zip: {
    includeSources: [
      'README.md',
      'SOURCE_CODE_REVIEW.md',
      'public/**',
      'scripts/**',
      'src/**',
      'package.json',
      'tsconfig.json',
      'vitest.config.ts',
      'web-ext.config.ts',
      'wxt.config.ts'
    ],
    excludeSources: [
      'orig-poc-src/**',
      'tmp/**',
      'tests/**'
    ]
  }
});
