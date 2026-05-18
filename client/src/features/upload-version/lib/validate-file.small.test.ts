import { describe, expect, it } from 'vitest';

import { MAX_FILE_SIZE_BYTES, validatePdfFile } from './validate-file';

function fileOf(opts: { type: string; size: number; name?: string }): File {
  const file = new File(['x'], opts.name ?? 'doc.pdf', { type: opts.type });
  // jsdom の File は size を内容長から算出するため、size を上書きする。
  Object.defineProperty(file, 'size', { value: opts.size });
  return file;
}

describe('validatePdfFile', () => {
  it('should accept a valid PDF within the size limit', () => {
    expect(
      validatePdfFile(fileOf({ type: 'application/pdf', size: 1024 })),
    ).toEqual({ ok: true });
  });

  it('should accept a PDF exactly at the size limit (boundary)', () => {
    expect(
      validatePdfFile(
        fileOf({ type: 'application/pdf', size: MAX_FILE_SIZE_BYTES }),
      ),
    ).toEqual({ ok: true });
  });

  it('should accept a PDF with case/whitespace variation in the MIME type', () => {
    expect(
      validatePdfFile(fileOf({ type: '  APPLICATION/PDF  ', size: 1024 })),
    ).toEqual({ ok: true });
  });

  it('should reject a non-PDF MIME type', () => {
    const result = validatePdfFile(
      fileOf({ type: 'image/png', size: 1024, name: 'a.png' }),
    );
    expect(result.ok).toBe(false);
  });

  it('should reject a file just over the size limit (boundary)', () => {
    const result = validatePdfFile(
      fileOf({ type: 'application/pdf', size: MAX_FILE_SIZE_BYTES + 1 }),
    );
    expect(result.ok).toBe(false);
  });

  it('should reject an empty file', () => {
    const result = validatePdfFile(
      fileOf({ type: 'application/pdf', size: 0 }),
    );
    expect(result.ok).toBe(false);
  });
});
