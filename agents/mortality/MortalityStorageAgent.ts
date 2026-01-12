import { BaseAgent } from '../base/BaseAgent';
import { SupabaseService } from '../../services/supabaseService';

/**
 * Mortality Storage Agent
 * Handles persistence of mortality and feed data in Supabase.
 */
export class MortalityStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'MortalityStorageAgent',
            systemPrompt: `Você é um Gerenciador de Banco de Dados especializado em Supabase.
Sua função é garantir que os dados de mortalidade e ração sejam salvos corretamente.`
        });
    }

    async process(data: { operation: 'save' | 'load', companyId: string, month: number, year: number, records?: any }): Promise<any> {
        this.log(`Mortality Storage: ${data.operation}`);

        if (data.operation === 'save') {
            const result = await SupabaseService.saveMortalityData(data.companyId, data.month, data.year, data.records);
            return result;
        }

        if (data.operation === 'load') {
            const result = await SupabaseService.getMortalityData(data.companyId, data.month, data.year);
            return result;
        }

        throw new Error('Unsupported operation');
    }
}
