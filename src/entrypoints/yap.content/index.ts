import { defineContentScript } from 'wxt/utils/define-content-script';

import './style.css';

import {
  ensureFilterBanner,
  markPluginReady,
  reduceRightColumn
} from '../../features/content-foundation/dom';
import { replaceAuthorSearchLinks } from '../../features/content-foundation/link-rewrite';
import {
  consumeSavedScrollPosition,
  getFilteredUserName,
  saveScrollPosition
} from '../../features/content-foundation/page-state';
import { initializeSettingsDocument } from '../../utils/settings/storage';

const supportedMatches = ['*://*.yaplakal.com/*', '*://*.yap.ru/*'];

export default defineContentScript({
  matches: supportedMatches,
  runAt: 'document_end',
  async main() {
    const settingsDocument = await initializeSettingsDocument({
      legacyStorage: window.localStorage
    });
    const filteredUserName = getFilteredUserName(window.localStorage);

    document.documentElement.dataset.yapLampExtension = 'active';
    replaceAuthorSearchLinks(document);

    if (filteredUserName != null) {
      ensureFilterBanner(filteredUserName, window.localStorage, document);
    }

    if (settingsDocument.settings.reduce_ad_block) {
      reduceRightColumn(document);
    }

    window.addEventListener('beforeunload', () => {
      saveScrollPosition(window.localStorage, window.pageYOffset);
    });

    const navigationEntry = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    const scrollPosition = consumeSavedScrollPosition(
      window.localStorage,
      navigationEntry?.type
    );

    markPluginReady(document);

    if (location.hash) {
      const targetId = location.hash.slice(1);
      const targetElement = document.getElementById(targetId);
      targetElement?.scrollIntoView();
    }

    if (scrollPosition != null) {
      window.scrollTo(0, scrollPosition);
    }
  }
});
