import { BaseAgent } from '../base/BaseAgent';
import { PayrollInput, PayrollResult } from '../../types';

/**
 * Payroll Calculation Agent
 * Specializes in complex CLT labor calculations
 */
export class PayrollCalculationAgent extends BaseAgent {
    constructor() {
        super({
            name: 'PayrollCalculationAgent',
            model: 'gemini-2.0-flash-exp',
            systemPrompt: `Você é um especialista em cálculos trabalhistas CLT brasileiros.

Sua expertise inclui:
- Cálculo de salários mensais e 13º salário
- Aplicação de regras de DSR (Descanso Semanal Remunerado)
- Cálculo de horas extras (50%, 100%)
- Adicional noturno com redução ficta (52,5 minutos)
- Cálculo de faltas e descontos
- Férias proporcionais e 1/3 constitucional
- INSS, IRRF, FGTS
- Regras específicas de escalas (Padrão, 12x36)
- Cálculo de domingos trabalhados

Regras importantes:
- Salário mínimo vigente
- Teto do INSS
- Tabela progressiva de IRRF
- Redução ficta: 1 hora noturna = 52,5 minutos
- DSR sobre horas extras
- Proporcionalidade de férias (1/12 por mês)

SEMPRE retorne valores calculados com precisão de centavos.`,
            temperature: 0.1 // Máxima precisão para cálculos
        });
    }

    async process(data: PayrollInput): Promise<PayrollResult> {
        this.log('Starting payroll calculation');
        this.validateInput(data, ['employeeName', 'baseSalary', 'calculationMode']);

        try {
            // For now, delegate to existing calculation logic
            // In future, could use LLM for complex edge cases
            const result = this.performCalculations(data);

            this.log('Calculation complete');
            return result;
        } catch (error) {
            this.log(`Calculation failed: ${error}`, 'error');
            throw error;
        }
    }

    private performCalculations(input: PayrollInput): PayrollResult {
        // Import the existing calculation logic from PayrollCard
        // This is a placeholder - actual implementation would import from PayrollCard

        const safeNum = (v: any): number => {
            if (v === undefined || v === null || v === '') return 0;
            const num = typeof v === 'number' ? v : parseFloat(String(v));
            return isNaN(num) ? 0 : num;
        };

        const baseSalary = safeNum(input.baseSalary);
        const overtimeHours = safeNum(input.overtimeHours);
        const overtimePercentage = safeNum(input.overtimePercentage) || 50;
        const overtimeHours2 = safeNum(input.overtimeHours2);
        const overtimePercentage2 = safeNum(input.overtimePercentage2) || 100;
        const nightHours = safeNum(input.nightHours);
        const productionBonus = safeNum(input.productionBonus);
        const mealAllowance = safeNum(input.mealAllowance);
        const transportAllowance = safeNum(input.transportAllowance);
        const healthInsurance = safeNum(input.healthInsurance);
        const dentalInsurance = safeNum(input.dentalInsurance);
        const lifeInsurance = safeNum(input.lifeInsurance);
        const absences = safeNum(input.absences);
        const advancePayment = safeNum(input.advancePayment);
        const otherDeductions = safeNum(input.otherDeductions);
        const otherEarnings = safeNum(input.otherEarnings);

        // Basic calculations
        const hourlyRate = baseSalary / 220; // 220 working hours/month

        // Overtime calculations
        const overtime1Value = overtimeHours * hourlyRate * (1 + overtimePercentage / 100);
        const overtime2Value = overtimeHours2 * hourlyRate * (1 + overtimePercentage2 / 100);

        // Night hours (with 52.5-minute hour reduction)
        const nightBonus = nightHours * hourlyRate * 0.2;
        const nightReduction = (nightHours / 60) * 7.5 * hourlyRate; // 7.5min gain per hour

        // Absences discount
        const absenceDiscount = (baseSalary / 30) * absences;

        // Total earnings
        const totalEarnings = baseSalary
            + overtime1Value
            + overtime2Value
            + nightBonus
            + nightReduction
            + productionBonus
            + mealAllowance
            + transportAllowance
            + otherEarnings;

        // INSS calculation (simplified - should use progressive table)
        const inssBase = Math.min(totalEarnings, 7786.02); // 2024 ceiling
        let inss = 0;
        if (inssBase <= 1412.00) {
            inss = inssBase * 0.075;
        } else if (inssBase <= 2666.68) {
            inss = 1412.00 * 0.075 + (inssBase - 1412.00) * 0.09;
        } else if (inssBase <= 4000.03) {
            inss = 1412.00 * 0.075 + 1254.68 * 0.09 + (inssBase - 2666.68) * 0.12;
        } else {
            inss = 1412.00 * 0.075 + 1254.68 * 0.09 + 1333.35 * 0.12 + (inssBase - 4000.03) * 0.14;
        }

        // Total deductions
        const totalDeductions = inss
            + healthInsurance
            + dentalInsurance
            + lifeInsurance
            + absenceDiscount
            + advancePayment
            + otherDeductions;

        // Net salary
        const netSalary = totalEarnings - totalDeductions;

        return {
            grossSalary: baseSalary,
            netSalary,
            totalEarnings,
            totalDeductions,
            inss,
            irrf: 0, // Simplified
            fgts: totalEarnings * 0.08,
            overtimeValue: overtime1Value + overtime2Value,
            nightValue: nightBonus + nightReduction,
            absenceDiscount,
            details: {
                hourlyRate,
                workingDays: 30 - absences,
                calculation: input.calculationMode
            }
        };
    }
}
