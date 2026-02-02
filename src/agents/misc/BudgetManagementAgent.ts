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
    Você é um Especialista em Extração de Dados de Notas Fiscais.
    Sua missão é extrair itens de notas fiscais para orçamentos.
    
    REGRAS CRÍTICAS:
    1. "description" deve conter APENAS o nome do produto (ex: "FEIJÃO CARIOCA", "ARROZ BRANCO").
    2. "issuerName" deve conter o nome do ESTABELECIMENTO/FORNECEDOR que vendeu o produto.
    3. "issuerAddress" deve conter o ENDEREÇO do estabelecimento.
    4. NUNCA misture informações de fornecedor na descrição do produto.
    5. Se houver vários produtos de diferentes fornecedores, cada item deve ter seu próprio issuerName e issuerAddress.
    
    Retorne JSON estrito:
    {
        "items": [{
            "id": "string",
            "code": "string",
            "description": "APENAS NOME DO PRODUTO",
            "quantity": number,
            "unit": "string",
            "price": number,
            "total": number,
            "issuerName": "NOME DO SUPERMERCADO/FORNECEDOR",
            "issuerAddress": "ENDEREÇO COMPLETO DO ESTABELECIMENTO"
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
