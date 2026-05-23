import type Browser from 'webextension-polyfill';

import type { UserTagsLookup } from '../../utils/tags';
import type { MessageGetter } from '../../utils/i18n';
import type { ExtensionSettings } from '../../utils/settings/defaults';
import { getContrastColor } from '../../utils/color';
import { reduceRightColumn } from '../content-foundation/dom';
import { getPostArea, getRow } from '../content-foundation/page';
import { SMILIES } from './smilies';
import { attachContextMenus } from './context-menu';
import { openTagsDialog, openDeleteTagConfirm } from './tags-dialog';

declare global {
  interface Window {
    checkFBO?: () => void;
  }
}

interface RuntimeBridge {
  browser: typeof Browser;
  manifest: {
    version: string;
    homepage_url?: string;
  };
}

interface EnhanceOptions {
  settings: ExtensionSettings;
  userTagsLookup: UserTagsLookup;
  filteredUserName: string | null;
  runtime: RuntimeBridge;
  getMessage: MessageGetter;
}

type MenuIconType = 'pm' | 'quote' | 'report' | 'reply' | 'edit';

export function scaleDimensions(size: number, height: number, width: number): {
  h: string;
  w: string;
} {
  const divider = height > width ? height : width;
  const factor = size / divider;

  if (height > width) {
    return { h: String(Math.trunc(size)), w: String(Math.trunc(width * factor)) };
  }

  return { h: String(Math.trunc(height * factor)), w: String(Math.trunc(size)) };
}

export function normalizeMessageContent(html: string): string {
  return html
    .replace(/(<!--QuoteE?Begin-->)(?:\s*<br\s*\/?>\s*)+/gi, '$1')
    .replace(/(?:\s*<br\s*\/?>\s*)+(<!--QuoteE?End-->)/gi, '$1')
    .replace(/(<!--QuoteE?End-->)(?:\s*<br\s*\/?>\s*)+/gi, '$1')
    .replace(/(?:\s*<br\s*\/?>\s*){3,}/gi, '<br><br>')
    .replace(/(<!--ec\d-->)(?:\s*<br\s*\/?>)/gi, '$1');
}

function replaceElementHtml(element: HTMLElement, html: string): void {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  const nodes = Array.from(parsed.body.childNodes).map((node) => document.importNode(node, true));
  element.replaceChildren(...nodes);
}

