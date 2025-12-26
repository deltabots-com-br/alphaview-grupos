-- ============================================
-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS
-- EXECUTAR TODO O SCRIPT DE UMA VEZ
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'user', 'system');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('text', 'image', 'audio', 'document', 'sticker', 'video');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_status') THEN
        CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'error', 'server_ack');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_status') THEN
        CREATE TYPE schedule_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
    END IF;
END $$;

-- ============================================
-- TABELAS
-- ============================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user'::user_role,
    status user_status DEFAULT 'active'::user_status,
    department VARCHAR(100),
    avatar_url TEXT,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zapi_id VARCHAR(255) UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    photo_url TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    max_members INTEGER DEFAULT 256,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TAGS
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONVERSATION TAGS
CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, tag_id)
);

-- PARTICIPANTS
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    is_admin BOOLEAN DEFAULT FALSE,
    notes TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, phone)
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) CHECK (sender_type IN ('user', 'contact', 'system')),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    sender_name VARCHAR(255),
    sender_phone VARCHAR(50),
    content TEXT,
    media_url TEXT,
    media_type VARCHAR(50),
    message_type message_type DEFAULT 'text'::message_type,
    status message_status DEFAULT 'pending'::message_status,
    zapi_message_id VARCHAR(255) UNIQUE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SCHEDULED MESSAGES
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    message_type message_type DEFAULT 'text'::message_type,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status schedule_status DEFAULT 'pending'::schedule_status,
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_conversations_zapi_id ON conversations(zapi_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scheduled_status_time ON scheduled_messages(status, scheduled_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers (Safe re-creation)
DO $$
BEGIN
    -- Users
    DROP TRIGGER IF EXISTS update_users_modtime ON users;
    CREATE TRIGGER update_users_modtime 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

    -- Conversations
    DROP TRIGGER IF EXISTS update_conversations_modtime ON conversations;
    CREATE TRIGGER update_conversations_modtime 
        BEFORE UPDATE ON conversations 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

    -- Messages
    DROP TRIGGER IF EXISTS update_messages_modtime ON messages;
    CREATE TRIGGER update_messages_modtime 
        BEFORE UPDATE ON messages 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

    -- Scheduled Messages
    DROP TRIGGER IF EXISTS update_scheduled_messages_modtime ON scheduled_messages;
    CREATE TRIGGER update_scheduled_messages_modtime 
        BEFORE UPDATE ON scheduled_messages 
        FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
END $$;

-- ============================================
-- DADOS PADRÃO
-- ============================================

-- Configurações padrão da empresa
INSERT INTO system_settings (key, value, description)
VALUES 
    ('company_name', 'Sistema de Grupos WhatsApp', 'Nome da empresa/sistema exibido no dashboard'),
    ('company_plan', 'basic', 'Plano contratado: basic, professional, enterprise')
ON CONFLICT (key) DO NOTHING;

