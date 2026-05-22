import { clearFilteredUserName, type StorageLike } from './page-state';
import type { MessageGetter } from '../../utils/i18n';

const PLUGIN_READY_CLASS = 'plugin-ready';
const VISIBILITY_GUARD_ID = 'yap-lamp-visibility-guard';
const FILTER_BANNER_ID = 'cancel_user_filter';

export function installVisibilityGuard(doc: Document = document): void {
  if (doc.getElementById(VISIBILITY_GUARD_ID) != null) {
    return;
  }

  const style = doc.createElement('style');
  style.id = VISIBILITY_GUARD_ID;
  style.textContent = `
    body:not(.${PLUGIN_READY_CLASS}) table[id^="entry"] {
      display: none !important;
    }
  `;

  const parent = doc.head ?? doc.documentElement;
  parent?.append(style);
}

export function markPluginReady(doc: Document = document): void {
  doc.body?.classList.add(PLUGIN_READY_CLASS);
}

export function ensureFilterBanner(
  filteredUserName: string,
  storage: StorageLike,
  getMessage: MessageGetter,
  doc: Document = document
): void {
  const target = doc.getElementById('content') ?? doc.body;
  if (target == null) {
    return;
  }

  let banner = doc.getElementById(FILTER_BANNER_ID);
  if (banner == null) {
    banner = doc.createElement('div');
    banner.id = FILTER_BANNER_ID;
    banner.addEventListener('click', () => {
      clearFilteredUserName(storage);
      banner?.classList.add('hidden');

      doc.querySelectorAll<HTMLTableElement>('table[id^="entry"].hidden').forEach((table) => {
        table.classList.remove('hidden');
      });
    });
    target.append(banner);
  }

  banner.replaceChildren();
  banner.append(`${getMessage('filter_banner_label')} ${filteredUserName}`, doc.createElement('hr'));
  const resetText = doc.createElement('span');
  resetText.textContent = getMessage('filter_banner_reset');
  banner.append(resetText);
  banner.classList.remove('hidden');
}

export function reduceRightColumn(doc: Document = document): void {
  const rightColumn = doc.querySelector<HTMLElement>('#right-column');
  if (rightColumn == null) {
    return;
  }

  const widthAttr = rightColumn.getAttribute('width');
  if (widthAttr != null) {
    const originalWidth = Number.parseInt(widthAttr, 10);
    if (Number.isFinite(originalWidth)) {
      const reduced = Math.trunc(originalWidth - 0.2 * originalWidth);
      rightColumn.style.maxWidth = `${reduced}px`;
    }
  }

  rightColumn.style.minWidth = '0';
  rightColumn.style.overflowX = 'hidden';

  rightColumn.querySelectorAll<HTMLElement>('center').forEach((element) => {
    element.style.transform = 'scale(0.8)';
    element.style.transformOrigin = 'top center';
  });

  rightColumn.querySelectorAll<HTMLElement>('iframe').forEach((element) => {
    element.style.transform = 'scale(0.8)';
    element.style.transformOrigin = 'top left';
  });
}
