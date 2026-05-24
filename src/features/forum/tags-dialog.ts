import type { MessageGetter } from '../../utils/i18n';
import { getSettingsDocument } from '../../utils/settings/storage';
import {
  deleteTag,
  ensureIgnoreTag,
  findPrimaryTagBgColor,
  IGNORE_TAG_NAME,
  loadTags,
  loadUsers,
  mergeTag,
  renameTag,
  saveTags,
  saveUsers,
  type TagsMap
} from '../../utils/tags';
import { getContrastColor } from '../../utils/color';

const DIALOG_ID = 'yap-tags-dialog';
const CONFIRM_DIALOG_ID = 'yap-tags-confirm-dialog';
const EDIT_DIALOG_ID = 'yap-tags-edit-dialog';
const MERGE_DIALOG_ID = 'yap-tags-merge-dialog';

// ── Shared dialog helpers ─────────────────────────────────────────────────────

function createTagSwatch(bg: string | undefined): HTMLSpanElement {
  const swatch = document.createElement('span');
  swatch.className = 'yap-dialog__swatch';
  if (bg != null) swatch.style.background = bg;
  return swatch;
}

function createErrorParagraph(): HTMLParagraphElement {
  const error = document.createElement('p');
  error.className = 'yap-dialog__error';
  error.style.display = 'none';
  return error;
}

function createCancelButton(getMessage: MessageGetter, dialog: HTMLDialogElement): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'yap-dialog__btn yap-dialog__btn--secondary';
  btn.textContent = getMessage('tags_dialog_cancel');
  btn.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });
  return btn;
}

/** Closes and removes a dialog when the user clicks outside its bounding box. */
function attachBackdropClose(dialog: HTMLDialogElement): void {
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    ) {
      dialog.close();
      dialog.remove();
    }
  });
}

// ── In-place DOM update helpers ───────────────────────────────────────────────

/**
 * Rebuilds .user-tags pill container for every transformed table whose
 * data-nik-name matches the given username.
 * Safe to call when no matching tables exist — does nothing.
 */
function refreshTagPillsInDOM(
  username: string,
  tagsMap: TagsMap,
  selectedTagNames: string[]
): void {
  const tables = document.querySelectorAll<HTMLElement>('[data-nik-name]');

  for (const table of tables) {
    if (table.dataset.nikName !== username) {
      continue;
    }

    // Left cell is identified by its class set during transformEntryTable
    const leftCell = table.querySelector<HTMLElement>('.entry-column1');
    if (leftCell == null) {
      continue;
    }

    // userWrapper is the first div child of leftCell
    const userWrapper = leftCell.firstElementChild;
    if (userWrapper == null) {
      continue;
    }

    // Remove existing pills container if present
    userWrapper.querySelector('.user-tags')?.remove();

    if (selectedTagNames.length === 0) {
      continue;
    }

    const container = document.createElement('div');
    container.className = 'user-tags';

    for (const tagName of selectedTagNames) {
      const pill = document.createElement('span');
      pill.className = 'user-tag';
      pill.textContent = tagName;
      pill.dataset.tagName = tagName;
      const tagDef = tagsMap[tagName];
      const bg = tagDef?.bgColor;
      if (bg != null) {
        pill.style.background = bg;
        pill.style.color = getContrastColor(bg);
      }
      container.append(pill);
    }

    userWrapper.append(container);
  }
}

/**
 * Applies/removes live primary-tag background highlighting for all transformed
 * comment tables that belong to the given username.
 */
function refreshPrimaryHighlightInDOM(
  username: string,
  tagsMap: TagsMap,
  selectedTagNames: string[],
  useFullColumnHighlight: boolean
): void {
  const primaryBgColor = findPrimaryTagBgColor(selectedTagNames, tagsMap);
  const tables = document.querySelectorAll<HTMLElement>('[data-nik-name]');

  for (const table of tables) {
    if (table.dataset.nikName !== username) continue;

    const leftCell = table.querySelector<HTMLElement>('.entry-column1');
    if (leftCell == null) continue;

    const titleRow = leftCell.closest<HTMLTableRowElement>('tr.title-msg-row');
    const baseLeftBg = titleRow?.style.background ?? '';
    const userWrapper = leftCell.firstElementChild as HTMLElement | null;
    const identityContainer = userWrapper?.firstElementChild as HTMLElement | null;

    if (primaryBgColor == null) {
      leftCell.style.background = baseLeftBg;
      if (identityContainer != null) {
        identityContainer.style.background = '';
        identityContainer.style.padding = '';
      }
      continue;
    }

    if (useFullColumnHighlight) {
      leftCell.style.background = primaryBgColor;
      if (identityContainer != null) {
        identityContainer.style.background = '';
        identityContainer.style.padding = '';
      }
      continue;
    }

    leftCell.style.background = baseLeftBg;
    if (identityContainer != null) {
      identityContainer.style.background = primaryBgColor;
      identityContainer.style.padding = '0.25em';
    }
  }
}

