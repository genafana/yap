import './style.css';

import { getBrowser } from '../../utils/browser-api';

const button = document.querySelector<HTMLButtonElement>('#open-options');

async function openOptionsPage(): Promise<void> {
  const browser = await getBrowser();
  await browser.runtime.openOptionsPage();
}

button?.addEventListener('click', () => {
  void openOptionsPage();
});