export function extractCitationAuthor(text: string): string | null {
  const match = text.match(/\((.+?) @/);
  return match?.[1]?.trim() ?? null;
}

export function shouldHideFilteredTable(
  filteredUserName: string | null,
  currentUserName: string | null
): boolean {
  return (
    filteredUserName != null &&
    currentUserName != null &&
    filteredUserName.trim() !== '' &&
    filteredUserName !== currentUserName
  );
}

export async function enhanceLegacyForumPage(options: EnhanceOptions): Promise<void> {
  const { settings, userTagsLookup, filteredUserName, runtime, getMessage } = options;

  addConfigMenu(runtime, getMessage);
  initContextMenu(settings, runtime, getMessage);

  if (settings.reduce_ad_block) {
    reduceRightColumn();
  }

  const postArea = getPostArea();
  if (postArea != null) {
    renderSmilesTable(settings, getMessage);
  }

  const entryTables = Array.from(document.querySelectorAll<HTMLTableElement>('table[id^="entry"]'));
  for (const table of entryTables) {
    transformEntryTable(table, {
      settings,
      userTagsLookup,
      filteredUserName,
      getMessage
    });
  }

  setupResponseFormToggle(settings, postArea, getMessage);
  adjustScrollTopElement(settings);
  addReplyUploadFeature(getMessage);
  setBetterCopyMessageLink(getMessage);
  setUserFilterForQuotes(settings);
  installAntiCollapseObserver();
}

function initContextMenu(
  settings: ExtensionSettings,
  runtime: RuntimeBridge,
  getMessage: MessageGetter
): void {
  if (!settings.apply_context_menu || document.body.dataset.yapLampContextMenu === 'ready') {
    return;
  }

  const userActions = [
    {
      label: getMessage('context_open_profile'),
      action: function (this: HTMLElement) {
        const anchor = this.closest('a') ?? this.parentElement;
        const href = anchor?.getAttribute('href');
        if (href != null) {
          window.open(href, '_blank', 'noopener');
        }
      }
    },
    {
      label: getMessage('context_filter_user'),
      action: function (this: HTMLElement) {
        const table = this.closest('table.entry-table,[data-nik-name]') as HTMLElement | null;
        const userName = table?.dataset.nikName;
        if (userName != null) {
          window.localStorage.setItem('filtered_nik_name', userName);
          window.scrollTo(0, 0);
          window.location.reload();
        }
      }
    },
    {
      label: getMessage('context_tags'),
      action: function (this: HTMLElement) {
        const table = this.closest('table.entry-table,[data-nik-name]') as HTMLElement | null;
        const userName = table?.dataset.nikName;
        if (userName != null) {
          openTagsDialog(userName, getMessage);
        }
      }
    }
  ];

  if (settings.privat_mail_type === 'avatar_rkm') {
    userActions.push({
        label: getMessage('context_write_private'),
      action: function (this: HTMLElement) {
        const table = this.closest('table');
        const pmLink = table?.querySelector<HTMLAnchorElement>('a.search_pm');
        pmLink?.click();
      }
    });
  }

  attachContextMenus(
    {
      user_actions: userActions,
      user_filter_only: [
        {
          label: getMessage('context_filter_user'),
          action: function (this: HTMLElement) {
            const userName = extractCitationAuthor(readElementText(this));
            if (userName != null) {
              window.localStorage.setItem('filtered_nik_name', userName);
              window.scrollTo(0, 0);
              window.location.reload();
            }
          }
        }
      ],
      check_update: [
        {
          label: getMessage('context_check_update', runtime.manifest.version),
          action: function () {
            const homepageUrl = runtime.manifest.homepage_url;
            if (homepageUrl != null) {
              window.open(homepageUrl, '_blank', 'noopener');
            }
          }
        }
      ],
      tag_actions: [
        {
          label: getMessage('context_tag_delete'),
          action: function (this: HTMLElement) {
            const tagName = this.dataset.tagName;
            if (tagName != null) {
              openDeleteTagConfirm(tagName, getMessage);
            }
          }
        }
      ]
    },
    document,
    window,
    getMessage('context_menu_tooltip')
  );

  document.body.dataset.yapLampContextMenu = 'ready';
}

function transformEntryTable(
  originalTable: HTMLTableElement,
  options: {
    settings: ExtensionSettings;
    userTagsLookup: UserTagsLookup;
    filteredUserName: string | null;
    getMessage: MessageGetter;
  }
): void {
  const { settings, userTagsLookup, filteredUserName, getMessage } = options;
  const rows = originalTable.rows;
  const currentUser = readCurrentUser();

  const userInfoRow = getRow(rows, 'userInfo') as HTMLTableRowElement | null;
  if (userInfoRow == null) {
    return;
  }

  const userNameElement =
    userInfoRow.querySelector<HTMLElement>('span.normalname') ??
    userInfoRow.querySelector<HTMLElement>('span.unreg');
  const currentUserName = userNameElement == null ? null : readElementText(userNameElement).trim();
  const userTags = currentUserName == null ? [] : (userTagsLookup[currentUserName] ?? []);

  if (userTags.some((t) => t.ignore === true)) {
    originalTable.style.display = 'none';
    return;
  }

  const postArea = getPostArea();
  const isCurrentUser = currentUserName != null && currentUserName === currentUser;
  const transformed = document.createElement('table');
  transformed.id = originalTable.id;
  transformed.style.width = '100%';
  transformed.classList.add('comment-table', 'entry-table');

  let online =
    userInfoRow.querySelector<HTMLElement>('span.red-circle') ??
    userInfoRow.querySelector<HTMLElement>('.green-circle');

  if (online != null) {
    online.classList.add('user-online');
  } else {
    online = document.createElement('span');
    online.textContent = '👤';
  }

  const profileAnchor = userNameElement?.querySelector<HTMLAnchorElement>('a') ?? null;
  if (userNameElement != null && profileAnchor != null) {
    userNameElement.title = profileAnchor.title;
    userNameElement.innerText = readElementText(profileAnchor).trim();
    if (profileAnchor.querySelector('s') != null) {
      userNameElement.style.textDecoration = 'line-through';
    }
    userNameElement.style.paddingRight = '.5em';
    if (!isCurrentUser) {
      userNameElement.style.cursor = 'pointer';
      userNameElement.addEventListener('click', (event) => mentionUser(event, getMessage));
    }
  }

  const userPic =
    userInfoRow.querySelector<HTMLElement>('a') ??
    userInfoRow.querySelector<HTMLElement>('div.extended') ??
    userInfoRow.querySelector<HTMLElement>('div.comment-left');
  if (userPic?.classList.contains('comment-left')) {
    userPic.classList.remove('comment-left');
  }

  let userImage = userPic?.querySelector<HTMLImageElement>('img') ?? null;
  if (userImage != null) {
    const height = Number.parseInt(userImage.getAttribute('height') ?? '0', 10);
    const width = Number.parseInt(userImage.getAttribute('width') ?? '0', 10);
    if (Number.isFinite(height) && Number.isFinite(width) && height > 0 && width > 0) {
      const scaled = scaleDimensions(settings.user_pic_size, height, width);
      userImage.setAttribute('height', scaled.h);
      userImage.setAttribute('width', scaled.w);
    }
    userImage.classList.add('user-img');
  } else if (profileAnchor != null && userPic != null) {
    const noAvatar = document.createElement('a');
    noAvatar.href = profileAnchor.href;
    userImage = document.createElement('img');
    userImage.setAttribute('height', String(settings.user_pic_size));
    userImage.setAttribute('width', String(settings.user_pic_size));
    userImage.src = '//www.yaplakal.com/html/static/noavatar.svg';
    userImage.title = getMessage('profile_title');
    userImage.classList.add('user-img');
    noAvatar.append(userImage);
    userPic.append(noAvatar);
  }

  if (userImage != null) {
    prepareForContextMenu(userImage, settings, 'user_actions');
  }

  const messageDateAnchor = userInfoRow.querySelector<HTMLAnchorElement>('a.anchor');
  if (messageDateAnchor != null) {
    const dateSpan = document.createElement('span');
    dateSpan.innerText = readElementText(messageDateAnchor);
    dateSpan.classList.add('msg-date');
    messageDateAnchor.replaceChildren(dateSpan);
  }

  let ratingValue = userInfoRow.querySelector<HTMLElement>('div.rating-value');
  if (ratingValue != null) {
    ratingValue = ratingValue.parentElement;
  }

  const userLabel = userInfoRow.querySelector<HTMLElement>('span.badge-author');
  const toPrivate = userInfoRow.querySelector<HTMLAnchorElement>('a.pm-icon');
  if (toPrivate != null) {
    decorateMessageMenuItem(toPrivate, settings, 'pm', getMessage('message_menu_pm'));
    if (settings.privat_mail_type === 'avatar_rkm') {
      toPrivate.classList.add('hidden', 'search_pm');
    }
  }

  let partialQuoteLink: HTMLAnchorElement | null = null;
  let hrefToPost: HTMLSpanElement | null = null;
  if (userInfoRow.querySelector('a.quote-icon') != null || isCurrentUser) {
    partialQuoteLink = document.createElement('a');
    partialQuoteLink.href = '#';
    partialQuoteLink.title = getMessage('partial_quote_hint');
    partialQuoteLink.dataset.tableId = originalTable.id;
    decorateMessageMenuItem(partialQuoteLink, settings, 'quote', getMessage('message_menu_quote'));
    partialQuoteLink.addEventListener('click', (event) => insertPartialQuote(event, getMessage));

    hrefToPost = document.createElement('span');
    hrefToPost.textContent = '▼';
    hrefToPost.classList.add('href-to-post');
    hrefToPost.style.display = 'none';
    hrefToPost.style.paddingLeft = '.25em';
    hrefToPost.style.paddingRight = '.25em';
    hrefToPost.style.cursor = 'pointer';
    hrefToPost.style.color = 'darkblue';
    hrefToPost.style.fontSize = '.9em';
    hrefToPost.addEventListener('click', beforeFocusReplyArea);
  }

  const replyLink = userInfoRow.querySelector<HTMLAnchorElement>('a.reply-icon');
  if (replyLink != null) {
    decorateMessageMenuItem(replyLink, settings, 'reply', getMessage('message_menu_reply'));
  }

  const reportLink = userInfoRow.querySelector<HTMLAnchorElement>('a.report-icon');
  if (reportLink != null) {
    decorateMessageMenuItem(reportLink, settings, 'report', '911');
    reportLink.classList.add('report911');
  }

  const postRank = userInfoRow.querySelector<HTMLElement>('div[id^="p_rank"]');
  const userStatus = userInfoRow.querySelector<HTMLElement>('div.postdetails');
  if (userStatus != null) {
    replaceElementLines(userStatus, buildUserStatus(userStatus, userNameElement, settings, getMessage));
  }

  const postHeaderRow = getRow(rows, 'postHeader') as HTMLTableRowElement | null;
  const editLink = postHeaderRow?.querySelector<HTMLAnchorElement>('a.edit-icon') ?? null;
  if (editLink != null) {
    decorateMessageMenuItem(editLink, settings, 'edit', getMessage('message_menu_edit'));
  }

  const messageRow = getRow(rows, 'userMsg') as HTMLTableRowElement | null;
  const messageCell = messageRow?.cells[0] ?? null;
  if (messageCell != null) {
    messageCell.classList.add('user-msg');
    messageCell.style.background = settings.message_bg_color;
    if (
      /QuoteE?Begin|QuoteE?End/.test(messageCell.innerHTML) ||
      /(?:\s*<br\s*\/?>\s*){3,}/.test(messageCell.innerHTML)
    ) {
      replaceElementHtml(messageCell, normalizeMessageContent(messageCell.innerHTML));
    }
  }

  const row1 = transformed.insertRow();
  row1.classList.add('collapsebox', 'title-msg-row');
  if (settings.title_bg_color) {
    row1.style.background = settings.title_bg_color;
  }
  if (settings.hor_separate_border) {
    row1.style.borderTop = settings.hor_separate_border;
  }

  const leftCell = row1.insertCell();
  leftCell.classList.add('entry-column1');
  leftCell.rowSpan = 2;
  leftCell.style.width = settings.left_col_width;
  leftCell.style.minWidth = settings.left_col_width;
  leftCell.style.maxWidth = settings.left_col_width;
  leftCell.style.overflowX = 'auto';
  leftCell.style.borderRight = settings.left_col_right_border;
  leftCell.style.background = settings.title_bg_color;

  const userWrapper = document.createElement('div');
  leftCell.append(userWrapper);

  const nameWrapper = document.createElement('div');
  nameWrapper.style.display = 'block';
  nameWrapper.style.whiteSpace = 'nowrap';

  const nameContainer = document.createElement('div');
  nameContainer.classList.add('user-nik');

  if (userNameElement != null) {
    if (isCurrentUser && (settings.self_highlight_bg || settings.self_highlight_border)) {
      userWrapper.classList.add('user-wrapper');
      if (settings.self_highlight_bg) {
        userWrapper.style.background = settings.self_highlight_bg;
      }
      if (settings.self_highlight_border) {
        userWrapper.style.border = settings.self_highlight_border;
      }
    }
    nameWrapper.append(userNameElement);
  }

  nameWrapper.append(online);
  nameContainer.append(nameWrapper);

  if (settings.nik_on_top) {
    nameContainer.style.paddingBottom = '.5em';
    if (userNameElement != null) {
      userWrapper.append(nameContainer);
    }
    if (userPic != null) {
      userWrapper.append(userPic);
    }
  } else {
    if (userPic != null) {
      userWrapper.append(userPic);
    }
    nameContainer.style.paddingTop = '.5em';
    if (userNameElement != null) {
      userWrapper.append(nameContainer);
    }
  }

  if (userStatus != null) {
    userWrapper.append(userStatus);
  }

  if (userLabel != null) {
    userWrapper.append(document.createElement('br'), userLabel);
  }

  if (userTags.length > 0) {
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'user-tags';
    for (const tag of userTags) {
      const pill = document.createElement('span');
      pill.className = 'user-tag';
      pill.textContent = tag.name;
      pill.dataset.tagName = tag.name;
      prepareForContextMenu(pill, settings, 'tag_actions');
      if (tag.bgColor != null) {
        pill.style.background = tag.bgColor;
        pill.style.color = getContrastColor(tag.bgColor);
      }
      tagsContainer.append(pill);
    }
    userWrapper.append(tagsContainer);
  }

  const rightTopCell = row1.insertCell();
  rightTopCell.colSpan = 2;
  rightTopCell.classList.add('entry-column2');
  rightTopCell.style.verticalAlign = 'middle';
  rightTopCell.style.height = '1.2em';
  rightTopCell.style.maxHeight = '1.2em';

  const wrapTable = document.createElement('table');
  wrapTable.style.width = '100%';
  wrapTable.style.borderCollapse = 'collapse';
  const wrapRow = wrapTable.insertRow();
  const wrapCell1 = wrapRow.insertCell();
  wrapCell1.style.paddingLeft = '.5em';
  const wrapCell2 = wrapRow.insertCell();
  rightTopCell.append(wrapTable);

  if (messageDateAnchor != null) {
    wrapCell1.append(messageDateAnchor);
  }

  const actions = document.createElement('div');
  actions.style.float = 'right';
  actions.style.display = 'inline';

  for (const node of [editLink, toPrivate, partialQuoteLink, hrefToPost, replyLink, reportLink]) {
    if (node != null) {
      actions.append(node);
    }
  }

  if (postRank != null) {
    postRank.style.paddingLeft = '1em';
    actions.append(postRank);
  }

  if (ratingValue != null) {
    const ratingWrapper = document.createElement('div');
    ratingWrapper.style.marginLeft = '2em';
    ratingWrapper.style.display = 'inline';
    ratingWrapper.append(ratingValue);
    actions.append(ratingWrapper);
  }

  wrapCell2.append(actions);

  const row2 = transformed.insertRow();
  if (messageCell != null) {
    messageCell
      .querySelectorAll<HTMLTableCellElement>('td[id^="QUOT"]')
      .forEach((quoteTableCell) => {
        quoteTableCell.style.background = settings.citate_bg_color;
        quoteTableCell.classList.add('citate');
        quoteTableCell.removeAttribute('id');
      });
    row2.append(messageCell);
  }

  const topCell = row2.insertCell();
  if (originalTable.previousElementSibling != null) {
    topCell.style.verticalAlign = 'bottom';
    topCell.style.paddingRight = '.5em';
    const scrollTop = document.createElement('a');
    scrollTop.href = '#';
    scrollTop.classList.add('title');
    scrollTop.innerText = '▲';
    scrollTop.style.fontSize = '.9em';
    scrollTop.style.textDecoration = 'none';
    const wrapper = document.createElement('div');
    wrapper.style.paddingBottom = '.5em';
    wrapper.append(scrollTop);
    topCell.style.background = settings.message_bg_color;
    topCell.append(wrapper);
  } else {
    topCell.style.minWidth = '1em';
    topCell.style.background = settings.message_bg_color;
  }

  if (currentUserName != null) {
    transformed.dataset.nikName = currentUserName;
  }

  if (shouldHideFilteredTable(filteredUserName, currentUserName)) {
    transformed.classList.add('hidden');
  }

  originalTable.replaceWith(transformed);

  if (postArea == null) {
    void postArea;
  }
}

function buildUserStatus(
  userStatus: HTMLElement,
  userNameElement: HTMLElement | null,
  settings: ExtensionSettings,
  getMessage: MessageGetter
): string[] {
  const lines: string[] = [];
  const statusHtml = userStatus.innerHTML || '';
  const infoTitle = userNameElement?.getAttribute('title') ?? '';

  const rankMatch = statusHtml.match(/.+•/);
  if (rankMatch != null) {
    lines.push(rankMatch[0].replace('•', '').trim());
  }

  if (settings.show_date_or_age === 'age') {
    const ageMatch = statusHtml.match(/сайте\s\d+.+/);
    if (ageMatch != null) {
      lines.push(`${getMessage('user_status_on_site')}: ${ageMatch[0].substring(6).trim()}`);
    }
  }

  if (settings.show_date_or_age === 'date') {
    const dateMatch = infoTitle.match(/\d{1,2}\.\d{2}\.(\d{2}|\d{4})/);
    if (dateMatch != null) {
      lines.push(dateMatch[0]);
    }
  }

  const messagesMatch = infoTitle.match(/ний:\s.+/);
  if (messagesMatch != null) {
    const digits = messagesMatch[0].match(/\d+/g);
    lines.push(`${digits?.join('') ?? 0} ${getMessage('user_status_posts_short')}`);
  }

  return lines;
}

function replaceElementLines(element: HTMLElement, lines: string[]): void {
  const nodes: Node[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(document.createElement('br'));
    }
    nodes.push(document.createTextNode(line));
  });
  element.replaceChildren(...nodes);
}

