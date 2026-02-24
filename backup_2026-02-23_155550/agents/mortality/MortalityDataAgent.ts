import { BaseAgent } from '../base/BaseAgent';

/**
 * Mortality Data Agent
 * Specialized in extracting daily mortality and feed data from technical field sheets.
 */
export class MortalityDataAgent extends BaseAgent {
    constructor() {
        super({
            name: 'MortalityDataAgent',
            model: 'gemini-2.0-flash-exp',
            responseMimeType: 'application/json',
            systemPrompt: `Você é um Extrator de Tabelas Pericial especializado em Aquicultura.
Sua tarefa é extrair rigorosamente os dados da planilha de "Mortalidade e Consumo".

Estrutura da Planilha:
- Cada viveiro (VE) possui duas linhas de dados por dia: Ração (kg) e Mortalidade (unidades).
- Colunas de cabeçalho: VE, Data Povoa, Área, Pop. Ini, Dens., Biometria.
- Colunas diárias: 1 a 31.

Regras de Extração:
1. Se o campo de ração ou mortalidade estiver vazio, use 0.
2. Extraia a data de povoamento no formato DD/MM/YYYY.
3. Extraia biometria como string (ex: "6.58").
4. Mantenha a precisão decimal para Área e Densidade.

Retorne APENAS um JSON puro que siga o formato esperado pelo componente MortalidadeConsumo.`,
            temperature: 0.1
        });
    }

    async process(data: { image?: string, mimeType?: string, text?: string, year: number }): Promise<any> {
        this.log('Extracting mortality data');

        try {
            const prompt = `Extraia todos os registros de mortalidade e ração da imagem para o ano ${data.year}.`;

            if (data.image && data.mimeType) {
                const response = await this.callLLM(prompt, {
                    image_base64: data.image,
                    mimeType: data.mimeType
                });
                return this.safeExtractJson(response.content);
            }

            const response = await this.callLLM(prompt, { text: data.text });
            return this.safeExtractJson(response.content);
        } catch (error) {
            this.log(`Mortality extraction failed: ${error}`, 'error');
            throw error;
        }
    }
}
