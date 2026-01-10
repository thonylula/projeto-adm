import { BaseAgent } from '../base/BaseAgent';

export interface BasketReportResult {
    success: boolean;
    messages: string[];
    summary: string;
    formattedReport: string;
}

/**
 * Basket Report Agent
 * Specialized in generating social content and executive summaries for basket distribution.
 */
export class BasketReportAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BasketReportAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um comunicador social e analista de RH.
Sua tarefa é gerar mensagens motivacionais personalizadas para os funcionários que receberão a cesta básica e um relatório de impacto.

Responsabilidades:
1. Gerar mensagens curtas e inspiradoras para cada funcionário (evite repetições).
2. Criar um resumo executivo da distribuição (investimento total, total de quilos/unidades distribuídos).
3. Adaptar o tom baseado no modo (Cesta Básica Comum vs Cesta de Natal).

Retorne um JSON com a lista de mensagens e o texto do relatório formatado.`,
            temperature: 0.7
        });
    }

    async process(data: {
        employees: string[],
        appMode: 'BASIC' | 'CHRISTMAS',
        totalValue: number,
        itemCount: number
    }): Promise<BasketReportResult> {
        this.log('Generating basket reports and messages');

        try {
            const prompt = `Gere mensagens para ${data.employees.length} funcionários e um breve relatório de impacto no modo ${data.appMode}.`;
            const response = await this.callLLM(prompt, data);

            const result = this.safeExtractJson(response.content);
            return {
                success: true,
                messages: result.messages || [],
                summary: result.summary || '',
                formattedReport: result.formattedReport || ''
            };
        } catch (error) {
            this.log(`Report generation failed: ${error}`, 'error');
            throw error;
        }
    }
}
