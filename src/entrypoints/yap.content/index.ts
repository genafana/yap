import { defineContentScript } from 'wxt/utils/define-content-script';

import './style.css';

import {
  ensureFilterBanner,
  markPluginReady,
} from '../../features/content-foundation/dom';
import { replaceAuthorSearchLinks } from '../../features/content-foundation/link-rewrite';
import {
  consumeSavedScrollPosition,
  getFilteredUserName,
  saveScrollPosition
} from '../../features/content-foundation/page-state';
import { enhanceLegacyForumPage } from '../../features/forum/legacy-compat';
import { getBrowser } from '../../utils/browser-api';
import { loadUserTagsLookup } from '../../utils/tags';
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
    const [browser, userTagsLookup] = await Promise.all([getBrowser(), loadUserTagsLookup()]);

    document.documentElement.dataset.yapLampExtension = 'active';
    replaceAuthorSearchLinks(document);

    if (filteredUserName != null) {
      ensureFilterBanner(
        filteredUserName,
        window.localStorage,
        browser.i18n.getMessage.bind(browser.i18n),
        document
      );
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

    await enhanceLegacyForumPage({
      settings: settingsDocument.settings,
      userTagsLookup,
      filteredUserName,
      getMessage: browser.i18n.getMessage.bind(browser.i18n),
      runtime: {
        browser,
        manifest: browser.runtime.getManifest()
      }
    });

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
