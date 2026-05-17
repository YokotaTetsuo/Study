import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

import type { Clock } from '../../shared-kernel/clock';
import type { IdGenerator } from '../../shared-kernel/id-generator';
import type { Project } from '../domain/project';
import type { ProjectId } from '../domain/project-id';
import type { ProjectRepository } from '../domain/project-repository';

export const FIXED_NOW: Dayjs = dayjs('2026-05-18T00:00:00.000Z');
export const PROJECT_ID_1 = '01HQ8ZK9PRSTVWXYZ234567890';
export const OWNER_ID = '01HQ8ZK9PRSTVWXYZ23456789A';
export const MEMBER_ID = '01HQ8ZK9PRSTVWXYZ23456789B';

export const fixedClock: Clock = { now: () => FIXED_NOW };

export function idGeneratorReturning(id: string): IdGenerator {
  return { generate: () => id };
}

export class InMemoryProjectRepository implements ProjectRepository {
  readonly #byId = new Map<string, Project>();

  findById(id: ProjectId): Promise<Project | null> {
    return Promise.resolve(this.#byId.get(id.value) ?? null);
  }

  save(project: Project): Promise<void> {
    this.#byId.set(project.id.value, project);
    return Promise.resolve();
  }
}
