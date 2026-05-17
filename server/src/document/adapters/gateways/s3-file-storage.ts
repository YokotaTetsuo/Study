import {
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { S3Client } from '@aws-sdk/client-s3';

import type { FileStorage } from '../../../shared-kernel/file-storage';

/* eslint-disable @typescript-eslint/naming-convention --
   Bucket/Key/Body/ContentType は AWS SDK の外部 API で決まる識別子のため対象外。 */
/**
 * S3 互換ストレージ（RustFS など）への FileStorage 実装。
 * バケットの存在は infrastructure 側の起動時処理で保証する。
 */
export class S3FileStorage implements FileStorage {
  readonly #client: S3Client;
  readonly #bucket: string;

  constructor(client: S3Client, bucket: string) {
    this.#client = client;
    this.#bucket = bucket;
  }

  async put(key: string, data: Uint8Array, contentType: string): Promise<void> {
    await this.#client.send(
      new PutObjectCommand({
        Bucket: this.#bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const res = await this.#client.send(
        new GetObjectCommand({ Bucket: this.#bucket, Key: key }),
      );
      if (res.Body === undefined) {
        return null;
      }
      return await res.Body.transformToByteArray();
    } catch (e) {
      if (e instanceof NoSuchKey) {
        return null;
      }
      throw e;
    }
  }
}
/* eslint-enable @typescript-eslint/naming-convention */