function readCurrentUser(): string | null {
  const user = document.querySelector<HTMLAnchorElement>('div.user-name > a');
  return user == null ? null : readElementText(user).trim();
}

function readElementText(element: Element | null): string {
  if (element == null) {
    return '';
  }

  return 'innerText' in element ? (element as HTMLElement).innerText : element.textContent ?? '';
}

function cleanReplyArea(textarea: HTMLTextAreaElement): void {
  if (!textarea.value.trim()) {
    textarea.value = '';
  }
}

function mentionUser(event: MouseEvent, getMessage: MessageGetter): void {
  const target = event.currentTarget as HTMLElement | null;
  const text = readElementText(target).trim();
  if (text === '') {
    return;
  }

  if (!event.ctrlKey) {
    void navigator.clipboard.writeText(text);
    showToastMessage(getMessage('toast_nick_copied'));
    return;
  }

  const postArea = getPostArea();
  if (postArea == null) {
    return;
  }

  cleanReplyArea(postArea);
  if (postArea.value && !postArea.value.endsWith('\n')) {
    postArea.value += '\n';
  }
  postArea.value += `[b]${text}[/b]\n`;

  const replier = document.getElementById('REPLIER');
  if (replier != null) {
    (replier as HTMLElement).style.display = '';
  }

  const toggleButton = document.getElementById('toggleFBO');
  if (toggleButton != null) {
    toggleButton.textContent = getMessage('fbo_hide');
  }

  postArea.focus();
  const length = postArea.value.length;
  postArea.selectionStart = length;
  postArea.selectionEnd = length;
}

