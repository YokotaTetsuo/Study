-- 既存 DB に projects に存在しない project_id を持つ孤児文書が 1 件でも
-- あると、続く FK 追加でマイグレーション自体が失敗する。本アプリでは
-- 文書は必ずプロジェクト配下で作られるため通常は発生しないが、レガシー
-- データ混在環境への安全策として、FK 追加前に孤児文書を除去する
-- （version/comment は documents への既存 FK cascade で連鎖削除される）。
DELETE FROM "documents" WHERE "project_id" NOT IN (SELECT "id" FROM "projects");
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "documents_project_id_created_at_idx" ON "documents" USING btree ("project_id","created_at");
