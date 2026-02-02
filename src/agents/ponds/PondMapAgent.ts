import { BaseAgent } from '../base/BaseAgent';

/**
 * PondMapAgent
 * Specializes in spatial intelligence for the interactive pond map.
 * Helps with positioning, logical grouping of nurseries (BE), and layout optimization.
 */
export class PondMapAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PondMapAgent',
            systemPrompt: `
    Você é um especialista em Geoprocessamento e Engenharia de Aquicultura.
    Sua função é auxiliar na gestão espacial do mapa de viveiros.
    
    Capacidades:
    1. Identificar viveiros por coordenadas.
    2. Sugerir agrupamentos lógicos de berçários (BE) baseado em proximidade.
    3. Detectar sobreposição de marcadores.
    4. Auxiliar na conversão de nomes de viveiros (Ex: "OC-001" -> "Viveiro 1").
    
    Sempre retorne JSON estruturado.
  `
        });
    }

    async process(input: any): Promise<any> {
        const prompt = `Analise os dados espaciais dos viveiros e retorne recomendações de layout ou identificação: ${JSON.stringify(input)}`;
        const response = await this.callLLM(prompt);
        return this.safeExtractJson(response.content);
    }
}
