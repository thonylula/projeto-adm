import { BaseAgent } from '../base/BaseAgent';

export interface BiometryRawData {
    viveiro: string;
    dataPovoamento?: string;
    diasCultivo?: number;
    pMedStr?: string;
    quat?: number;
    pAntStr?: string;
}

export interface BiometryExtractionResult {
    data: BiometryRawData[];
    confidence: number;
    notes?: string;
}

/**
 * Biometry Data Agent
 * Specializes in extracting biometry data from images or text inputs
 */
export class BiometryDataAgent extends BaseAgent {
    constructor() {
        super({
            name: 'BiometryDataAgent',
            model: 'gemini-2.0-flash-exp',
            responseMimeType: 'application/json',
            systemPrompt: `Você é um especialista em transcrição de dados de planilhas e anotações de campo de carcinicultura (criação de camarão).
            
Sua tarefa é extrair tabelas de biometria de imagens ou texto com precisão absoluta.

Campos esperados:
- viveiro: Identificador do viveiro (ex: OC-01, BE-02, VP-05)
- dataPovoamento: Data no formato DD/MM/AAAA ou ISO
- diasCultivo (DOC): Número de dias desde o povoamento
- pMedStr (PM): Peso médio atual em gramas (ex: 5,25)
- quat: Quantidade ou densidade se disponível
- pAntStr: Peso médio anterior para comparação

Orientações:
1. Transcreva cada linha da tabela sem pular nenhuma.
2. Normalize os nomes dos viveiros (ex: OS 005 -> OC-005).
3. Se um valor não estiver claro, extraia o que for possível.
4. Retorne APENAS um JSON puro no formato especificado.`,
            temperature: 0.2
        });
    }

    async process(data: { image?: File, text?: string }): Promise<BiometryExtractionResult> {
        this.log('Extracting biometry data');

        try {
            const prompt = 'Extraia todos os dados da biometria desta imagem/texto.';
            const context = data.image ? { image: data.image } : { text: data.text };

            const response = await this.callLLM(prompt, context);
            const extracted = this.safeExtractJson(response.content);

            return {
                data: Array.isArray(extracted) ? extracted : (extracted.data || []),
                confidence: 0.9, // Simplified
                notes: extracted.notes
            };
        } catch (error) {
            this.log(`Extraction failed: ${error}`, 'error');
            throw error;
        }
    }
}