// ── Delete tag ────────────────────────────────────────────────────────────────

/**
 * Removes all pill spans for the given tag from the live page DOM.
 * If a .user-tags container becomes empty after removal, it is removed too.
 */
function deleteTagFromDOM(tagName: string): void {
  const pills = document.querySelectorAll<HTMLElement>(
    `.user-tag[data-tag-name="${CSS.escape(tagName)}"]`
  );
  for (const pill of pills) {
    const container = pill.parentElement;
    pill.remove();
    if (
      container != null &&
      container.classList.contains('user-tags') &&
      container.childElementCount === 0
    ) {
      container.remove();
    }
  }
}

/**
 * Shows a small confirmation dialog before deleting a tag.
 * On confirm: removes the tag from storage and updates the page DOM.
 */
export function openDeleteTagConfirm(
  tagName: string,
  getMessage: MessageGetter,
  onDeleted?: () => void
): void {
  // Remove any stale confirm dialog first
  document.getElementById(CONFIRM_DIALOG_ID)?.remove();

  const dialog = document.createElement('dialog');
  dialog.id = CONFIRM_DIALOG_ID;
  dialog.className = 'yap-dialog yap-dialog--confirm';

  const msg = document.createElement('p');
  msg.className = 'yap-dialog__confirm-msg';
  msg.textContent = getMessage('tag_delete_confirm', tagName);

  const footer = document.createElement('div');
  footer.className = 'yap-dialog__footer';

  const cancelBtn = createCancelButton(getMessage, dialog);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'yap-dialog__btn yap-dialog__btn--danger';
  deleteBtn.textContent = getMessage('tag_delete_button');
  deleteBtn.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
    void deleteTag(tagName).then(() => {
      deleteTagFromDOM(tagName);
      onDeleted?.();
    });
  });

  footer.append(cancelBtn, deleteBtn);
  dialog.append(msg, footer);
  document.body.append(dialog);
  dialog.showModal();
  attachBackdropClose(dialog);
}

/**
 * Updates all pill spans for the given tag with the new name and styles.
 */
function renameTagInDOM(oldName: string, newName: string, tagsMap: TagsMap): void {
  const pills = document.querySelectorAll<HTMLElement>(
    `.user-tag[data-tag-name="${CSS.escape(oldName)}"]`
  );
  for (const pill of pills) {
    pill.dataset.tagName = newName;
    pill.textContent = newName;
    const tagDef = tagsMap[newName];
    const bg = tagDef?.bgColor;
    if (bg != null) {
      pill.style.background = bg;
      pill.style.color = getContrastColor(bg);
    } else {
      pill.style.background = '';
      pill.style.color = '';
    }
  }
}

// ── Edit / New tag dialog ─────────────────────────────────────────────────────

/**
 * Unified dialog for creating a new tag (tagName === null) or editing an
 * existing one. Supports renaming, changing the background colour, and toggling
 * the primary flag.
 */
