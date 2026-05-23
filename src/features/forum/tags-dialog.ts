import type { MessageGetter } from '../../utils/i18n';
import {
  deleteTag,
  loadTags,
  loadUsers,
  saveTags,
  saveUsers,
  type TagsMap
} from '../../utils/tags';
import { getContrastColor } from '../../utils/color';

const DIALOG_ID = 'yap-tags-dialog';
const CONFIRM_DIALOG_ID = 'yap-tags-confirm-dialog';

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

    // Mirror ctxm attribute only when context menu infrastructure is present
    const ctxMenuActive = document.getElementById('ctxm-overlay') != null;

    for (const tagName of selectedTagNames) {
      const pill = document.createElement('span');
      pill.className = 'user-tag';
      pill.textContent = tagName;
      pill.dataset.tagName = tagName;
      if (ctxMenuActive) {
        pill.setAttribute('ctxm', 'tag_actions');
        pill.classList.add('has-context-menu');
      }
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

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'yap-dialog__btn yap-dialog__btn--secondary';
  cancelBtn.textContent = getMessage('tags_dialog_cancel');
  cancelBtn.addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

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
  (dialog as HTMLDialogElement).showModal();

  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (isOutside) {
      dialog.close();
      dialog.remove();
    }
  });
}

// ── Tags edit dialog ──────────────────────────────────────────────────────────

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
  _tagsDialog: HTMLDialogElement,
  getMessage: MessageGetter,
  onDeleted?: () => void
): void {
  dismissMiniMenu();

  const menu = document.createElement('dialog');
  menu.id = MINI_MENU_ID;
  menu.className = 'yap-tag-row-ctxm';
  // Position at cursor; override browser default dialog centering
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;

  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'yap-tag-row-ctxm__item';
  item.textContent = getMessage('context_tag_delete');
  item.addEventListener('click', () => {
    dismissMiniMenu();
    openDeleteTagConfirm(tagName, getMessage, onDeleted);
  });

  menu.append(item);
  document.body.append(menu);
  (menu as HTMLDialogElement).showModal();

  // Backdrop click (outside the menu box) closes it
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

        // Color swatch
        const tagDef = tagsMap[tagName];
        const bg = tagDef?.bgColor;
        const swatch = document.createElement('span');
        swatch.className = 'yap-dialog__swatch';
        if (bg != null) {
          swatch.style.background = bg;
        }

        const nameSpan = document.createElement('span');
        nameSpan.textContent = tagName;

        row.append(cb, swatch, nameSpan);
        row.dataset.tagName = tagName;
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showTagRowContextMenu(
            e.clientX, e.clientY, tagName,
            dialog as HTMLDialogElement, getMessage,
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

    // New-tag form
    const newTagSection = document.createElement('details');
    newTagSection.className = 'yap-dialog__new-tag';
    const summary = document.createElement('summary');
    summary.textContent = getMessage('tags_new_tag_heading');
    newTagSection.append(summary);

    const nameLabel = document.createElement('label');
    nameLabel.className = 'yap-dialog__field';
    const nameLabelText = document.createElement('span');
    nameLabelText.textContent = getMessage('tags_new_tag_name');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'yap-dialog__input';
    nameInput.placeholder = getMessage('tags_new_tag_name');
    nameLabel.append(nameLabelText, nameInput);

    const colorLabel = document.createElement('label');
    colorLabel.className = 'yap-dialog__field';
    const colorLabelText = document.createElement('span');
    colorLabelText.textContent = getMessage('tags_new_tag_color');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = '#e0e0e0';
    colorInput.className = 'yap-dialog__color';
    colorLabel.append(colorLabelText, colorInput);

    const addError = document.createElement('p');
    addError.className = 'yap-dialog__error';
    addError.style.display = 'none';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'yap-dialog__btn yap-dialog__btn--secondary';
    addBtn.textContent = getMessage('tags_new_tag_add');
    addBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (newName === '') {
        addError.textContent = getMessage('tags_new_tag_name_empty');
        addError.style.display = '';
        return;
      }
      addError.style.display = 'none';

      // Persist the new tag definition
      tagsMap = { ...tagsMap, [newName]: { bgColor: colorInput.value } };
      await saveTags(tagsMap);

      // Re-render the whole dialog so the new checkbox appears
      render();
    });

    newTagSection.append(nameLabel, colorLabel, addError, addBtn);
    dialog.append(newTagSection);

    // Footer buttons
    const footer = document.createElement('div');
    footer.className = 'yap-dialog__footer';

    const statusSpan = document.createElement('span');
    statusSpan.className = 'yap-dialog__status';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'yap-dialog__btn yap-dialog__btn--secondary';
    cancelBtn.textContent = getMessage('tags_dialog_cancel');
    cancelBtn.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
    });

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
  (dialog as HTMLDialogElement).showModal();

  // Close on backdrop click (click outside the dialog box)
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const isOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;
    if (isOutside) {
      dialog.close();
      dialog.remove();
    }
  });
}
