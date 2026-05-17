import { beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from '../../../infrastructure/env';
import {
  createS3Client,
  ensureBucket,
} from '../../../infrastructure/storage/s3-client';

import { S3FileStorage } from './s3-file-storage';

// 他スイートと衝突しないようスイート固有バケットを使う（testing 規約 5）。
const BUCKET = 'pdfreview-s3-file-storage-test';
const env = loadEnv(process.env);
const client = createS3Client(env);
const storage = new S3FileStorage(client, BUCKET);

beforeAll(async () => {
  await ensureBucket(client, BUCKET, env.S3_REGION);
});

describe('S3FileStorage', () => {
  it('should round-trip stored bytes', async () => {
    const key = `documents/round-trip/${String(Date.now())}.pdf`;
    const data = new Uint8Array([37, 80, 68, 70]); // %PDF

    await storage.put(key, data, 'application/pdf');
    const fetched = await storage.get(key);

    expect(fetched).toEqual(data);
  });

  it('should return null for a missing key', async () => {
    expect(await storage.get('documents/does-not-exist.pdf')).toBeNull();
  });
});
