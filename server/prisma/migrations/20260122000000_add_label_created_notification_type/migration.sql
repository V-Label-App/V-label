-- AlterEnum (add LABEL_CREATED if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'LABEL_CREATED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'NotificationType')) THEN
        ALTER TYPE "NotificationType" ADD VALUE 'LABEL_CREATED';
    END IF;
END
$$;
