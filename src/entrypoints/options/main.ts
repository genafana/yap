import './style.css';

import { getBrowser } from '../../utils/browser-api';
import { localizeDocument, type MessageGetter } from '../../utils/i18n';
import { resolveSelectOptionLabel } from './select-labels';
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
let getMessage: MessageGetter = (messageName) => messageName;

function getLocalizedDefinition(key: keyof ExtensionSettings): {
  label: string;
  description: string;
  valueLabels: string[];
} {
  const definition = settingDefinitions[key];

  return {
    label: getMessage(definition.labelMessage),
    description: definition.descriptionMessage ? getMessage(definition.descriptionMessage) : '',
    valueLabels: definition.valueLabelMessages?.map((message) => getMessage(message)) ?? []
  };
}

function createInput(key: keyof ExtensionSettings, value: ExtensionSettings[typeof key]): HTMLElement {
  const definition = settingDefinitions[key];
  const localized = getLocalizedDefinition(key);

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
        option.textContent = resolveSelectOptionLabel(localized.valueLabels[index], optionValue);
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
    const localized = getLocalizedDefinition(key);
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = localized.label;

    const valueCell = document.createElement('td');
    valueCell.append(createInput(key, settings[key]));

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = localized.description || getMessage('options_no_description');

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
    saveStatus.textContent = getMessage('options_save_success');
    window.setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  }
}

async function handleReset(): Promise<void> {
  const documentState = await resetSettingsToBundledDefaults();
  renderForm(documentState.settings);
  if (saveStatus != null) {
    saveStatus.textContent = getMessage('options_restore_success');
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
    saveStatus.textContent = getMessage('options_export_success');
  }
}

async function bootstrap(): Promise<void> {
  const browser = await getBrowser();
  getMessage = browser.i18n.getMessage.bind(browser.i18n);
  localizeDocument(document, getMessage);
  document.title = getMessage('options_title_with_version', browser.runtime.getManifest().version);
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
