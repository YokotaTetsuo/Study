import { ValidationError } from '../../shared-kernel/validation-error';

export const PROJECT_ROLES = [
  'owner',
  'submitter',
  'reviewer',
  'approver',
] as const;

export type ProjectRoleValue = (typeof PROJECT_ROLES)[number];

function isProjectRoleValue(value: string): value is ProjectRoleValue {
  return PROJECT_ROLES.some((role) => role === value);
}

/** プロジェクト内ロール値オブジェクト。 */
export class ProjectRole {
  readonly #value: ProjectRoleValue;

  constructor(value: string) {
    if (!isProjectRoleValue(value)) {
      throw new ValidationError(`不正なロールです: ${value}`);
    }
    this.#value = value;
  }

  get value(): ProjectRoleValue {
    return this.#value;
  }

  equals(other: ProjectRole): boolean {
    return this.#value === other.value;
  }

  isOwner(): boolean {
    return this.#value === 'owner';
  }
}
