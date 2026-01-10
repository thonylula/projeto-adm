import { BaseAgent } from '../base/BaseAgent';

/**
 * DeliveryDocumentAgent
 * Specializes in generating professional billing emails and delivery documents.
 */
export class DeliveryDocumentAgent extends BaseAgent {
    constructor() {
        super({
            name: 'DeliveryDocumentAgent',
            systemPrompt: `
    Você é um assistente de Faturamento Sênior da Carapitanga.
    Sua missão é gerar comunicações profissionais para clientes de aquicultura.
    
    Tom: Profissional, amigável e conciso.
    Língua: Português do Brasil.
    
    Capacidades:
    1. Gerar corpo de e-mail de faturamento listando biomassa total e valor.
    2. Mencionar prazos de pagamento.
    3. Resumir indicadores de performance (peso médio, FCR).
  `
        });
    }

    async process(input: { type: 'email' | 'summary', client: string, data: any, paymentTerms: string }): Promise<any> {
        this.log(`Generating ${input.type} for ${input.client}`);

        const prompt = `Gere um ${input.type === 'email' ? 'corpo de e-mail de faturamento' : 'resumo executivo'} para o cliente ${input.client}.
        Considerando os dados: ${JSON.stringify(input.data)}
        Prazo de pagamento: ${input.paymentTerms}.
        Não inclua saudação genérica ou assinatura final.`;

        const response = await this.callLLM(prompt);
        return { content: response.content };
    }
}
