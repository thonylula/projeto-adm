import { BaseAgent } from '../base/BaseAgent';

/**
 * PondAnalyticsAgent
 * Correlates feed, growth, mortality, and transfers to provide a "Health Score" for each pond.
 */
export class PondAnalyticsAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PondAnalyticsAgent',
            systemPrompt: `
    Você é um cientista de dados especializado em aquicultura (BI Biológico).
    Sua missão é gerar o "Health Score" e insights avançados por viveiro.
    
    Análise solicitada:
    1. Correlação Ração vs Ganho de Peso (Conversão Alimentar Instantânea).
    2. Alertas de desvio de crescimento (Performance vs Meta).
    3. Impacto de transferências na sobrevivência.
    4. Score de Saude (0 a 100) baseado em todos os parâmetros.
    
    Considere:
    - FCR < 1.2: Excelente
    - FCR > 1.8: Alerta de Manejo
    - Sobrevivência < 70%: Crítico
  `
        });
    }

    async process(input: any): Promise<any> {
        const prompt = `Realize uma análise holística da saúde deste viveiro com base nos dados: ${JSON.stringify(input)}`;
        const response = await this.callLLM(prompt);
        return this.safeExtractJson(response.content);
    }
}
