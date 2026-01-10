import { BaseAgent } from '../base/BaseAgent';

/**
 * Growth Prediction Agent
 * Uses historical biological curves to predict harvest dates and weights.
 */
export class GrowthPredictionAgent extends BaseAgent {
    constructor() {
        super({
            name: 'GrowthPredictionAgent',
            systemPrompt: `Você é um Analista de BI Biológico.
Sua missão é projetar o crescimento dos camarões.
Use como referência que viveiros OC (Oceanic) tem ganho médio de 0.15g-0.25g/dia.
Retorne previsões de data de colheita e peso final esperado.`
        });
    }

    async process(data: any): Promise<any> {
        this.log('Predicting growth');
        const response = await this.callLLM(`Com base nestes dados de biometria e mortalidade, projete a despesca: ${JSON.stringify(data)}`);
        return this.safeExtractJson(response.content);
    }
}
