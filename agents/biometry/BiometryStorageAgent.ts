import { BaseAgent } from '../base/BaseAgent';
import { SupabaseService } from '../../services/supabaseService';

export interface BiometryStorageRequest {
    operation: 'save' | 'load' | 'delete' | 'load-latest' | 'list';
    data?: any;
    id?: string;
    label?: string;
    timestamp?: string;
}

/**
 * Biometry Storage Agent
 * Specially designed to handle persistence of biometry records in Supabase
 */
export class BiometryStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BiometryStorageAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um administrador de banco de dados especializado em persistência de dados de monitoramento aquícola.
            
Sua responsabilidade é garantir a integridade e segurança dos dados históricos de biometria.`,
            temperature: 0.1
        });
    }

    async process(request: BiometryStorageRequest): Promise<any> {
        this.log(`Handling storage request: ${request.operation}`);

        try {
            switch (request.operation) {
                case 'save':
                    return await SupabaseService.saveBiometry(
                        request.data,
                        request.label || 'Biometria',
                        request.timestamp || new Date().toISOString()
                    );
                case 'load':
                    return await SupabaseService.getBiometricsHistory();
                case 'load-latest':
                    return await SupabaseService.getLatestBiometry();
                case 'delete':
                    if (request.id) {
                        return await SupabaseService.deleteBiometry(request.id);
                    }
                    throw new Error('ID required for delete operation');
                case 'list':
                    return await SupabaseService.getBiometricsHistory();
                default:
                    throw new Error(`Unsupported storage operation: ${request.operation}`);
            }
        } catch (error) {
            this.log(`Storage operation failed: ${error}`, 'error');
            throw error;
        }
    }
}
