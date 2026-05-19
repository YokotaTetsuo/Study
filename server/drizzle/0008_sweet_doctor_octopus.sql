-- 既存コメント行を壊さず updated_at を追加する。
-- まず NULL 許容で追加 → 既存行は created_at で backfill（未編集扱い）
-- → NOT NULL 制約を付与、の 3 段階で行う。
ALTER TABLE "document_comments" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
UPDATE "document_comments" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "document_comments" ALTER COLUMN "updated_at" SET NOT NULL;
