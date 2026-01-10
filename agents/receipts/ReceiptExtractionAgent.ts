import { BaseAgent } from '../base/BaseAgent';

export interface ReceiptData {
    payeeName: string;
    payeeDocument?: string;
    value: number;
    date: string;
    serviceDate: string;
    serviceEndDate?: string;
    description: string;
    paymentMethod: string;
    pixKey?: string;
    bankInfo?: string;
    category?: string;
}

export interface ExtractedReceiptData {
    receipts: ReceiptData[];
    confidence: number;
    metadata?: {
        imageAnalyzed: boolean;
        recordsFound: number;
    };
}

export interface ValidatedReceipt extends ReceiptData {
    valueInWords: string;
    validations: {
        documentValid: boolean;
        valueValid: boolean;
        pixKeyValid: boolean;
    };
}

export interface GeneratedReceipt {
    id: string;
    receipt: ValidatedReceipt;
    pdfUrl?: string;
    pngUrl?: string;
    textFormat: string;
    saved: boolean;
}

/**
 * Receipt Extraction Agent
 * Specializes in extracting receipt data from images/PDFs using AI
 */
export class ReceiptExtractionAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ReceiptExtractionAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em extração de dados de recibos e comprovantes de pagamento.

Sua expertise inclui:
- Reconhecimento óptico de caracteres (OCR) em imagens
- Extração de múltiplos recibos de uma única imagem/tabela
- Identificação de CPF/CNPJ, valores monetários, datas
- Detecção de chaves PIX e dados bancários
- Interpretação de diferentes formatos de recibos

IMPORTANTE:
- Se encontrar uma tabela com múltiplas pessoas, extraia TODAS
- Converta datas para formato YYYY-MM-DD
- Remova símbolos de moeda dos valores
- Identifique o método de pagamento (PIX, DINHEIRO, TRANSFERÊNCIA, CHEQUE)
- Se dados estiverem no cabeçalho e forem únicos para todos, replique-os

Retorne SEMPRE um JSON com este formato:
{
  "records": [
    {
      "payeeName": "nome completo",
      "payeeDocument": "CPF ou CNPJ (apenas números)",
      "value": 123.45,
      "date": "YYYY-MM-DD",
      "description": "descrição do pagamento",
      "paymentMethod": "PIX",
      "pixKey": "chave pix se encontrada"
    }
  ]
}`,
            temperature: 0.3 // Baixa temperatura para extração precisa
        });
    }

    async process(data: { image: File | string }): Promise<ExtractedReceiptData> {
        this.log('Starting receipt extraction');
        this.validateInput(data, ['image']);

        try {
            // Build prompt for extraction
            const prompt = `Analise este comprovante/recibo ou lista de pagamentos e extraia os dados de TODOS os registros encontrados.

Se for uma tabela com várias pessoas, extraia todas.
Se a data estiver no cabeçalho e for única para todos, use-a para todos os registros.`;

            const response = await this.callLLM(prompt, data);

            // Parse JSON response
            const parsed = this.parseExtractionResponse(response.content);

            this.log(`Extracted ${parsed.receipts.length} receipt(s)`);

            // Handoff to validation agent
            return parsed;
        } catch (error) {
            this.log(`Extraction failed: ${error}`, 'error');
            throw error;
        }
    }

    private parseExtractionResponse(content: string): ExtractedReceiptData {
        try {
            this.log(`AI Raw Content Length: ${content.length}`);

            // 1. Clean markdown code blocks if present
            let cleaned = content;
            if (content.includes('```')) {
                const match = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) {
                    cleaned = match[1];
                }
            }

            const jsonStr = this.safeExtractJson(cleaned);
            this.log(`Extracted JSON (first 50 chars): ${jsonStr.substring(0, 50)}...`);

            let data;
            try {
                data = JSON.parse(jsonStr);
            } catch (parseError) {
                this.log(`JSON.parse failed on: ${jsonStr.substring(0, 100)}...`, 'error');
                throw parseError;
            }

            if (!data.records || !Array.isArray(data.records)) {
                throw new Error('Invalid response format: missing records array');
            }

            const receipts: ReceiptData[] = data.records.map((rec: any) => ({
                payeeName: rec.payeeName || '',
                payeeDocument: String(rec.payeeDocument || '').replace(/\D/g, ''),
                value: typeof rec.value === 'number' ? rec.value : parseFloat(String(rec.value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0,
                date: rec.date || new Date().toISOString().split('T')[0],
                serviceDate: rec.date || new Date().toISOString().split('T')[0],
                description: rec.description || '',
                paymentMethod: rec.paymentMethod || 'PIX',
                pixKey: rec.pixKey || '',
                bankInfo: '',
                category: 'OUTROS'
            }));

            return {
                receipts,
                confidence: 0.9,
                metadata: {
                    imageAnalyzed: true,
                    recordsFound: receipts.length
                }
            };
        } catch (error) {
            this.log(`Failed to parse extraction response: ${error}`, 'error');
            // Try to return a partial result if possible, or rethrow
            throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Extracts JSON from string by finding the first '{' and its matching '}'
     * Handles extra text and multiple JSON blocks by isolating the first complete object.
     */
    private safeExtractJson(content: string): string {
        const firstBrace = content.indexOf('{');
        if (firstBrace === -1) throw new Error('No opening brace found');

        let braceCount = 0;
        let lastBrace = -1;

        for (let i = firstBrace; i < content.length; i++) {
            if (content[i] === '{') braceCount++;
            else if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    lastBrace = i;
                    break;
                }
            }
        }

        if (lastBrace === -1) {
            // Fallback: try to find the very last brace if counting failed
            const finalBrace = content.lastIndexOf('}');
            if (finalBrace > firstBrace) {
                return content.substring(firstBrace, finalBrace + 1);
            }
            throw new Error('No matching closing brace found');
        }

        return content.substring(firstBrace, lastBrace + 1);
    }
}
