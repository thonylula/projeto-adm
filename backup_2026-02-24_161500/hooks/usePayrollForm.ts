import { useState, useEffect, useCallback } from 'react';
import { PayrollInput, Company } from '../types';
import { usePayrollCalculator } from './usePayrollCalculator';
import { usePayrollCalendar } from './usePayrollCalendar';
import { useShiftCalculator } from './useShiftCalculator';

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
    startDate: '',
    endDate: '',
    sundaysAmount: 0,
    workScale: 'STANDARD',
    shiftScheduleType: null,
    customDivisor: 220,
    calculateDsrOn12x36: true,
    workedOnHoliday: false,
    holidayHours: 12,
    shiftStartTime: '',
    shiftEndTime: '',
    shiftBreakStart: '',
    shiftBreakEnd: '',
    extendNightShift: false,
    baseSalary: 0,
    daysWorked: 30,
    costAllowance: 0,
    hasHazardPay: false,
    nightHours: 0,
    applyNightShiftReduction: true,
    nightShiftPercentage: 20,
    familyAllowance: 0,
    loanTotalValue: 0,
    loanDiscountValue: 0,
    loanTotalInstallments: 0,
    loanCurrentInstallment: 0,
    overtimeHours: 0,
    overtimePercentage: 50,
    overtimeHours2: 0,
    overtimePercentage2: 100,
    productionBonus: 0,
    visitsAmount: 0,
    visitUnitValue: 0,
    bankName: '',
    pixKey: '',
    terminationDate: '',
    terminationReason: 'DISMISSAL_NO_CAUSE',
    noticePeriodType: 'INDEMNIFIED',
    fgtsBalance: 0,
    admissionDate: '',
};

export const usePayrollForm = (activeCompany: Company, activeYear?: number | null, activeMonth?: number | null, editingId?: string | null) => {
    const [formState, setFormState] = useState<PayrollInput>({
        ...INITIAL_INPUT_STATE,
        companyName: activeCompany.name,
        companyLogo: activeCompany.logoUrl
    });

    const { calculateCalendarDays, countSundays } = usePayrollCalendar();
    const { calculateShiftStats } = useShiftCalculator();
    const { safeNum } = usePayrollCalculator();

    // Sync with active selection
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

    // Sync Calendar
    useEffect(() => {
        if (!editingId) {
            const { business, nonBusiness } = calculateCalendarDays(
                formState.referenceMonth,
                formState.referenceYear,
                formState.selectedState
            );
            setFormState(prev => ({
                ...prev,
                businessDays: business,
                nonBusinessDays: nonBusiness
            }));
        }
    }, [formState.referenceMonth, formState.referenceYear, formState.selectedState, editingId, calculateCalendarDays]);

    // Sync Sundays
    useEffect(() => {
        if (formState.startDate && formState.endDate && !editingId) {
            const sundays = countSundays(
                formState.startDate,
                formState.endDate,
                formState.workScale,
                formState.shiftScheduleType
            );
            setFormState(prev => ({ ...prev, sundaysAmount: sundays }));
        }
    }, [formState.startDate, formState.endDate, formState.workScale, formState.shiftScheduleType, editingId, countSundays]);

    // Sync Shift Stats
    useEffect(() => {
        if (!editingId && formState.shiftStartTime && formState.shiftEndTime) {
            const stats = calculateShiftStats(
                formState.shiftStartTime,
                formState.shiftEndTime,
                formState.shiftBreakStart,
                formState.shiftBreakEnd,
                formState.extendNightShift
            );

            if (stats) {
                const monthlyNightHours = stats.nightHours * formState.daysWorked;
                let dailyOvertime = 0;
                if (formState.workScale === 'STANDARD') {
                    dailyOvertime = Math.max(0, stats.totalHours - 8);
                }
                const monthlyOvertime = dailyOvertime * formState.daysWorked;

                setFormState(prev => ({
                    ...prev,
                    nightHours: parseFloat(monthlyNightHours.toFixed(2)),
                    overtimeHours: parseFloat(monthlyOvertime.toFixed(2))
                }));
            }
        }
    }, [formState.shiftStartTime, formState.shiftEndTime, formState.shiftBreakStart, formState.shiftBreakEnd, formState.extendNightShift, formState.daysWorked, formState.workScale, editingId, calculateShiftStats]);

    // 12x36 Automation
    useEffect(() => {
        if (formState.workScale === '12x36' && formState.shiftScheduleType && !editingId) {
            const daysInMonth = new Date(formState.referenceYear, formState.referenceMonth, 0).getDate();
            let count = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const isEven = d % 2 === 0;
                if (formState.shiftScheduleType === 'ODD' && !isEven) count++;
                else if (formState.shiftScheduleType === 'EVEN' && isEven) count++;
            }
            setFormState(prev => ({ ...prev, daysWorked: count }));
        }
    }, [formState.workScale, formState.shiftScheduleType, formState.referenceMonth, formState.referenceYear, editingId]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let newValue: string | number | boolean | null = value;

        if (type === 'checkbox') {
            newValue = (e.target as HTMLInputElement).checked;
        } else if (type === 'number' || [
            'overtimePercentage', 'overtimePercentage2', 'referenceMonth', 'referenceYear',
            'customDivisor', 'holidayHours', 'thirteenthMonths', 'fractionalMonthDays',
            'baseSalary', 'daysWorked', 'familyAllowance', 'costAllowance', 'productionBonus',
            'visitsAmount', 'visitUnitValue', 'loanTotalValue', 'loanDiscountValue',
            'loanTotalInstallments', 'loanCurrentInstallment', 'overtimeHours',
            'overtimeHours2', 'nightHours', 'nightShiftPercentage', 'sundaysAmount'
        ].includes(name)) {
            newValue = safeNum(value);
        }

        if (name === 'workScale') {
            if (value === '12x36') {
                setFormState(prev => ({ ...prev, workScale: '12x36', daysWorked: 15, customDivisor: 220, shiftScheduleType: null }));
            } else {
                setFormState(prev => ({ ...prev, workScale: 'STANDARD', daysWorked: 30, customDivisor: 220, shiftScheduleType: null }));
            }
            return;
        }

        setFormState(prev => {
            const updated = { ...prev, [name]: newValue };
            if (['referenceMonth', 'referenceYear', 'selectedState'].includes(name)) {
                const { business, nonBusiness } = calculateCalendarDays(updated.referenceMonth, updated.referenceYear, updated.selectedState);
                updated.businessDays = business;
                updated.nonBusinessDays = nonBusiness;
            }
            return updated;
        });
    }, [calculateCalendarDays, safeNum]);

    return { formState, setFormState, handleInputChange };
};
