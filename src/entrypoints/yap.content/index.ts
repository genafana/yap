import { defineContentScript } from 'wxt/utils/define-content-script';

import './style.css';

import { initializeSettingsDocument } from '../../utils/settings/storage';

const supportedMatches = ['*://*.yaplakal.com/*', '*://*.yap.ru/*'];

export default defineContentScript({
  matches: supportedMatches,
  runAt: 'document_end',
  async main() {
    await initializeSettingsDocument({ legacyStorage: window.localStorage });

    document.documentElement.dataset.yapLampExtension = 'active';
  }
});
