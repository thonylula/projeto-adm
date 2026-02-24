
export interface ReceiptInput {
    payeeName: string;
    payeeDocument?: string;
    value: number;
    date: string;
    serviceDate: string;
    serviceEndDate?: string;
    serviceDates?: string[];
    description: string;
    paymentMethod: string;
    pixKey?: string;
    bankInfo?: string;
    category?: string;
}

export interface ReceiptResult {
    valueInWords: string;
}

export interface ReceiptHistoryItem {
    id: string;
    timestamp: string;
    rawDate: string;
    input: ReceiptInput;
    result: ReceiptResult;
}

export interface ExtractedData {
    local: string;
    estocagem: number;
    plPorGrama: number;
    densidade: string;
    viveiroDestino: string;
    isParcial: boolean;
    horario?: string;
    data?: string;
    pesoTotal?: number;
    tipo?: 'TRANSFERENCIA' | 'VENDA';
    dataPovoamento?: string;
    clienteId?: string;
    clienteNome?: string;
}

export interface ProcessedData extends ExtractedData {
    pesoMedioCalculado: number;
    pesoTotalCalculado: number;
    viveiroDestinoArea?: number;
}

export interface NurserySurvivalData {
    initialStocking: number;
    totalTransferred: number;
    totalSold: number;
    survivalRate: number;
    isParcial: boolean;
}

export interface HistoryEntry {
    id: string;
    timestamp: string;
    data: ProcessedData[];
    initialStockings?: Record<string, number>;
}
