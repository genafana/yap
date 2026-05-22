import { describe, expect, it } from 'vitest';

import { parseLooseJson } from '../../src/utils/loose-json';

describe('parseLooseJson', () => {
  it('parses comments, trailing commas, and adjacent string literals', () => {
    const parsed = parseLooseJson<{
      group: {
        ignore: boolean;
        users: string;
      };
    }>(`{
      // line comment
      "group": {
        "ignore": true,
        "users": "one two "
                 "three",
      },
    }`);

    expect(parsed).toEqual({
      group: {
        ignore: true,
        users: 'one two three'
      }
    });
  });
});
