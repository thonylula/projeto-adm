import { BaseAgent } from '../base/BaseAgent';
import { BiometryAnalysisResult } from './BiometryAnalysisAgent';

export interface BiometryReportResult {
    success: boolean;
    summary: string;
    criticalAlerts: string[];
    topPerformers: string[];
    formattedText: string;
}

/**
 * Biometry Report Agent
 * Specializes in generating executive summaries and management insights
 */
export class BiometryReportAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BiometryReportAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um consultor técnico em carcinicultura responsável por relatórios executivos.
            
Sua tarefa é sintetizar dados complexos de biometria em insights gerenciais claros e diretos.

Foque em:
- Viveiros que precisam de intervenção imediata (alerta crítico).
- Destaques de produtividade.
- Tendências de crescimento (GPD médio).
- Sugestões práticas de manejo (ajuste de ração, aeração, sanidade).

Seja profissional, técnico e propositivo.

Retorne EXCLUSIVAMENTE um objeto JSON no formato:
{
    "summary": "string",
    "criticalAlerts": ["string"],
    "topPerformers": ["string"],
    "formattedText": "string formatada em markdown amigável"
}
`,
            temperature: 0.3
        });
    }

    async process(data: BiometryAnalysisResult[]): Promise<BiometryReportResult> {
        this.log('Generating biometry report');

        try {
            const prompt = `Gere um relatório gerencial baseado nestas análises de biometria.`;
            const response = await this.callLLM(prompt, { analyses: data });

            const report = this.safeExtractJson(response.content);
            return {
                success: true,
                summary: report.summary || '',
                criticalAlerts: report.criticalAlerts || [],
                topPerformers: report.topPerformers || [],
                formattedText: report.formattedText || report.summary || ''
            };
        } catch (error) {
            this.log(`Report generation failed: ${error}`, 'error');
            throw error;
        }
    }
}
