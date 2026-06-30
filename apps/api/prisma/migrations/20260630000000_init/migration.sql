-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('free', 'pay_per_book', 'family', 'annual', 'educator');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "Pronouns" AS ENUM ('he/him', 'she/her', 'they/them');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('created', 'char_build', 'story_plan', 'chapter_gen', 'illust_plan', 'image_gen', 'qa_review', 'layout', 'pdf_render', 'complete', 'failed', 'partial', 'cancelled');

-- CreateEnum
CREATE TYPE "AgentStep" AS ENUM ('char_build', 'story_plan', 'chapter_gen', 'illust_plan', 'char_consistency', 'image_gen', 'qa_review', 'layout', 'pdf_render');

-- CreateEnum
CREATE TYPE "AgentLogStatus" AS ENUM ('success', 'error', 'retry');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('book_creation', 'regen_page', 'refund_generation_failure', 'purchase', 'subscription_grant', 'promotional_grant', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'cancelled', 'trialing');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('pending', 'processing', 'complete', 'failed');

-- CreateEnum
CREATE TYPE "ShareLinkMode" AS ENUM ('preview_only', 'full_read');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('generation_complete', 'generation_failed', 'birthday_reminder', 'subscription_renewed', 'payment_failed', 'marketing', 'newsletter');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'push');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "avatar_url" TEXT,
    "oauth_provider" TEXT,
    "oauth_id" TEXT,
    "plan" "UserPlan" NOT NULL DEFAULT 'free',
    "credits" INTEGER NOT NULL DEFAULT 3,
    "credits_updated_at" TIMESTAMP(3),
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "deactivated_at" TIMESTAMP(3),
    "notify_email_on_completion" BOOLEAN NOT NULL DEFAULT true,
    "notify_email_marketing" BOOLEAN NOT NULL DEFAULT false,
    "notify_push_on_completion" BOOLEAN NOT NULL DEFAULT true,
    "notify_birthday_reminders" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'pending',
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "r2_key" TEXT NOT NULL,
    "processed_r2_key" TEXT,
    "processed_url" TEXT,
    "failure_reason" TEXT,
    "image_width" INTEGER,
    "image_height" INTEGER,
    "presign_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "age" INTEGER NOT NULL,
    "pronouns" "Pronouns" NOT NULL DEFAULT 'they/them',
    "avatar_config" JSONB,
    "photo_asset_id" UUID,
    "birthday" DATE,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "child_profile_id" UUID,
    "name" TEXT NOT NULL,
    "card" JSONB NOT NULL,
    "visual_anchor" TEXT NOT NULL,
    "lora_weights_r2_key" TEXT,
    "lora_trained_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "character_card_id" UUID,
    "book_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wizard_drafts" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_session_id" TEXT,
    "step" INTEGER NOT NULL DEFAULT 1,
    "completed_steps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "data" JSONB NOT NULL,
    "child_profile_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wizard_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "plan" "UserPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "child_profile_id" UUID,
    "status" "BookStatus" NOT NULL DEFAULT 'created',
    "request" JSONB NOT NULL,
    "title" TEXT,
    "dedication_text" TEXT,
    "page_count" INTEGER,
    "character_card" JSONB,
    "story_plan" JSONB,
    "chapters" JSONB,
    "image_prompts" JSONB,
    "quality_report" JSONB,
    "page_layouts" JSONB,
    "cover_url" TEXT,
    "pdf_r2_key" TEXT,
    "pdf_url" TEXT,
    "print_pdf_r2_key" TEXT,
    "print_pdf_url" TEXT,
    "preview_pdf_r2_key" TEXT,
    "preview_pdf_url" TEXT,
    "social_card_url" TEXT,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMP(3),
    "stripe_payment_intent_id" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "generation_time_ms" INTEGER,
    "total_cost_usd" DECIMAL(10,6),
    "ai_model_versions" JSONB,
    "generated_degraded" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "failed_step" "AgentStep",
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_pages" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "page_number" INTEGER NOT NULL,
    "text_content" TEXT,
    "reading_level" DECIMAL(3,1),
    "image_prompt" JSONB,
    "image_r2_key" TEXT,
    "image_url" TEXT,
    "image_seed" BIGINT,
    "layout_spec" JSONB,
    "qa_passed" BOOLEAN,
    "qa_scores" JSONB,
    "text_regen_count" INTEGER NOT NULL DEFAULT 0,
    "image_regen_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "mode" "ShareLinkMode" NOT NULL DEFAULT 'preview_only',
    "password_hash" TEXT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "agent" TEXT NOT NULL,
    "step" "AgentStep" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "duration_ms" INTEGER,
    "tokens_input" INTEGER,
    "tokens_output" INTEGER,
    "cost_usd" DECIMAL(10,6),
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" "AgentLogStatus" NOT NULL,
    "error" TEXT,
    "trace_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_book_states" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "last_page" INTEGER NOT NULL DEFAULT 1,
    "bookmarks" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_book_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_oauth_provider_oauth_id_idx" ON "users"("oauth_provider", "oauth_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "uploads_user_id_idx" ON "uploads"("user_id");

-- CreateIndex
CREATE INDEX "child_profiles_user_id_idx" ON "child_profiles"("user_id");

-- CreateIndex
CREATE INDEX "character_cards_user_id_idx" ON "character_cards"("user_id");

-- CreateIndex
CREATE INDEX "series_user_id_idx" ON "series"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wizard_drafts_user_id_key" ON "wizard_drafts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wizard_drafts_guest_session_id_key" ON "wizard_drafts"("guest_session_id");

-- CreateIndex
CREATE INDEX "wizard_drafts_guest_session_id_idx" ON "wizard_drafts"("guest_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "books_user_id_idx" ON "books"("user_id");

-- CreateIndex
CREATE INDEX "books_status_idx" ON "books"("status");

-- CreateIndex
CREATE INDEX "books_user_id_status_idx" ON "books"("user_id", "status");

-- CreateIndex
CREATE INDEX "books_user_id_created_at_idx" ON "books"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "book_pages_book_id_page_number_key" ON "book_pages"("book_id", "page_number");

-- CreateIndex
CREATE INDEX "book_pages_book_id_idx" ON "book_pages"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_key" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "share_links_book_id_idx" ON "share_links"("book_id");

-- CreateIndex
CREATE INDEX "share_links_token_idx" ON "share_links"("token");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions"("user_id");

-- CreateIndex
CREATE INDEX "credit_transactions_book_id_idx" ON "credit_transactions"("book_id");

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "agent_logs_book_id_idx" ON "agent_logs"("book_id");

-- CreateIndex
CREATE INDEX "agent_logs_trace_id_idx" ON "agent_logs"("trace_id");

-- CreateIndex
CREATE INDEX "agent_logs_created_at_idx" ON "agent_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_book_states_user_id_book_id_key" ON "user_book_states"("user_id", "book_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_photo_asset_id_fkey" FOREIGN KEY ("photo_asset_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_cards" ADD CONSTRAINT "character_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_cards" ADD CONSTRAINT "character_cards_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "child_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_character_card_id_fkey" FOREIGN KEY ("character_card_id") REFERENCES "character_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_child_profile_id_fkey" FOREIGN KEY ("child_profile_id") REFERENCES "child_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_pages" ADD CONSTRAINT "book_pages_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_book_states" ADD CONSTRAINT "user_book_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_book_states" ADD CONSTRAINT "user_book_states_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
