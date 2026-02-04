-- ==========================================
-- MASTER SCHEMA: PROJETO ADM (CONSOLIDADO)
-- ==========================================
-- Este script contém a definição completa de todas as tabelas,
-- relacionamentos e segurança do sistema.

-- 0. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS (ÂNCORA)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    cnpj TEXT,
    logo_url TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CADASTRO DE FUNCIONÁRIOS (REGISTRO GLOBAL)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    photo_url TEXT,
    cpf TEXT,
    role TEXT,
    admission_date DATE,
    salary NUMERIC DEFAULT 0,
    phone TEXT,
    email TEXT,
    active BOOLEAN DEFAULT TRUE,
    is_non_drinker BOOLEAN DEFAULT FALSE,
    -- Endereço
    zip_code TEXT,
    address TEXT,
    number TEXT,
    district TEXT,
    city TEXT,
    state TEXT,
    -- Bancário
    bank_name TEXT,
    agency TEXT,
    account TEXT,
    pix_key TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. HISTÓRICO DE FOLHA (VINCULADO À EMPRESA)
CREATE TABLE IF NOT EXISTS payroll_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    employee_name TEXT,
    timestamp TEXT,
    raw_date DATE,
    input JSONB NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. FORNECEDORES
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    trade_name TEXT,
    cnpj TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    category TEXT,
    zip_code TEXT,
    address TEXT,
    number TEXT,
    district TEXT,
    city TEXT,
    state TEXT,
    bank_name TEXT,
    agency TEXT,
    account TEXT,
    pix_key TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    document TEXT,
    type TEXT CHECK (type IN ('PF', 'PJ')),
    phone TEXT,
    email TEXT,
    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE', 'LEAD')),
    zip_code TEXT,
    address TEXT,
    number TEXT,
    district TEXT,
    city TEXT,
    state TEXT,
    bank_name TEXT,
    agency TEXT,
    account TEXT,
    pix_key TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VIVEIROS (FISH PONDS)
CREATE TABLE IF NOT EXISTS viveiros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    coordinates JSONB NOT NULL,
    area_m2 NUMERIC NOT NULL,
    status TEXT DEFAULT 'VAZIO',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TRANSFERÊNCIAS
CREATE TABLE IF NOT EXISTS transferencias (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    origem_id UUID REFERENCES viveiros(id),
    destino_id UUID REFERENCES viveiros(id),
    data_transferencia DATE NOT NULL DEFAULT CURRENT_DATE,
    turno TEXT,
    povoamento_origem_id TEXT,
    quantidade NUMERIC DEFAULT 0,
    peso_medio NUMERIC DEFAULT 0,
    observacao TEXT,
    tipo TEXT DEFAULT 'TRANSFERENCIA',
    data_povoamento DATE,
    cliente_id UUID REFERENCES clients(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. RECIBOS (RECEIPTS)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    payee_name TEXT NOT NULL,
    payee_document TEXT,
    value NUMERIC NOT NULL,
    date DATE NOT NULL,
    service_date DATE,
    service_end_date DATE,
    description TEXT,
    payment_method TEXT,
    pix_key TEXT,
    bank_info TEXT,
    category TEXT DEFAULT 'OUTROS',
    value_in_words TEXT,
    timestamp TEXT,
    raw_date DATE,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BIOMETRIAS (BIOMETRICS)
CREATE TABLE IF NOT EXISTS biometrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    data JSONB NOT NULL,
    label TEXT NOT NULL DEFAULT 'Biometria',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CONFIGURAÇÕES GERAIS (JSON STORAGE)
CREATE TABLE IF NOT EXISTS global_configs (
    id TEXT PRIMARY KEY,
    value JSONB,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. DASHBOARD E Faturamento (DELIVERY ORDERS)
CREATE TABLE IF NOT EXISTS delivery_orders (
    id TEXT PRIMARY KEY,
    data JSONB,
    logo_url TEXT,
    user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_payroll_company_id ON payroll_history(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_viveiros_company_id ON viveiros(company_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_company ON transferencias(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_company ON receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_biometrics_user ON biometrics(user_id);

-- ==========================================
-- SEGURANÇA (RLS JÁ INCLUÍDO NA FASE 1)
-- ==========================================
-- (As políticas reais estão no configure_rls_secure.sql)