function decorateMessageMenuItem(
  element: HTMLElement,
  settings: ExtensionSettings,
  iconType: MenuIconType,
  text: string
): void {
  element.className = '';
  element.classList.add('msg-menu-item');
  if (settings.msg_menu_type === 'text') {
    element.classList.add('msg-menu-text');
    element.innerText = text;
    return;
  }

  element.classList.add('msg-menu-icon', `icon-${iconType}`);
  element.innerText = '';
}

function prepareForContextMenu(
  element: HTMLElement,
  settings: ExtensionSettings,
  menuName: string
): void {
  if (!settings.apply_context_menu) {
    return;
  }

  element.setAttribute('ctxm', menuName);
  element.classList.add('has-context-menu');
  element.style.cursor = 'default';
}

function addConfigMenu(runtime: RuntimeBridge, getMessage: MessageGetter): void {
  if (document.getElementById('plugin-config-menu') != null) {
    return;
  }

  const menu = document.querySelector<HTMLElement>('div#main-menu');
  if (menu == null) {
    return;
  }

  const configMenu = document.createElement('span');
  configMenu.id = 'plugin-config-menu';
  configMenu.style.paddingLeft = '.5em';
  configMenu.style.color = 'Honeydew';
  configMenu.style.cursor = 'pointer';
  configMenu.textContent = `⚙️ ${getMessage('config_menu_version', runtime.manifest.version)}`;
  configMenu.addEventListener('click', () => {
    void runtime.browser.runtime.openOptionsPage();
  });
  configMenu.classList.add('has-context-menu');
  configMenu.setAttribute('ctxm', 'check_update');
  menu.append(configMenu);
}

