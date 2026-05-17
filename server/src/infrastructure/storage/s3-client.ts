import {
  BucketAlreadyOwnedByYou,
  BucketLocationConstraint,
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';

import type { Env } from '../env';

const DEFAULT_REGION = 'us-east-1';

/** env から S3 互換クライアントを構築する。 */
export function createS3Client(env: Env): S3Client {
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
}

function isNotFound(e: unknown): boolean {
  return e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404;
}

/** SDK が知るリージョン制約だけを返す（RustFS 等の独自値は undefined）。 */
function toLocationConstraint(
  region: string,
): BucketLocationConstraint | undefined {
  return Object.values(BucketLocationConstraint).find((v) => v === region);
}

/* eslint-disable @typescript-eslint/naming-convention --
   Bucket 等は AWS SDK の外部 API で決まる識別子のため対象外。 */
/**
 * バケットが無ければ作成する（冪等）。
 * 存在確認が 404 のときだけ作成し、それ以外（権限不足・誤 endpoint 等）は
 * 起動失敗として再 throw する。作成競合は無視する。
 */
export async function ensureBucket(
  client: S3Client,
  bucket: string,
  region: string,
): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return;
  } catch (e) {
    if (!isNotFound(e)) {
      throw e;
    }
  }
  // AWS S3 本体は us-east-1 以外で LocationConstraint が必須。
  const constraint =
    region === DEFAULT_REGION ? undefined : toLocationConstraint(region);
  try {
    await client.send(
      new CreateBucketCommand({
        Bucket: bucket,
        ...(constraint === undefined
          ? {}
          : { CreateBucketConfiguration: { LocationConstraint: constraint } }),
      }),
    );
  } catch (e) {
    // 自分が所有する既存バケットのみ許容。BucketAlreadyExists（他アカウント
    // 所有の同名バケット）は誤った環境を指す危険があるため再 throw する。
    if (e instanceof BucketAlreadyOwnedByYou) {
      return;
    }
    throw e;
  }
}
/* eslint-enable @typescript-eslint/naming-convention */
