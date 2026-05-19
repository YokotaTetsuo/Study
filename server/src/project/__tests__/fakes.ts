import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { UserDirectory, UserProfile } from '../application/user-directory';
import type { MemberUserId } from '../domain/member-user-id';
import type { Project } from '../domain/project';
import type { ProjectId } from '../domain/project-id';
import type { ProjectRepository } from '../domain/project-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');
export const PROJECT_ID_1 = '01HQ8ZK9PRSTVWXYZ234567890';
export const OWNER_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
export const MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';
export const MEMBER_EMAIL = 'member@example.com';

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function idGeneratorReturning(id: string): IdGenerator {
  return { generate: () => id };
}

export class InMemoryProjectRepository implements ProjectRepository {
  readonly #byId = new Map<string, Project>();

  findById(id: ProjectId): Promise<Project | null> {
    return Promise.resolve(this.#byId.get(id.value) ?? null);
  }

  listByMember(userId: MemberUserId): Promise<readonly Project[]> {
    const list = [...this.#byId.values()].filter((p) =>
      p.members.some((m) => m.userId.equals(userId)),
    );
    return Promise.resolve(list);
  }

  save(project: Project): Promise<void> {
    this.#byId.set(project.id.value, project);
    return Promise.resolve();
  }

  delete(id: ProjectId): Promise<void> {
    this.#byId.delete(id.value);
    return Promise.resolve();
  }
}

/** インメモリの email→userId / プロフィール解決。 */
export class InMemoryUserDirectory implements UserDirectory {
  readonly #profiles: readonly UserProfile[];

  constructor(profiles: readonly UserProfile[]) {
    this.#profiles = profiles;
  }

  findUserIdByEmail(email: string): Promise<string | null> {
    // 本番（DrizzleUserDirectory）と同じく trim/lowercase 正規化で比較。
    const normalized = email.trim().toLowerCase();
    const found = this.#profiles.find(
      (p) => p.email.trim().toLowerCase() === normalized,
    );
    return Promise.resolve(found?.userId ?? null);
  }

  findProfiles(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, UserProfile>> {
    const map = new Map<string, UserProfile>();
    for (const p of this.#profiles) {
      if (userIds.includes(p.userId)) {
        map.set(p.userId, p);
      }
    }
    return Promise.resolve(map);
  }
}