function setupResponseFormToggle(
  settings: ExtensionSettings,
  postArea: HTMLTextAreaElement | null,
  getMessage: MessageGetter
): void {
  if (settings.response_form !== 'toggle' || postArea == null) {
    return;
  }

  // Only apply on the thread/comments page — not on reply or report pages
  if (document.querySelector('table[id^="entry"]') == null) {
    return;
  }

  const replier = document.getElementById('REPLIER') as HTMLElement | null;
  if (replier == null || document.getElementById('toggleFBO') != null) {
    return;
  }

  const tables = document.querySelectorAll<HTMLTableElement>('table.row3');
  if (tables.length > 0) {
    const row = tables[tables.length - 1].rows[0];
    const buttonCell = row.insertCell(1);
    const firstCellIsEmpty = (row.cells[0]?.innerText ?? '') === '';
    buttonCell.style.textAlign = firstCellIsEmpty ? 'right' : 'center';
    if (firstCellIsEmpty) {
      buttonCell.style.width = '50%';
    }
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleFBO';
    toggleButton.type = 'button';
    toggleButton.textContent = getMessage('fbo_hide');
    buttonCell.append(toggleButton);
  } else {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'toggleFBO';
    toggleButton.type = 'button';
    toggleButton.textContent = getMessage('fbo_hide');
    toggleButton.style.margin = '10px 0';
    replier.parentNode?.insertBefore(toggleButton, replier);
  }

  const toggleButton = document.getElementById('toggleFBO');
  if (toggleButton == null) {
    return;
  }

  const updateButtonText = () => {
    toggleButton.textContent = replier.style.display === 'none' ? getMessage('fbo_show') : getMessage('fbo_hide');
  };

  const checkFBO = () => {
    replier.style.display = postArea.value.trim() ? '' : 'none';
    updateButtonText();
  };

  toggleButton.addEventListener('click', () => {
    replier.style.display = replier.style.display === 'none' ? '' : 'none';
    updateButtonText();
  });
  postArea.addEventListener('input', checkFBO);
  window.checkFBO = checkFBO;
  checkFBO();
}

function beforeFocusReplyArea(): void {
  document.querySelectorAll<HTMLElement>('span.href-to-post').forEach((element) => {
    element.style.display = 'none';
  });

  const postArea = getPostArea();
  if (postArea == null) {
    return;
  }

  cleanReplyArea(postArea);
  postArea.focus();
  const length = postArea.value.length;
  postArea.selectionStart = length;
  postArea.selectionEnd = length;
}

