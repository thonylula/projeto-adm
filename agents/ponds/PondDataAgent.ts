import { BaseAgent } from '../base/BaseAgent';

/**
 * PondDataAgent
 * Specialized in extracting technical data from pond reports and water quality sheets.
 */
export class PondDataAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PondDataAgent',
            responseMimeType: 'application/json',
            systemPrompt: `
    Você é um assistente técnico de carcinicultura especialista em extração de dados.
    Sua função é extrair parâmetros técnicos de viveiros a partir de imagens ou textos.
    
    Parâmetros alvo:
    - Oxigênio Dissolvido (mg/L)
    - Temperatura (°C)
    - pH
    - Salinidade (ppt)
    - Alcalinidade
    - Transparência (cm)
    
    Mantenha o rigor pericial na extração. Se não houver certeza, retorne null para o campo.
  `
        });
    }

    async process(input: any): Promise<any> {
        const { image, text, mimeType } = input;

        if (image) {
            // BaseAgent's callLLM expects (userPrompt, context)
            // If context.image exists, it calls callLLMWithImage
            const response = await this.callLLM("Extraia os parâmetros de qualidade de água desta folha de campo.", { image, mimeType });
            return this.safeExtractJson(response.content);
        }

        const response = await this.callLLM(`Extraia os dados técnicos deste texto: ${text}`);
        return this.safeExtractJson(response.content);
    }
}
