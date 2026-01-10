import { BaseAgent } from '../base/BaseAgent';
import { SupabaseService } from '../../services/supabaseService';

/**
 * DeliveryStorageAgent
 * Manages persistence for delivery orders in Supabase.
 */
export class DeliveryStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'DeliveryStorageAgent',
            systemPrompt: `Você é um Especialista em Persistência de Dados de Logística.`
        });
    }

    async process(input: { operation: 'save' | 'load', data?: any, logo?: string | null }): Promise<any> {
        this.log(`Delivery Storage: ${input.operation}`);

        if (input.operation === 'save') {
            const success = await SupabaseService.saveDeliveryOrders(input.data, input.logo);
            return { success };
        }

        if (input.operation === 'load') {
            const result = await SupabaseService.getDeliveryOrders();
            return result;
        }

        throw new Error('Unsupported storage operation');
    }
}
