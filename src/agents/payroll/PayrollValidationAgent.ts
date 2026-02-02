import { BaseAgent } from '../base/BaseAgent';
import { PayrollInput } from '../../types';

export interface PayrollValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    validated: PayrollInput;
}

/**
 * Payroll Validation Agent
 * Specializes in validating payroll data against CLT rules
 */
export class PayrollValidationAgent extends BaseAgent {
    private readonly MIN_SALARY = 1412.00; // 2024 minimum wage
    private readonly MAX_OVERTIME_HOURS = 44; // Weekly limit = ~176 monthly
    private readonly MAX_NIGHT_HOURS = 176; // Full night shift month

    constructor() {
        super({
            name: 'PayrollValidationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em validação de folha de pagamento CLT.

Sua expertise inclui:
- Validação de salários (mínimo, teto, proporcionalidade)
- Limites legais de horas extras
- Validação de escalas de trabalho
- Verificação de compatibilidade de benefícios
- Detecção de inconsistências

Regras críticas:
- Salário mínimo vigente: R$ 1.412,00 (2024)
- Horas extras: máximo 2h/dia, 44h/semana
- Adicional noturno: 22h às 5h
- Escala 12x36: regras específicas de DSR
- FGTS: 8% sobre remuneração
- Vale-transporte: máximo 6% de desconto

Você deve ALERTAR sobre irregularidades mas não bloquear o processamento.`,
            temperature: 0.1
        });
    }

    async process(data: PayrollInput): Promise<PayrollValidationResult> {
        this.log('Starting payroll validation');

        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate employee name
        if (!data.employeeName || data.employeeName.trim().length < 3) {
            errors.push('Nome do funcionário deve ter pelo menos 3 caracteres');
        }

        // Validate base salary
        if (data.baseSalary < this.MIN_SALARY) {
            errors.push(`Salário base (R$ ${data.baseSalary.toFixed(2)}) está abaixo do mínimo legal (R$ ${this.MIN_SALARY.toFixed(2)})`);
        }

        if (data.baseSalary > 100000) {
            warnings.push(`Salário base muito alto (R$ ${data.baseSalary.toFixed(2)}). Verifique se está correto.`);
        }

        // Validate overtime hours
        const totalOvertime = (data.overtimeHours || 0) + (data.overtimeHours2 || 0);
        if (totalOvertime > this.MAX_OVERTIME_HOURS) {
            warnings.push(`Total de horas extras (${totalOvertime}h) excede limite recomendado de ${this.MAX_OVERTIME_HOURS}h/mês`);
        }

        // Validate night hours
        if ((data.nightHours || 0) > this.MAX_NIGHT_HOURS) {
            warnings.push(`Horas noturnas (${data.nightHours}h) excedem o máximo mensal de ${this.MAX_NIGHT_HOURS}h`);
        }

        // Validate absences
        if ((data.absences || 0) > 30) {
            errors.push('Faltas não podem exceder 30 dias no mês');
        }

        // Validate dates
        if (data.admissionDate) {
            const admission = new Date(data.admissionDate);
            const now = new Date();
            if (admission > now) {
                errors.push('Data de admissão não pode ser futura');
            }
        }

        // Validate PIX key if provided
        if (data.pixKey) {
            if (!this.validatePixKey(data.pixKey)) {
                warnings.push('Formato de chave PIX pode estar incorreto');
            }
        }

        // Validate calculation mode
        if (!['MONTHLY', 'THIRTEENTH'].includes(data.calculationMode)) {
            errors.push('Modo de cálculo inválido. Use MONTHLY ou THIRTEENTH');
        }

        const valid = errors.length === 0;

        if (!valid) {
            this.log(`Validation failed: ${errors.join(', ')}`, 'error');
        } else if (warnings.length > 0) {
            this.log(`Validation passed with warnings: ${warnings.join(', ')}`, 'warn');
        } else {
            this.log('Validation passed');
        }

        return {
            valid,
            errors,
            warnings,
            validated: data
        };
    }

    private validatePixKey(pixKey: string): boolean {
        if (!pixKey) return true;

        const cleaned = pixKey.replace(/\D/g, '');

        // CPF (11 digits)
        if (cleaned.length === 11) return true;

        // CNPJ (14 digits)
        if (cleaned.length === 14) return true;

        // Email
        if (pixKey.includes('@')) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey);
        }

        // Phone (10-11 digits)
        if (cleaned.length >= 10 && cleaned.length <= 11) return true;

        // Random key (UUID)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pixKey)) {
            return true;
        }

        return false;
    }
}
