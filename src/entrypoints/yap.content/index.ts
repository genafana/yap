import { defineContentScript } from 'wxt/utils/define-content-script';

import './style.css';

import { getSettingsDocument } from '../../utils/settings/storage';

const supportedMatches = ['*://*.yaplakal.com/*', '*://*.yap.ru/*'];

function renderBadge(): void {
  if (document.getElementById('yap-lamp-badge') != null) {
    return;
  }

  const badge = document.createElement('div');
  badge.id = 'yap-lamp-badge';
  badge.className = 'yap-lamp-badge';
  badge.textContent = 'YAP Lamp active';
  document.body.append(badge);
}

export default defineContentScript({
  matches: supportedMatches,
  runAt: 'document_end',
  async main() {
    const { settings } = await getSettingsDocument();

    if (!settings.enabled) {
      return;
    }

    document.documentElement.dataset.yapLampExtension = 'active';

    if (settings.showFloatingBadge) {
      renderBadge();
    }
  }
});
