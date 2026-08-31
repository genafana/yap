export function matchesTagFilter(tagName: string, filterQuery: string): boolean {
  const normalizedFilter = filterQuery.trim().toLocaleLowerCase();
  if (normalizedFilter === '') {
    return true;
  }

  return tagName.toLocaleLowerCase().includes(normalizedFilter);
}
