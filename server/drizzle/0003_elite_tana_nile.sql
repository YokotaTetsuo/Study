CREATE TABLE "review_approvals" (
	"review_request_id" text NOT NULL,
	"approver_id" text NOT NULL,
	"role" text NOT NULL,
	"decided_at" timestamp with time zone NOT NULL,
	CONSTRAINT "review_approvals_review_request_id_approver_id_pk" PRIMARY KEY("review_request_id","approver_id")
);
--> statement-breakpoint
CREATE TABLE "review_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"status" text NOT NULL,
	"required_approvals" integer NOT NULL,
	"approver_roles" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"decided_at" timestamp with time zone,
	CONSTRAINT "review_requests_document_id_version_number_unique" UNIQUE("document_id","version_number")
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "official_version_number" integer;--> statement-breakpoint
ALTER TABLE "review_approvals" ADD CONSTRAINT "review_approvals_review_request_id_review_requests_id_fk" FOREIGN KEY ("review_request_id") REFERENCES "public"."review_requests"("id") ON DELETE cascade ON UPDATE no action;