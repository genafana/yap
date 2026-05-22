import { defineConfig } from 'wxt';

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
    name: '__MSG_extension_name__',
    short_name: '__MSG_extension_short_name__',
    description: '__MSG_extension_description__',
    version: '0.1.0',
    default_locale: 'en',
    permissions: ['storage'],
    host_permissions: hostPermissions,
    action: {
      default_title: '__MSG_action_title__'
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
