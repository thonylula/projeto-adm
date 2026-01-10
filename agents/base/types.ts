/**
 * Core types for Multi-Agent System
 */

export interface AgentConfig {
    name: string;
    model?: string;
    systemPrompt: string;
    temperature?: number;
    maxTokens?: number;
}

export interface AgentInteraction {
    agentId: string;
    timestamp: Date;
    data: any;
    result?: any;
    error?: string;
}

export interface HandoffRequest {
    targetAgent: string;
    data: any;
    metadata?: {
        sourceAgent?: string;
        timestamp?: Date;
        reason?: string;
    };
}

export interface LLMResponse {
    content: string;
    metadata?: {
        model?: string;
        tokensUsed?: number;
        latency?: number;
    };
}

export type AgentIntent =
    // Receipts
    | 'extract-receipt'
    | 'validate-receipt'
    | 'generate-receipt'
    // Payroll
    | 'calculate-payroll'
    | 'validate-payroll'
    | 'upload-payroll'
    | 'generate-payroll-report'
    | 'store-payroll'
    // Biometry
    | 'extract-biometry-data'
    | 'analyze-biometry'
    | 'generate-biometry-report'
    | 'store-biometry'
    // Baskets
    | 'extract-invoice'
    | 'allocate-baskets'
    | 'validate-basket-allocation'
    | 'generate-basket-report'
    | 'store-basket-config'
    // Mortality
    | 'record-mortality'
    | 'analyze-mortality'
    | 'predict-harvest'
    | 'generate-mortality-report'
    | 'store-mortality-data'
    // Ponds
    | 'analyze-pond-map'
    | 'extract-pond-data'
    | 'analyze-pond-health'
    // Delivery
    | 'extract-delivery-order'
    | 'generate-delivery-document'
    | 'store-delivery-data'
    // Registration
    | 'manage-registration'
    | 'extract-registration-data'
    | 'store-registration-data'
    // Fiscal
    | 'identify-tax'
    | 'generate-tax-report'
    | 'manage-budget'
    | 'calculate-roi'
    | 'summarize-showcase'
    | 'suggest-pricing'
    | 'compare-documents'
    | 'generate-showcase'
    | 'manage-pricing';

export interface AgentRegistry {
    id: string;
    agent: any; // BaseAgent instance
    category: 'receipts' | 'payroll' | 'biometry' | 'baskets' | 'mortality' | 'ponds' | 'delivery' | 'registration' | 'tax' | 'misc';
    intents: AgentIntent[];
    description: string;
}
