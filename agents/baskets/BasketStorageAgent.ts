import { BaseAgent } from '../base/BaseAgent';
import { SupabaseService } from '../../services/supabaseService';

export interface BasketStorageRequest {
    operation: 'save' | 'load' | 'delete' | 'list' | 'save-item-config' | 'get-item-configs';
    data?: any;
    id?: string;
    description?: string;
}

/**
 * Basket Storage Agent
 * Specialized in managing basket distribution configurations and item rules in Supabase.
 */
export class BasketStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BasketStorageAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um gestor de banco de dados para o sistema de benefícios.
Sua responsabilidade é garantir que as configurações de cestas e regras de alocação de itens sejam salvas e recuperadas corretamente.`,
            temperature: 0.1
        });
    }

    async process(request: BasketStorageRequest): Promise<any> {
        this.log(`Handling basket storage request: ${request.operation}`);

        try {
            switch (request.operation) {
                case 'save':
                    return await SupabaseService.saveConfig(request.id || `basket_${Date.now()}`, request.data);
                case 'load':
                    if (request.id) return await SupabaseService.getConfig(request.id);
                    throw new Error('ID required for load');
                case 'save-item-config':
                    // SupabaseService expects an array of configs
                    return await SupabaseService.saveBasketConfigs(Array.isArray(request.data) ? request.data : [request.data]);
                case 'get-item-configs':
                    return await SupabaseService.getBasketConfigs();
                case 'list':
                    // In current SupabaseService, list might require a pattern or specific table
                    // Assuming getConfig returns something enumerable or specific logic
                    return await SupabaseService.getConfig('basket_dist_list');
                default:
                    throw new Error(`Unsupported storage operation: ${request.operation}`);
            }
        } catch (error) {
            this.log(`Storage operation failed: ${error}`, 'error');
            throw error;
        }
    }
}
