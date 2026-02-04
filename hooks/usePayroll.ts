
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PayrollInput, PayrollResult, PayrollHistoryItem, Company, RegistryEmployee } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { PayrollService, safeNum } from '../services/payrollService';
import { getOrchestrator } from '../services/agentService';

const INITIAL_DETAILED_DAYS: Record<number, number> = {};
for (let i = 1; i <= 12; i++) INITIAL_DETAILED_DAYS[i] = 0;

const INITIAL_INPUT_STATE: Omit<PayrollInput, 'companyName' | 'companyLogo'> = {
    employeeName: '',
    calculationMode: 'MONTHLY',
    thirteenthDetailedDays: { ...INITIAL_DETAILED_DAYS },
    thirteenthCalculationType: 'CLT',
    referenceMonth: new Date().getMonth() + 1,
    referenceYear: new Date().getFullYear(),
    selectedState: 'SP',
    businessDays: 25,
    nonBusinessDays: 5,
    startDate: '', endDate: '', sundaysAmount: 0,
    workScale: 'STANDARD', shiftScheduleType: null, customDivisor: 220, calculateDsrOn12x36: true, workedOnHoliday: false, holidayHours: 12,
    shiftStartTime: '', shiftEndTime: '', shiftBreakStart: '', shiftBreakEnd: '', extendNightShift: false,
    baseSalary: 0, daysWorked: 30, costAllowance: 0, hasHazardPay: false, nightHours: 0, applyNightShiftReduction: true, nightShiftPercentage: 20,
    familyAllowance: 0, loanTotalValue: 0, loanDiscountValue: 0, loanTotalInstallments: 0, loanCurrentInstallment: 0,
    overtimeHours: 0, overtimePercentage: 50, overtimeHours2: 0, overtimePercentage2: 100,
    productionBonus: 0, visitsAmount: 0, visitUnitValue: 0, bankName: '', pixKey: '',
    terminationDate: '', terminationReason: 'DISMISSAL_NO_CAUSE', noticePeriodType: 'INDEMNIFIED', fgtsBalance: 0, admissionDate: '',
};

export function usePayroll(activeCompany: Company, activeYear?: number | null, activeMonth?: number | null) {
    const [formState, setFormState] = useState<PayrollInput>({
        ...INITIAL_INPUT_STATE,
        companyName: activeCompany.name,
        companyLogo: activeCompany.logoUrl
    });

    const [result, setResult] = useState<PayrollResult | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [registeredEmployees, setRegisteredEmployees] = useState<RegistryEmployee[]>([]);

    // Load registered employees
    useEffect(() => {
        SupabaseService.getEmployees().then(setRegisteredEmployees);
    }, []);

    // Sync basic company info
    useEffect(() => {
        if (!editingId) {
            setFormState(prev => ({
                ...prev,
                companyName: activeCompany.name,
                companyLogo: activeCompany.logoUrl,
                referenceYear: activeYear || prev.referenceYear,
                referenceMonth: activeMonth || prev.referenceMonth
            }));
        }
    }, [activeCompany, activeYear, activeMonth, editingId]);

    // Update calendar days
    useEffect(() => {
        const { business, nonBusiness } = PayrollService.calculateCalendarDays(formState.referenceMonth, formState.referenceYear, formState.selectedState);
        setFormState(prev => ({ ...prev, businessDays: business, nonBusinessDays: nonBusiness }));
    }, [formState.referenceMonth, formState.referenceYear, formState.selectedState]);

    // Auto-count sundays
    useEffect(() => {
        if (formState.startDate && formState.endDate && !editingId) {
            const sundays = PayrollService.countSundays(formState.startDate, formState.endDate, formState.workScale, formState.shiftScheduleType);
            setFormState(prev => ({ ...prev, sundaysAmount: sundays }));
        }
    }, [formState.startDate, formState.endDate, formState.workScale, formState.shiftScheduleType]);

    const handleInputChange = useCallback((name: string, value: any) => {
        setFormState(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'workScale') {
                newState.daysWorked = value === '12x36' ? 15 : 30;
                newState.shiftScheduleType = null;
            }
            return newState;
        });
    }, []);

    const calculate = useCallback(() => {
        const res = formState.calculationMode === 'TERMINATION'
            ? PayrollService.calculateTermination(formState)
            : PayrollService.performCalculation(formState);
        setResult(res);
        return res;
    }, [formState]);

    return {
        formState, setFormState, result, setResult, editingId, setEditingId, loading, setLoading,
        registeredEmployees, handleInputChange, calculate
    };
}
