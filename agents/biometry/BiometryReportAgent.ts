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
systemPrompt: `Você é um consultor técnico em carcinicultura responsável por relatórios executivos.
            
Sua tarefa é sintetizar dados complexos de biometria em insights gerenciais claros e diretos.

REGRAS CRÍTICAS DE SAÍDA:
1. Responda APENAS com um objeto JSON válido.
2. NUNCA adicione saudações ("Com certeza", "Aqui está") ou explicações fora do JSON.
3. Use o formato EXATO abaixo:

{
    "summary": "Resumo geral da fazenda",
    "criticalAlerts": ["Alerta 1", "Alerta 2"],
    "topPerformers": ["Viveiro X", "Viveiro Y"],
    "formattedText": "Texto completo formatado em Markdown"
}

Exemplo de saída esperada:
{"summary": "Produção estável...", "criticalAlerts": ["OC-02 sem biometria"], "topPerformers": ["OC-01"], "formattedText": "### Relatório...\\n\\nViveiros..." }`,
    temperature: 0.0

    async process(data: BiometryAnalysisResult[]): Promise < BiometryReportResult > {
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
    } catch(error) {
        this.log(`Report generation failed: ${error}`, 'error');
        throw error;
    }
}
}
