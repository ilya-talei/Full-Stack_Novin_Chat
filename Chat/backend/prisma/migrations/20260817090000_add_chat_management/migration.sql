-- Group/channel settings. Existing groups inherit permissive member defaults.
ALTER TABLE "chats"
    ADD COLUMN "default_permissions" JSONB NOT NULL DEFAULT '{"send_messages":true,"send_photos":true,"send_videos":true,"send_files":true,"send_voice":true,"send_video_messages":true,"send_stickers":true,"send_gifs":true,"send_links":true,"send_polls":true,"add_members":true,"change_info":false,"pin_messages":false}',
    ADD COLUMN "slow_mode_seconds" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "public_username" VARCHAR(64),
    ADD COLUMN "history_visible" BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "signatures_enabled" BOOLEAN NOT NULL DEFAULT false;

-- Existing channels must not become writable by regular subscribers.
UPDATE "chats"
SET "default_permissions" = '{"send_messages":false,"send_photos":false,"send_videos":false,"send_files":false,"send_voice":false,"send_video_messages":false,"send_stickers":false,"send_gifs":false,"send_links":false,"send_polls":false,"add_members":false,"change_info":false,"pin_messages":false}'
WHERE "type" = 'channel';

ALTER TABLE "chat_members"
    ADD COLUMN "role" VARCHAR(16) NOT NULL DEFAULT 'member',
    ADD COLUMN "custom_title" VARCHAR(32),
    ADD COLUMN "admin_permissions" JSONB,
    ADD COLUMN "member_permissions" JSONB,
    ADD COLUMN "banned_until" TIMESTAMP(3);

-- Repair legacy chats whose owner did not have a membership row.
INSERT INTO "chat_members" (
    "chat_id",
    "user_id",
    "role",
    "created_at",
    "updated_at"
)
SELECT
    c."id",
    c."owner_id",
    'owner',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "chats" AS c
WHERE c."owner_id" IS NOT NULL
  AND c."type" IN ('group', 'channel')
  AND NOT EXISTS (
      SELECT 1
      FROM "chat_members" AS cm
      WHERE cm."chat_id" = c."id" AND cm."user_id" = c."owner_id"
  );

-- Owner is derived from chats.owner_id for legacy data.
UPDATE "chat_members" AS cm
SET "role" = 'owner'
FROM "chats" AS c
WHERE c."id" = cm."chat_id" AND c."owner_id" = cm."user_id";

-- Keep one membership per pair before adding the unique constraint. Prefer an
-- active row, then the newest row; preserve the furthest read position.
WITH ranked AS (
    SELECT
        "id",
        "chat_id",
        "user_id",
        ROW_NUMBER() OVER (
            PARTITION BY "chat_id", "user_id"
            ORDER BY ("deleted_at" IS NULL) DESC, "updated_at" DESC, "id" DESC
        ) AS rn,
        MAX("last_read_message_id") OVER (
            PARTITION BY "chat_id", "user_id"
        ) AS max_last_read
    FROM "chat_members"
),
keepers AS (
    UPDATE "chat_members" AS cm
    SET "last_read_message_id" = ranked.max_last_read
    FROM ranked
    WHERE cm."id" = ranked."id" AND ranked.rn = 1
    RETURNING cm."id"
)
DELETE FROM "chat_members" AS cm
USING ranked
WHERE cm."id" = ranked."id" AND ranked.rn > 1;

DROP INDEX IF EXISTS "chat_members_chat_id_user_id_idx";
CREATE UNIQUE INDEX "chat_members_chat_id_user_id_key"
    ON "chat_members"("chat_id", "user_id");
CREATE UNIQUE INDEX "chats_public_username_key"
    ON "chats"("public_username");

ALTER TABLE "chats"
    ADD CONSTRAINT "chats_slow_mode_seconds_check"
    CHECK ("slow_mode_seconds" BETWEEN 0 AND 21600);

ALTER TABLE "chat_members"
    ADD CONSTRAINT "chat_members_role_check"
    CHECK ("role" IN ('owner', 'admin', 'member', 'restricted'));
