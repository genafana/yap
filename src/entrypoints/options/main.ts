import './style.css';

import { getSettingsDocument, saveSettings } from '../../utils/settings/storage';

const form = document.querySelector<HTMLFormElement>('#settings-form');
const saveStatus = document.querySelector<HTMLElement>('#save-status');

async function populateForm(): Promise<void> {
  const { settings } = await getSettingsDocument();

  const enabled = document.querySelector<HTMLInputElement>('#enabled');
  const debug = document.querySelector<HTMLInputElement>('#debug');
  const applyContextMenu = document.querySelector<HTMLInputElement>('#applyContextMenu');
  const showFloatingBadge = document.querySelector<HTMLInputElement>('#showFloatingBadge');

  if (
    enabled == null ||
    debug == null ||
    applyContextMenu == null ||
    showFloatingBadge == null
  ) {
    return;
  }

  enabled.checked = settings.enabled;
  debug.checked = settings.debug;
  applyContextMenu.checked = settings.applyContextMenu;
  showFloatingBadge.checked = settings.showFloatingBadge;
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();

  const enabled = document.querySelector<HTMLInputElement>('#enabled');
  const debug = document.querySelector<HTMLInputElement>('#debug');
  const applyContextMenu = document.querySelector<HTMLInputElement>('#applyContextMenu');
  const showFloatingBadge = document.querySelector<HTMLInputElement>('#showFloatingBadge');

  if (
    enabled == null ||
    debug == null ||
    applyContextMenu == null ||
    showFloatingBadge == null
  ) {
    return;
  }

  await saveSettings({
    enabled: enabled.checked,
    debug: debug.checked,
    applyContextMenu: applyContextMenu.checked,
    showFloatingBadge: showFloatingBadge.checked
  });

  if (saveStatus != null) {
    saveStatus.textContent = 'Saved';
    window.setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  }
}

async function bootstrap(): Promise<void> {
  await populateForm();
  form?.addEventListener('submit', (event) => {
    void handleSubmit(event);
  });
}

void bootstrap();

