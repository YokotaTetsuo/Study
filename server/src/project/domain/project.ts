import type { Dayjs } from 'dayjs';

import { ApprovalPolicy } from './approval-policy';
import { LastOwnerError } from './last-owner-error';
import { MemberAlreadyExistsError } from './member-already-exists-error';
import { MemberNotFoundError } from './member-not-found-error';
import { MemberUserId } from './member-user-id';
import type { ProjectId } from './project-id';
import type { ProjectName } from './project-name';
import { ProjectRole } from './project-role';

class Membership {
  readonly #userId: MemberUserId;
  #role: ProjectRole;

  private constructor(userId: MemberUserId, role: ProjectRole) {
    this.#userId = userId;
    this.#role = role;
  }

  static create(userId: MemberUserId, role: ProjectRole): Membership {
    return new Membership(userId, role);
  }

  static reconstruct(userId: MemberUserId, role: ProjectRole): Membership {
    return new Membership(userId, role);
  }

  changeRole(role: ProjectRole): void {
    this.#role = role;
  }

  get userId(): MemberUserId {
    return this.#userId;
  }

  get role(): ProjectRole {
    return this.#role;
  }
}

/**
 * 集約外から内部エンティティ Membership を読み取るビュー型。
 * mutator を含めず集約境界をコンパイラ強制する。
 */
export interface MembershipReadonly {
  readonly userId: MemberUserId;
  readonly role: ProjectRole;
}

interface ReconstructParams {
  readonly id: ProjectId;
  readonly name: ProjectName;
  readonly createdAt: Dayjs;
  readonly membersData: readonly {
    readonly userId: string;
    readonly role: string;
  }[];
  readonly approvalPolicy: ApprovalPolicy;
}

/**
 * プロジェクト集約ルート。メンバー（内部エンティティ）と承認ポリシーを束ねる。
 * 不変条件: Owner を最低 1 名保持 / 同一ユーザーの重複参加不可。
 */
export class Project {
  readonly #id: ProjectId;
  readonly #name: ProjectName;
  readonly #createdAt: Dayjs;
  readonly #members: Membership[];
  #approvalPolicy: ApprovalPolicy;

  private constructor(params: {
    id: ProjectId;
    name: ProjectName;
    createdAt: Dayjs;
    members: Membership[];
    approvalPolicy: ApprovalPolicy;
  }) {
    this.#id = params.id;
    this.#name = params.name;
    this.#createdAt = params.createdAt;
    this.#members = params.members;
    this.#approvalPolicy = params.approvalPolicy;
  }

  static create(params: {
    id: ProjectId;
    name: ProjectName;
    ownerUserId: MemberUserId;
    createdAt: Dayjs;
  }): Project {
    return new Project({
      id: params.id,
      name: params.name,
      createdAt: params.createdAt,
      members: [
        Membership.create(params.ownerUserId, new ProjectRole('owner')),
      ],
      approvalPolicy: ApprovalPolicy.default(),
    });
  }

  static reconstruct(params: ReconstructParams): Project {
    const members = params.membersData.map((d) =>
      Membership.reconstruct(
        new MemberUserId(d.userId),
        new ProjectRole(d.role),
      ),
    );
    return new Project({
      id: params.id,
      name: params.name,
      createdAt: params.createdAt,
      members,
      approvalPolicy: params.approvalPolicy,
    });
  }

  #find(userId: MemberUserId): Membership | undefined {
    return this.#members.find((m) => m.userId.equals(userId));
  }

  #ownerCount(): number {
    return this.#members.filter((m) => m.role.isOwner()).length;
  }

  addMember(params: {
    userId: MemberUserId;
    role: ProjectRole;
  }): MembershipReadonly {
    if (this.#find(params.userId) !== undefined) {
      throw new MemberAlreadyExistsError();
    }
    const member = Membership.create(params.userId, params.role);
    this.#members.push(member);
    return member;
  }

  setMemberRole(userId: MemberUserId, role: ProjectRole): void {
    const member = this.#find(userId);
    if (member === undefined) {
      throw new MemberNotFoundError();
    }
    if (member.role.isOwner() && !role.isOwner() && this.#ownerCount() === 1) {
      throw new LastOwnerError();
    }
    member.changeRole(role);
  }

  updateApprovalPolicy(policy: ApprovalPolicy): void {
    this.#approvalPolicy = policy;
  }

  isOwner(userId: MemberUserId): boolean {
    return this.#find(userId)?.role.isOwner() ?? false;
  }

  get id(): ProjectId {
    return this.#id;
  }

  get name(): ProjectName {
    return this.#name;
  }

  get createdAt(): Dayjs {
    return this.#createdAt;
  }

  get approvalPolicy(): ApprovalPolicy {
    return this.#approvalPolicy;
  }

  get members(): readonly MembershipReadonly[] {
    return [...this.#members];
  }
}
