import './style.css';

import { getBrowser } from '../../utils/browser-api';
import { localizeDocument } from '../../utils/i18n';

const button = document.querySelector<HTMLButtonElement>('#open-options');

async function openOptionsPage(): Promise<void> {
  const browser = await getBrowser();
  await browser.runtime.openOptionsPage();
}

button?.addEventListener('click', () => {
  void openOptionsPage();
});

void (async () => {
  const browser = await getBrowser();
  localizeDocument(document, browser.i18n.getMessage.bind(browser.i18n));
})();
