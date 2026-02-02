import { BaseAgent } from '../base/BaseAgent';
import { BiometryRawData } from './BiometryDataAgent';

export interface BiometryAnalysisResult {
    viveiro: string;
    doc: number;
    pMed: number;
    pAnt: number;
    incSemanal: number;
    gpd: number;
    status: string;
    classification: 'ESPETACULAR' | 'OTIMO' | 'BOM' | 'REGULAR' | 'RUIM' | 'PESSIMO';
    recommendations?: string[];
}

/**
 * Biometry Analysis Agent
 * Specializes in zootechnical analysis and performance classification
 */
export class BiometryAnalysisAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BiometryAnalysisAgent',
            model: 'gemini-2.0-flash-exp',
            responseMimeType: 'application/json',
            maxTokens: 8192,
            systemPrompt: `Você é um analista de produção sênior especializado em carcinicultura.
            
Sua expertise:
- Cálculo de Ganho de Peso Diário (GPD) e Classificação de performance (DOC).
- Identificacão de anomalias no crescimento.

Instruções de Saída:
1. Retorne APENAS um array JSON de objetos.
2. Recomendações devem ser CURTAS e DIRETAS (máx 10 palavras cada).
3. Seja extremamente conciso para evitar truncamento em grandes volumes de dados.

Exemplo:
[{"viveiro":"OC-01","doc":30,"pMed":2.5,"pAnt":2.0,"incSemanal":0.5,"gpd":0.07,"status":"OK","classification":"BOM","recommendations":["Aumentar ração 5%"]}]`,
            temperature: 0.0
        });
    }

    async process(data: BiometryRawData[]): Promise<BiometryAnalysisResult[]> {
        this.log(`Analyzing ${data.length} biometry entries`);

        // Safety check
        if (!data || data.length === 0) return [];

        const CHUNK_SIZE = 20; // Conservative limit to avoid token overflow
        const results: BiometryAnalysisResult[] = [];

        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            this.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(data.length / CHUNK_SIZE)} (${chunk.length} items)`);

            try {
                const prompt = `Analise estes dados de biometria e forneça classificação zootécnica para cada um. 
                IMPORTANTE: Responda APENAS com o JSON. Não inclua texto explicativo, markdown ou nada fora do array.`;

                const response = await this.callLLM(prompt, { biometryData: chunk });
                const analyzed = this.safeExtractJson(response.content);

                if (Array.isArray(analyzed)) {
                    results.push(...analyzed);
                } else if (analyzed && Array.isArray(analyzed.results)) {
                    results.push(...analyzed.results);
                }
            } catch (error) {
                this.log(`Analysis failed for chunk starting at index ${i}: ${error}`, 'error');
                // Continue identifying other chunks instead of failing everything?
                // For now, let's throw to warn user, or maybe return partial?
                // Throwing is safer so they know it failed.
                throw error;
            }
        }

        return results;
    }
}
