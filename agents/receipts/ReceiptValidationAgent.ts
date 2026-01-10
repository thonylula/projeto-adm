import { BaseAgent } from '../base/BaseAgent';
import { ReceiptData, ValidatedReceipt } from './ReceiptExtractionAgent';
import { numberToWordsBRL } from '../../utils';

/**
 * Receipt Validation Agent
 * Specializes in validating and enriching receipt data
 */
export class ReceiptValidationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'ReceiptValidationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em validação de documentos e dados financeiros brasileiros.

Sua expertise inclui:
- Validação de CPF e CNPJ (algoritmo de dígitos verificadores)
- Validação de chaves PIX (CPF, CNPJ, email, telefone, aleatória)
- Verificação de valores monetários
- Formatação de datas
- Detecção de inconsistências

Regras importantes:
- CPF deve ter 11 dígitos
- CNPJ deve ter 14 dígitos
- Valores devem ser positivos
- Chaves PIX devem seguir padrões válidos
- Datas devem estar em formato válido`,
            temperature: 0.1 // Muito baixa para validação precisa
        });
    }

    async process(data: ReceiptData): Promise<ValidatedReceipt> {
        this.log('Starting receipt validation');
        this.validateInput(data, ['payeeName', 'value']);

        try {
            const validations = {
                documentValid: this.validateDocument(data.payeeDocument),
                valueValid: this.validateValue(data.value),
                pixKeyValid: this.validatePixKey(data.pixKey)
            };

            // Convert value to words
            const valueInWords = numberToWordsBRL(data.value);

            const validated: ValidatedReceipt = {
                ...data,
                valueInWords,
                validations
            };

            this.log('Validation complete', validations.documentValid && validations.valueValid ? 'info' : 'warn');

            return validated;
        } catch (error) {
            this.log(`Validation failed: ${error}`, 'error');
            throw error;
        }
    }

    private validateDocument(doc?: string): boolean {
        if (!doc) return true; // Optional field

        const cleaned = doc.replace(/\D/g, '');

        if (cleaned.length === 11) {
            return this.validateCPF(cleaned);
        } else if (cleaned.length === 14) {
            return this.validateCNPJ(cleaned);
        }

        return false;
    }

    private validateCPF(cpf: string): boolean {
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf.charAt(i)) * (10 - i);
        }
        let remainder = 11 - (sum % 11);
        let digit1 = remainder >= 10 ? 0 : remainder;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf.charAt(i)) * (11 - i);
        }
        remainder = 11 - (sum % 11);
        let digit2 = remainder >= 10 ? 0 : remainder;

        return parseInt(cpf.charAt(9)) === digit1 && parseInt(cpf.charAt(10)) === digit2;
    }

    private validateCNPJ(cnpj: string): boolean {
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

        const calc = (numbers: string, weights: number[]): number => {
            const sum = numbers.split('').reduce((acc, num, idx) => {
                return acc + parseInt(num) * weights[idx];
            }, 0);
            const remainder = sum % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        };

        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        const digit1 = calc(cnpj.substring(0, 12), weights1);
        const digit2 = calc(cnpj.substring(0, 13), weights2);

        return parseInt(cnpj.charAt(12)) === digit1 && parseInt(cnpj.charAt(13)) === digit2;
    }

    private validateValue(value: number): boolean {
        return value > 0 && value < 1000000000; // Reasonable limits
    }

    private validatePixKey(pixKey?: string): boolean {
        if (!pixKey) return true; // Optional

        const cleaned = pixKey.replace(/\D/g, '');

        // CPF (11 digits)
        if (cleaned.length === 11) return this.validateCPF(cleaned);

        // CNPJ (14 digits)
        if (cleaned.length === 14) return this.validateCNPJ(cleaned);

        // Email
        if (pixKey.includes('@')) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
        }

        // Phone (10-11 digits)
        if (cleaned.length >= 10 && cleaned.length <= 11) {
            return true;
        }

        // Random key (UUID format)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pixKey)) {
            return true;
        }

        return false;
    }
}
