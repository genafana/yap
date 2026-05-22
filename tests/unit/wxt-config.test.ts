import { describe, expect, it } from 'vitest';

import config from '../../wxt.config';

describe('WXT source archive configuration', () => {
  it('excludes non-review artifacts from sources zip', () => {
    expect(config.zip?.excludeSources).toEqual(
      expect.arrayContaining(['orig-poc-src/**', 'tmp/**', 'tests/**'])
    );
  });
});
