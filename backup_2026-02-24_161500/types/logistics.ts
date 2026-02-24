
export type ViveiroStatus = 'VAZIO' | 'PREPARACAO' | 'PREPARADO' | 'POVOADO' | 'DESPESCA';

export interface Viveiro {
    id: string;
    company_id: string;
    name: string;
    coordinates: { lat: number; lng: number }[];
    area_m2: number;
    status?: ViveiroStatus;
    notes?: string;
    created_at: string;
}

export interface InvoiceItem {
    id: string;
    code: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    total: number;
    issuerName?: string;
    issuerAddress?: string;
}

export interface InvoiceData {
    recipientName: string;
    recipientCnpj: string;
    issuerName: string;
    issuerAddress: string;
    invoiceNumber: string;
    series: string;
    issueDate: string;
    totalValue: number;
    items: InvoiceItem[];
}

export interface ItemAllocationConfig {
    mode: 'ALL' | 'NON_DRINKER' | 'DRINKER' | 'CUSTOM';
    customQtyNonDrinker?: number;
    customQtyDrinker?: number;
}

export interface ItemConfiguration {
    id: string;
    description: string;
    config: ItemAllocationConfig;
}

export interface MortalityDailyRecord {
    day: number;
    feed: number;
    mortality: number;
}

export interface MortalityTankRecord {
    id: string;
    ve: string;
    stockingDate: string;
    area: number;
    initialPopulation: number;
    density: number;
    biometry: string;
    status?: 'em_curso' | 'preparacao';
    dailyRecords: MortalityDailyRecord[];
}

export interface MonthlyMortalityData {
    id: string;
    companyId: string;
    month: number;
    year: number;
    records: MortalityTankRecord[];
}

export interface Transferencia {
    id: string;
    company_id: string;
    origem_id: string;
    destino_id: string;
    data_transferencia: string;
    turno: string;
    povoamento_origem_id?: string;
    quantidade: number;
    peso_medio: number;
    observacao?: string;
    created_at?: string;
    updated_at?: string;
}
