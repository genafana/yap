import { defineBackground } from 'wxt/utils/define-background';

import { getBrowser } from '../utils/browser-api';
import { seedDefaultSettings } from '../utils/settings/storage';

export default defineBackground(() => {
  void (async () => {
    const browser = await getBrowser();

    browser.runtime.onInstalled.addListener(() => {
      void seedDefaultSettings();
    });

    browser.runtime.onStartup.addListener(() => {
      void seedDefaultSettings();
    });
  })();
});
