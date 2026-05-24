import { defineBackground } from 'wxt/utils/define-background';

import { getBrowser } from '../utils/browser-api';
import { seedDefaultSettings } from '../utils/settings/storage';
import { ensureIgnoreTag } from '../utils/tags';

export default defineBackground(() => {
  void (async () => {
    const browser = await getBrowser();

    browser.runtime.onInstalled.addListener(() => {
      void seedDefaultSettings();
      void ensureIgnoreTag();
    });

    browser.runtime.onStartup.addListener(() => {
      void seedDefaultSettings();
      void ensureIgnoreTag();
    });
  })();
});