function insertPartialQuote(event: Event, getMessage: MessageGetter): void {
  event.preventDefault();

  const info = getSelectionInfo();
  if (info == null) {
    alert((event.currentTarget as HTMLElement | null)?.title ?? getMessage('selection_empty'));
    return;
  }

  const trigger = event.currentTarget as HTMLElement | null;
  if (info.ownerTable == null) {
    alert(getMessage('selection_not_from_feed'));
    return;
  }

  if (info.ownerTable.id !== (trigger?.dataset.tableId ?? '')) {
    alert(getMessage('selection_not_from_quoted_message'));
    return;
  }

  let quoteTitle = `[color=red][i]${getMessage('quoted_user_not_found')}[/i][/color]`;

  if (info.element.tagName === 'DIV' && info.element.classList.contains('postcolor')) {
    const nameElement = info.ownerTable.querySelector<HTMLElement>('span.normalname, span.unreg');
    const dateElement = info.ownerTable.querySelector<HTMLElement>('span.msg-date');
    const userName = readElementText(nameElement);
    const messageDate = readElementText(dateElement);
    quoteTitle = `${userName} @ ${messageDate}`;

    const messageDateAnchor = dateElement?.parentElement as HTMLAnchorElement | null;
    const prefixUrl = `[url=${messageDateAnchor?.href ?? ''}]🔗[/url] `;
    if (!info.bbcode.trim().startsWith('[quote')) {
      info.bbcode = prefixUrl + info.bbcode;
    } else {
      const lastClose = info.bbcode.lastIndexOf('[/quote]');
      info.bbcode =
        lastClose === -1
          ? prefixUrl + info.bbcode
          : `${info.bbcode.slice(0, lastClose + 8)}${prefixUrl}${info.bbcode
              .slice(lastClose + 8)
              .trim()}`;
    }
  } else if (info.element.tagName === 'TD' && info.element.id === 'QUOTE') {
    const authorCell = getFirstCellInPreviousRow(info.element as HTMLTableCellElement);
    const match = readElementText(authorCell).match(/\(([^)]+)\)/);
    quoteTitle = match?.[1]?.trim() ?? `[i]${getMessage('quoted_user_missing')}[/i]`;
  }

  const insertedQuote = `[quote=${quoteTitle}]${info.bbcode}[/quote]`;
  const postArea = getPostArea();
  if (postArea == null) {
    alert(getMessage('reply_form_not_found'));
    return;
  }

  postArea.value += `${postArea.value && !postArea.value.endsWith('\n') ? '\n' : ''}${insertedQuote}\n`;
  if (window.checkFBO != null) {
    window.checkFBO();
  }

  const hrefToPost = trigger?.nextElementSibling as HTMLElement | null;
  if (hrefToPost != null) {
    hrefToPost.style.display = 'inline';
  }
}

function getSelectionInfo():
  | {
      text: string;
      bbcode: string;
      element: HTMLElement;
      ownerTable: HTMLTableElement | null;
    }
  | null {
  const selection = window.getSelection();
  if (selection == null || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const text = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const bbcode = htmlToBBCode(range.cloneContents());
  let container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement ?? document.body;
  }
  const block = findParent(
    container,
    'p, div, td, th, li, blockquote, h1, h2, h3, h4, h5, h6, article, section'
  );
  const element = (block ?? container) as HTMLElement;
  const ownerTable = findParent(element, 'table.entry-table') as HTMLTableElement | null;

  return { text, bbcode, element, ownerTable };
}

function htmlToBBCode(root: DocumentFragment): string {
  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue ?? '';
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      return Array.from(node.childNodes).map(walk).join('');
    }

    if (!(node instanceof Element)) {
      return '';
    }

    const tag = node.tagName.toLowerCase();
    if (tag === 'table') {
      return parseQuoteTable(node as HTMLTableElement);
    }
    if (tag === 'a') {
      return `[url=${node.getAttribute('href') ?? ''}]${Array.from(node.childNodes)
        .map(walk)
        .join('')}[/url]`;
    }
    if (tag === 'img') {
      let src =
        node.getAttribute('src') ??
        node.getAttribute('data-src') ??
        node.getAttribute('data-original') ??
        '';
      if (src.startsWith('//')) {
        src = `https:${src}`;
      }
      return src ? `[img]${src}[/img]` : '';
    }
    if (tag === 'b' || tag === 'strong') {
      return `[b]${Array.from(node.childNodes).map(walk).join('')}[/b]`;
    }
    if (tag === 'i' || tag === 'em') {
      return `[i]${Array.from(node.childNodes).map(walk).join('')}[/i]`;
    }
    if (tag === 'u') {
      return `[u]${Array.from(node.childNodes).map(walk).join('')}[/u]`;
    }
    if (tag === 'br') {
      return '\n';
    }
    if (tag === 'div' || tag === 'p') {
      return `${Array.from(node.childNodes).map(walk).join('')}\n`;
    }

    return Array.from(node.childNodes).map(walk).join('');
  };

  return walk(root).replace(/\n{3,}/g, '\n\n').trim();
}

function parseQuoteTable(table: HTMLTableElement): string {
  let author = '';
  const rows = table.querySelectorAll('tr');
  let contentCell: HTMLTableCellElement | null = null;

  if (rows.length >= 2) {
    const match = readElementText(rows[0]).match(/Цитата\s*\(([^)]+)\)/);
    author = match?.[1] ?? '';
    contentCell = rows[1].querySelector('td');
  }

  const content =
    contentCell == null
      ? ''
      : (() => {
          const fragment = document.createDocumentFragment();
          fragment.append(contentCell.cloneNode(true));
          return htmlToBBCode(fragment);
        })()
          .replace(/<!--Quote(E|B)[^>]*-->/g, '')
          .trim();

  return `[quote=${author}]\n${content}\n[/quote]\n`;
}

