import { BaseAgent } from '../base/BaseAgent';
import { InvoiceItem, ItemAllocationConfig } from '../../types';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metrics: {
        coveragePercentage: number;
        wastePercentage: number;
    };
}

/**
 * Basket Validation Agent
 * Specialized in auditing the basket distribution to ensure compliance and accuracy.
 */
export class BasketValidationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BasketValidationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um auditor de conformidade logística para distribuição de benefícios.
Sua tarefa é validar se a alocação de itens da cesta básica está correta.

Critérios de Auditoria:
1. Itens alocados para 'ALL' estão sendo divididos por todos?
2. Bebidas alcoólicas estão EXCLUSIVAMENTE para bebedores?
3. Há sobra excessiva de algum item (desperdício)?
4. Há algum item que não foi alocado (esquecimento)?
5. Os totais distribuídos batem com os totais da nota fiscal?

Retorne um JSON com o status de validação, erros, avisos e métricas.`,
            temperature: 0.1
        });
    }

    async process(data: {
        items: InvoiceItem[],
        allocations: Record<string, ItemAllocationConfig>,
        totalEmployees: number,
        nonDrinkerCount: number
    }): Promise<ValidationResult> {
        this.log('Auditing basket allocation');

        try {
            const prompt = 'Realize uma auditoria completa na alocação de itens fornecida.';
            const response = await this.callLLM(prompt, data);

            return this.safeExtractJson(response.content);
        } catch (error) {
            this.log(`Validation failed: ${error}`, 'error');
            throw error;
        }
    }
}
