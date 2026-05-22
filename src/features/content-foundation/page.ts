export type MessageRowType = 'userInfo' | 'userMsg' | 'postHeader' | 'userTools';

const rowMatchers: Record<MessageRowType, string> = {
  userInfo: 'span.normalname, span.unreg',
  userMsg: 'div.postcolor',
  postHeader: 'div.post-header',
  userTools: 'div.post-tools'
};

export function getRow(
  rows: ArrayLike<{ querySelector(selector: string): Element | null }>,
  type: MessageRowType
): { querySelector(selector: string): Element | null } | null {
  const selector = rowMatchers[type];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row.querySelector(selector) != null) {
      return row;
    }
  }

  return null;
}

export function getCurrentUser(doc: Document = document): string | null {
  const user = doc.querySelector<HTMLAnchorElement>('div.user-name > a');
  return user?.innerText ?? user?.textContent ?? null;
}

export function getPostArea(doc: Document = document): HTMLTextAreaElement | null {
  return doc.querySelector<HTMLTextAreaElement>('#Post');
}

export function isAuthorSearchPage(url: URL): boolean {
  return (
    url.searchParams.get('act') === 'Search' &&
    url.searchParams.get('nav') === 'au' &&
    url.searchParams.get('CODE') === 'show'
  );
}

