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

    async process(data: { operation: 'save' | 'load', companyId: string, month: number, year: number, records?: any, data?: any }): Promise<any> {
        this.log(`Mortality Storage: ${data.operation}`);

        if (data.operation === 'save') {
            // detailed payload structure check: caller sends 'data' property containing the full object
            const payloadToSave = data.data || data.records;

            if (!payloadToSave) {
                return { success: false, error: 'Erro Interno: Payload de dados vazio (Agent)' };
            }

            const result = await SupabaseService.saveMortalityData(data.companyId, data.month, data.year, payloadToSave);
            return result;
        }

        if (data.operation === 'load') {
            const result = await SupabaseService.getMortalityData(data.companyId, data.month, data.year);
            return result;
        }

        throw new Error('Unsupported operation');
    }
}
