/* eslint-disable @typescript-eslint/naming-convention --
   環境変数名は UPPER_SNAKE_CASE が OS/12-factor の慣習のため対象外。 */
import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

describe('loadEnv', () => {
  it('should apply defaults when variables are absent', () => {
    const env = loadEnv({});

    expect(env).toEqual({
      DB_HOST: 'localhost',
      DB_PORT: 5432,
      DB_USER: 'pdfreview',
      DB_PASSWORD: 'pdfreview',
      DB_NAME: 'pdfreview',
      PORT: 3000,
      NODE_ENV: 'development',
      CLIENT_ORIGIN: 'http://localhost:5173',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'pdfreview',
      S3_ACCESS_KEY_ID: 'pdfreview',
      S3_SECRET_ACCESS_KEY: 'pdfreview',
      S3_FORCE_PATH_STYLE: true,
    });
  });

  it('should coerce provided values', () => {
    const env = loadEnv({ DB_PORT: '5544', PORT: '8080', DB_HOST: 'db.local' });

    expect(env.DB_PORT).toBe(5544);
    expect(env.PORT).toBe(8080);
    expect(env.DB_HOST).toBe('db.local');
  });

  it.each([
    { value: '0', reason: 'below range' },
    { value: '70000', reason: 'above range' },
    { value: '1.5', reason: 'not an integer' },
    { value: 'abc', reason: 'not numeric' },
  ])('should reject an invalid DB_PORT ($reason)', ({ value }) => {
    expect(() => loadEnv({ DB_PORT: value })).toThrow();
  });

  it('should reject an empty required string', () => {
    expect(() => loadEnv({ DB_NAME: '' })).toThrow();
  });

  it('should preserve a valid NODE_ENV and reject an invalid one', () => {
    expect(loadEnv({ NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow();
  });

  it('should normalize CLIENT_ORIGIN to an origin and reject non-URLs', () => {
    expect(
      loadEnv({ CLIENT_ORIGIN: 'https://app.example.com/foo?x=1' })
        .CLIENT_ORIGIN,
    ).toBe('https://app.example.com');
    expect(() => loadEnv({ CLIENT_ORIGIN: 'not-a-url' })).toThrow();
  });
});
