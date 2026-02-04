
import { PayrollInput, PayrollResult } from '../types';

export const FIXED_HOLIDAYS = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
];

export const STATE_HOLIDAYS: Record<string, string[]> = {
    'AC': ['01-23', '03-08', '06-15', '08-06', '09-05', '11-17'],
    'AL': ['06-24', '09-16'],
    'AP': ['03-19', '09-13', '10-05'],
    'AM': ['09-05'],
    'BA': ['07-02'],
    'CE': ['03-19', '03-25'],
    'DF': ['11-30'],
    'ES': [], 'GO': [],
    'MA': ['07-28'], 'MT': ['11-20'], 'MS': ['10-11'], 'MG': [],
    'PA': ['08-15'], 'PB': ['08-05'], 'PR': ['12-19'], 'PE': ['03-06', '06-24'],
    'PI': ['10-19'], 'RJ': ['04-23'], 'RN': ['10-03'], 'RS': ['09-20'],
    'RO': ['01-04', '06-18'], 'RR': ['10-05'], 'SC': ['08-11'], 'SP': ['07-09'],
    'SE': ['07-08'], 'TO': ['03-18', '09-08', '10-05'],
};

export const safeNum = (v: any): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    if (typeof v === 'string') {
        let clean = v.replace(/\s/g, '');
        if (clean.includes(',') && clean.includes('.')) clean = clean.replace(/\./g, '').replace(',', '.');
        else if (clean.includes(',')) clean = clean.replace(',', '.');
        const n = parseFloat(clean);
        return isNaN(n) ? 0 : n;
    }
    return 0;
};

