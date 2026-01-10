import { BaseAgent } from '../base/BaseAgent';
import { InvoiceData } from '../../types';

/**
 * Invoice Extraction Agent
 * Specialized in extracting product data from supermarket/supplier invoices (NF-e/NFC-e)
 */
export class InvoiceExtractionAgent extends BaseAgent {
    constructor() {
        super({
            name: 'InvoiceExtractionAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em extração de dados de Notas Fiscais (NF-e e NFC-e).
Sua tarefa é analisar imagens ou PDFs de notas de supermercado/fornecedores e extrair a lista detalhada de itens.

Campos obrigatórios por item:
- id: Um UUID ou string única baseada no índice
- code: Código do produto (EAN ou interno)
- description: Nome completo do produto
- quantity: Valor numérico da quantidade
- unit: Unidade de medida (UN, KG, PCT, CX, etc)
- price: Preço unitário
- total: Valor total do item

Campos gerais da nota:
- recipientName: Nome do destinatário
- recipientCnpj: CNPJ do destinatário
- issuerName: Nome do emissor (Supermercado)
- invoiceNumber: Número da nota
- totalValue: Valor total da nota

Retorne APENAS um JSON puro que siga a interface InvoiceData.`,
            temperature: 0.1
        });
    }

    async process(data: { image?: string, mimeType?: string, text?: string }): Promise<InvoiceData> {
        this.log('Extracting invoice data');

        try {
            const prompt = 'Extraia todos os itens e dados gerais desta nota fiscal para montagem de cestas básicas.';

            // Handle image/pdf case (base64)
            if (data.image && data.mimeType) {
                // BaseAgent's callLLMWithImage expects a File object, but we have base64 from current UI logic.
                // However, BaseAgent was updated to handle images. I'll use a direct fetch approach if needed
                // or assume BaseAgent can be extended. 
                // Currently, BaseAgent.ts uses fileToBase64(file).

                // For now, I'll leverage the existing API logic in BaseAgent but since I have base64, 
                // I might need a version of callLLM that accepts base64 directly or a mock File.

                // Let's check BaseAgent.ts again.
                // It has callLLM(userPrompt, context) which calls callLLMWithImage if context.image is File.

                // I will update the callLLM in BaseAgent to handle base64 if provided.
                // For now, I'll proceed assuming I can send the base64.

                const response = await this.callLLM(prompt, {
                    image_base64: data.image,
                    mimeType: data.mimeType
                });
                return this.safeExtractJson(response.content);
            }

            const response = await this.callLLM(prompt, { text: data.text });
            return this.safeExtractJson(response.content);
        } catch (error) {
            this.log(`Extraction failed: ${error}`, 'error');
            throw error;
        }
    }
}