function openEditTagDialog(
  tagName: string | null,
  tagsMap: TagsMap,
  getMessage: MessageGetter,
  onChanged?: () => void
): void {
  document.getElementById(EDIT_DIALOG_ID)?.remove();

  const isNew = tagName == null;
  const currentDef = tagName != null ? tagsMap[tagName] : undefined;
  const currentBgColor = currentDef?.bgColor ?? '#e0e0e0';
  // Absent primary means true (backward compat).
  const currentPrimary = currentDef == null || currentDef.primary !== false;

  const dialog = document.createElement('dialog');
  dialog.id = EDIT_DIALOG_ID;
  dialog.className = 'yap-dialog yap-dialog--confirm';

  const title = document.createElement('h3');
  title.className = 'yap-dialog__title';
  title.textContent = isNew ? getMessage('tag_edit_new_title') : getMessage('tag_rename_title');

  const nameLabel = document.createElement('label');
  nameLabel.className = 'yap-dialog__field';
  const nameLabelText = document.createElement('span');
  nameLabelText.textContent = getMessage('tags_new_tag_name');
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'yap-dialog__input';
  nameInput.value = tagName ?? '';
  nameLabel.append(nameLabelText, nameInput);

  const colorLabel = document.createElement('label');
  colorLabel.className = 'yap-dialog__field';
  const colorLabelText = document.createElement('span');
  colorLabelText.textContent = getMessage('tags_new_tag_color');
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = currentBgColor;
  colorInput.className = 'yap-dialog__color';
  colorLabel.append(colorLabelText, colorInput);

  const primaryLabel = document.createElement('label');
  primaryLabel.className = 'yap-dialog__field yap-dialog__field--checkbox';
  const primaryCheckbox = document.createElement('input');
  primaryCheckbox.type = 'checkbox';
  primaryCheckbox.checked = currentPrimary;
  const primaryLabelText = document.createElement('span');
  primaryLabelText.textContent = getMessage('tag_edit_primary');
  primaryLabel.append(primaryCheckbox, primaryLabelText);

  const error = createErrorParagraph();

  const footer = document.createElement('div');
  footer.className = 'yap-dialog__footer';

  const cancelBtn = createCancelButton(getMessage, dialog);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'yap-dialog__btn yap-dialog__btn--primary';
  saveBtn.textContent = getMessage('tag_rename_button');
  saveBtn.addEventListener('click', () => {
    const newName = nameInput.value.trim();
    if (newName === '') {
      error.textContent = getMessage('tag_rename_empty');
      error.style.display = '';
      return;
    }

    const isRename = !isNew && newName !== tagName;
    if ((isNew || isRename) && newName in tagsMap) {
      error.textContent = getMessage('tag_rename_duplicate');
      error.style.display = '';
      return;
    }

    error.style.display = 'none';
    void (async () => {
      if (isRename) {
        await renameTag(tagName!, newName);
      }
      const current = await loadTags();
      current[newName] = {
        ...(current[newName] ?? {}),
        bgColor: colorInput.value,
        primary: primaryCheckbox.checked
      };
      await saveTags(current);
      if (!isNew) {
        const newTagsMap = await loadTags();
        renameTagInDOM(tagName!, newName, newTagsMap);
      }
      dialog.close();
      dialog.remove();
      onChanged?.();
    })();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
    if (e.key === 'Escape') cancelBtn.click();
  });

  footer.append(cancelBtn, saveBtn);
  dialog.append(title, nameLabel, colorLabel, primaryLabel, error, footer);
  document.body.append(dialog);
  dialog.showModal();
  requestAnimationFrame(() => { nameInput.select(); });
  attachBackdropClose(dialog);
}

// ── Merge tag dialog ──────────────────────────────────────────────────────────

