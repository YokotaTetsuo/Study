import { describe, expect, it } from 'vitest';

import { renameDocumentRequestSchema } from './document';

describe('renameDocumentRequestSchema', () => {
  it.each([
    { input: '', reason: '空文字' },
    { input: '   ', reason: '空白のみ' },
    { input: '\t\n ', reason: '空白文字のみ（タブ・改行）' },
    { input: ` ${'x'.repeat(201)} `, reason: 'trim 後に最大超' },
  ])('should reject the name when it is invalid ($reason)', ({ input }) => {
    expect(renameDocumentRequestSchema.safeParse({ name: input }).success).toBe(
      false,
    );
  });

  it('should trim surrounding whitespace before length validation', () => {
    const result = renameDocumentRequestSchema.safeParse({
      name: '  設計書  ',
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe('設計書');
  });

  it('should accept the name at the max length after trimming', () => {
    const name = `  ${'x'.repeat(200)}  `;

    const result = renameDocumentRequestSchema.safeParse({ name });

    expect(result.success).toBe(true);
    expect(result.success && result.data.name).toBe('x'.repeat(200));
  });
});
