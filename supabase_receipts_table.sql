-- Script SQL para criar tabela de recibos no Supabase
-- Execute este script no Supabase SQL Editor

-- Criar tabela receipts
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  payee_name TEXT NOT NULL,
  payee_document TEXT,
  value DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  service_date DATE NOT NULL,
  service_end_date DATE,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'PIX',
  pix_key TEXT,
  bank_info TEXT,
  category TEXT DEFAULT 'OUTROS',
  value_in_words TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  raw_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_receipts_company ON receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(raw_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payee ON receipts(payee_name);

-- Habilitar RLS (Row Level Security)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem acessar apenas recibos de suas empresas
-- Nota: ajuste conforme sua política de autenticação
CREATE POLICY "Users can access their company receipts" 
  ON receipts 
  FOR ALL 
  USING (true);  -- Ajuste esta política conforme necessário

-- Comentários na tabela
COMMENT ON TABLE receipts IS 'Recibos de pagamento avulsos gerados pela aplicação';
COMMENT ON COLUMN receipts.company_id IS 'Referência à empresa que emitiu o recibo';
COMMENT ON COLUMN receipts.payee_name IS 'Nome do beneficiário que recebe o pagamento';
COMMENT ON COLUMN receipts.value IS 'Valor do recibo em reais';
COMMENT ON COLUMN receipts.service_date IS 'Data de início da prestação do serviço';
COMMENT ON COLUMN receipts.service_end_date IS 'Data de fim da prestação do serviço (opcional)';
COMMENT ON COLUMN receipts.payment_method IS 'Forma de pagamento: PIX, DINHEIRO, TRANSFERÊNCIA, CHEQUE';
COMMENT ON COLUMN receipts.value_in_words IS 'Valor por extenso em português';
COMMENT ON COLUMN receipts.timestamp IS 'Data/hora formatada em português para exibição';
COMMENT ON COLUMN receipts.raw_date IS 'Data/hora ISO para ordenação e filtros';
