import { BaseAgent } from '../base/BaseAgent';
import { ValidatedReceipt, GeneratedReceipt } from './ReceiptExtractionAgent';
import { SupabaseService } from '../../services/supabaseService';

/**
 * Receipt Generation Agent
 * Specializes in generating formatted receipts and saving to database
 */
export class ReceiptGenerationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ReceiptGenerationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em geração de recibos formatados no padrão brasileiro.

Sua expertise inclui:
- Formatação de recibos conforme normas ABNT
- Geração de texto claro e profissional
- Formatação de valores monetários por extenso
- Aplicação de logos e marcas
- Geração de vias (1ª e 2ª via)`,
            temperature: 0.2
        });
    }

    async process(data: {
        receipt: ValidatedReceipt;
        companyId: string;
        companyName?: string;
    }): Promise<GeneratedReceipt> {
        this.log('Starting receipt generation');
        this.validateInput(data, ['receipt', 'companyId']);

        try {
            const { receipt, companyId } = data;

            // Generate text format for clipboard
            const textFormat = this.generateTextFormat(receipt);

            // Create receipt object for storage
            const receiptItem = {
                id: crypto.randomUUID(),
                timestamp: new Date().toLocaleString('pt-BR'),
                rawDate: new Date().toISOString(),
                input: {
                    payeeName: receipt.payeeName,
                    payeeDocument: receipt.payeeDocument || '',
                    value: receipt.value,
                    date: new Date().toISOString().split('T')[0],
                    serviceDate: receipt.serviceDate,
                    serviceEndDate: receipt.serviceEndDate,
                    description: receipt.description,
                    paymentMethod: receipt.paymentMethod,
                    pixKey: receipt.pixKey || '',
                    bankInfo: receipt.bankInfo || '',
                    category: receipt.category || 'OUTROS'
                },
                result: {
                    valueInWords: receipt.valueInWords
                }
            };

            // Save to Supabase
            const saved = await SupabaseService.addReceiptItem(companyId, receiptItem);

            this.log(saved ? 'Receipt saved to database' : 'Failed to save receipt', saved ? 'info' : 'warn');

            return {
                id: receiptItem.id,
                receipt,
                textFormat,
                saved
            };
        } catch (error) {
            this.log(`Generation failed: ${error}`, 'error');
            throw error;
        }
    }

    private generateTextFormat(receipt: ValidatedReceipt): string {
        const formatCurrency = (value: number) => {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        };

        const formatDate = (dateStr: string) => {
            if (!dateStr) return '---';
            try {
                const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
                const [year, month, day] = datePart.split('-');
                if (!year || !month || !day) return dateStr;
                return `${day}/${month}/${year}`;
            } catch (e) {
                return dateStr;
            }
        };

        const period = receipt.serviceEndDate
            ? `${formatDate(receipt.serviceDate)} À ${formatDate(receipt.serviceEndDate)}`
            : formatDate(receipt.serviceDate);

        return `📄 RECIBO DE PAGAMENTO
----------------------------
👤 Beneficiário: ${receipt.payeeName}
💰 Valor: ${formatCurrency(receipt.value)}
📝 Referente a: ${receipt.description}
📅 Data/Período: ${period}
🔑 CHAVE PIX: ${receipt.pixKey || 'N/A'}
----------------------------`;
    }
}
