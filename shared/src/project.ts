import { z } from 'zod';

/**
 * プロジェクト/メンバー/ロール/承認ポリシーの API コントラクト。
 * ロールは設定で運用変更しうるが、本コントラクトの列挙は固定セット。
 */

export const projectRoleSchema = z.enum([
  'owner',
  'submitter',
  'reviewer',
  'approver',
]);
export type ProjectRole = z.infer<typeof projectRoleSchema>;

// trim を schema 側にも入れ、空白のみ名（'   '）を境界で弾く。
// これが無いと domain の ValidationError 経由で 400 になり責務がずれる。
export const createProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type CreateProjectRequest = z.infer<typeof createProjectRequestSchema>;

export const renameProjectRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});
export type RenameProjectRequest = z.infer<typeof renameProjectRequestSchema>;

export const addMemberRequestSchema = z.object({
  email: z.string().email().max(254),
  role: projectRoleSchema,
});
export type AddMemberRequest = z.infer<typeof addMemberRequestSchema>;

export const setMemberRoleRequestSchema = z.object({
  role: projectRoleSchema,
});
export type SetMemberRoleRequest = z.infer<typeof setMemberRoleRequestSchema>;

export const approvalPolicySchema = z.object({
  requiredApprovals: z.number().int().min(1).max(100),
  approverRoles: z.array(projectRoleSchema).min(1),
});
export type ApprovalPolicy = z.infer<typeof approvalPolicySchema>;

export const updateApprovalPolicyRequestSchema = approvalPolicySchema;
export type UpdateApprovalPolicyRequest = z.infer<
  typeof updateApprovalPolicyRequestSchema
>;

export const projectMemberSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: projectRoleSchema,
});
export type ProjectMember = z.infer<typeof projectMemberSchema>;

export const projectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string().datetime(),
  approvalPolicy: approvalPolicySchema,
  members: z.array(projectMemberSchema),
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;

export const projectListResponseSchema = z.array(projectResponseSchema);
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
