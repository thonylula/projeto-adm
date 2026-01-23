import type { InvoiceData, ExtractedData } from '../types';

/**
 * Extracts invoice data using the Gemini AI proxy.
 * @param base64 The base64 encoded image or PDF data.
 * @param mimeType The MIME type of the file.
 * @returns A promise that resolves to the extracted InvoiceData.
 */
export async function extractInvoiceData(base64: string, mimeType: string): Promise<InvoiceData> {
    const prompt = `
    Aga como um especialista em processamento de documentos fiscais brasileiros e capturas de tela do app "Preço da Hora".
    Analise a imagem fornecida e extraia os seguintes campos com precisão ABSOLUTA:
    1. Nome do destinatário (empresa ou pessoa que comprou).
    2. CNPJ do destinatário.
    3. Nome do emitente/estabelecimento (vendedor - Geralmente em letras grandes no topo ou em cada quadro de produto).
    4. Endereço completo do emitente (rua, número, bairro, cidade, estado - Procure por endereços completos nos cantos, rodapés ou cabeçalhos).
    5. Número da nota fiscal.
    6. Série da nota.
    7. Data de emissão.
    8. Valor total da nota.
    9. Lista de itens comprados, contendo: código, descrição, quantidade, unidade de medida (ex: KG, UN, PCT, LT), preço unitário e total do item.

    DICAS PARA "PREÇO DA HORA":
    - A QUANTIDADE e a UNIDADE DE MEDIDA são fundamentais. Procure por números seguidos de siglas como "KG", "UN", "PCT".
    - O NOME DO ESTABELECIMENTO e o ENDEREÇO costumam estar na parte superior de cada quadro de produto ou no cabeçalho da página. SE HOUVER VÁRIOS ESTABELECIMENTOS NA MESMA IMAGEM, IDENTIFIQUE CADA UM PARA SEU RESPECTIVO PRODUTO.

    Responda EXCLUSIVAMENTE em formato JSON seguindo esta estrutura:
    {
      "recipientName": "Nome extraído",
      "recipientCnpj": "00.000.000/0000-00",
      "issuerName": "NOME DO ESTABELECIMENTO ENCONTRADO",
      "issuerAddress": "ENDEREÇO COMPLETO ENCONTRADO",
      "invoiceNumber": "12345",
      "series": "1",
      "issueDate": "DD/MM/AAAA",
      "totalValue": 0.00,
      "items": [
        {
          "id": "1",
          "code": "CÓDIGO",
          "description": "Item 1",
          "quantity": 1.0,
          "unit": "KG/UN/PCT",
          "price": 10.00,
          "total": 10.00
        }
      ]
    }
    NUNCA deixe quantity ou unit vazios se houver qualquer indicação na imagem. Se não encontrar, use 1 para quantity e "UN" para unit como fallback.
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

/**
 * General text generation function for agents
 * @param prompt The user prompt
 * @param options Optional configuration
 * @returns The generated text response
 */
export async function generateText(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxOutputTokens?: number;
        systemInstruction?: string;
        responseMimeType?: string;
    }
): Promise<string> {
    try {
        const contents = [{
            role: 'user',
            parts: [{ text: prompt }]
        }];

        const requestBody: any = { contents };

        if (options?.systemInstruction) {
            requestBody.systemInstruction = {
                parts: [{ text: options.systemInstruction }]
            };
        }

        if (options?.temperature !== undefined || options?.responseMimeType) {
            requestBody.generationConfig = {
                temperature: options?.temperature ?? 0.7,
                maxOutputTokens: options?.maxOutputTokens || 8192,
                responseMimeType: options?.responseMimeType
            };
        }

        const response = await fetch('/api/generative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            const errorObj = payload.error;
            const errorMsg = typeof errorObj === 'object'
                ? (errorObj.message || errorObj.error?.message || JSON.stringify(errorObj))
                : (errorObj || 'Erro na API.');
            throw new Error(errorMsg);
        }

        const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Resposta vazia da IA');

        return text;
    } catch (error) {
        console.error('Erro ao gerar texto:', error);
        throw error;
    }
}

/**
 * Processes aquaculture transfer data from text or file.
 */
export async function processAquacultureData(input: string | File): Promise<ExtractedData[]> {
    let promptText = "";
    let base64 = "";
    let mimeType = "";

    if (typeof input === 'string') {
        promptText = input;
    } else {
        // Handle file conversion to base64
        base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(input);
        });
        mimeType = input.type;
    }

    const prompt = `
    Aga como um especialista em aquicultura. Analise o seguinte texto ou imagem contendo registros de transferência de camarão:
    "${promptText}"

    Extraia uma lista de objetos JSON para cada transferência encontrada, com os seguintes campos:
    - local: Nome do berçário/viveiro de origem (ex: BE-01, OC-P07).
    - estocagem: Quantidade total de PLs/camarões transferidos (número inteiro).
    - plPorGrama: PLs por grama ou peso unitário inverso (se houver, senão use 0).
    - densidade: Densidade mencionada (ex: "1.2 cam/m²"), se houver.
    - viveiroDestino: Nome do viveiro de destino (ex: OC-10, P05).
    - isParcial: true se for mencionado "Parcial", false se for "Total" ou não mencionado.
    - horario: Horário da transferência, se houver.
    - data: Data da transferência, se houver (DD/MM/AAAA).
    - pesoTotal: Peso total transferido em KG, se houver.
    - dataPovoamento: Data do povoamento mencionada, se houver (DD/MM/AAAA).

    Responda APENAS com o array JSON. Exemplo:
    [
      { "local": "BE-01", "estocagem": 150000, "plPorGrama": 450, "densidade": "1.2", "viveiroDestino": "OC-10", "isParcial": false, "dataPovoamento": "01/01/2026" }
    ]
  `;

    try {
        const contents: any[] = [{
            role: 'user',
            parts: [
                { text: prompt },
                ...(base64 ? [{ inlineData: { data: base64, mimeType } }] : [])
            ]
        }];

        const response = await fetch('/api/generative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'Erro na API Gemini');

        const text = payload.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('A IA não retornou resultados.');

        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error('Erro ao processar dados de aquicultura:', error);
        throw error;
    }
}

