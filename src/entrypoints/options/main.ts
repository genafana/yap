import './style.css';

import { getBrowser } from '../../utils/browser-api';
import {
  settingDefinitions,
  settingKeys,
  type ExtensionSettings
} from '../../utils/settings/defaults';
import {
  exportSettingsJson,
  getSettingsDocument,
  resetSettingsToBundledDefaults,
  saveSettings
} from '../../utils/settings/storage';

const form = document.querySelector<HTMLFormElement>('#settings-form');
const saveStatus = document.querySelector<HTMLElement>('#save-status');
const tableBody = document.querySelector<HTMLTableSectionElement>('#settings-table-body');
const resetButton = document.querySelector<HTMLButtonElement>('#reset-settings');
const exportButton = document.querySelector<HTMLButtonElement>('#export-settings');

function createInput(key: keyof ExtensionSettings, value: ExtensionSettings[typeof key]): HTMLElement {
  const definition = settingDefinitions[key];

  switch (definition.type) {
    case 'boolean': {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value as boolean;
      input.dataset.key = key;
      input.className = 'settings-input';
      return input;
    }
    case 'integer': {
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '1';
      input.value = String(value);
      input.dataset.key = key;
      input.className = 'settings-input';
      return input;
    }
    case 'enum': {
      const select = document.createElement('select');
      select.dataset.key = key;
      select.className = 'settings-input';
      definition.values?.forEach((optionValue, index) => {
        const option = document.createElement('option');
        option.value = String(optionValue);
        option.textContent = definition.valueLabels?.[index] ?? String(optionValue);
        option.selected = optionValue === value;
        select.append(option);
      });
      return select;
    }
    case 'string':
    default: {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = String(value);
      input.dataset.key = key;
      input.className = 'settings-input';
      return input;
    }
  }
}

function renderForm(settings: ExtensionSettings): void {
  if (tableBody == null) {
    return;
  }

  tableBody.replaceChildren();

  for (const key of settingKeys) {
    const definition = settingDefinitions[key];
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = definition.label;

    const valueCell = document.createElement('td');
    valueCell.append(createInput(key, settings[key]));

    const descriptionCell = document.createElement('td');
    descriptionCell.innerHTML = definition.description || '—';

    row.append(nameCell, valueCell, descriptionCell);
    tableBody.append(row);
  }
}

async function populateForm(): Promise<void> {
  const { settings } = await getSettingsDocument();
  renderForm(settings);
}

function collectFormValues(): Partial<ExtensionSettings> {
  const nextValues: Partial<ExtensionSettings> = {};

  document.querySelectorAll<HTMLElement>('.settings-input[data-key]').forEach((element) => {
    const key = element.dataset.key as keyof ExtensionSettings | undefined;
    if (key == null) {
      return;
    }

    const definition = settingDefinitions[key];

    switch (definition.type) {
      case 'boolean':
        nextValues[key] = (element as HTMLInputElement).checked as never;
        break;
      case 'integer':
      case 'string':
      case 'enum':
      default:
        nextValues[key] = (element as HTMLInputElement | HTMLSelectElement).value as never;
    }
  });

  return nextValues;
}

async function handleSubmit(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  const documentState = await saveSettings(collectFormValues());
  renderForm(documentState.settings);

  if (saveStatus != null) {
    saveStatus.textContent = 'Настройки сохранены';
    window.setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  }
}

async function handleReset(): Promise<void> {
  const documentState = await resetSettingsToBundledDefaults();
  renderForm(documentState.settings);
  if (saveStatus != null) {
    saveStatus.textContent = 'Восстановлены значения по умолчанию';
  }
}

async function handleExport(): Promise<void> {
  const json = await exportSettingsJson();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'config.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  if (saveStatus != null) {
    saveStatus.textContent = 'Файл config.json экспортирован';
  }
}

async function bootstrap(): Promise<void> {
  const browser = await getBrowser();
  document.title = `YAP Lamp Options v${browser.runtime.getManifest().version}`;
  await populateForm();
  form?.addEventListener('submit', (event) => {
    void handleSubmit(event);
  });
  resetButton?.addEventListener('click', () => {
    void handleReset();
  });
  exportButton?.addEventListener('click', () => {
    void handleExport();
  });
}

void bootstrap();
