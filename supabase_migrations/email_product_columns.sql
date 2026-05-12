-- Add email settings columns to products table if they don't exist

-- Add sendEmailEnabled column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'sendEmailEnabled'
    ) THEN
        ALTER TABLE products ADD COLUMN sendEmailEnabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add emailTemplate column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'emailTemplate'
    ) THEN
        ALTER TABLE products ADD COLUMN emailTemplate TEXT;
    END IF;
END $$;

-- Add product_variants column if it doesn't exist (for slot management)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products'
        AND column_name = 'product_variants'
    ) THEN
        ALTER TABLE products ADD COLUMN product_variants JSONB;
    END IF;
END $$;

-- Add order_chats table for support chat feature if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'order_chats'
        AND column_name = 'order_id'
    ) THEN
        CREATE TABLE IF NOT EXISTS order_chats (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            order_id BIGINT,
            sender_id TEXT,
            sender_name TEXT,
            content TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            is_admin BOOLEAN DEFAULT FALSE
        );

        -- Enable RLS
        ALTER TABLE order_chats ENABLE ROW LEVEL SECURITY;

        -- Allow public access (you may want to refine this for production)
        CREATE POLICY "Allow all access to order_chats" ON order_chats FOR ALL USING (true);
    END IF;
END $$;

-- Add index on order_id for faster lookups
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_chats_order_id'
    ) THEN
        CREATE INDEX idx_order_chats_order_id ON order_chats(order_id);
    END IF;
END $$;

COMMENT ON COLUMN products.sendEmailEnabled IS 'When true, send custom email template to customer on order completion';
COMMENT ON COLUMN products.emailTemplate IS 'Custom email template text with placeholders like {{email}}, {{password}}, {{code}}, {{name}}, {{orderNumber}}';
