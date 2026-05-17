import { DomainError } from '../../shared-kernel/domain-error';

export class LastOwnerError extends DomainError {
  constructor() {
    super('最後の Owner は変更できません');
  }
}
