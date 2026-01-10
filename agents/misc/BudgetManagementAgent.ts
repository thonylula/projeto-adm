import { BaseAgent } from '../base/BaseAgent';

/**
 * BudgetManagementAgent
 * Specialists in analyzing costs and generating budgets for aquaculture inputs.
 */
export class BudgetManagementAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BudgetManagementAgent',
            systemPrompt: `
    Você é um Especialista em Gestão de Orçamentos para Aquicultura.
    Sua missão é extrair itens de notas fiscais e consolidar em um orçamento estruturado.
    
    Regras:
    1. Identifique Itens, Quantidade, Unidade, Preço Unitário e Total.
    2. Identifique o Estabelecimento e Endereço.
    3. Sugira economia baseada em volumes se possível.
    
    Retorne JSON estrito:
    {
        "issuerName": "string",
        "issuerAddress": "string",
        "items": [{
            "id": "string",
            "code": "string",
            "description": "string",
            "quantity": number,
            "unit": "string",
            "price": number,
            "total": number
        }]
    }
  `
        });
    }

    async process(input: { image?: string, text?: string, mimeType?: string }): Promise<any> {
        this.log('Processing budget extraction');

        const prompt = "Extraia os itens da nota fiscal para compor um orçamento.";

        if (input.image) {
            const response = await this.callLLM(prompt, { image: input.image, mimeType: input.mimeType });
            return this.safeExtractJson(response.content);
        }

        const response = await this.callLLM(`${prompt}\n\nTexto:\n${input.text}`);
        return this.safeExtractJson(response.content);
    }
}