function openMergeTagDialog(
  sourceTag: string,
  tagsMap: TagsMap,
  getMessage: MessageGetter,
  onChanged?: () => void
): void {
  document.getElementById(MERGE_DIALOG_ID)?.remove();

  const otherTags = Object.keys(tagsMap).filter((t) => t !== sourceTag);

  const dialog = document.createElement('dialog');
  dialog.id = MERGE_DIALOG_ID;
  dialog.className = 'yap-dialog';

  const title = document.createElement('h3');
  title.className = 'yap-dialog__title';
  title.textContent = getMessage('tag_merge_title', sourceTag);

  const list = document.createElement('div');
  list.className = 'yap-dialog__checkboxes';

  for (const tagName of otherTags) {
    const row = document.createElement('label');
    row.className = 'yap-dialog__tag-row';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'merge-target';
    radio.value = tagName;
    radio.className = 'yap-dialog__tag-cb';

    const swatch = createTagSwatch(tagsMap[tagName]?.bgColor);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = tagName;

    row.append(radio, swatch, nameSpan);
    list.append(row);
  }

  const error = createErrorParagraph();

  const footer = document.createElement('div');
  footer.className = 'yap-dialog__footer';

  const cancelBtn = createCancelButton(getMessage, dialog);

  const mergeBtn = document.createElement('button');
  mergeBtn.type = 'button';
  mergeBtn.className = 'yap-dialog__btn yap-dialog__btn--primary';
  mergeBtn.textContent = getMessage('tag_merge_button');
  mergeBtn.addEventListener('click', () => {
    const selected = dialog.querySelector<HTMLInputElement>('input[name="merge-target"]:checked');
    if (selected == null) {
      error.textContent = getMessage('tag_merge_no_selection');
      error.style.display = '';
      return;
    }
    const targetTag = selected.value;
    error.style.display = 'none';

    void (async () => {
      const oldUsers = await loadUsers();
      const affectedUsers = Object.entries(oldUsers)
        .filter(([, def]) => def.tags.includes(sourceTag))
        .map(([username]) => username);

      await mergeTag(sourceTag, targetTag);

      const [{ settings }, newTagsMap, newUsersMap] = await Promise.all([
        getSettingsDocument(),
        loadTags(),
        loadUsers()
      ]);
      for (const username of affectedUsers) {
        refreshTagPillsInDOM(username, newTagsMap, newUsersMap[username]?.tags ?? []);
        refreshPrimaryHighlightInDOM(
          username,
          newTagsMap,
          newUsersMap[username]?.tags ?? [],
          settings.primary_tag_full_user_bg
        );
      }
      // Remove any remaining sourceTag pills (safety: no user should have them now)
      deleteTagFromDOM(sourceTag);

      dialog.close();
      dialog.remove();
      onChanged?.();
    })();
  });

  footer.append(cancelBtn, mergeBtn);
  dialog.append(title, list, error, footer);
  document.body.append(dialog);
  dialog.showModal();
  attachBackdropClose(dialog);
}

const MINI_MENU_ID = 'yap-tag-row-ctxm';

/** Dismisses any open tag-row mini context menu. */
function dismissMiniMenu(): void {
  const existing = document.getElementById(MINI_MENU_ID) as HTMLDialogElement | null;
  if (existing != null) {
    if (existing.open) existing.close();
    existing.remove();
  }
}

/**
 * Shows a small context-menu dialog at (x, y) for a tag row inside the
 * tags dialog. Uses showModal() so it sits in the top layer above the
 * first dialog. Transparent backdrop preserves the first dialog visually.
 */
function showTagRowContextMenu(
  x: number,
  y: number,
  tagName: string,
  tagsMap: TagsMap,
  _tagsDialog: HTMLDialogElement,
  getMessage: MessageGetter,
  onChanged?: () => void
): void {
  // The ignore tag is protected — no context menu.
  if (tagName === IGNORE_TAG_NAME) return;

  dismissMiniMenu();

  const menu = document.createElement('dialog');
  menu.id = MINI_MENU_ID;
  menu.className = 'yap-tag-row-ctxm';
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const makeItem = (label: string, danger: boolean, onClick: () => void): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = danger
      ? 'yap-tag-row-ctxm__item yap-tag-row-ctxm__item--danger'
      : 'yap-tag-row-ctxm__item';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      dismissMiniMenu();
      onClick();
    });
    return btn;
  };

  menu.append(
    makeItem(getMessage('context_tag_rename'), false, () => {
      openEditTagDialog(tagName, tagsMap, getMessage, onChanged);
    }),
    makeItem(getMessage('context_tag_merge_into'), false, () => {
      openMergeTagDialog(tagName, tagsMap, getMessage, onChanged);
    }),
    makeItem(getMessage('context_tag_delete'), true, () => {
      openDeleteTagConfirm(tagName, getMessage, onChanged);
    })
  );

  document.body.append(menu);
  menu.showModal();

  menu.addEventListener('click', (e) => {
    const rect = menu.getBoundingClientRect();
    const outside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom;
    if (outside) dismissMiniMenu();
  });
}

/**
 * Opens (or focuses already-open) the tags dialog for a given username.
 * All storage I/O is async; the dialog is injected into document.body.
 */
export function openTagsDialog(username: string, getMessage: MessageGetter): void {
  // Singleton: if dialog is already open, just bring it to front
  const existing = document.getElementById(DIALOG_ID);
  if (existing != null) {
    (existing as HTMLDialogElement).showModal?.();
    return;
  }

  void buildAndShowDialog(username, getMessage);
}

