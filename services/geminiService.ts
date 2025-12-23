import type { InvoiceData } from '../types';

/**
 * Extracts invoice data using the Gemini AI proxy.
 * @param base64 The base64 encoded image or PDF data.
 * @param mimeType The MIME type of the file.
 * @returns A promise that resolves to the extracted InvoiceData.
 */
export async function extractInvoiceData(base64: string, mimeType: string): Promise<InvoiceData> {
    const prompt = `
    Aga como um especialista em processamento de documentos fiscais brasileiros.
    Analise a nota fiscal fornecida e extraia os seguintes campos:
    1. Nome do destinatário (empresa ou pessoa que comprou).
    2. CNPJ do destinatário.
    3. Nome do emitente (vendedor).
    4. Endereço completo do emitente (rua, número, bairro, cidade, estado).
    5. Número da nota fiscal.
    6. Série da nota.
    7. Data de emissão.
    8. Valor total da nota.
    9. Lista de itens comprados, contendo: código, descrição, quantidade, unidade, preço unitário e total do item.

    Responda EXCLUSIVAMENTE em formato JSON seguindo esta estrutura:
    {
      "recipientName": "Nome extraído",
      "recipientCnpj": "00.000.000/0000-00",
      "issuerName": "Nome do vendedor",
      "issuerAddress": "Endereço completo do vendedor",
      "invoiceNumber": "12345",
      "series": "1",
      "issueDate": "DD/MM/AAAA",
      "totalValue": 0.00,
      "items": [
        {
          "id": "1",
          "code": "CÓDIGO",
          "description": "Item 1",
          "quantity": 1,
          "unit": "UN",
          "price": 10.00,
          "total": 10.00
        }
      ]
    }
    Se algum campo não for encontrado, deixe-o em branco ou use 0 para valores numéricos.
  `;

    try {
        const contents = [{
            role: 'user',
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        data: base64,
                        mimeType: mimeType
                    }
                }
            ]
        }];

        const response = await fetch('/api/generative', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents })
        });

        const payload = await response.json().catch(() => ({ ok: false, error: 'Resposta JSON inválida do servidor.' }));

        if (!response.ok || !payload.ok) {
            const errorObj = payload.error;
            const errorMsg = typeof errorObj === 'object'
                ? (errorObj.message || errorObj.error?.message || JSON.stringify(errorObj))
                : (errorObj || 'Erro desconhecido na API.');
            throw new Error(`Falha no processamento da IA: ${errorMsg}`);
        }

        const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('A IA retornou uma resposta vazia.');

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonStr) as InvoiceData;

        return result;
    } catch (error) {
        console.error('Erro ao extrair dados da nota fiscal:', error);
        throw error;
    }
}

/**
 * Generates 14 distinct motivational messages for employee pantry lists.
 * @param names The list of employee names.
 * @returns A promise that resolves to an array of 14 strings.
 */
export async function generateMotivationalMessages(names: string[]): Promise<string[]> {
    const prompt = `
    Gere 14 frases motivacionais curtas, inspiradoras e profissionais para serem colocadas em listas de entrega de cestas básicas. 
    As frases devem ser variadas e demonstrar gratidão pelo trabalho dos funcionários.
    Retorne apenas um array JSON de strings, sem blocos de código markdown.
    Exemplo: ["Frase 1", "Frase 2", ...]
  `;

    try {
        const contents = [{
            role: 'user',
            parts: [{ text: prompt }]
        }];

        const response = await fetch('/api/generative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok) {
            const errorObj = payload.error;
            const errorMsg = typeof errorObj === 'object'
                ? (errorObj.message || errorObj.error?.message || JSON.stringify(errorObj))
                : (errorObj || 'Falha ao gerar mensagens.');
            throw new Error(errorMsg);
        }

        const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Mensagens vazias.');

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.warn('Erro ao gerar mensagens motivacionais, usando padrão.', error);
        return names.map(() => "Sua dedicação é a força que impulsiona nosso sucesso. Obrigado!");
    }
}
