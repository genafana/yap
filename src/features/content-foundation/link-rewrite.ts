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
    cell.innerHTML = normalizeAuthorSearchCellHtml(cell.innerHTML);
  });
}

