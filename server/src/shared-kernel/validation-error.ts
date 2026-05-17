import { DomainError } from './domain-error';

/**
 * 値オブジェクト構築時などのドメイン検証失敗。
 */
export class ValidationError extends DomainError {}
