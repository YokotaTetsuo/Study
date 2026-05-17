import { describe, expect, it } from 'vitest';

import {
  FIXED_NOW,
  MEMBER_ID,
  OWNER_ID,
  PROJECT_ID_1,
} from '../__tests__/fakes';

import { ApprovalPolicy } from './approval-policy';
import { InvalidProjectStateError } from './invalid-project-state-error';
import { LastOwnerError } from './last-owner-error';
import { MemberAlreadyExistsError } from './member-already-exists-error';
import { MemberNotFoundError } from './member-not-found-error';
import { MemberUserId } from './member-user-id';
import { Project } from './project';
import { ProjectId } from './project-id';
import { ProjectName } from './project-name';
import { ProjectRole } from './project-role';

function aProject(): Project {
  return Project.create({
    id: new ProjectId(PROJECT_ID_1),
    name: new ProjectName('Docs'),
    ownerUserId: new MemberUserId(OWNER_ID),
    createdAt: FIXED_NOW,
  });
}

describe('Project', () => {
  it('should create with the creator as the sole owner and a default policy', () => {
    const p = aProject();

    expect(p.members).toHaveLength(1);
    expect(p.members[0]?.userId.value).toBe(OWNER_ID);
    expect(p.members[0]?.role.value).toBe('owner');
    expect(p.approvalPolicy.requiredApprovals).toBe(1);
    expect(p.isOwner(new MemberUserId(OWNER_ID))).toBe(true);
  });

  it('should add a member and reject duplicates', () => {
    const p = aProject();

    p.addMember({
      userId: new MemberUserId(MEMBER_ID),
      role: new ProjectRole('reviewer'),
    });

    expect(p.members).toHaveLength(2);
    expect(() =>
      p.addMember({
        userId: new MemberUserId(MEMBER_ID),
        role: new ProjectRole('approver'),
      }),
    ).toThrow(MemberAlreadyExistsError);
  });

  it('should reject demoting the last owner', () => {
    const p = aProject();

    expect(() => {
      p.setMemberRole(new MemberUserId(OWNER_ID), new ProjectRole('reviewer'));
    }).toThrow(LastOwnerError);
  });

  it('should allow changing an owner role when another owner exists', () => {
    const p = aProject();
    p.addMember({
      userId: new MemberUserId(MEMBER_ID),
      role: new ProjectRole('owner'),
    });

    p.setMemberRole(new MemberUserId(OWNER_ID), new ProjectRole('reviewer'));

    expect(p.isOwner(new MemberUserId(OWNER_ID))).toBe(false);
    expect(p.isOwner(new MemberUserId(MEMBER_ID))).toBe(true);
  });

  it('should reject role change for an unknown member', () => {
    const p = aProject();

    expect(() => {
      p.setMemberRole(new MemberUserId(MEMBER_ID), new ProjectRole('reviewer'));
    }).toThrow(MemberNotFoundError);
  });

  it('should reject reconstruction with no owner', () => {
    expect(() =>
      Project.reconstruct({
        id: new ProjectId(PROJECT_ID_1),
        name: new ProjectName('Docs'),
        createdAt: FIXED_NOW,
        membersData: [{ userId: OWNER_ID, role: 'reviewer' }],
        approvalPolicy: ApprovalPolicy.default(),
      }),
    ).toThrow(InvalidProjectStateError);
  });

  it('should reject reconstruction with duplicate members', () => {
    expect(() =>
      Project.reconstruct({
        id: new ProjectId(PROJECT_ID_1),
        name: new ProjectName('Docs'),
        createdAt: FIXED_NOW,
        membersData: [
          { userId: OWNER_ID, role: 'owner' },
          { userId: OWNER_ID, role: 'reviewer' },
        ],
        approvalPolicy: ApprovalPolicy.default(),
      }),
    ).toThrow(InvalidProjectStateError);
  });
});
