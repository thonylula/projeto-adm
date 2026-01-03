-- Table for Fish/Shrimp Transfers between ponds
CREATE TABLE IF NOT EXISTS transferencias (
    id TEXT PRIMARY KEY, -- Unique ID (e.g. TR-2026-0001 or UUID)
    company_id UUID REFERENCES companies(id),
    origem_id UUID REFERENCES viveiros(id),
    destino_id UUID REFERENCES viveiros(id),
    data_transferencia DATE NOT NULL DEFAULT CURRENT_DATE,
    turno TEXT,
    povoamento_origem_id TEXT, -- Reference to a stocking/lot ID
    quantidade NUMERIC DEFAULT 0,
    peso_medio NUMERIC DEFAULT 0,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transferencias_company ON transferencias(company_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_origem ON transferencias(origem_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_destino ON transferencias(destino_id);
