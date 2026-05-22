import { isAuthorSearchPage } from './page';

export function normalizeAuthorSearchCellHtml(html: string): string {
  return html.replace(/🔗/g, '«').replace(/↗/g, '«');
}

export function replaceAuthorSearchLinks(doc: Document = document): void {
  if (!isAuthorSearchPage(new URL(window.location.href))) {
    return;
  }

  const cells = doc.querySelectorAll<HTMLTableCellElement>('td.post1');
  cells.forEach((cell) => {
    const walker = doc.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current != null) {
      current.textContent = normalizeAuthorSearchCellHtml(current.textContent ?? '');
      current = walker.nextNode();
    }
  });
}
