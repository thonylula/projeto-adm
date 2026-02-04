
export interface PayrollInput {
    employeeName: string;
    companyName: string;
    companyLogo: string | null;
    calculationMode: 'MONTHLY' | '13TH' | 'TERMINATION';
    terminationDate?: string;
    terminationReason?: 'DISMISSAL_NO_CAUSE' | 'DISMISSAL_CAUSE' | 'RESIGNATION' | 'AGREEMENT';
    noticePeriodType?: 'WORKED' | 'INDEMNIFIED' | 'DISPENSED';
    fgtsBalance?: number;
    admissionDate?: string;
    thirteenthDetailedDays: Record<number, number>;
    thirteenthCalculationType: 'CLT' | 'DAILY_EXACT';
    referenceMonth: number;
    referenceYear: number;
    selectedState: string;
    businessDays: number;
    nonBusinessDays: number;
    workScale: 'STANDARD' | '12x36';
    shiftScheduleType: 'ODD' | 'EVEN' | null;
    customDivisor: number;
    calculateDsrOn12x36: boolean;
    workedOnHoliday: boolean;
    holidayHours: number;
    shiftStartTime: string;
    shiftEndTime: string;
    shiftBreakStart: string;
    shiftBreakEnd: string;
    extendNightShift: boolean;
    baseSalary: number;
    daysWorked: number;
    startDate: string;
    endDate: string;
    sundaysAmount: number;
    costAllowance: number;
    hasHazardPay: boolean;
    nightHours: number;
    applyNightShiftReduction: boolean;
    nightShiftPercentage: number;
    overtimeHours: number;
    overtimePercentage: 50 | 100;
    familyAllowance: number;
    loanTotalValue: number;
    loanDiscountValue: number;
    loanTotalInstallments: number;
    loanCurrentInstallment: number;
    overtimeHours2: number;
    overtimePercentage2: 50 | 100;
    productionBonus: number;
    visitsAmount: number;
    visitUnitValue: number;
    bankName: string;
    pixKey: string;
}

export interface PayrollResult {
    proportionalSalary: number;
    hourlyRate: number;
    hazardPayValue: number;
    effectiveNightHours: number;
    nightShiftValue: number;
    dsrNightShiftValue: number;
    overtimeValue: number;
    overtime1Value: number;
    overtime2Value: number;
    holidayValue: number;
    dsrOvertimeValue: number;
    sundayBonusValue: number;
    visitsTotalValue: number;
    loanDiscountValue: number;
    grossSalary: number;
    thirteenthTotalAvos?: number;
    thirteenthTotalDays?: number;
    terminationSalaryBalance?: number;
    terminationThirteenthProp?: number;
    terminationVacationProp?: number;
    terminationVacationOneThird?: number;
    terminationNoticePeriod?: number;
    terminationFgtsFine?: number;
}

export interface PayrollHistoryItem {
    id: string;
    timestamp: string;
    rawDate: string;
    input: PayrollInput;
    result: PayrollResult;
}

export interface Company {
    id: string;
    name: string;
    cnpj?: string;
    logoUrl: string | null;
    employees: PayrollHistoryItem[];
}
