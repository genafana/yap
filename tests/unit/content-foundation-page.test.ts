import { describe, expect, it } from 'vitest';

import {
  getCurrentUser,
  getPostArea,
  getRow,
  isAuthorSearchPage
} from '../../src/features/content-foundation/page';

describe('content foundation page helpers', () => {
  it('finds rows by semantic type', () => {
    const rows = [
      {
        querySelector(selector: string) {
          return selector === 'div.postcolor' ? ({}) as Element : null;
        }
      },
      {
        querySelector(selector: string) {
          return selector === 'span.normalname, span.unreg' ? ({}) as Element : null;
        }
      }
    ];

    expect(getRow(rows, 'userMsg')).toBe(rows[0]);
    expect(getRow(rows, 'userInfo')).toBe(rows[1]);
    expect(getRow(rows, 'userTools')).toBeNull();
  });

  it('detects author search pages', () => {
    expect(
      isAuthorSearchPage(
        new URL('https://www.yaplakal.com/?act=Search&nav=au&CODE=show&id=1')
      )
    ).toBe(true);
    expect(isAuthorSearchPage(new URL('https://www.yaplakal.com/forum1.html'))).toBe(false);
  });

  it('extracts current user and post area from document-like objects', () => {
    const doc = {
      querySelector(selector: string) {
        if (selector === 'div.user-name > a') {
          return { innerText: 'CurrentUser' };
        }

        if (selector === '#Post') {
          return { id: 'Post' };
        }

        return null;
      }
    } as unknown as Document;

    expect(getCurrentUser(doc)).toBe('CurrentUser');
    expect(getPostArea(doc)).toEqual({ id: 'Post' });
  });
});

