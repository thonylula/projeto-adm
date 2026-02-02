import { BaseAgent } from '../base/BaseAgent';

/**
 * Mortality Report Agent
 * Generates technical summaries and biological alerts.
 */
export class MortalityReportAgent extends BaseAgent {
    constructor() {
        super({
            name: 'MortalityReportAgent',
            systemPrompt: `Você é um Consultor Técnico em Carcinicultura.
Gere relatórios executivos baseados nos dados de mortalidade.
Identifique surtos, anomalias de consumo e sugira intervenções imediatas.`
        });
    }

    async process(data: any): Promise<any> {
        this.log('Generating mortality report');
        const response = await this.callLLM(`Gere um resumo técnico para este viveiro: ${JSON.stringify(data)}`);
        return this.safeExtractJson(response.content);
    }
}