export const PayrollService = {
    getEasterDate: (year: number): Date => {
        const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
        const month = Math.floor((h + l - 7 * m + 114) / 31) - 1, day = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(year, month, day);
    },

    getMobileHolidays: (year: number): string[] => {
        const easter = PayrollService.getEasterDate(year);
        const goodFriday = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
        const carnival = new Date(easter); carnival.setDate(easter.getDate() - 47);
        const fmt = (d: Date) => `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        return [fmt(goodFriday), fmt(carnival)];
    },

    calculateCalendarDays: (month: number, year: number, state: string) => {
        const end = new Date(year, month, 0);
        const mobile = PayrollService.getMobileHolidays(year);
        const hols = new Set([...FIXED_HOLIDAYS, ...mobile, ...(STATE_HOLIDAYS[state] || [])]);
        let bCount = 0, nbCount = 0;
        for (let d = 1; d <= end.getDate(); d++) {
            const cur = new Date(year, month - 1, d);
            const isSun = cur.getDay() === 0, isHol = hols.has(`${(cur.getMonth() + 1).toString().padStart(2, '0')}-${cur.getDate().toString().padStart(2, '0')}`);
            if (isSun || isHol) nbCount++; else bCount++;
        }
        return { business: bCount, nonBusiness: nbCount };
    },

    countSundays: (start: string, end: string, scale: string, schedule: string | null): number => {
        if (!start || !end) return 0;
        const cur = new Date(start + 'T00:00:00'), stop = new Date(end + 'T00:00:00');
        let count = 0;
        while (cur <= stop) {
            if (cur.getDay() === 0) {
                if (scale === '12x36' && schedule) {
                    if (schedule === 'ODD' && cur.getDate() % 2 !== 0) count++;
                    else if (schedule === 'EVEN' && cur.getDate() % 2 === 0) count++;
                } else count++;
            }
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    },

    performCalculation: (input: PayrollInput): PayrollResult => {
        const baseS = safeNum(input.baseSalary), daysW = safeNum(input.daysWorked), otH = safeNum(input.overtimeHours), otH2 = safeNum(input.overtimeHours2), nH = safeNum(input.nightHours), prodB = safeNum(input.productionBonus), vA = safeNum(input.visitsAmount), vUV = safeNum(input.visitUnitValue), fA = safeNum(input.familyAllowance), cA = safeNum(input.costAllowance), lTV = safeNum(input.loanTotalValue), lTI = safeNum(input.loanTotalInstallments), lDV = safeNum(input.loanDiscountValue), bD = safeNum(input.businessDays), nbD = safeNum(input.nonBusinessDays);
        let loanD = lTV > 0 && lTI > 0 ? lTV / lTI : lDV; if (isNaN(loanD)) loanD = 0;
        const nightRed = input.applyNightShiftReduction ? 1.14285714 : 1;
        let div = input.workScale === '12x36' ? (safeNum(input.customDivisor) || 220) : 220;
        const dsrF = input.workScale === '12x36' && !input.calculateDsrOn12x36 ? 0 : nbD / (bD || 1);
        let propS = input.workScale === '12x36' ? (baseS / 15) * (input.calculationMode === '13TH' ? 15 : daysW) : (baseS / 30) * (input.calculationMode === '13TH' ? 30 : Math.min(30, daysW));
        const hRate = baseS / div, hazV = input.hasHazardPay ? propS * 0.3 : 0;
        const nRate = hRate * (safeNum(input.nightShiftPercentage) / 100), nV = nRate * (nH * nightRed), dsrNV = nV * dsrF;
        const otV1 = hRate * (1 + safeNum(input.overtimePercentage) / 100) * otH, otV2 = hRate * (1 + safeNum(input.overtimePercentage2) / 100) * otH2;
        let sunV = 0; if (safeNum(input.sundaysAmount) > 0) sunV = hRate * 1.5 * (input.workScale === '12x36' ? 12 : 8) * safeNum(input.sundaysAmount);
        let holV = 0; if (input.workScale === '12x36' && input.workedOnHoliday) holV = hRate * 2 * safeNum(input.holidayHours);
        const totOT = otV1 + otV2 + sunV + holV, dsrOT = totOT * dsrF, vTV = vA * vUV;
        let gross = propS + hazV + nV + dsrNV + totOT + dsrOT + vTV + prodB + cA + fA - loanD;
        let tAvos = 0, tDays = 0;
        if (input.calculationMode === '13TH') {
            const rem13 = gross + loanD - cA;
            if (input.thirteenthCalculationType === 'CLT') {
                Object.values(input.thirteenthDetailedDays).forEach(d => { if (d >= 15) tAvos++; });
                gross = (rem13 / 12) * tAvos;
            } else {
                Object.values(input.thirteenthDetailedDays).forEach(d => tDays += (d || 0));
                gross = (rem13 / 360) * tDays;
            }
        }
        return { proportionalSalary: propS, hourlyRate: hRate, hazardPayValue: hazV, effectiveNightHours: nH * nightRed, nightShiftValue: nV, dsrNightShiftValue: dsrNV, overtimeValue: totOT, overtime1Value: otV1, overtime2Value: otV2, holidayValue: holV, dsrOvertimeValue: dsrOT, sundayBonusValue: sunV, visitsTotalValue: vTV, grossSalary: gross, thirteenthTotalAvos: tAvos, thirteenthTotalDays: tDays, loanDiscountValue: loanD };
    },

    calculateTermination: (input: PayrollInput): PayrollResult => {
        const baseS = safeNum(input.baseSalary), adm = input.admissionDate ? new Date(input.admissionDate + 'T00:00:00') : null, term = input.terminationDate ? new Date(input.terminationDate + 'T00:00:00') : null;
        if (!adm || !term || term < adm) return { proportionalSalary: 0, hourlyRate: 0, hazardPayValue: 0, effectiveNightHours: 0, nightShiftValue: 0, dsrNightShiftValue: 0, overtimeValue: 0, overtime1Value: 0, overtime2Value: 0, holidayValue: 0, dsrOvertimeValue: 0, sundayBonusValue: 0, visitsTotalValue: 0, grossSalary: 0, loanDiscountValue: 0 };
        const hRate = baseS / (input.customDivisor || 220), nH = input.nightHours * (input.applyNightShiftReduction ? 1.14285714 : 1), nV = nH * (hRate * safeNum(input.nightShiftPercentage) / 100);
        const otV = (hRate * (1 + safeNum(input.overtimePercentage) / 100) * safeNum(input.overtimeHours)) + (hRate * (1 + safeNum(input.overtimePercentage2) / 100) * safeNum(input.overtimeHours2));
        const dsrF = (safeNum(input.nonBusinessDays) || 5) / (safeNum(input.businessDays) || 25), dsrNV = nV * dsrF, dsrOT = otV * dsrF;
        const daysM = term.getDate(), salB = (baseS / 30) * daysM;
        const diffM = (term.getFullYear() - adm.getFullYear()) * 12 + (term.getMonth() - adm.getMonth()) + (term.getDate() >= 15 ? 1 : 0);
        const t13 = (baseS / 12) * (diffM % 12 || 12), vac = (baseS / 12) * diffM, vac13 = vac / 3, fine = input.terminationReason === 'DISMISSAL_NO_CAUSE' ? safeNum(input.fgtsBalance) * 0.4 : 0;
        const gross = salB + t13 + vac + vac13 + fine + nV + dsrNV + otV + dsrOT;
        return { proportionalSalary: salB, hourlyRate: hRate, hazardPayValue: 0, effectiveNightHours: nH, nightShiftValue: nV, dsrNightShiftValue: dsrNV, overtimeValue: otV, overtime1Value: 0, overtime2Value: 0, holidayValue: 0, dsrOvertimeValue: dsrOT, sundayBonusValue: 0, visitsTotalValue: 0, grossSalary: gross, loanDiscountValue: 0, terminationSalaryBalance: salB, terminationThirteenthProp: t13, terminationVacationProp: vac, terminationVacationOneThird: vac13, terminationFgtsFine: fine };
    }
};
