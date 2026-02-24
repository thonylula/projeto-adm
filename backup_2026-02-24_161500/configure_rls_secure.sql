-- ==========================================
-- SCRIPT DE SEGURANÇA SUPABASE (RLS)
-- ==========================================
-- Execute este script no SQL Editor do Supabase para configurar a segurança.

-- 1. ADICIONAR COLUNA DE USUÁRIO NAS TABELAS PRINCIPAIS
ALTER TABLE IF EXISTS companies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS biometrics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS global_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS employees ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS suppliers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS delivery_orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS ai_comparisons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS basket_item_configs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE IF EXISTS app_users ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. HABILITAR RLS EM TODAS AS TABELAS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE viveiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE basket_item_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;


-- 3. CRIAR POLÍTICAS DE ACESSO

-- Empresas: Usuário só vê suas próprias empresas
DROP POLICY IF EXISTS "Users can manage their own companies" ON companies;
CREATE POLICY "Users can manage their own companies" 
    ON companies FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Tabelas vinculadas a Empresa (Via Join)
-- Payroll History
DROP POLICY IF EXISTS "Users can manage payroll of their companies" ON payroll_history;
CREATE POLICY "Users can manage payroll of their companies" 
    ON payroll_history FOR ALL 
    USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = payroll_history.company_id AND companies.user_id = auth.uid()));

-- Viveiros
DROP POLICY IF EXISTS "Users can manage viveiros of their companies" ON viveiros;
CREATE POLICY "Users can manage viveiros of their companies" 
    ON viveiros FOR ALL 
    USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = viveiros.company_id AND companies.user_id = auth.uid()));

-- Transferências
DROP POLICY IF EXISTS "Users can manage transferencias of their companies" ON transferencias;
CREATE POLICY "Users can manage transferencias of their companies" 
    ON transferencias FOR ALL 
    USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = transferencias.company_id AND companies.user_id = auth.uid()));

-- Receipts (Recibos)
DROP POLICY IF EXISTS "Users can manage receipts of their companies" ON receipts;
CREATE POLICY "Users can manage receipts of their companies" 
    ON receipts FOR ALL 
    USING (EXISTS (SELECT 1 FROM companies WHERE companies.id = receipts.company_id AND companies.user_id = auth.uid()));

-- Tabelas vinculadas diretamente ao Usuário
DROP POLICY IF EXISTS "Users can manage their own biometrics" ON biometrics;
CREATE POLICY "Users can manage their own biometrics" ON biometrics FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own configs" ON global_configs;
CREATE POLICY "Users can manage their own configs" ON global_configs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own employees" ON employees;
CREATE POLICY "Users can manage their own employees" ON employees FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own suppliers" ON suppliers;
CREATE POLICY "Users can manage their own suppliers" ON suppliers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own clients" ON clients;
CREATE POLICY "Users can manage their own clients" ON clients FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own delivery_orders" ON delivery_orders;
CREATE POLICY "Users can manage their own delivery_orders" ON delivery_orders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own comparisons" ON ai_comparisons;
CREATE POLICY "Users can manage their own comparisons" ON ai_comparisons FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own basket configs" ON basket_item_configs;
CREATE POLICY "Users can manage their own basket configs" ON basket_item_configs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own legacy app_users" ON app_users;
CREATE POLICY "Users can manage their own legacy app_users" ON app_users FOR ALL USING (auth.uid() = user_id);


-- 4. LIMPEZA DE PERMISSÕES PÚBLICAS (ANON)
REVOKE ALL ON TABLE companies FROM anon;
REVOKE ALL ON TABLE global_configs FROM anon;
REVOKE ALL ON TABLE biometrics FROM anon;
-- ... repetir para outras se necessário
