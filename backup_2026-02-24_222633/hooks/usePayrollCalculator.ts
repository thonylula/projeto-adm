import { useState, useCallback, useMemo } from 'react';
import { PayrollInput, PayrollResult } from '../types';

const safeNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'string') {
        let clean = v.replace(/\s/g, '');
        if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
        } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
        }
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
    }
    return 0;
};

export const usePayrollCalculator = () => {
    const performCalculation = useCallback((input: PayrollInput): PayrollResult => {
        const baseSalary = safeNum(input.baseSalary);
        const daysWorked = safeNum(input.daysWorked);
        const overtimeHours = safeNum(input.overtimeHours);
        const overtimeHours2 = safeNum(input.overtimeHours2);
        const nightHours = safeNum(input.nightHours);
        const productionBonus = safeNum(input.productionBonus);
        const visitsAmount = safeNum(input.visitsAmount);
        const visitUnitValue = safeNum(input.visitUnitValue);
        const familyAllowance = safeNum(input.familyAllowance);
        const costAllowance = safeNum(input.costAllowance);
        const loanTotalValue = safeNum(input.loanTotalValue);
        const loanTotalInstallments = safeNum(input.loanTotalInstallments);
        const loanDiscountValue = safeNum(input.loanDiscountValue);
        const businessDays = safeNum(input.businessDays);
        const nonBusinessDays = safeNum(input.nonBusinessDays);

        let calculatedLoanDiscount = loanDiscountValue;
        if (loanTotalValue > 0 && loanTotalInstallments > 0) {
            calculatedLoanDiscount = loanTotalValue / loanTotalInstallments;
        }
        if (isNaN(calculatedLoanDiscount)) calculatedLoanDiscount = 0;

        const COMMERCIAL_MONTH_DAYS = 30;
        const NIGHT_HOUR_REDUCTION_FACTOR = input.applyNightShiftReduction ? 1.14285714 : 1;

        let divisor = 220;
        if (input.workScale === '12x36') {
            divisor = safeNum(input.customDivisor) > 0 ? safeNum(input.customDivisor) : 220;
        }

        const safeBusinessDays = businessDays > 0 ? businessDays : 1;
        let dsrFactor = nonBusinessDays / safeBusinessDays;
        if (input.workScale === '12x36' && !input.calculateDsrOn12x36) {
            dsrFactor = 0;
        }
        if (isNaN(dsrFactor)) dsrFactor = 0;

        let proportionalSalary = 0;
        const baseDays = input.calculationMode === '13TH' ? 30 : daysWorked;

        if (input.workScale === '12x36') {
            const activeDays = input.calculationMode === '13TH' ? 15 : daysWorked;
            proportionalSalary = (baseSalary / 15) * activeDays;
        } else {
            const days = baseDays > 30 ? 30 : (baseDays < 0 ? 0 : baseDays);
            proportionalSalary = (baseSalary / COMMERCIAL_MONTH_DAYS) * days;
        }

        const hourlyRate = baseSalary / divisor;
        const hazardPayValue = input.hasHazardPay ? proportionalSalary * 0.30 : 0;

        const nightShiftPercentageDecimal = safeNum(input.nightShiftPercentage) / 100;
        const effectiveNightHours = nightHours * NIGHT_HOUR_REDUCTION_FACTOR;
        const nightRate = hourlyRate * nightShiftPercentageDecimal;
        const nightShiftValue = nightRate * effectiveNightHours;
        const dsrNightShiftValue = nightShiftValue * dsrFactor;

        const overtimeMultiplier1 = 1 + (safeNum(input.overtimePercentage) / 100);
        const overtimeRate1 = hourlyRate * overtimeMultiplier1;
        const overtimeValue1 = overtimeRate1 * overtimeHours;

        const overtimeMultiplier2 = 1 + (safeNum(input.overtimePercentage2) / 100);
        const overtimeRate2 = hourlyRate * overtimeMultiplier2;
        const overtimeValue2 = overtimeRate2 * overtimeHours2;

        let totalOvertimeValue = overtimeValue1 + overtimeValue2;

        let sundayBonusValue = 0;
        if (safeNum(input.sundaysAmount) > 0) {
            const dailyHours = input.workScale === '12x36' ? 12 : 8;
            const sundayRate = hourlyRate * 1.5;
            const sundayHoursTotal = dailyHours * safeNum(input.sundaysAmount);
            sundayBonusValue = sundayRate * sundayHoursTotal;
            totalOvertimeValue += sundayBonusValue;
        }

        let holidayValue = 0;
        if (input.workScale === '12x36' && input.workedOnHoliday) {
            const holidayRate = hourlyRate * 2;
            holidayValue = holidayRate * safeNum(input.holidayHours);
            totalOvertimeValue += holidayValue;
        }

        const dsrOvertimeValue = totalOvertimeValue * dsrFactor;
        const visitsTotalValue = visitsAmount * visitUnitValue;
        const totalProductionBase = visitsTotalValue + productionBonus;

        let grossSalary =
            (proportionalSalary || 0) +
            (hazardPayValue || 0) +
            (nightShiftValue || 0) +
            (dsrNightShiftValue || 0) +
            (totalOvertimeValue || 0) +
            (dsrOvertimeValue || 0) +
            (totalProductionBase || 0) +
            (costAllowance || 0) +
            (familyAllowance || 0);

        grossSalary = (grossSalary || 0) - (calculatedLoanDiscount || 0);
        if (isNaN(grossSalary)) grossSalary = 0;

        let thirteenthTotalAvos = 0;
        let thirteenthTotalDays = 0;

        if (input.calculationMode === '13TH') {
            const detailedDays = input.thirteenthDetailedDays || {};
            const remunerationFor13th = grossSalary - input.costAllowance;

            if (input.thirteenthCalculationType === 'CLT') {
                let detailedAvos = 0;
                Object.values(detailedDays).forEach(days => {
                    if (days >= 15) detailedAvos++;
                });
                thirteenthTotalAvos = detailedAvos;
                grossSalary = (remunerationFor13th / 12) * thirteenthTotalAvos;
            } else {
                let totalDays = 0;
                Object.values(detailedDays).forEach(days => {
                    totalDays += (days || 0);
                });
                thirteenthTotalDays = totalDays;
                grossSalary = (remunerationFor13th / 360) * totalDays;
            }
        }

        return {
            proportionalSalary, hourlyRate, hazardPayValue, effectiveNightHours, nightShiftValue,
            dsrNightShiftValue, overtimeValue: totalOvertimeValue, overtime1Value: overtimeValue1,
            overtime2Value: overtimeValue2, holidayValue, dsrOvertimeValue, sundayBonusValue,
            visitsTotalValue, grossSalary, thirteenthTotalAvos, thirteenthTotalDays,
            loanDiscountValue: calculatedLoanDiscount
        };
    }, []);

    const calculateTermination = useCallback((input: PayrollInput): PayrollResult => {
        const baseSalary = safeNum(input.baseSalary);
        const admission = input.admissionDate ? new Date(input.admissionDate + 'T00:00:00') : null;
        const termination = input.terminationDate ? new Date(input.terminationDate + 'T00:00:00') : null;

        if (!admission || !termination || termination < admission) {
            return { proportionalSalary: 0, hourlyRate: 0, hazardPayValue: 0, effectiveNightHours: 0, nightShiftValue: 0, dsrNightShiftValue: 0, overtimeValue: 0, overtime1Value: 0, overtime2Value: 0, holidayValue: 0, dsrOvertimeValue: 0, sundayBonusValue: 0, visitsTotalValue: 0, grossSalary: 0, loanDiscountValue: 0 };
        }

        const nightShiftPercentageDecimal = safeNum(input.nightShiftPercentage) / 100;
        const NIGHT_HOUR_REDUCTION_FACTOR = input.applyNightShiftReduction ? 1.14285714 : 1;
        const divisor = input.customDivisor > 0 ? input.customDivisor : 220;
        const hourlyRate = baseSalary / divisor;

        const nightValue = (input.nightHours * NIGHT_HOUR_REDUCTION_FACTOR) * (hourlyRate * nightShiftPercentageDecimal);
        const overtimeMultiplier1 = 1 + (safeNum(input.overtimePercentage) / 100);
        const overtimeValue1 = (hourlyRate * overtimeMultiplier1) * safeNum(input.overtimeHours);
        const overtimeMultiplier2 = 1 + (safeNum(input.overtimePercentage2) / 100);
        const overtimeValue2 = (hourlyRate * overtimeMultiplier2) * safeNum(input.overtimeHours2);
        const totalOvertimeValue = overtimeValue1 + overtimeValue2;

        const businessDays = safeNum(input.businessDays) || 25;
        const nonBusinessDays = safeNum(input.nonBusinessDays) || 5;
        const dsrFactor = nonBusinessDays / businessDays;

        const dsrNightValue = nightValue * dsrFactor;
        const dsrOvertimeValue = totalOvertimeValue * dsrFactor;
        const hazardPayValue = input.hasHazardPay ? (baseSalary / 30 * termination.getDate()) * 0.30 : 0;
        const visitsTotalValue = safeNum(input.visitsAmount) * safeNum(input.visitUnitValue);
        const productionBonus = safeNum(input.productionBonus);

        const daysInMonth = termination.getDate();
        const salaryBalance = (baseSalary / 30) * daysInMonth;

        const monthOfTermination = termination.getMonth() + 1;
        const yearsOfService = termination.getFullYear() - admission.getFullYear();
        let thirteenthAvos = 0;
        if (termination.getFullYear() > admission.getFullYear()) {
            thirteenthAvos = monthOfTermination - (termination.getDate() >= 15 ? 0 : 1);
        } else {
            thirteenthAvos = (monthOfTermination - (admission.getMonth() + 1)) + (termination.getDate() >= 15 ? 1 : 0);
        }
        thirteenthAvos = Math.max(0, Math.min(12, thirteenthAvos));
        const thirteenthProp = (baseSalary / 12) * thirteenthAvos;

        const diffTime = termination.getTime() - admission.getTime();
        const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
        const vacationAvos = diffMonths % 12;
        const vacationProp = (baseSalary / 12) * vacationAvos;
        const vacationOneThird = vacationProp / 3;

        let noticePeriodValue = 0;
        if (input.noticePeriodType === 'INDEMNIFIED' && input.terminationReason !== 'RESIGNATION' && input.terminationReason !== 'DISMISSAL_CAUSE') {
            const extraDays = Math.min(60, Math.floor(yearsOfService) * 3);
            const totalDays = 30 + extraDays;
            noticePeriodValue = (baseSalary / 30) * totalDays;
        }

        let fgtsFine = 0;
        if (input.terminationReason === 'DISMISSAL_NO_CAUSE') {
            fgtsFine = safeNum(input.fgtsBalance) * 0.40;
        } else if (input.terminationReason === 'AGREEMENT') {
            fgtsFine = safeNum(input.fgtsBalance) * 0.20;
        }

        let grossSalary = salaryBalance + thirteenthProp + vacationProp + vacationOneThird + noticePeriodValue + fgtsFine +
            nightValue + dsrNightValue + totalOvertimeValue + dsrOvertimeValue + hazardPayValue +
            visitsTotalValue + productionBonus + safeNum(input.familyAllowance) + safeNum(input.costAllowance);

        if (input.terminationReason === 'RESIGNATION') {
            grossSalary = salaryBalance + thirteenthProp + vacationProp + vacationOneThird +
                nightValue + dsrNightValue + totalOvertimeValue + dsrOvertimeValue + hazardPayValue +
                visitsTotalValue + productionBonus + safeNum(input.familyAllowance) + safeNum(input.costAllowance);
        } else if (input.terminationReason === 'DISMISSAL_CAUSE') {
            grossSalary = salaryBalance +
                nightValue + dsrNightValue + totalOvertimeValue + dsrOvertimeValue + hazardPayValue +
                visitsTotalValue + productionBonus + safeNum(input.familyAllowance) + safeNum(input.costAllowance);
        }

        return {
            proportionalSalary: salaryBalance,
            hourlyRate,
            hazardPayValue,
            effectiveNightHours: input.nightHours * NIGHT_HOUR_REDUCTION_FACTOR,
            nightShiftValue: nightValue,
            dsrNightShiftValue: dsrNightValue,
            overtimeValue: totalOvertimeValue,
            overtime1Value: overtimeValue1,
            overtime2Value: overtimeValue2,
            holidayValue: 0,
            dsrOvertimeValue: dsrOvertimeValue,
            sundayBonusValue: 0,
            visitsTotalValue,
            grossSalary,
            loanDiscountValue: safeNum(input.loanDiscountValue),
            terminationSalaryBalance: salaryBalance,
            terminationThirteenthProp: thirteenthProp,
            terminationVacationProp: vacationProp,
            terminationVacationOneThird: vacationOneThird,
            terminationNoticePeriod: noticePeriodValue,
            terminationFgtsFine: fgtsFine
        };
    }, []);

    return { performCalculation, calculateTermination, safeNum };
};
