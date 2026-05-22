import { getBrowser } from './browser-api';

export type MessageGetter = (messageName: string, substitutions?: string | string[]) => string;

export async function getMessageGetter(): Promise<MessageGetter> {
  const browser = await getBrowser();
  return browser.i18n.getMessage.bind(browser.i18n);
}

export function localizeDocument(doc: Document, getMessage: MessageGetter): void {
  const localeCode = getMessage('locale_code');
  if (localeCode) {
    doc.documentElement.lang = localeCode;
  }

  doc.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key) {
      element.textContent = getMessage(key);
    }
  });

  doc.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach((element) => {
    const key = element.dataset.i18nHtml;
    if (key) {
      element.innerHTML = getMessage(key);
    }
  });

  doc.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((element) => {
    const key = element.dataset.i18nTitle;
    if (key) {
      element.title = getMessage(key);
    }
  });
}
