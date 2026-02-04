-- ==========================================
-- SCRIPT DE MANUTENÇÃO (LIMPEZA SEGURA)
-- ==========================================
-- Use este script para limpar dados órfãos ou inconsistentes.

-- 1. REMOVER FOLHAS SEM EMPRESA (ÓRFÃOS)
DELETE FROM payroll_history 
WHERE company_id NOT IN (SELECT id FROM companies);

-- 2. REMOVER VIVEIROS SEM EMPRESA
DELETE FROM viveiros 
WHERE company_id NOT IN (SELECT id FROM companies);

-- 3. REMOVER TRANSFERÊNCIAS SEM VIVEIROS VÁLIDOS
DELETE FROM transferencias 
WHERE origem_id NOT IN (SELECT id FROM viveiros) 
   OR destino_id NOT IN (SELECT id FROM viveiros);

-- 4. VERIFICAÇÃO DE SAÚDE (APENAS SELECTS)
-- Quantidade de registros por tabela
SELECT 'companies' as table, count(*) FROM companies
UNION ALL SELECT 'employees', count(*) FROM employees
UNION ALL SELECT 'payroll_history', count(*) FROM payroll_history
UNION ALL SELECT 'suppliers', count(*) FROM suppliers
UNION ALL SELECT 'clients', count(*) FROM clients
UNION ALL SELECT 'viveiros', count(*) FROM viveiros
UNION ALL SELECT 'receipts', count(*) FROM receipts;
