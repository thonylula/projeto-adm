import { BaseAgent } from '../base/BaseAgent';

/**
 * RegistrationDataAgent
 * Specialized in extracting data from ID documents (RG, CNH) and corporate documents (CNPJ).
 */
export class RegistrationDataAgent extends BaseAgent {
    constructor() {
        super({
            name: 'RegistrationDataAgent',
            responseMimeType: 'application/json',
            systemPrompt: `
    Você é um Especialista em Processamento de Documentos de Identidade e Corporativos.
    Sua missão é extrair dados para cadastros com precisão absoluta.
    
    Tipos de Cadastro:
    1. **EMPLOYEE**: Extraia Nome, CPF, Data de Nascimento, Endereço, Data de Emissão.
    2. **SUPPLIER**: Extraia Razão Social, CNPJ, Nome Fantasia, Endereço.
    3. **CLIENT**: Extraia Nome/Razão Social, Documento (CPF/CNPJ), Endereço.
    
    Regras:
    - Formate CPF como 000.000.000-00.
    - Formate CNPJ como 00.000.000/0000-00.
    - Retorne JSON estrito sem formatação markdown.
  `
        });
    }

    async process(input: { type: 'EMPLOYEE' | 'SUPPLIER' | 'CLIENT', text?: string, image?: string, mimeType?: string }): Promise<any> {
        this.log(`Processing registration data for type: ${input.type}`);

        const prompt = `Extraia os dados para um cadastro do tipo ${input.type}.`;

        if (input.image) {
            const response = await this.callLLM(prompt, { image: input.image, mimeType: input.mimeType });
            return this.safeExtractJson(response.content);
        }

        const response = await this.callLLM(`${prompt}\n\nTexto:\n${input.text}`);
        return this.safeExtractJson(response.content);
    }
}
