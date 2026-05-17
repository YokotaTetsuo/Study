import { DomainError } from '../../shared-kernel/domain-error';

/** 版は PDF のみ許可。それ以外の Content-Type を拒否する。 */
export class UnsupportedContentTypeError extends DomainError {
  constructor(contentType: string) {
    super(`サポートされない Content-Type です: ${contentType}`);
  }
}
