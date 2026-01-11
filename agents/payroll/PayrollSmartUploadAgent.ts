import { BaseAgent } from '../base/BaseAgent';
import { PayrollInput } from '../../types';

export interface SmartUploadResult {
    success: boolean;
    extractedData: Partial<PayrollInput>;
    confidence: number;
    fieldsFound: string[];
}

/**
 * Payroll Smart Upload Agent
 * Specializes in extracting payroll data from images and PDFs
 */
export class PayrollSmartUploadAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PayrollSmartUploadAgent',
            model: 'gemini-2.0-flash-exp',
            responseMimeType: 'application/json',
            systemPrompt: `Você é um especialista em extração de dados de contracheques e documentos trabalhistas brasileiros.

Sua expertise inclui:
- Reconhecimento óptico de caracteres (OCR) em contracheques
- Identificação de campos padrão (salário base, descontos, proventos)
- Extração de horas (normais, extras, noturnas)
- Identificação de benefícios (VT, VR, plano de saúde)
- Reconhecimento de padrões de diferentes empresas
- Extração de dados bancários e PIX

Campos principais a extrair:
- Nome do funcionário
- Salário base/bruto
- Horas extras e percentuais
- Adicional noturno
- Descontos (INSS, IRRF, VT, plano de saúde)
- Benefícios (VR, VA)
- Líquido a receber
- Dados bancários/PIX

IMPORTANTE:
- Retorne valores numéricos sem símbolos de moeda
- Converta datas para YYYY-MM-DD
- Identifique percentuais de horas extras (50%, 100%)
- Separe proventos de descontos

Retorne JSON estruturado com os dados extraídos.`,
            temperature: 0.3
        });
    }

    async process(data: { file: File | string }): Promise<SmartUploadResult> {
        this.log('Starting smart upload extraction');

        try {
            const prompt = `Analise este contracheque e extraia TODOS os dados possíveis.

Retorne um JSON com esta estrutura:
{
  "employeeName": "nome completo",
  "baseSalary": 0.00,
  "overtimeHours": 0,
  "overtimePercentage": 50,
  "nightHours": 0,
  "mealAllowance": 0,
  "transportAllowance": 0,
  "healthInsurance": 0,
  "inss": 0,
  "irrf": 0,
  "netSalary": 0,
  "admissionDate": "YYYY-MM-DD",
  "pixKey": "chave pix ou conta",
  "position": "cargo"
}

Se um campo não for encontrado, deixe como 0 ou string vazia.`;

            const response = await this.callLLM(prompt, data);
            const extracted = this.parseExtraction(response.content);

            const fieldsFound = Object.keys(extracted).filter(
                key => extracted[key] !== 0 && extracted[key] !== '' && extracted[key] !== null
            );

            const confidence = fieldsFound.length / 10; // 10 main fields

            this.log(`Extracted ${fieldsFound.length} fields with ${(confidence * 100).toFixed(0)}% confidence`);

            return {
                success: fieldsFound.length > 0,
                extractedData: extracted,
                confidence,
                fieldsFound
            };
        } catch (error) {
            this.log(`Smart upload failed: ${error}`, 'error');
            return {
                success: false,
                extractedData: {},
                confidence: 0,
                fieldsFound: []
            };
        }
    }

    private parseExtraction(content: string): Partial<PayrollInput> {
        try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const data = JSON.parse(jsonMatch[0]);

            // Convert string numbers to actual numbers
            const extracted: Partial<PayrollInput> = {
                employeeName: data.employeeName || '',
                baseSalary: parseFloat(data.baseSalary) || 0,
                overtimeHours: parseFloat(data.overtimeHours) || 0,
                overtimePercentage: (parseFloat(data.overtimePercentage) === 100 ? 100 : 50) as 50 | 100,
                nightHours: parseFloat(data.nightHours) || 0,
                costAllowance: (parseFloat(data.mealAllowance) || 0) + (parseFloat(data.transportAllowance) || 0),
                loanDiscountValue: parseFloat(data.advancePayment) || 0,
                pixKey: data.pixKey || '',
                bankName: data.bankName || '',
                calculationMode: 'MONTHLY' // Default
            };

            return extracted;
        } catch (error) {
            this.log(`Failed to parse extraction: ${error}`, 'error');
            return {};
        }
    }
}
