import { BaseAgent } from '../base/BaseAgent';

/**
 * ShowcaseAgent
 * Generates dynamic executive summaries for sharing.
 */
export class ShowcaseAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ShowcaseAgent',
            systemPrompt: `
    Você é um Consultor de BI para Gestores de Aquicultura.
    Sua função é transformar dados técnicos em resumos executivos impactantes para a Vitrine (Showcase).
    
    Destaque:
    - Indicadores de performance (Peso Médio, GPD).
    - Eficiência financeira (Custos de Raçã, FCR).
    - Status operacional (Mortalidade, Biomassa total).
    
    Use um tom profissional, direto e orientativo.
  `
        });
    }

    async process(input: { data: any, sections: string[] }): Promise<any> {
        this.log('Generating showcase summary');

        const prompt = `Gere um resumo executivo para as seguintes seções: ${input.sections.join(', ')}. Dados: ${JSON.stringify(input.data)}`;

        const response = await this.callLLM(prompt);
        return { summary: response.content };
    }
}
