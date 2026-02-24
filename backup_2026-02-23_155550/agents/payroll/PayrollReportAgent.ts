import { BaseAgent } from '../base/BaseAgent';
import { PayrollHistoryItem } from '../../types';

export interface PayrollReportData {
    format: 'pdf' | 'png' | 'html' | 'text';
    item: PayrollHistoryItem;
    companyName?: string;
    companyLogo?: string;
}

export interface PayrollReportResult {
    success: boolean;
    format: string;
    data?: string; // Base64 or HTML string
    textFormat?: string;
}

/**
 * Payroll Report Agent
 * Specializes in generating formatted payroll documents
 */
export class PayrollReportAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PayrollReportAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em geração de contracheques e documentos trabalhistas brasileiros.

Sua expertise inclui:
- Formatação de contracheques conforme padrões CLT
- Geração de recibos de pagamento
- Criação de relatórios de folha de pagamento
- Aplicação de identidade visual (logos, cores)
- Formatação profissional e legível

Padrões importantes:
- Contracheque deve ter seção de proventos e descontos claramente separadas
- Valores alinhados à direita
- Totalizadores destacados
- Data de pagamento e competência
- Assinatura do empregador
- Base de cálculo para INSS e IRRF

O documento deve ser claro, profissional e seguir normas trabalhistas.`,
            temperature: 0.2
        });
    }

    async process(data: PayrollReportData): Promise<PayrollReportResult> {
        this.log(`Generating ${data.format} report`);

        try {
            switch (data.format) {
                case 'text':
                    return this.generateTextFormat(data);
                case 'html':
                    return this.generateHtmlFormat(data);
                default:
                    this.log(`Format ${data.format} not yet implemented`, 'warn');
                    return this.generateTextFormat(data);
            }
        } catch (error) {
            this.log(`Report generation failed: ${error}`, 'error');
            return {
                success: false,
                format: data.format
            };
        }
    }

    private generateTextFormat(data: PayrollReportData): PayrollReportResult {
        const { item, companyName } = data;
        const { input, result } = item;

        const formatCurrency = (value: number) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        };

        const text = `
╔════════════════════════════════════════════════════════════════╗
║                    CONTRACHEQUE DE PAGAMENTO                    ║
║              ${(companyName || 'Empresa').padEnd(60)}║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║ FUNCIONÁRIO: ${input.employeeName?.padEnd(45) || ''}║
║ CARGO: ${'---'.padEnd(51)}║
║ REFERÊNCIA: ${input.referenceMonth?.toString().padStart(2, '0') || '--'}/${input.referenceYear || '----'}                                           ║
║                                                                 ║
╠════════════════════════════════════════════════════════════════╣
║ PROVENTOS                                                       ║
╠════════════════════════════════════════════════════════════════╣
║ Salário Base                      ${formatCurrency(input.baseSalary || 0).padStart(26)}║
${input.overtimeHours ? `║ Horas Extras (${input.overtimePercentage || 50}%)            ${formatCurrency(result.overtimeValue || 0).padStart(26)}║` : ''}
${input.nightHours ? `║ Adicional Noturno                 ${formatCurrency((result as any).nightValue || 0).padStart(26)}║` : ''}
${input.productionBonus ? `║ Bônus de Produção                 ${formatCurrency(input.productionBonus).padStart(26)}║` : ''}
╠════════════════════════════════════════════════════════════════╣
║ TOTAL DE PROVENTOS                ${formatCurrency((result as any).totalEarnings || result.grossSalary || 0).padStart(26)}║
╠════════════════════════════════════════════════════════════════╣
║ DESCONTOS                                                       ║
╠════════════════════════════════════════════════════════════════╣
║ INSS                              ${formatCurrency((result as any).inss || 0).padStart(26)}║
${(result as any).irrf ? `║ IRRF                              ${formatCurrency((result as any).irrf).padStart(26)}║` : ''}
${input.advancePayment ? `║ Adiantamento                      ${formatCurrency(input.advancePayment).padStart(26)}║` : ''}
╠════════════════════════════════════════════════════════════════╣
║ TOTAL DE DESCONTOS                ${formatCurrency((result as any).totalDeductions || 0).padStart(26)}║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║ LÍQUIDO A RECEBER                 ${formatCurrency((result as any).netSalary || 0).padStart(26)}║
║                                                                 ║
╠════════════════════════════════════════════════════════════════╣
║ FGTS DO MÊS: ${formatCurrency((result as any).fgts || 0).padStart(42)}║
║                                                                 ║
║ FORMA DE PAGAMENTO: ${(input.pixKey ? 'PIX' : 'Transferência').padEnd(38)}║
${input.pixKey ? `║ CHAVE PIX: ${input.pixKey.padEnd(47)}║` : ''}
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║ Data: ${new Date().toLocaleDateString('pt-BR').padEnd(54)}║
║                                                                 ║
║ _______________________________                                 ║
║ Assinatura do Empregador                                        ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
`.trim();

        return {
            success: true,
            format: 'text',
            textFormat: text
        };
    }

    private generateHtmlFormat(data: PayrollReportData): PayrollReportResult {
        // Placeholder for HTML generation
        // Could generate a full HTML payslip with CSS
        this.log('HTML format not yet implemented', 'warn');
        return this.generateTextFormat(data);
    }
}