async function buildAndShowDialog(username: string, getMessage: MessageGetter): Promise<void> {
  await ensureIgnoreTag();
  let tagsMap = await loadTags();
  let usersMap = await loadUsers();

  const dialog = document.createElement('dialog');
  dialog.id = DIALOG_ID;
  dialog.className = 'yap-dialog';

  function render(): void {
    dialog.replaceChildren();

    // Title
    const title = document.createElement('h3');
    title.className = 'yap-dialog__title';
    title.textContent = getMessage('tags_dialog_title', username);
    dialog.append(title);

    // Tag checkboxes
    const tagNames = Object.keys(tagsMap);
    const userTagNames = new Set(usersMap[username]?.tags ?? []);

    const checkboxSection = document.createElement('div');
    checkboxSection.className = 'yap-dialog__checkboxes';

    if (tagNames.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'yap-dialog__empty';
      empty.textContent = getMessage('tags_dialog_no_tags');
      checkboxSection.append(empty);
    } else {
      for (const tagName of tagNames) {
        const row = document.createElement('label');
        row.className = 'yap-dialog__tag-row';

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = tagName;
        cb.checked = userTagNames.has(tagName);
        cb.className = 'yap-dialog__tag-cb';

        const swatch = createTagSwatch(tagsMap[tagName]?.bgColor);

        const nameSpan = document.createElement('span');
        nameSpan.textContent = tagName;

        row.append(cb, swatch, nameSpan);
        row.dataset.tagName = tagName;
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showTagRowContextMenu(
            e.clientX, e.clientY, tagName,
            tagsMap,
            dialog, getMessage,
            () => {
              void Promise.all([loadTags(), loadUsers()]).then(([t, u]) => {
                tagsMap = t;
                usersMap = u;
                render();
              });
            }
          );
        });
        checkboxSection.append(row);
      }
    }
    dialog.append(checkboxSection);

    // New tag button
    const newTagBtn = document.createElement('button');
    newTagBtn.type = 'button';
    newTagBtn.className = 'yap-dialog__btn yap-dialog__btn--secondary yap-dialog__new-tag-btn';
    newTagBtn.textContent = getMessage('tags_dialog_new_tag_btn');
    newTagBtn.addEventListener('click', () => {
      openEditTagDialog(null, tagsMap, getMessage, () => {
        void Promise.all([loadTags(), loadUsers()]).then(([t, u]) => {
          tagsMap = t;
          usersMap = u;
          render();
        });
      });
    });
    dialog.append(newTagBtn);

    // Footer buttons
    const footer = document.createElement('div');
    footer.className = 'yap-dialog__footer';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'yap-dialog__status';

    const cancelBtn = createCancelButton(getMessage, dialog);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'yap-dialog__btn yap-dialog__btn--primary';
    saveBtn.textContent = getMessage('tags_dialog_save');
    saveBtn.addEventListener('click', async () => {
      const selected = Array.from(
        dialog.querySelectorAll<HTMLInputElement>('.yap-dialog__tag-cb:checked')
      ).map((cb) => cb.value);

      // Update user entry (keep existing user object structure)
      const existing = usersMap[username];
      if (selected.length === 0) {
        // Remove user entry entirely when no tags selected
        usersMap = Object.fromEntries(
          Object.entries(usersMap).filter(([k]) => k !== username)
        );
      } else {
        usersMap = {
          ...usersMap,
          [username]: { ...(existing ?? {}), tags: selected }
        };
      }

      await saveUsers(usersMap);

      // Update pills in-place for all matching tables
      refreshTagPillsInDOM(username, tagsMap, selected);
      const { settings } = await getSettingsDocument();
      refreshPrimaryHighlightInDOM(
        username,
        tagsMap,
        selected,
        settings.primary_tag_full_user_bg
      );

      statusSpan.textContent = getMessage('tags_dialog_saved');
      setTimeout(() => {
        dialog.close();
        dialog.remove();
      }, 800);
    });

    footer.append(statusSpan, cancelBtn, saveBtn);
    dialog.append(footer);
  }

  render();

  document.body.append(dialog);
  dialog.showModal();
  attachBackdropClose(dialog);
}
