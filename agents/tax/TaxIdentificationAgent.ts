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
            systemPrompt: `Você é um Especialista em Direito Tributário e Contabilidade para Agronegócio (Carcinicultura).
    Sua função é identificar a Natureza da Operação (OpeNat), CFOP, NCM e impostos aplicáveis.

REGRAS CRÍTICAS DE SAÍDA:
1. Responda APENAS com um objeto JSON válido.
2. NUNCA adicione saudações ("Com certeza", "Aqui está") ou explicações fora do JSON.
3. Use o formato EXATO abaixo:

{
    "code": "Código OPE/NAT",
    "description": "Descrição da Natureza",
    "reasoning": "Embasamento legal/lógico",
    "items": ["Item 1", "Item 2"]
}

Exemplo de saída esperada:
{"code": "1.556", "description": "Compra para consumo", "reasoning": "Insumos para uso interno...", "items": ["Arroz", "Feijão"]}

Analise os itens considerando o contexto de carcinicultura.`,
            temperature: 0.0
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
