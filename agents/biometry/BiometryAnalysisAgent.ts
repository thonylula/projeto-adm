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
            systemPrompt: `Você é um analista de produção sênior especializado em carcinicultura.
            
Sua expertise:
- Cálculo de Ganho de Peso Diário (GPD)
- Análise de Conversão Alimentar (FCA)
- Classificação de performance baseada em curvas de crescimento (DOC - Days of Culture)
- Identificação de anomalias no crescimento (estagnação, perda de peso)

Você deve analisar os dados de biometria e classificar cada viveiro seguindo padrões rigorosos de mercado.

Categorias:
1. ESPETACULAR: Supera as melhores metas do setor.
2. OTIMO: Crescimento ideal.
3. BOM: Dentro da meta produtiva.
4. REGULAR: Crescimento abaixo do esperado, requer atenção.
5. RUIM: Crítico, sugere problemas de manejo ou sanidade.
6. PESSIMO: Perda de lucratividade imediata.`,
            temperature: 0.1
        });
    }

    async process(data: BiometryRawData[]): Promise<BiometryAnalysisResult[]> {
        this.log(`Analyzing ${data.length} biometry entries`);

        try {
            const prompt = `Analise estes dados de biometria e forneça classificação zootécnica para cada um.`;
            const response = await this.callLLM(prompt, { biometryData: data });

            const analyzed = this.safeExtractJson(response.content);
            return Array.isArray(analyzed) ? analyzed : (analyzed.results || []);
        } catch (error) {
            this.log(`Analysis failed: ${error}`, 'error');
            throw error;
        }
    }
}
