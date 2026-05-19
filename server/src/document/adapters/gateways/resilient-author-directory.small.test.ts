import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FailingAuthorDirectory,
  FakeAuthorDirectory,
  MEMBER_DISPLAY_NAME,
  MEMBER_ID,
} from '../../__tests__/fakes';

import { ResilientAuthorDirectory } from './resilient-author-directory';

describe('ResilientAuthorDirectory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delegate to the inner directory when it resolves', async () => {
    const directory = new ResilientAuthorDirectory(
      new FakeAuthorDirectory({ [MEMBER_ID]: MEMBER_DISPLAY_NAME }),
    );

    const result = await directory.findDisplayNames([MEMBER_ID]);

    expect(result.get(MEMBER_ID)).toBe(MEMBER_DISPLAY_NAME);
  });

  it('should return an empty map without propagating when the inner directory throws', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const directory = new ResilientAuthorDirectory(
      new FailingAuthorDirectory(),
    );

    const result = await directory.findDisplayNames([MEMBER_ID]);

    expect(result.size).toBe(0);
  });

  it('should warn exactly once per failed resolution', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const directory = new ResilientAuthorDirectory(
      new FailingAuthorDirectory(),
    );

    await directory.findDisplayNames([MEMBER_ID]);

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
