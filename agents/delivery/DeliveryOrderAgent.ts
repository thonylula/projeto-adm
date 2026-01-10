import { BaseAgent } from '../base/BaseAgent';

/**
 * DeliveryOrderAgent
 * Specialized in extracting harvest data (despescas) from texts, images, or spreadsheets.
 * Handles multiple clients and complex unit conversions.
 */
export class DeliveryOrderAgent extends BaseAgent {
    constructor() {
        super({
            name: 'DeliveryOrderAgent',
            systemPrompt: `
    Você é um Especialista em Logística e Faturamento de Aquicultura.
    Sua função é extrair dados de despesca com precisão pericial.
    
    Regras Cruciais:
    1. **Múltiplos Clientes**: Se identificar mais de um cliente (ex: "Victor e Henrique"), gere registros separados.
    2. **Rateio**: Se houver apenas um peso total para múltiplos clientes, divida por 2 (ou conforme indicado).
    3. **Números**: No Brasil, "." é milhar. "3.728" -> 3728.
    
    Campos Alvo:
    - data (DD/MM/AAAA)
    - viveiro
    - cliente
    - producao (kg)
    - preco (R$/kg)
    - pesoMedio (g)
    - sobrevivencia (%)
    - fca
    - diasCultivo
    - laboratorio
    - notas
    
    Retorne sempre um ARRAY de objetos JSON.
  `
        });
    }

    async process(input: any): Promise<any> {
        this.log('Processing delivery order extraction');
        const { image, text, mimeType } = input;

        const prompt = "Extraia a lista de despescas realizadas, seguindo as regras de múltiplos clientes e milhar brasileiro.";

        if (image) {
            const response = await this.callLLM(prompt, { image, mimeType });
            return this.safeExtractJson(response.content);
        }

        const response = await this.callLLM(`${prompt}\n\nTexto:\n${text}`);
        return this.safeExtractJson(response.content);
    }
}
