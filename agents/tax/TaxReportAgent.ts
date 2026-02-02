import { BaseAgent } from '../base/BaseAgent';

/**
 * TaxReportAgent
 * Consolidates tax data into reports for accounting.
 */
export class TaxReportAgent extends BaseAgent {
    constructor() {
        super({
            name: 'TaxReportAgent',
            systemPrompt: `
    Você é um Assistente de Controladoria Fiscal.
    Sua missão é consolidar tributos e gerar resumos executivos para contabilidade.
    Foque em: ICMS, PIS, COFINS e IPI (se aplicável).
  `
        });
    }

    async process(input: { data: any[], period: string }): Promise<any> {
        this.log(`Generating tax report for period: ${input.period}`);

        const prompt = `Consolide os impostos para o seguinte conjunto de dados fiscais do período ${input.period}.\nDados: ${JSON.stringify(input.data)}`;

        const response = await this.callLLM(prompt);
        return { report: response.content };
    }
}
