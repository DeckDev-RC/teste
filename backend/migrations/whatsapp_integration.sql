-- Migration: WhatsApp Integration Tables
-- Run this in your Supabase SQL Editor

-- 1. Tabela para instâncias WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    instance_name VARCHAR(100) NOT NULL,
    instance_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'disconnected',
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_id ON whatsapp_instances(user_id);

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own instances" ON whatsapp_instances;
CREATE POLICY "Users can view own instances" ON whatsapp_instances
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own instances" ON whatsapp_instances;
CREATE POLICY "Users can insert own instances" ON whatsapp_instances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own instances" ON whatsapp_instances;
CREATE POLICY "Users can update own instances" ON whatsapp_instances
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own instances" ON whatsapp_instances;
CREATE POLICY "Users can delete own instances" ON whatsapp_instances
    FOR DELETE USING (auth.uid() = user_id);

-- 2. Tabela para grupos monitorados
CREATE TABLE IF NOT EXISTS monitored_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
    group_jid VARCHAR(100) NOT NULL,
    group_name VARCHAR(255),
    company VARCHAR(100),
    analysis_type VARCHAR(50) DEFAULT 'auto',
    drive_folder_id VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitored_groups_instance_id ON monitored_groups(instance_id);

ALTER TABLE monitored_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own groups" ON monitored_groups;
CREATE POLICY "Users can view own groups" ON monitored_groups
    FOR SELECT USING (
        instance_id IN (SELECT id FROM whatsapp_instances WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage own groups" ON monitored_groups;
CREATE POLICY "Users can manage own groups" ON monitored_groups
    FOR ALL USING (
        instance_id IN (SELECT id FROM whatsapp_instances WHERE user_id = auth.uid())
    );

-- 3. Tabela para mensagens processadas
CREATE TABLE IF NOT EXISTS processed_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES monitored_groups(id) ON DELETE CASCADE,
    message_id VARCHAR(100) UNIQUE,
    sender_jid VARCHAR(100),
    file_type VARCHAR(20),
    file_name VARCHAR(255),
    analysis_result JSONB,
    drive_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_group_id ON processed_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_processed_messages_status ON processed_messages(status);

ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON processed_messages;
CREATE POLICY "Users can view own messages" ON processed_messages
    FOR SELECT USING (
        group_id IN (
            SELECT mg.id FROM monitored_groups mg
            JOIN whatsapp_instances wi ON mg.instance_id = wi.id
            WHERE wi.user_id = auth.uid()
        )
    );
