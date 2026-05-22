import { defineContentScript } from 'wxt/utils/define-content-script';

import { installVisibilityGuard } from '../../features/content-foundation/dom';

const supportedMatches = ['*://*.yaplakal.com/*', '*://*.yap.ru/*'];

export default defineContentScript({
  matches: supportedMatches,
  runAt: 'document_start',
  main() {
    installVisibilityGuard(document);
  }
});