function findParent(node: Node | null, selector: string): HTMLElement | null {
  let current: Node | null = node;
  while (current != null && current !== document.body) {
    if (current instanceof Element && current.matches(selector)) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  return null;
}

function getFirstCellInPreviousRow(td: HTMLTableCellElement): HTMLTableCellElement | null {
  const row = td.closest('tr');
  const previousRow = row?.previousElementSibling as HTMLTableRowElement | null;
  return previousRow?.cells[0] ?? null;
}

function adjustScrollTopElement(settings: ExtensionSettings): void {
  if (!settings.origin_scroll_top) {
    return;
  }

  const scrollTopElement = document.querySelector<HTMLElement>('#scrollTop');
  if (scrollTopElement == null) {
    return;
  }

  if (settings.origin_scroll_top === 'hide') {
    scrollTopElement.classList.add('hidden');
    return;
  }

  const table = document.querySelector('table.entry-table')?.closest('table');
  if (table != null) {
    scrollTopElement.style.left = `${Math.trunc(table.getBoundingClientRect().right) + 8}px`;
  }
}

function addReplyUploadFeature(getMessage: MessageGetter): void {
  const replier = document.getElementById('REPLIER');
  if (replier == null || replier.querySelector('input[name=FILE_UPLOAD]') != null) {
    return;
  }

  const replyTable = replier.querySelector('table');
  if (replyTable == null) {
    return;
  }

  const index = Math.max(replyTable.rows.length - 1, 0);
  const row = replyTable.insertRow(index);
  const cell = row.insertCell();
  cell.style.background = 'whitesmoke';
  cell.style.borderTop = '1px solid gainsboro';
  const wrapper = document.createElement('div');
  wrapper.className = 'reply-form';

  const leftBlock = document.createElement('div');
  leftBlock.className = 'reply-form-synteticleft-block';

  const textareaWrap = document.createElement('div');
  textareaWrap.className = 'reply-form-textarea-wrap';

  const title = document.createElement('b');
  title.style.paddingRight = '.5em';
  title.textContent = getMessage('reply_upload_image');

  const maxFileSize = document.createElement('input');
  maxFileSize.type = 'hidden';
  maxFileSize.name = 'MAX_FILE_SIZE';
  maxFileSize.value = '3145728';

  const fileInput = document.createElement('input');
  fileInput.className = 'textinput';
  fileInput.type = 'file';
  fileInput.size = 30;
  fileInput.name = 'FILE_UPLOAD';

  const lineBreak = document.createElement('br');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.name = 'enabletag';
  checkbox.id = 'enabletag';
  checkbox.className = 'checkbox';
  checkbox.value = '1';
  checkbox.checked = true;

  const checkboxLabel = document.createElement('label');
  checkboxLabel.htmlFor = 'enabletag';

  const checkboxPrefix = document.createElement('strong');
  checkboxPrefix.textContent = getMessage('reply_enable_logo_prefix');

  checkboxLabel.append(checkboxPrefix, document.createTextNode(` ${getMessage('reply_enable_logo')}`));
  textareaWrap.append(title, maxFileSize, fileInput, lineBreak, checkbox, checkboxLabel);

  const rightBlock = document.createElement('div');
  rightBlock.className = 'reply-form-right-block';
  rightBlock.style.verticalAlign = 'middle';
  rightBlock.style.textAlign = 'center';

  const topImage = document.createElement('img');
  topImage.id = 'imghaha_up';
  topImage.src = '//www.yaplakal.com/html/emoticons/brake.gif';

  const bottomImage = document.createElement('img');
  bottomImage.id = 'imghaha_bot';
  bottomImage.src = '//www.yaplakal.com/html/emoticons/rulez.gif';

  rightBlock.append(topImage, document.createElement('br'), bottomImage);
  wrapper.append(leftBlock, textareaWrap, rightBlock);
  cell.append(wrapper);

  const textarea = document.querySelector<HTMLTextAreaElement>('textarea#Post');
  textarea?.addEventListener('click', hideHaha);
}

function hideHaha(): void {
  const firstId = Math.random() < 0.5 ? 'imghaha_up' : 'imghaha_bot';
  const secondId = firstId === 'imghaha_up' ? 'imghaha_bot' : 'imghaha_up';
  window.setTimeout(() => hideElement(firstId), 500);
  window.setTimeout(() => hideElement(secondId), 1000);
}

function hideElement(id: string): void {
  const element = document.getElementById(id) as HTMLElement | null;
  if (element != null) {
    element.style.display = 'none';
  }
}

function setBetterCopyMessageLink(getMessage: MessageGetter): void {
  document.querySelectorAll<HTMLAnchorElement>('a.anchor').forEach((anchor) => {
    anchor.addEventListener(
      'click',
      (event) => {
        const currentTarget =
          ((event.target as HTMLElement | null)?.closest('a.anchor') as HTMLAnchorElement | null) ??
          anchor;
        event.preventDefault();
        event.stopImmediatePropagation();
        const table = currentTarget.closest<HTMLTableElement>('table.entry-table');
        const nick = table?.dataset.nikName ?? '';
        void navigator.clipboard.writeText(`${currentTarget.href}\n${nick} - `);
        showToastMessage(getMessage('toast_link_copied'));
      },
      true
    );
  });
}

function setUserFilterForQuotes(settings: ExtensionSettings): void {
  if (!settings.apply_context_menu) {
    return;
  }

  document.querySelectorAll<HTMLTableCellElement>('td.citate').forEach((quoteCell) => {
    const titleCell =
      quoteCell.parentElement?.previousElementSibling?.firstElementChild as HTMLElement | null;
    if (titleCell == null || extractCitationAuthor(readElementText(titleCell)) == null) {
      return;
    }

    const span = document.createElement('span');
    while (titleCell.firstChild != null) {
      span.append(titleCell.firstChild);
    }
    titleCell.append(span);
    prepareForContextMenu(span, settings, 'user_filter_only');
  });
}

function renderSmilesTable(settings: ExtensionSettings, getMessage: MessageGetter): HTMLElement | null {
  if (!settings.smilies_show_all) {
    return null;
  }

  const layout = findSmiliesLayout(settings);
  if (layout == null) {
    return null;
  }

  const details = document.createElement('details');
  details.className = 'smilies-details';
  details.style.width = '100%';

  const summary = document.createElement('summary');
  summary.textContent = getMessage('smilies_title');
  summary.style.fontSize = '.9em';
  summary.style.cursor = 'pointer';
  summary.style.paddingBottom = '.25em';
  details.append(summary);

  const table = document.createElement('table');
  table.className = 'smilies-table';
  table.cellSpacing = '0';
  table.cellPadding = '0';
  table.style.borderCollapse = 'collapse';

  let row: HTMLTableRowElement | null = null;
  let columns = Number.parseInt(settings.smilies_columns, 10);
  if (!Number.isFinite(columns) || columns < 2 || columns > 5) {
    columns = 2;
  }

  SMILIES.forEach((smile, index) => {
    if (index % columns === 0) {
      row = document.createElement('tr');
      table.append(row);
    }

    const cell = document.createElement('td');
    cell.className = 'smile-cell';
    cell.align = 'center';
    cell.vAlign = 'top';
    cell.style.padding = '4px 0px';

    const image = document.createElement('img');
    image.src = smile.src;
    image.alt = smile.code;
    image.setAttribute('equalText', smile.code);
    image.style.cursor = 'pointer';
    image.style.border = 'none';
    image.style.verticalAlign = 'middle';
    image.addEventListener('click', () => addSmile(image));
    cell.append(image);

    if (settings.smilies_text === 'title') {
      image.title = smile.code;
    } else if (settings.smilies_text === 'bottom') {
      const code = document.createElement('div');
      code.className = 'smile-code';
      code.textContent = smile.code;
      code.style.fontSize = '11px';
      code.style.color = '#555';
      code.style.marginTop = '4px';
      code.style.lineHeight = '1.2';
      cell.append(code);
    }

    row?.append(cell);
  });

  const container = document.createElement('div');
  container.style.overflowY = 'scroll';
  container.style.height = layout.isSimpleForm ? '18em' : '27em';
  container.append(table);
  details.append(container);
  layout.element.append(details);

  return details;
}

function findSmiliesLayout(settings: ExtensionSettings):
  | { element: HTMLElement; isSimpleForm: boolean }
  | null {
  const leftBlocks = document.querySelectorAll<HTMLElement>('div.reply-form-left-block');
  const isSimpleForm = leftBlocks.length > 0 && document.querySelector('div.bbcode') == null;

  const element =
    leftBlocks.length > 0
      ? isSimpleForm
        ? (leftBlocks[0] ?? null)
        : (leftBlocks[1] ?? null)
      : document.querySelector<HTMLElement>('td.pformleft');

  if (element == null) {
    return null;
  }

  element.replaceChildren();
  element.style.verticalAlign = 'top';
  element.style.textAlign = 'left';

  const show =
    settings.smilies_show_all === 'always' ||
    (isSimpleForm && settings.smilies_show_all === 'simple');
  return show ? { element, isSimpleForm } : null;
}

function addSmile(image: HTMLImageElement): void {
  const textarea = getPostArea();
  if (textarea == null) {
    return;
  }

  const smileCode = ` ${image.getAttribute('equalText') ?? ''}`;
  if (!smileCode.trim()) {
    return;
  }

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value =
    textarea.value.substring(0, start) + smileCode + textarea.value.substring(end);
  const newPosition = start + smileCode.length;
  textarea.selectionStart = newPosition;
  textarea.selectionEnd = newPosition;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function showToastMessage(text: string): void {
  let toast = document.getElementById('ext-toast');
  if (toast == null) {
    toast = document.createElement('div');
    toast.id = 'ext-toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.append(toast);
  }

  toast.textContent = text;
  toast.classList.add('show');
  const timer = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 1750);

  void timer;
}

function installAntiCollapseObserver(): void {
  if (document.body == null || window.MutationObserver == null) {
    return;
  }

  const isTarget = (element: Element): boolean => {
    const tag = element.tagName.toUpperCase();
    return (
      (tag === 'TR' && element.className.includes('collapsebox')) ||
      element.id.startsWith('pr_') ||
      element.id.startsWith('pb_')
    );
  };

  const getDisplay = (tag: string): string => {
    const normalized = tag.toUpperCase();
    if (normalized === 'TR') {
      return 'table-row';
    }
    if (['TBODY', 'THEAD', 'TFOOT'].includes(normalized)) {
      return 'table-header-group';
    }
    if (['TD', 'TH'].includes(normalized)) {
      return 'table-cell';
    }
    if (['SPAN', 'A', 'B', 'STRONG'].includes(normalized)) {
      return 'inline';
    }
    return '';
  };

  const observer = new MutationObserver((mutations) => {
    const toRestore: Element[] = [];
    mutations.forEach((mutation) => {
      if (mutation.type !== 'attributes') {
        return;
      }

      const element = mutation.target as Element;
      if (!isTarget(element)) {
        return;
      }

      const computed = window.getComputedStyle(element);
      if (computed.display === 'none') {
        toRestore.push(element);
      }
    });

    if (toRestore.length === 0) {
      return;
    }

    observer.disconnect();
    toRestore.forEach((element) => {
      (element as HTMLElement).style.display = getDisplay(element.tagName);
    });
    requestAnimationFrame(() => {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true
      });
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'class'],
    subtree: true
  });
}
