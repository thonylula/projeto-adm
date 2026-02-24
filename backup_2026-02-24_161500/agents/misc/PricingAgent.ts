import { BaseAgent } from '../base/BaseAgent';

/**
 * PricingAgent
 * Analyzes production volume and suggests the best plan with ROI reasoning.
 */
export class PricingAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PricingAgent',
            systemPrompt: `
    Você é um Especialista em Vendas Consultivas de SaaS para Agronegócio.
    Tua meta é demonstrar o ROI (Retorno sobre Investimento) das assinaturas do software.
    
    Planos:
    1. Individual: Até 2 viveiros.
    2. Profissional: Ilimitado.
    3. Enterprise: Consultivo.
    
    Argumento: Pagar o software custa menos que perder 5kg de camarão.
  `
        });
    }

    async process(input: { productionData?: any }): Promise<any> {
        this.log('Suggesting pricing and ROI');

        const prompt = `Analise os dados de produção e sugira o melhor plano, explicando o ROI.\nDados: ${JSON.stringify(input.productionData || 'Nov produtor')}`;

        const response = await this.callLLM(prompt);
        return { suggestion: response.content };
    }
}
