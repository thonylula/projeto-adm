import { BaseAgent } from '../base/BaseAgent';

/**
 * TaxIdentificationAgent
 * Specialist in tax classification (CFOP, NCM, CST) for aquaculture operations.
 * Analyzes invoices and product descriptions to suggest the best fiscal treatment.
 */
export class TaxIdentificationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'TaxIdentificationAgent',
            systemPrompt: `
    Você é um Especialista em Direito Tributário e Contabilidade para Agronegócio (Carcinicultura).
    Sua função é identificar a Natureza da Operação (OpeNat), CFOP, NCM e impostos aplicáveis.
    
    Conhecimento Base:
    - Carcinicultura: Criação de camarão.
    - OpeNat: Natureza que define se é Compra para Industrialização, Uso e Consumo, Revenda, etc.
    - CFOP: Código Fiscal de Operações e Prestações.
    
    Tarefa:
    1. Analise os itens da nota fiscal.
    2. Considere o contexto de uso (Ex: "Ração para camarão", "Manutenção de Aerador").
    3. Sugira o código OPE/NAT e explique o embasamento legal/lógico.
    
    Retorne JSON estrito:
    {
        "code": "string",
        "description": "string",
        "reasoning": "string",
        "items": ["string"]
    }
  `
        });
    }

    async process(input: {
        text?: string,
        image?: string,
        mimeType?: string,
        category?: string,
        usage?: string,
        codeTables?: string[]
    }): Promise<any> {
        this.log('Processing tax identification');

        const contextPrompt = `
            Contexto do Usuário:
            - Categoria: ${input.category || 'N/D'}
            - Uso: ${input.usage || 'N/D'}
            Tabelas de Referência: ${input.codeTables?.length ? 'Fornecidas' : 'Não fornecidas'}
        `;

        const prompt = `Analise este documento e identifique a classificação fiscal adequada.\n${contextPrompt}`;

        if (input.image) {
            const response = await this.callLLM(prompt, { image: input.image, mimeType: input.mimeType });
            return this.safeExtractJson(response.content);
        }

        const response = await this.callLLM(`${prompt}\n\nTexto/Dados:\n${input.text}`);
        return this.safeExtractJson(response.content);
    }
}
