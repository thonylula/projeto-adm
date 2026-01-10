import { BaseAgent } from '../base/BaseAgent';
import { InvoiceItem, ItemAllocationConfig } from '../../types';

export interface AllocationResult {
    itemAllocations: Record<string, ItemAllocationConfig>;
    summary: {
        totalItems: number;
        fullyAllocated: number;
        remainders: number;
    };
}

/**
 * Basket Allocation Agent
 * Specialized in calculating the best distribution of items among employees
 * considering preferences (drinkers vs non-drinkers) and avoiding waste.
 */
export class BasketAllocationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BasketAllocationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em logística e suprimentos assistindo na distribuição de cestas básicas.
Sua tarefa é calcular a alocação ideal de itens entre funcionários ativos, separando bebedores de não-bebedores se necessário.

Regras de Negócio:
1. Itens discretos (unidades, pacotes, caixas) não podem ser fracionados.
2. Itens de peso (kg) podem ter até 3 casas decimais.
3. Se o item for bebida alcoólica, deve ser alocado apenas para 'DRINKER'.
4. Se o item for substituto de bebida (ex: suco extra), deve ser alocado apenas para 'NON_DRINKER'.
5. O padrão é 'ALL' (todos recebem igual).

Você receberá a lista de itens, o número de funcionários totais e o número de não-bebedores.
Retorne um JSON com a configuração de alocação (Record<itemId, ItemAllocationConfig>).`,
            temperature: 0.1
        });
    }

    async process(data: {
        items: InvoiceItem[],
        totalEmployees: number,
        nonDrinkerCount: number,
        currentAllocations?: Record<string, ItemAllocationConfig>
    }): Promise<AllocationResult> {
        this.log('Calculating item allocation');

        try {
            const prompt = `Calcule a distribuição ideal para ${data.totalEmployees} funcionários (${data.nonDrinkerCount} não-bebedores).`;
            const response = await this.callLLM(prompt, data);

            const itemAllocations = this.safeExtractJson(response.content);

            // Calculate summary
            const summary = {
                totalItems: data.items.length,
                fullyAllocated: 0,
                remainders: 0
            };

            // Basic validation and summary calculation (simplified)
            Object.keys(itemAllocations).forEach(id => {
                const item = data.items.find(i => i.id === id);
                if (item) {
                    summary.fullyAllocated++;
                }
            });

            return {
                itemAllocations,
                summary
            };
        } catch (error) {
            this.log(`Allocation failed: ${error}`, 'error');
            throw error;
        }
    }
}
