CREATE TABLE "document_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"author_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_comments" ADD CONSTRAINT "document_comments_document_id_version_number_document_versions_document_id_version_number_fk" FOREIGN KEY ("document_id","version_number") REFERENCES "public"."document_versions"("document_id","version_number") ON DELETE cascade ON UPDATE no action;