// [AI-LOCK: CLOSED]
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { PayrollInput, PayrollResult, PayrollHistoryItem, Company, RegistryEmployee } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useGeminiParser } from '../hooks/useGeminiParser';
import { numberToWordsBRL } from '../utils';
import { SupabaseService } from '../services/supabaseService';
import { getOrchestrator } from '../services/agentService';

interface PayrollCardProps {
  activeCompany: Company;
  activeYear?: number | null;
  activeMonth?: number | null;
  onBack: () => void;
  onAddEmployee: (newItem: PayrollHistoryItem) => void;
  onUpdateEmployee: (updatedItem: PayrollHistoryItem) => void;
  onDeleteEmployee: (itemId: string) => void;
  onBulkUpdateEmployees: (newEmployees: PayrollHistoryItem[]) => void;
  onSaveBulk: (newEmployees: PayrollHistoryItem[]) => void;
  isPublic?: boolean;
}

// Configuração Inicial
const currentDate = new Date();

// Inicializa o objeto de dias detalhados com 0 ou 30 para todos os meses
const INITIAL_DETAILED_DAYS: Record<number, number> = {};
for (let i = 1; i <= 12; i++) INITIAL_DETAILED_DAYS[i] = 0;

const INITIAL_INPUT_STATE: Omit<PayrollInput, 'companyName' | 'companyLogo'> = {
  employeeName: '',

  // Modo e 13º
  calculationMode: 'MONTHLY',
  thirteenthDetailedDays: { ...INITIAL_DETAILED_DAYS },
  thirteenthCalculationType: 'CLT', // Padrão Inicial

  referenceMonth: currentDate.getMonth() + 1, // 1-12
  referenceYear: currentDate.getFullYear(),
  selectedState: 'SP', // Padrão inicial
  businessDays: 25, // Será calculado automaticamente
  nonBusinessDays: 5, // Será calculado automaticamente

  startDate: '',
  endDate: '',
  sundaysAmount: 0,

  // Escalas
  workScale: 'STANDARD',
  shiftScheduleType: null,
  customDivisor: 220,
  calculateDsrOn12x36: true,
  workedOnHoliday: false,
  holidayHours: 12,

  // Jornada Padrão (Vazio inicialmente)
  shiftStartTime: '',
  shiftEndTime: '',
  shiftBreakStart: '',
  shiftBreakEnd: '',
  extendNightShift: false,

  baseSalary: 0,
  daysWorked: 30, // Padrão mês comercial
  costAllowance: 0,
  hasHazardPay: false,
  nightHours: 0,
  applyNightShiftReduction: true, // Padrão CLT: Verdadeiro
  nightShiftPercentage: 20, // Padrão CLT

  familyAllowance: 0, // Novo campo

  // Empréstimo
  loanTotalValue: 0,
  loanDiscountValue: 0,
  loanTotalInstallments: 0,
  loanCurrentInstallment: 0,



  overtimeHours: 0,
  overtimePercentage: 50,

  overtimeHours2: 0, // Novo campo
  overtimePercentage2: 100, // Novo campo (padrão 100 para diferenciar)

  productionBonus: 0,
  visitsAmount: 0,
  visitUnitValue: 0,

  bankName: '',
  pixKey: '',

  // Rescisão
  terminationDate: '',
  terminationReason: 'DISMISSAL_NO_CAUSE',
  noticePeriodType: 'INDEMNIFIED',
  fgtsBalance: 0,
  admissionDate: '',
};

// Helper seguro para gerar IDs
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) { }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// --- CONSTANTES DE FERIADOS --- (Mantidos iguais)
const FIXED_HOLIDAYS = [
  '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25',
];

// Helper robusto para garantir números válidos em toda a aplicação
const safeNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'string') {
    let clean = v.replace(/\s/g, '');
    // Trata formato brasileiro: milhar com ponto e decimal com vírgula
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
const STATE_HOLIDAYS: Record<string, string[]> = {
  'AC': ['01-23', '03-08', '06-15', '08-06', '09-05', '11-17'],
  'AL': ['06-24', '09-16'],
  'AP': ['03-19', '09-13', '10-05'],
  'AM': ['09-05'],
  'BA': ['07-02'],
  'CE': ['03-19', '03-25'],
  'DF': ['11-30'],
  'ES': [],
  'GO': [],
  'MA': ['07-28'],
  'MT': ['11-20'],
  'MS': ['10-11'],
  'MG': [],
  'PA': ['08-15'],
  'PB': ['08-05'],
  'PR': ['12-19'],
  'PE': ['03-06', '06-24'],
  'PI': ['10-19'],
  'RJ': ['04-23'],
  'RN': ['10-03'],
  'RS': ['09-20'],
  'RO': ['01-04', '06-18'],
  'RR': ['10-05'],
  'SC': ['08-11'],
  'SP': ['07-09'],
  'SE': ['07-08'],
  'TO': ['03-18', '09-08', '10-05'],
};
const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const PayrollCard: React.FC<PayrollCardProps> = ({
  activeCompany,
  activeYear,
  activeMonth,
  onBack,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkUpdateEmployees,
  onSaveBulk,
  isPublic = false
}) => {
  const [formState, setFormState] = useState<PayrollInput>({
    ...INITIAL_INPUT_STATE,
    companyName: activeCompany.name,
    companyLogo: activeCompany.logoUrl
  });

  const [result, setResult] = useState<PayrollResult | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  const [receiptItem, setReceiptItem] = useState<PayrollHistoryItem | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(false);


  // Lista de funcionários cadastrados para importação
  const [registeredEmployees, setRegisteredEmployees] = useState<RegistryEmployee[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Carregar funcionários do "Cadastros Gerais"
  useEffect(() => {
    const load = async () => {
      try {
        const data = await SupabaseService.getEmployees();
        setRegisteredEmployees(data);
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    };
    load();
  }, []);


  // --- Lógica de Calendário (Holidays & Business Days) ---
  const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
  };

  const getMobileHolidays = (year: number): string[] => {
    const easter = getEasterDate(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    const carnival = new Date(easter);
    carnival.setDate(easter.getDate() - 47);

    const formatDate = (date: Date) => {
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${m}-${d}`;
    };

    return [formatDate(goodFriday), formatDate(carnival)];
  };

  const calculateCalendarDays = useCallback((month: number, year: number, state: string) => {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const mobileHolidays = getMobileHolidays(year);
    const stateSpecificHolidays = STATE_HOLIDAYS[state] || [];
    const allHolidays = new Set([...FIXED_HOLIDAYS, ...mobileHolidays, ...stateSpecificHolidays]);

    let businessDaysCount = 0;
    let nonBusinessDaysCount = 0;

    for (let d = 1; d <= endDate.getDate(); d++) {
      const currentDate = new Date(year, month - 1, d);
      const dayOfWeek = currentDate.getDay();
      const dateString = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

      const isSunday = dayOfWeek === 0;
      const isHoliday = allHolidays.has(dateString);

      if (isSunday || isHoliday) {
        nonBusinessDaysCount++;
      } else {
        businessDaysCount++;
      }
    }

    return { business: businessDaysCount, nonBusiness: nonBusinessDaysCount };
  }, []);

  // --- Lógica de Contagem de Domingos ---
  const countSundays = (start: string, end: string, scale: string, scheduleType: string | null): number => {
    if (!start || !end) return 0;
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');

    if (startDate > endDate) return 0;

    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() === 0) { // 0 = Domingo
        if (scale === '12x36' && scheduleType) {
          const dayOfMonth = current.getDate();
          if (scheduleType === 'ODD' && dayOfMonth % 2 !== 0) count++;
          else if (scheduleType === 'EVEN' && dayOfMonth % 2 === 0) count++;
        } else {
          count++;
        }
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

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
  }, [formState.startDate, formState.endDate, formState.workScale, formState.shiftScheduleType, editingId]);


  // --- Lógica de Calculadora de Jornada (Shift Calculator) ---
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr) return -1;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const calculateShiftStats = useCallback((
    start: string, end: string, breakStart: string, breakEnd: string, extendNight: boolean
  ) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    if (startMins === -1 || endMins === -1) return null;

    let effectiveEndMins = endMins;
    if (endMins < startMins) effectiveEndMins += 1440;

    const breakStartMins = timeToMinutes(breakStart);
    const breakEndMins = timeToMinutes(breakEnd);
    let breakStartAdjusted = -1;
    let breakEndAdjusted = -1;

    if (breakStartMins !== -1 && breakEndMins !== -1) {
      let bStart = breakStartMins;
      let bEnd = breakEndMins;
      if (bStart < startMins && effectiveEndMins > 1440) bStart += 1440;
      if (bEnd < bStart) bEnd += 1440;
      if (bStart >= startMins && bEnd <= effectiveEndMins) {
        breakStartAdjusted = bStart;
        breakEndAdjusted = bEnd;
      }
    }

    let nightMinutes = 0;
    let dayMinutes = 0;

    for (let m = startMins; m < effectiveEndMins; m++) {
      if (breakStartAdjusted !== -1 && m >= breakStartAdjusted && m < breakEndAdjusted) continue;
      const timeOfDay = m % 1440;
      const isStandardNight = timeOfDay >= 1320 || timeOfDay < 300;
      let isExtendedNight = false;
      if (extendNight && !isStandardNight) {
        if (timeOfDay >= 300 && startMins < (effectiveEndMins > 1440 ? 1740 : 300)) {
          isExtendedNight = true;
        }
      }
      if (isStandardNight || isExtendedNight) nightMinutes++;
      else dayMinutes++;
    }

    const totalWorkedMinutes = dayMinutes + nightMinutes;
    return {
      dayHours: dayMinutes / 60,
      nightHours: nightMinutes / 60,
      totalHours: totalWorkedMinutes / 60
    };
  }, []);

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


  // --- Automação de Plantões 12x36 ---
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


  // --- Efeitos de Sistema ---
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
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | number | boolean | null = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number' || ['overtimePercentage', 'overtimePercentage2', 'referenceMonth', 'referenceYear', 'customDivisor', 'holidayHours', 'thirteenthMonths', 'fractionalMonthDays', 'baseSalary', 'daysWorked', 'familyAllowance', 'costAllowance', 'productionBonus', 'visitsAmount', 'visitUnitValue', 'loanTotalValue', 'loanDiscountValue', 'loanTotalInstallments', 'loanCurrentInstallment', 'overtimeHours', 'overtimeHours2', 'nightHours', 'nightShiftPercentage', 'sundaysAmount'].includes(name)) {
      // Forçar conversão numérica e tratar vírgula brasileira de forma robusta
      newValue = safeNum(value);
    }

    if (name === 'workScale') {
      if (value === '12x36') {
        setFormState((prev) => ({
          ...prev, workScale: '12x36', daysWorked: 15, customDivisor: 220, shiftScheduleType: null
        }));
        return;
      } else {
        setFormState((prev) => ({
          ...prev, workScale: 'STANDARD', daysWorked: 30, customDivisor: 220, shiftScheduleType: null
        }));
        return;
      }
    }

    setFormState((prev) => {
      // @ts-ignore
      const updatedState = { ...prev, [name]: newValue };

      if (name === 'referenceMonth' || name === 'referenceYear' || name === 'selectedState') {
        const { business, nonBusiness } = calculateCalendarDays(
          updatedState.referenceMonth,
          updatedState.referenceYear,
          updatedState.selectedState
        );
        updatedState.businessDays = business;
        updatedState.nonBusinessDays = nonBusiness;
      }

      return updatedState;
    });
  };

  const handleThirteenthDayChange = (monthIndex: number, days: number) => {
    setFormState(prev => ({
      ...prev,
      thirteenthDetailedDays: {
        ...(prev.thirteenthDetailedDays || {}), // Safety for missing map
        [monthIndex]: days
      }
    }));
  };

  const handleFillAllMonths = (days: number) => {
    const newDetailed: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) newDetailed[i] = days;
    setFormState(prev => ({
      ...prev,
      thirteenthDetailedDays: newDetailed
    }));
  };

  const handleImportEmployee = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const empId = e.target.value;
    if (!empId) return;
    const emp = registeredEmployees.find(r => r.id === empId);
    if (emp) {
      setFormState(prev => ({
        ...prev,
        employeeName: emp.name,
        baseSalary: emp.salary,
        bankName: emp.bankName || '',
        pixKey: emp.pixKey || '',
      }));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // --- AI SMART UPLOAD ---
  const { processFile, isProcessing } = useGeminiParser({
    onError: (err) => alert(`Erro na Inteligência Artificial: ${err.message}`)
  });

  const handleSmartUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const orchestrator = getOrchestrator();

    try {
      // Usamos o novo agente especializado
      const data = await orchestrator.routeToAgent('payroll-smart-upload', { image: file });

      if (data) {
        setFormState(prev => ({
          ...prev,
          referenceMonth: data.referenceMonth || prev.referenceMonth,
          referenceYear: data.referenceYear || prev.referenceYear,
          employeeName: data.employeeName || prev.employeeName,
          baseSalary: data.baseSalary || prev.baseSalary,
          overtimeHours: data.overtimeHours || prev.overtimeHours,
          overtimePercentage: data.overtimePercentage || prev.overtimePercentage,
          nightHours: data.nightHours || prev.nightHours,
          bankName: data.bankName || prev.bankName,
          pixKey: data.pixKey || prev.pixKey,
        }));
        alert(`✅ IA extraiu dados com sucesso!\nAgente: ${orchestrator.getHistory().pop()?.agentId || 'SmartUpload'}`);
      }

    } catch (error) {
      console.error("Smart Upload Error", error);
      alert("❌ Falha na extração inteligente. Certifique-se de que o arquivo está legível.");
    } finally {
      e.target.value = '';
    }
  };

  // --- FUNÇÃO DE CÁLCULO CENTRAL ---
  const performCalculation = (input: PayrollInput): PayrollResult => {
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

    // Cálculo Automático de Empréstimo se houver parcelas
    let calculatedLoanDiscount = loanDiscountValue;
    if (loanTotalValue > 0 && loanTotalInstallments > 0) {
      calculatedLoanDiscount = loanTotalValue / loanTotalInstallments;
    }
    if (isNaN(calculatedLoanDiscount)) calculatedLoanDiscount = 0;


    const COMMERCIAL_MONTH_DAYS = 30;
    const NIGHT_HOUR_REDUCTION_FACTOR = input.applyNightShiftReduction ? 1.14285714 : 1;

    // 1. Definição do Divisor
    let divisor = 220;
    if (input.workScale === '12x36') {
      divisor = safeNum(input.customDivisor) > 0 ? safeNum(input.customDivisor) : 220;
    }

    // 2. Fator DSR
    const safeBusinessDays = businessDays > 0 ? businessDays : 1;
    let dsrFactor = nonBusinessDays / safeBusinessDays;
    if (input.workScale === '12x36' && !input.calculateDsrOn12x36) {
      dsrFactor = 0;
    }
    if (isNaN(dsrFactor)) dsrFactor = 0;

    // 3. Salário Proporcional (Base para Mensal) vs Integral (Base para 13º)
    let proportionalSalary = 0;

    // Se for 13º, usamos o salário CHEIO como base de cálculo das médias e valor final
    // Se for Mensal, depende dos dias trabalhados
    const baseDays = input.calculationMode === '13TH' ? 30 : daysWorked;

    if (input.workScale === '12x36') {
      // No 12x36, se for 13º, assumimos a média de 15 plantões (salário cheio)
      const activeDays = input.calculationMode === '13TH' ? 15 : daysWorked;
      proportionalSalary = (baseSalary / 15) * activeDays;
    } else {
      const days = baseDays > 30 ? 30 : (baseDays < 0 ? 0 : baseDays);
      proportionalSalary = (baseSalary / COMMERCIAL_MONTH_DAYS) * days;
    }

    const hourlyRate = baseSalary / divisor;
    const hazardPayValue = input.hasHazardPay ? proportionalSalary * 0.30 : 0;

    // Adicional Noturno
    const nightShiftPercentageDecimal = safeNum(input.nightShiftPercentage) / 100;
    const effectiveNightHours = nightHours * NIGHT_HOUR_REDUCTION_FACTOR;
    const nightRate = hourlyRate * nightShiftPercentageDecimal;
    const nightShiftValue = nightRate * effectiveNightHours;
    const dsrNightShiftValue = nightShiftValue * dsrFactor;

    // Horas Extras
    const overtimeMultiplier1 = 1 + (safeNum(input.overtimePercentage) / 100);
    const overtimeRate1 = hourlyRate * overtimeMultiplier1;
    const overtimeValue1 = overtimeRate1 * overtimeHours;

    const overtimeMultiplier2 = 1 + (safeNum(input.overtimePercentage2) / 100);
    const overtimeRate2 = hourlyRate * overtimeMultiplier2;
    const overtimeValue2 = overtimeRate2 * overtimeHours2;

    let totalOvertimeValue = overtimeValue1 + overtimeValue2;

    // Domingos
    let sundayBonusValue = 0;
    if (safeNum(input.sundaysAmount) > 0) {
      const dailyHours = input.workScale === '12x36' ? 12 : 8;
      const sundayRate = hourlyRate * 1.5;
      const sundayHoursTotal = dailyHours * safeNum(input.sundaysAmount);
      sundayBonusValue = sundayRate * sundayHoursTotal;
      totalOvertimeValue += sundayBonusValue;
    }

    // Feriados 12x36
    let holidayValue = 0;
    if (input.workScale === '12x36' && input.workedOnHoliday) {
      const holidayRate = hourlyRate * 2;
      holidayValue = holidayRate * safeNum(input.holidayHours);
      totalOvertimeValue += holidayValue;
    }

    const dsrOvertimeValue = totalOvertimeValue * dsrFactor;

    const visitsTotalValue = visitsAmount * visitUnitValue;
    const totalProductionBase = visitsTotalValue + productionBonus;

    // Ajuda de Custo (Geralmente não entra no 13º, mas deixamos opcional/manual. Aqui vamos somar)
    // Se o usuário inserir no modo 13º, assume-se que integra a base.

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

    // Subtrair o empréstimo do total final se houver valor calculado
    grossSalary = (grossSalary || 0) - (calculatedLoanDiscount || 0);

    if (isNaN(grossSalary)) grossSalary = 0;



    // Descontos de Empréstimo não abatem do "Bruto" contábil normalmente, mas para "Valor a Receber" sim.
    // Como a UI foca no "Total Bruto" como "Total Gerado", vamos manter no bruto se o usuário quiser ver o "Total da Folha"
    // Mas talvez seja melhor subtrair apenas num "Líquido".
    // O usuário pediu: "TERÁ O VALOR QUE PEGOU... E O VALOR QUE JA FOI... DESCONTADO"
    // Vamos adicionar ao objeto de resultado mas NÃO subtrair do GrossSalary para manter coerência de "Salário Bruto",
    // mas talvez criar um "NetSalary" ou apenas exibir.
    // Porem, em folhas simples, muitas vezes "Total" é o a pagar.
    // Vou manter GrossSalary como soma de proventos e adicionar os dados de empréstimo para exibição.
    // Se o usuário quiser que subtraia, ele pedirá. Por enquanto, a feature é "Mostrar".
    // EDIT: Para garantir que o cálculo "feche" se for um recibo simples, talvez subtrair?
    // Melhor não alterar o conceito de "Bruto" agora. O "Total Bruto" é a soma dos ganhos. 
    // O empréstimo é um desconto. Vamos passar os valores para o result para exibição.


    // --- CÁLCULO ESPECÍFICO DE 13º SALÁRIO ---
    let thirteenthTotalAvos = 0;
    let thirteenthTotalDays = 0;

    if (input.calculationMode === '13TH') {
      const detailedDays = input.thirteenthDetailedDays || {};

      // *Importante*: Ajuda de custo tipicamente é indenizatória e não entra no 13º.
      // Vamos removê-la da base de cálculo do 13º para ficar mais correto.
      const remunerationFor13th = grossSalary - input.costAllowance;

      if (input.thirteenthCalculationType === 'CLT') {
        // Lógica CLT: Mês com 15+ dias conta 1 avo
        let detailedAvos = 0;
        Object.values(detailedDays).forEach(days => {
          if (days >= 15) detailedAvos++;
        });
        thirteenthTotalAvos = detailedAvos;
        grossSalary = (remunerationFor13th / 12) * thirteenthTotalAvos;
      } else {
        // Lógica Avulsa (Daily Exact): Soma todos os dias e paga proporcional (Base 360)
        let totalDays = 0;
        Object.values(detailedDays).forEach(days => {
          totalDays += (days || 0);
        });
        thirteenthTotalDays = totalDays;

        // Fórmula: Remuneração Integral dividida por 360 dias, multiplicada pelos dias trabalhados
        // Isso equivale a (Base / 12) * (Dias / 30)
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
  };

  // --- FUNÇÃO DE CÁLCULO DE RESCISÃO ---
  const calculateTermination = (input: PayrollInput): PayrollResult => {
    const baseSalary = safeNum(input.baseSalary);
    const admission = input.admissionDate ? new Date(input.admissionDate + 'T00:00:00') : null;
    const termination = input.terminationDate ? new Date(input.terminationDate + 'T00:00:00') : null;

    if (!admission || !termination || termination < admission) {
      return { proportionalSalary: 0, hourlyRate: 0, hazardPayValue: 0, effectiveNightHours: 0, nightShiftValue: 0, dsrNightShiftValue: 0, overtimeValue: 0, overtime1Value: 0, overtime2Value: 0, holidayValue: 0, dsrOvertimeValue: 0, sundayBonusValue: 0, visitsTotalValue: 0, grossSalary: 0, loanDiscountValue: 0 };
    }

    // 0. Cálculos de Variáveis Mensais (Mesma lógica do performCalculation)
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

    // DSR Factor
    const businessDays = safeNum(input.businessDays) || 25;
    const nonBusinessDays = safeNum(input.nonBusinessDays) || 5;
    const dsrFactor = nonBusinessDays / businessDays;

    const dsrNightValue = nightValue * dsrFactor;
    const dsrOvertimeValue = totalOvertimeValue * dsrFactor;

    const hazardPayValue = input.hasHazardPay ? (baseSalary / 30 * termination.getDate()) * 0.30 : 0;
    const visitsTotalValue = safeNum(input.visitsAmount) * safeNum(input.visitUnitValue);
    const productionBonus = safeNum(input.productionBonus);

    // 1. Saldo de Salário
    const daysInMonth = termination.getDate();
    const salaryBalance = (baseSalary / 30) * daysInMonth;

    // 2. 13º Proporcional
    // Simplificado: Assume que cada mês com 15+ dias conta 1 avo
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

    // 3. Férias Proporcionais
    // Diferença total de meses entre admissão e demissão
    const diffTime = termination.getTime() - admission.getTime();
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    const vacationAvos = diffMonths % 12;
    const vacationProp = (baseSalary / 12) * vacationAvos;
    const vacationOneThird = vacationProp / 3;

    // 4. Aviso Prévio Indenizado
    let noticePeriodValue = 0;
    if (input.noticePeriodType === 'INDEMNIFIED' && input.terminationReason !== 'RESIGNATION' && input.terminationReason !== 'DISMISSAL_CAUSE') {
      const extraDays = Math.min(60, Math.floor(yearsOfService) * 3);
      const totalDays = 30 + extraDays;
      noticePeriodValue = (baseSalary / 30) * totalDays;
    }

    // 5. Multa FGTS (40%)
    let fgtsFine = 0;
    if (input.terminationReason === 'DISMISSAL_NO_CAUSE') {
      fgtsFine = safeNum(input.fgtsBalance) * 0.40;
    } else if (input.terminationReason === 'AGREEMENT') {
      fgtsFine = safeNum(input.fgtsBalance) * 0.20;
    }

    // Soma Total (Incluindo variáveis mensais que ocorreram até a rescisão)
    let grossSalary = salaryBalance + thirteenthProp + vacationProp + vacationOneThird + noticePeriodValue + fgtsFine +
      nightValue + dsrNightValue + totalOvertimeValue + dsrOvertimeValue + hazardPayValue +
      visitsTotalValue + productionBonus + safeNum(input.familyAllowance) + safeNum(input.costAllowance);

    // Pedido de demissão ou Justa causa removem algumas verbas de aviso e multa, mas mantêm o saldo e variáveis trabalhadas
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
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedResult = formState.calculationMode === 'TERMINATION'
      ? calculateTermination(formState)
      : performCalculation(formState);
    setResult(calculatedResult);

    const timestamp = new Date().toLocaleString('pt-BR');
    const rawDate = new Date().toISOString();
    const newItemData: PayrollHistoryItem = {
      id: editingId || generateId(),
      timestamp, rawDate,
      input: { ...formState, companyName: activeCompany.name, companyLogo: activeCompany.logoUrl },
      result: calculatedResult
    };

    if (editingId) {
      onUpdateEmployee(newItemData);
      setEditingId(null);
    } else {
      onAddEmployee(newItemData);
    }

    // Reset, keeping the mode and detailed days structure clean
    const resetDetailedDays: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) resetDetailedDays[i] = 0;

    setFormState({
      ...INITIAL_INPUT_STATE,
      thirteenthDetailedDays: resetDetailedDays,
      referenceMonth: formState.referenceMonth,
      referenceYear: formState.referenceYear,
      selectedState: formState.selectedState,
      businessDays: formState.businessDays,
      nonBusinessDays: formState.nonBusinessDays,
      companyName: activeCompany.name,
      companyLogo: activeCompany.logoUrl,
      workScale: formState.workScale,
      customDivisor: formState.customDivisor,
      calculateDsrOn12x36: formState.calculateDsrOn12x36,
      shiftScheduleType: formState.shiftScheduleType,
      shiftStartTime: formState.shiftStartTime,
      shiftEndTime: formState.shiftEndTime,
      shiftBreakStart: formState.shiftBreakStart,
      shiftBreakEnd: formState.shiftBreakEnd,
      extendNightShift: formState.extendNightShift,
      applyNightShiftReduction: formState.applyNightShiftReduction,
      calculationMode: formState.calculationMode, // Mantém o modo
      thirteenthCalculationType: formState.thirteenthCalculationType // Mantém o tipo
    });
  };

  const handleAuditAI = async () => {
    if (!formState.baseSalary) return;
    const orchestrator = getOrchestrator();
    setLoading(true);

    try {
      // 1. Cálculo com IA
      const calcResult = await orchestrator.routeToAgent('payroll-calculation', formState);

      // 2. Validação com IA
      const validation = await orchestrator.routeToAgent('payroll-validation', {
        input: formState,
        result: calcResult
      });

      setResult(calcResult);

      if (validation.errors && validation.errors.length > 0) {
        alert(`🚨 Alertas da Auditoria IA:\n\n${validation.errors.join('\n')}`);
      } else if (validation.warnings && validation.warnings.length > 0) {
        alert(`⚠️ Avisos da IA:\n\n${validation.warnings.join('\n')}`);
      } else {
        alert("✅ Auditoria Digital Concluída: Cálculos validados conforme CLT.");
      }
    } catch (error) {
      console.error("Audit AI Error", error);
      alert("❌ Erro ao realizar auditoria inteligente.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (e: React.MouseEvent, item: PayrollHistoryItem) => {
    e.stopPropagation();
    // Ensure compatibility with old records that might not have the map
    const detailedDays = item.input.thirteenthDetailedDays || { ...INITIAL_DETAILED_DAYS };
    // Ensure type compatibility
    const calcType = item.input.thirteenthCalculationType || 'CLT';

    setFormState({ ...item.input, thirteenthDetailedDays: detailedDays, thirteenthCalculationType: calcType });
    setEditingId(item.id);
    setResult(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormState({
      ...INITIAL_INPUT_STATE,
      referenceMonth: formState.referenceMonth,
      referenceYear: formState.referenceYear,
      selectedState: formState.selectedState,
      businessDays: formState.businessDays,
      nonBusinessDays: formState.nonBusinessDays,
      companyName: activeCompany.name,
      companyLogo: activeCompany.logoUrl,
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); e.preventDefault();
    onDeleteEmployee(itemId);
    if (editingId === itemId) handleCancelEdit();
  };

  const generateSmartSummary = (item: PayrollHistoryItem) => {
    const { input, result } = item;
    const parts: string[] = [];

    // TÍTULO / REFERÊNCIA
    if (input.calculationMode === '13TH') {
      const label = input.thirteenthCalculationType === 'CLT'
        ? `${result.thirteenthTotalAvos}/12 AVOS`
        : `${result.thirteenthTotalDays}D`;
      parts.push(`13º PAGT. REF ${input.referenceYear} (${label})`);
    } else if (input.calculationMode === 'TERMINATION') {
      const reasonMap: any = {
        'DISMISSAL_NO_CAUSE': 'SEM JUSTA CAUSA',
        'DISMISSAL_CAUSE': 'COM JUSTA CAUSA',
        'RESIGNATION': 'PEDIDO DE DEMISSÃO',
        'AGREEMENT': 'ACORDO'
      };
      const dateStr = input.terminationDate ? new Date(input.terminationDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';
      parts.push(`RESCISÃO EM ${dateStr} (${reasonMap[input.terminationReason || ''] || ''})`);
    } else {
      const label = input.workScale === '12x36' ? `${input.daysWorked} PLANTÕES` : `${input.daysWorked} DIAS TRAB.`;
      parts.push(`PAGT. REF ${input.referenceMonth}/${input.referenceYear} (${label})`);
    }

    // BASE
    parts.push(`SAL. BASE ${formatCurrency(input.baseSalary)}`);

    // Ganhos Adicionais
    if (result.hazardPayValue > 0) parts.push(`PERIC. ${formatCurrency(result.hazardPayValue)}`);

    // Noturno
    if (result.nightShiftValue > 0) {
      const nightDetails = result.effectiveNightHours ? `(${result.effectiveNightHours.toFixed(2).replace('.', ',')}H)` : '';
      parts.push(`ADI. NOT. ${nightDetails} ${formatCurrency(result.nightShiftValue)}`);
    }

    // HE Detalhado
    if (result.overtimeValue > 0) {
      const details = [];
      if (input.overtimeHours > 0) details.push(`${input.overtimeHours}H/${input.overtimePercentage}%`);
      if (input.overtimeHours2 > 0) details.push(`${input.overtimeHours2}H/${input.overtimePercentage2}%`);
      if (input.sundaysAmount > 0) details.push(`${input.sundaysAmount}DOM`);
      if (input.workScale === '12x36' && input.holidayHours > 0 && input.workedOnHoliday) details.push(`${input.holidayHours}H/FER`);

      const detailsStr = details.length > 0 ? `(${details.join('+')})` : '';
      parts.push(`H. EXTRAS ${detailsStr} ${formatCurrency(result.overtimeValue)}`);
    }

    // DSR
    const totalDsr = result.dsrOvertimeValue + result.dsrNightShiftValue;
    if (totalDsr > 0) parts.push(`DSR ${formatCurrency(totalDsr)}`);

    // Ganhos/Descontos
    if (input.familyAllowance > 0) parts.push(`SAL. FAML. ${formatCurrency(input.familyAllowance)}`);
    if (input.costAllowance > 0) parts.push(`AJ. DE CUSTO ${formatCurrency(input.costAllowance)}`);
    if (result.visitsTotalValue > 0) parts.push(`VISIT. (${input.visitsAmount}) ${formatCurrency(result.visitsTotalValue)}`);
    if (input.productionBonus > 0) parts.push(`PROD. ${formatCurrency(input.productionBonus)}`);

    // Rescisão Específicos
    if (input.calculationMode === 'TERMINATION') {
      if (result.terminationSalaryBalance && result.terminationSalaryBalance > 0) parts.push(`SALDO SAL. ${formatCurrency(result.terminationSalaryBalance)}`);
      if (result.terminationNoticePeriod && result.terminationNoticePeriod > 0) parts.push(`AVISO PRÉVIO ${formatCurrency(result.terminationNoticePeriod)}`);
      if (result.terminationThirteenthProp && result.terminationThirteenthProp > 0) parts.push(`13º PROP. ${formatCurrency(result.terminationThirteenthProp)}`);
      if (result.terminationVacationProp && result.terminationVacationProp > 0) parts.push(`FÉRIAS PROP. ${formatCurrency(result.terminationVacationProp)}`);
      if (result.terminationVacationOneThird && result.terminationVacationOneThird > 0) parts.push(`1/3 FÉRIAS ${formatCurrency(result.terminationVacationOneThird)}`);
      if (result.terminationFgtsFine && result.terminationFgtsFine > 0) parts.push(`MULTA FGTS ${formatCurrency(result.terminationFgtsFine)}`);
    }

    // Empréstimo
    if (input.loanTotalValue > 0 || result.loanDiscountValue > 0) {
      const inst = input.loanTotalInstallments > 0 ? `(${input.loanCurrentInstallment}/${input.loanTotalInstallments})` : '';
      parts.push(`EMP. ${inst} ${formatCurrency(result.loanDiscountValue)}`);
    }

    // Banco / Pix
    if (input.bankName) parts.push(`BANCO: ${input.bankName}`);
    if (input.pixKey) parts.push(`PIX: ${input.pixKey}`);

    // Final
    parts.push(`TOTAL ${formatCurrency(result.grossSalary)}.`);

    return parts.join(', ').toUpperCase();
  };

  const handleCopySummary = (e: React.MouseEvent, summary: string, id: string) => {
    e.stopPropagation(); e.preventDefault();
    navigator.clipboard.writeText(summary).then(() => {
      setCopiedSummaryId(id);
      setTimeout(() => setCopiedSummaryId(null), 2000);
    });
  };

  // --- DERIVED STATE & CONSTANTS ---
  const isThirteenthMode = formState.calculationMode === '13TH';
  const history = (activeCompany.employees || []).filter(item => {
    if (activeYear && item.input.referenceYear !== activeYear) return false;
    if (activeMonth && item.input.referenceMonth !== activeMonth) return false;
    return true;
  });
  const totalCompanyCost = history.reduce((acc, item) => acc + (item.result?.grossSalary || 0), 0);
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const currentCalculatedAvos = isThirteenthMode && formState.thirteenthDetailedDays
    ? Object.values(formState.thirteenthDetailedDays).filter((d: any) => d >= 15).length
    : 0;

  const currentTotalDays = isThirteenthMode && formState.thirteenthDetailedDays
    ? Object.values(formState.thirteenthDetailedDays).reduce((a: number, b: any) => a + (b || 0), 0)
    : 0;

  // --- EXPORT & BACKUP FUNCTIONS ---
  const generateBulkPDF = async () => {
    const bulkContainer = document.getElementById('bulk-receipts-container');
    if (!bulkContainer) {
      throw new Error("Container de recibos (DOM) não encontrado.");
    }

    const receipts = bulkContainer.querySelectorAll('.bulk-receipt-page');
    if (receipts.length === 0) {
      throw new Error("Nenhum elemento de recibo foi encontrado no container.");
    }

    const pdf = new jsPDF('p', 'mm', 'a4');

    for (let i = 0; i < receipts.length; i++) {
      const element = receipts[i] as HTMLElement;
      try {
        const canvas = await html2canvas(element, {
          scale: 1.3, // Reduzido de 1.5 para otimizar tamanho
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          allowTaint: true
        });
        // Usando JPEG com 75% de qualidade para reduzir drasticamente o peso (PNG é muito pesado)
        const imgData = canvas.toDataURL('image/jpeg', 0.75);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      } catch (canvasErr: any) {
        console.error(`Erro ao capturar página ${i + 1}`, canvasErr);
        throw new Error(`Erro na página ${i + 1}: ${canvasErr.message}`);
      }
    }
    return pdf;
  };

  const handleShareBulk = async () => {
    if (history.length === 0) {
      alert("⚠️ Nenhum funcionário na lista da empresa para gerar recibos.");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const pdf = await generateBulkPDF();
      const filename = `Recibos_${activeCompany.name.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      const pdfBlob = pdf.output('blob');

      // Tentativa de compartilhamento nativo
      let shared = false;
      if (typeof File !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Recibos de Pagamento',
              text: `Seguem os recibos de pagamento - ${activeCompany.name}`
            });
            shared = true;
          }
        } catch (shareErr) {
          console.warn("Navegador não permitiu compartilhar o arquivo diretamente.", shareErr);
        }
      }

      if (!shared) {
        pdf.save(filename);
        alert("✅ Arquivo de recibos gerado e baixado com sucesso!");
      }
    } catch (e: any) {
      console.error("Share Bulk Error", e);
      alert("❌ Erro ao processar recibos: " + (e.message || "Erro inesperado ao gerar PDF"));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadReceiptPDF = async (item: PayrollHistoryItem) => {
    const element = document.getElementById('receipt-content');
    if (!element) return;
    try {
      // Reduzido o scale de 2 para 1.3 e usando JPEG 75%
      const canvas = await html2canvas(element, {
        scale: 1.3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const filename = `Recibo_${item.input.employeeName.replace(/\s+/g, '_')}.pdf`;

      // Oferecer compartilhamento para recibo individual também se disponível
      const pdfBlob = pdf.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Recibo de Pagamento',
          text: `Recibo de ${item.input.employeeName}`
        });
      } else {
        pdf.save(filename);
      }
    } catch (e) {
      console.error("PDF Error", e);
      alert("Erro ao gerar PDF.");
    }
  };

  const handleWhatsAppBulk = async () => {
    if (history.length === 0) return;

    const phone = prompt("Digite o número do WhatsApp (DDI + DDD + Número):", "55");
    if (!phone) return;

    try {
      const pdf = await generateBulkPDF();

      // Fallback: download PDF and open WhatsApp web (since we're removing API)
      pdf.save(`Recibos_Gerais_${activeCompany.name}.pdf`);
      const message = encodeURIComponent(`Olá, seguem os recibos de pagamento da empresa ${activeCompany.name}. Acabei de baixar o arquivo PDF completo, vou te enviar agora.`);
      window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    } catch (e) {
      console.error("Bulk PDF Error", e);
      alert("Erro ao gerar PDF.");
    }
  };

  const handlePrint = () => { setShowExportMenu(false); window.print(); };

  const handleExportPDF = async () => {
    setShowExportMenu(false);
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node.classList.contains('export-ignore')
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Folha_${activeCompany.name}.pdf`);
    } catch (e) {
      console.error("PDF Export Error", e);
    }
  };

  const handleExportPNG = async () => {
    setShowExportMenu(false);
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        ignoreElements: (node) => node.classList.contains('export-ignore')
      });
      const link = document.createElement('a');
      link.download = `Folha_${activeCompany.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error("PNG Export Error", e);
    }
  };

  const handleExportHTML = () => {
    setShowExportMenu(false);
    if (!reportRef.current) return;
    navigator.clipboard.writeText(reportRef.current.outerHTML).then(() => {
      alert("HTML da tabela copiado para a área de transferência!");
    });
  };

  const handleSaveBackup = () => {
    setShowExportMenu(false);
    const data = activeCompany.employees || [];
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_folha_${activeCompany.name}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (Array.isArray(parsed)) {
          onBulkUpdateEmployees(parsed);
          alert("Backup carregado com sucesso!");
        } else {
          alert("Formato de arquivo inválido. O backup deve ser uma lista de registros.");
        }
      } catch (err) {
        alert("Erro ao ler o arquivo de backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const exportToCSV = () => {
    const data = activeCompany.employees || [];
    if (data.length === 0) return;
    const headers = ["Modo", "Competência", "Nome", "Salário Base", "Total Bruto"];
    const rows = data.map(item => [
      item.input.calculationMode === '13TH' ? "13 SALARIO" : "MENSAL",
      `"${item.input.referenceMonth}/${item.input.referenceYear}"`,
      `"${item.input.employeeName}"`,
      item.input.baseSalary.toFixed(2),
      item.result.grossSalary.toFixed(2)
    ]);
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `folha.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-6xl mx-auto print:max-w-none print:w-full">

      {/* INPUT CARD */}
      {!isPublic && (
        <div className={`w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border transition-all duration-300 mb-12 print:hidden ${editingId ? 'border-amber-300 ring-4 ring-amber-50 shadow-amber-100' : 'border-gray-200/60 hover:shadow-2xl'}`}>

          <header className={`px-8 py-10 text-center relative overflow-hidden bg-slate-900 shadow-lg`}>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white flex items-center gap-2 transition-colors group">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 group-hover:-translate-x-1 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Trocar Empresa
                </button>
                {editingId && <span className="text-[10px] font-black text-white bg-orange-500 px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-orange-500/30">Modo Edição</span>}
              </div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                {activeCompany.name}
              </h1>
              <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">Folha de Pagamento Inteligente</p>
            </div>
          </header>

          {/* --- SELETOR DE MODO DE CÁLCULO --- */}
          <div className="bg-white border-b border-gray-100 p-2 flex justify-center gap-3 px-6">
            <button
              type="button"
              onClick={() => setFormState(prev => ({ ...prev, calculationMode: 'MONTHLY' }))}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formState.calculationMode === 'MONTHLY' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-gray-50'}`}
            >
              Folha Mensal
            </button>
            <button
              type="button"
              onClick={() => setFormState(prev => ({ ...prev, calculationMode: '13TH' }))}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formState.calculationMode === '13TH' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-400 hover:bg-gray-50'}`}
            >
              13º Salário
            </button>
            <button
              type="button"
              onClick={() => setFormState(prev => ({ ...prev, calculationMode: 'TERMINATION' }))}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${formState.calculationMode === 'TERMINATION' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400 hover:bg-gray-50'}`}
            >
              Demissão
            </button>
          </div>

          {/* --- SMART UPLOAD BAR --- */}
          <div className="bg-white border-b border-gray-100 p-3 flex justify-center items-center gap-4">
            <div className="relative group w-full max-w-md">
              <input
                type="file"
                id="smart-upload-payroll"
                className="hidden"
                onChange={handleSmartUpload}
                accept="image/*,application/pdf"
                disabled={isProcessing}
              />
              <label
                htmlFor="smart-upload-payroll"
                className={`flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider cursor-pointer border-2 border-dashed transition-all ${isProcessing ? 'bg-gray-50 border-gray-200 text-gray-400' : 'border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300'}`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analisando Holerite...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Importar Dados via Holerite (IA)
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="p-6 sm:p-8">

            {/* BANNER 13º */}
            {isThirteenthMode && (
              <div className="mb-8 animate-in fade-in">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center mb-4">
                  <h3 className="text-lg font-bold text-red-600 uppercase mb-1">CÁLCULO DETALHADO 13º PROPORCIONAL</h3>
                  <p className="text-xs text-red-400">Insira as médias e os dias trabalhados no quadro abaixo.</p>
                </div>

                {/* SELETOR DE TIPO DE CÁLCULO 13º */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-xs font-bold text-gray-500 uppercase">Regra de Pagamento:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormState(prev => ({ ...prev, thirteenthCalculationType: 'CLT' }))}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formState.thirteenthCalculationType === 'CLT' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-300'}`}
                    >
                      Padrão CLT (15 Dias)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState(prev => ({ ...prev, thirteenthCalculationType: 'DAILY_EXACT' }))}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${formState.thirteenthCalculationType === 'DAILY_EXACT' ? 'bg-red-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-300'}`}
                    >
                      Cálculo Avulso (Por Dias)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* BANNER DEMISSÃO */}
            {formState.calculationMode === 'TERMINATION' && (
              <div className="mb-8 animate-in fade-in">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-center mb-6">
                  <h3 className="text-lg font-bold text-orange-600 uppercase mb-1">CÁLCULO DE RESCISÃO CONTRATUAL</h3>
                  <p className="text-xs text-orange-400">Preencha os dados abaixo para calcular as verbas rescisórias.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motivo da Demissão</label>
                    <select
                      name="terminationReason"
                      value={formState.terminationReason}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="DISMISSAL_NO_CAUSE">Dispensa Sem Justa Causa</option>
                      <option value="DISMISSAL_CAUSE">Dispensa Com Justa Causa</option>
                      <option value="RESIGNATION">Pedido de Demissão</option>
                      <option value="AGREEMENT">Acordo (Art. 484-A CLT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Aviso Prévio</label>
                    <select
                      name="noticePeriodType"
                      value={formState.noticePeriodType}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="INDEMNIFIED">Indenizado</option>
                      <option value="WORKED">Trabalhado</option>
                      <option value="DISPENSED">Dispensado / Não Cumprido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data de Admissão</label>
                    <input
                      type="date"
                      name="admissionDate"
                      value={formState.admissionDate}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Data de Demissão</label>
                    <input
                      type="date"
                      name="terminationDate"
                      value={formState.terminationDate}
                      onChange={handleInputChange}
                      className="w-full p-3 bg-white border border-gray-300 rounded-xl text-sm font-medium shadow-sm border-orange-200"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Saldo p/ Fins Rescisórios (FGTS)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-400 sm:text-sm">R$</span></div>
                      <input
                        type="number"
                        name="fgtsBalance"
                        value={formState.fgtsBalance}
                        onChange={handleInputChange}
                        className="w-full pl-10 p-3 bg-white border border-gray-300 rounded-xl text-sm font-bold text-orange-700"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-gray-400 italic">Usado para calcular a multa de 40% (ou 20% em caso de acordo).</p>
                  </div>
                </div>
              </div>
            )}

            <form className="space-y-8" onSubmit={handleCalculate}>

              {/* Seção: Escala de Trabalho */}
              <div className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-slate-100">
                <div className="flex-1 space-y-4">
                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Selecione a Escala</span>
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formState.workScale === 'STANDARD' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'}`}>
                        <input type="radio" name="workScale" value="STANDARD" checked={formState.workScale === 'STANDARD'} onChange={handleInputChange} className="hidden" />
                        <span className="text-sm">Padrão (8h/44h)</span>
                      </label>
                      <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${formState.workScale === '12x36' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : 'bg-white border-gray-200 text-slate-500 hover:bg-gray-50'}`}>
                        <input type="radio" name="workScale" value="12x36" checked={formState.workScale === '12x36'} onChange={handleInputChange} className="hidden" />
                        <span className="text-sm">Escala 12x36</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seção de Grade Mensal do 13º */}
              {isThirteenthMode && (
                <div className="bg-red-50/50 rounded-xl p-6 border-2 border-red-100 animate-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Detalhamento de Dias por Mês
                    </h3>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleFillAllMonths(30)} className="text-[10px] bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-50 font-bold">Preencher Ano (30)</button>
                      <button type="button" onClick={() => handleFillAllMonths(0)} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded hover:bg-gray-50">Limpar</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {monthAbbr.map((m, index) => {
                      const monthKey = index + 1;
                      const days = formState.thirteenthDetailedDays?.[monthKey] || 0;
                      const isValidAvo = days >= 15;
                      const isClt = formState.thirteenthCalculationType === 'CLT';

                      // Visualização muda dependendo do modo
                      let cellStyle = 'bg-red-50/50 border-red-100 opacity-80';
                      if (isClt) {
                        if (isValidAvo) cellStyle = 'bg-white border-green-300 shadow-sm';
                      } else {
                        if (days > 0) cellStyle = 'bg-white border-blue-300 shadow-sm';
                      }

                      return (
                        <div key={monthKey} className={`relative border rounded-lg p-2 transition-all ${cellStyle}`}>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase text-center mb-1">{m}</label>
                          <input
                            type="number"
                            min="0"
                            max="31"
                            value={days || ''}
                            onChange={(e) => handleThirteenthDayChange(monthKey, parseInt(e.target.value) || 0)}
                            className={`w-full text-center font-bold text-sm outline-none bg-transparent ${isClt ? (isValidAvo ? 'text-green-700' : 'text-red-400') : 'text-blue-700'}`}
                            placeholder="0"
                          />
                          {isClt && (
                            <div className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border border-white ${isValidAvo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-100 flex justify-between items-center">
                    <span className="text-xs text-red-400 font-medium">
                      {formState.thirteenthCalculationType === 'CLT'
                        ? "Regra CLT: Mês com 15+ dias conta 1 avo."
                        : "Cálculo Avulso: Proporcional aos dias trabalhados."}
                    </span>
                    <div className="text-right">
                      <span className="text-xs text-gray-500 uppercase font-bold mr-2">
                        {formState.thirteenthCalculationType === 'CLT'
                          ? "Avos Conquistados:"
                          : "Total Dias:"}
                      </span>
                      <span className="text-xl font-black text-red-600">
                        {formState.thirteenthCalculationType === 'CLT'
                          ? `${currentCalculatedAvos}/12`
                          : currentTotalDays
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Competência (Ocultar/Simplificar se for 13º?) - Mantemos para referência do ano */}
              <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  Competência & Calendário
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Mês Ref.</label>
                    <select name="referenceMonth" value={formState.referenceMonth} onChange={handleInputChange} className="block w-full px-2 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-900">
                      {months.map((m, idx) => <option key={idx} value={idx + 1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ano</label>
                    <input type="number" name="referenceYear" value={formState.referenceYear} onChange={handleInputChange} className="block w-full px-2 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-900" min="2000" max="2100" />
                  </div>
                  {/* Oculta detalhes de dias úteis se for 13º, pois base é integral */}
                  {!isThirteenthMode && (
                    <>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Estado (UF)</label>
                        <select name="selectedState" value={formState.selectedState} onChange={handleInputChange} className="block w-full px-2 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-900">
                          {BRAZIL_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dias Úteis</label>
                        <input type="number" name="businessDays" value={formState.businessDays} onChange={handleInputChange} className="block w-full px-2 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-900 font-bold text-center" />
                      </div>
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dom/Feriados</label>
                        <input type="number" name="nonBusinessDays" value={formState.nonBusinessDays} onChange={handleInputChange} className="block w-full px-2 py-2 text-sm border border-blue-200 rounded-lg bg-white text-gray-900 font-bold text-center" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados do Funcionário */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Funcionário</label>
                <div className="flex gap-2">
                  <input type="text" name="employeeName" value={formState.employeeName} onChange={handleInputChange} className="block w-full px-3 py-2 sm:text-sm border border-gray-300 rounded-lg bg-white text-gray-900 flex-1" required placeholder="Ex: João da Silva" />
                  {registeredEmployees.length > 0 && (
                    <div className="relative">
                      <select onChange={handleImportEmployee} className="block w-40 px-3 py-2 text-xs border border-indigo-200 bg-indigo-50 text-indigo-700 font-bold rounded-lg cursor-pointer hover:bg-indigo-100" defaultValue="">
                        <option value="" disabled>Importar</option>
                        {registeredEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Remuneração Fixa */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">Remuneração Base {isThirteenthMode ? '(Integral)' : ''}</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salário Contratual</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-sm">R$</span></div>
                      <input type="number" name="baseSalary" value={formState.baseSalary || ''} onChange={handleInputChange} className="block w-full pl-10 px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0,00" step="0.01" required />
                    </div>
                  </div>
                  {!isThirteenthMode && (
                    <div className="col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${formState.workScale === '12x36' ? 'text-indigo-600 font-bold' : 'text-slate-700'}`}>
                        {formState.workScale === '12x36' ? 'Plantões' : 'Dias Trab.'}
                      </label>
                      <input type="number" name="daysWorked" value={formState.daysWorked} onChange={handleInputChange} className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-center bg-white text-gray-900" min="0" max="31" required />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center pt-1 cursor-pointer">
                <input
                  id="hasHazardPay"
                  name="hasHazardPay"
                  type="checkbox"
                  checked={formState.hasHazardPay}
                  onChange={handleInputChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer accent-indigo-600"
                />
                <label htmlFor="hasHazardPay" className="ml-3 text-sm text-slate-700 font-medium cursor-pointer select-none">Periculosidade (30%)</label>
              </div>



              {/* Nova Seção: Benefícios e Produção */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
                  Benefícios & Produção
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Salário Família</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-xs">R$</span></div>
                      <input type="number" name="familyAllowance" value={formState.familyAllowance || ''} onChange={handleInputChange} className="block w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0,00" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ajuda de Custo</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-xs">R$</span></div>
                      <input type="number" name="costAllowance" value={formState.costAllowance || ''} onChange={handleInputChange} className="block w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0,00" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Produção</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-xs">R$</span></div>
                      <input type="number" name="productionBonus" value={formState.productionBonus || ''} onChange={handleInputChange} className="block w-full pl-8 px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0,00" step="0.01" />
                    </div>
                  </div>
                </div>

                {/* Visitas */}
                <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-3 rounded-lg border border-orange-100">
                  <div>
                    <label className="block text-xs font-medium text-orange-900 mb-1">Qtd. Visitas</label>
                    <input type="number" name="visitsAmount" value={formState.visitsAmount || ''} onChange={handleInputChange} className="block w-full px-3 py-2 border border-orange-200 rounded-md bg-white text-gray-900" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-900 mb-1">Valor por Visita</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-xs">R$</span></div>
                      <input type="number" name="visitUnitValue" value={formState.visitUnitValue || ''} onChange={handleInputChange} className="block w-full pl-8 px-3 py-2 border border-orange-200 rounded-md bg-white text-gray-900" placeholder="0,00" step="0.01" />
                    </div>
                  </div>
                </div>

                {/* Empréstimo */}
                <div className="grid grid-cols-2 gap-4 bg-red-50/50 p-3 rounded-lg border border-red-100">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-red-900 mb-1 font-bold">VALOR TOTAL DO EMPRÉSTIMO</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-slate-500 sm:text-xs">R$</span></div>
                      <input type="number" name="loanTotalValue" value={formState.loanTotalValue || ''} onChange={handleInputChange} className="block w-full pl-8 px-3 py-2 border border-red-200 rounded-md bg-white text-gray-900 font-bold" placeholder="0,00" step="0.01" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-red-800 mb-1">QTD PARCELAS</label>
                    <input type="number" name="loanTotalInstallments" value={formState.loanTotalInstallments || ''} onChange={handleInputChange} className="block w-full px-3 py-2 border border-red-200 rounded-md bg-white text-gray-900 text-center" placeholder="Ex: 5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-red-800 mb-1">PARCELA ATUAL</label>
                    <input type="number" name="loanCurrentInstallment" value={formState.loanCurrentInstallment || ''} onChange={handleInputChange} className="block w-full px-3 py-2 border border-red-200 rounded-md bg-white text-gray-900 text-center" placeholder="Ex: 3" />
                  </div>
                  {formState.loanTotalValue > 0 && formState.loanTotalInstallments > 0 && (
                    <div className="col-span-2 pt-2 border-t border-red-100 flex justify-between items-center">
                      <span className="text-[10px] text-red-600 font-bold uppercase">Desconto Automático:</span>
                      <span className="text-sm font-black text-red-700">{formatCurrency(formState.loanTotalValue / formState.loanTotalInstallments)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados Bancários para o Resumo */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
                  Dados para Pagamento (Resumo)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Banco / Ag. / CC</label>
                    <input
                      type="text"
                      name="bankName"
                      value={formState.bankName}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="Ex: Nubank Ag 0001 CC 12345-6"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Chave PIX</label>
                    <input
                      type="text"
                      name="pixKey"
                      value={formState.pixKey}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      placeholder="CPF, E-mail, Celular ou Aleatória"
                    />
                  </div>
                </div>
              </div>

              {/* Médias e Variáveis */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-100 pb-2">
                  {isThirteenthMode ? 'Médias de Variáveis (Integral)' : 'Jornada & Variáveis'}
                </h3>

                {!isThirteenthMode && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase">Calculadora de Jornada (Opcional)</span>
                      {formState.workScale === '12x36' && (
                        <button
                          type="button"
                          onClick={() => setFormState(prev => ({ ...prev, shiftStartTime: '19:00', shiftEndTime: '07:00', shiftBreakStart: '00:00', shiftBreakEnd: '01:00' }))}
                          className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded hover:bg-indigo-200 font-bold"
                        >
                          Preencher 12x36 Noturno (19h-07h)
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Entrada</label>
                        <input type="time" name="shiftStartTime" value={formState.shiftStartTime} onChange={handleInputChange} className="block w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Saída</label>
                        <input type="time" name="shiftEndTime" value={formState.shiftEndTime} onChange={handleInputChange} className="block w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Início Int.</label>
                        <input type="time" name="shiftBreakStart" value={formState.shiftBreakStart} onChange={handleInputChange} className="block w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white text-center" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase text-slate-400 font-bold mb-1">Fim Int.</label>
                        <input type="time" name="shiftBreakEnd" value={formState.shiftBreakEnd} onChange={handleInputChange} className="block w-full px-2 py-1 text-sm border border-slate-300 rounded bg-white text-center" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Noturno */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <div>
                    <label className="block text-xs font-medium text-indigo-900 mb-1">Noturno: Qtd. Horas {isThirteenthMode ? '(Média)' : 'Totais'}</label>
                    <input type="number" name="nightHours" value={formState.nightHours || ''} onChange={handleInputChange} className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-md bg-white text-gray-900" placeholder="0.0" step="0.1" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-indigo-900 mb-1">% Adicional</label>
                    <input type="number" name="nightShiftPercentage" value={formState.nightShiftPercentage || ''} onChange={handleInputChange} className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-md bg-white text-gray-900" placeholder="20" />
                  </div>
                </div>

                {/* Extras */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. H. Extra (Tipo 1) {isThirteenthMode ? '(Média)' : ''}</label>
                    <input type="number" name="overtimeHours" value={formState.overtimeHours || ''} onChange={handleInputChange} className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0.0" step="0.1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">% H. Extra</label>
                    <select name="overtimePercentage" value={formState.overtimePercentage} onChange={handleInputChange} className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                      <option value="50">50%</option>
                      <option value="100">100%</option>
                    </select>
                  </div>
                  {/* Hora Extra Tipo 2 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. H. Extra (Tipo 2)</label>
                    <input type="number" name="overtimeHours2" value={formState.overtimeHours2 || ''} onChange={handleInputChange} className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900" placeholder="0.0" step="0.1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">% H. Extra (Tipo 2)</label>
                    <select name="overtimePercentage2" value={formState.overtimePercentage2} onChange={handleInputChange} className="block w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900">
                      <option value="50">50%</option>
                      <option value="100">100%</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleAuditAI}
                  disabled={loading || !formState.baseSalary}
                  className="flex-1 py-4 px-6 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-emerald-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  AUDITAR COM IA
                </button>
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl">Cancelar</button>
                )}
                <button type="submit" className={`flex-[2] py-4 px-6 text-lg font-bold rounded-xl shadow-lg text-white flex items-center justify-center gap-2 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : isThirteenthMode ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {editingId ? 'Salvar Alterações' : 'Calcular e Adicionar'}
                </button>
              </div>
            </form>

            {/* Instant Feedback */}
            {result && !editingId && (
              <div className="mt-8 bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex justify-between items-center print:hidden">
                <div className="text-left">
                  <span className="block text-emerald-800 font-medium">
                    {isThirteenthMode ? '13º Salário Bruto' : 'Total Bruto'}
                  </span>
                  {isThirteenthMode && (
                    <span className="text-xs text-emerald-600 block">
                      {formState.thirteenthCalculationType === 'CLT'
                        ? `Proporção: ${result.thirteenthTotalAvos}/12 avos`
                        : `Base: ${result.thirteenthTotalDays} dias trabalhados`
                      }
                    </span>
                  )}
                </div>
                <span className="text-2xl font-bold text-emerald-700">{formatCurrency(result.grossSalary)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT TABLE */}
      {
        history.length > 0 && (
          <div ref={reportRef} className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden mb-16 print:shadow-none print:border-none print:rounded-none print:m-0 print:w-full">
            <div className="relative p-8 border-b-2 border-gray-100 bg-white flex flex-row items-center justify-start gap-8 print:border-slate-800">
              {/* ... (Menu de exportação mantido, simplificado aqui) ... */}
              {activeCompany.logoUrl && (
                <div className="w-32 flex-shrink-0">
                  <img src={activeCompany.logoUrl} alt="Logo" className="w-full object-contain" />
                </div>
              )}
              <div className="flex-1 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 uppercase">{activeCompany.name}</h2>
                    <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em]">Folha Analítica</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-gray-200 print:bg-slate-200 print:text-black">
                  <tr>
                    <th className="px-3 py-2 min-w-[120px]">Nome/Ref</th>
                    <th className="px-2 py-2 text-right">Base/Integral</th>
                    <th className="px-2 py-2 text-right bg-indigo-50/50 print:bg-transparent">Extras</th>
                    <th className="px-2 py-2 text-right bg-indigo-50/50 print:bg-transparent">DSR</th>
                    <th className="px-2 py-2 text-right">Noturno</th>
                    <th className="px-2 py-2 text-right">Peric.</th>
                    <th className="px-2 py-2 text-right bg-blue-50/50">Sal.Fam.</th>
                    <th className="px-2 py-2 text-right bg-blue-50/50">Aj.Custo</th>
                    <th className="px-2 py-2 text-right bg-orange-50/50">Prod.</th>
                    <th className="px-2 py-2 text-right bg-orange-50/50">Visitas</th>
                    <th className="px-2 py-2 text-right bg-red-50/50">Empréstimo</th>
                    <th className="px-3 py-2 text-right bg-slate-200 text-slate-900 font-bold print:bg-slate-300">TOTAL BRUTO</th>

                    {!isPublic && <th className="px-2 py-2 text-center print:hidden export-ignore">Opções</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {history.map((item) => (
                    <tr key={item.id} className={`hover:bg-blue-50 transition-colors group print:hover:bg-transparent ${item.input.calculationMode === '13TH' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {item.input.employeeName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.input.calculationMode === '13TH'
                            ? (item.input.thirteenthCalculationType === 'CLT'
                              ? <span className="text-red-600 font-bold">[13º CLT] {(item.result.thirteenthTotalAvos || 0)}/12</span>
                              : <span className="text-blue-600 font-bold">[13º Avulso] {(item.result.thirteenthTotalDays || 0)} dias</span>)
                            : item.input.calculationMode === 'TERMINATION'
                              ? <span className="text-orange-600 font-bold">[RESCISÃO] {item.input.terminationDate ? new Date(item.input.terminationDate + 'T00:00:00').toLocaleDateString('pt-BR') : ''}</span>
                              : `Ref: ${item.input.referenceMonth}/${item.input.referenceYear}`
                          }
                          {item.input.loanTotalInstallments > 0 && (
                            <span className="block text-[9px] font-bold text-red-500 mt-1 italic">
                              Emp: {item.input.loanCurrentInstallment}/{item.input.loanTotalInstallments}
                            </span>
                          )}
                        </span>

                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.proportionalSalary)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600 bg-indigo-50/20">{formatCurrency(item.result.overtimeValue)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-indigo-50/20">{formatCurrency(item.result.dsrOvertimeValue + item.result.dsrNightShiftValue)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.nightShiftValue)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">{formatCurrency(item.result.hazardPayValue)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-blue-50/20">{formatCurrency(item.input.familyAllowance || 0)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-blue-50/20">{formatCurrency(item.input.costAllowance)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-orange-50/20">{formatCurrency(item.input.productionBonus)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-500 bg-orange-50/20">{formatCurrency(item.result.visitsTotalValue)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-red-500 bg-red-50/20">
                        {item.result.loanDiscountValue > 0 ? `-${formatCurrency(item.result.loanDiscountValue)}` : '-'}
                      </td>



                      <td className="px-3 py-2 text-right font-bold text-emerald-700 bg-slate-50 border-l border-slate-100 tabular-nums print:bg-slate-100 print:text-black">
                        {formatCurrency(item.result.grossSalary)}
                      </td>
                      {!isPublic && (
                        <td className="px-2 py-2 text-center print:hidden export-ignore">
                          <div className="flex justify-center gap-1 items-center">
                            <button
                              type="button"
                              onClick={(e) => handleCopySummary(e, generateSmartSummary(item), item.id)}
                              className={`p-1 rounded shadow-sm transition-all duration-300 ${copiedSummaryId === item.id ? 'bg-emerald-600' : 'bg-slate-600 hover:bg-slate-800'} text-white`}
                              title="Copiar Resumo Inteligente"
                            >
                              {copiedSummaryId === item.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                  <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                const orchestrator = getOrchestrator();
                                try {
                                  const report = await orchestrator.routeToAgent('payroll-report', {
                                    format: 'text',
                                    item,
                                    companyName: activeCompany.name
                                  });
                                  if (report.success && report.textFormat) {
                                    await navigator.clipboard.writeText(report.textFormat);
                                    alert("📋 Contracheque Profissional (IA) copiado para a área de transferência!");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Erro ao gerar holerite com IA.");
                                }
                              }}
                              className="p-1 text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-sm flex items-center gap-1 px-2 text-[10px] font-bold"
                              title="Copiar Holerite Profissional (IA)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              HOLERITE IA
                            </button>

                            <button
                              type="button"
                              onClick={() => setReceiptItem(item)}
                              className="p-1 text-white bg-orange-600 hover:bg-orange-700 rounded shadow-sm flex items-center gap-1 px-2 text-[10px] font-bold"
                              title="Gerar Recibo"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              RECIBO
                            </button>


                            <button type="button" onClick={(e) => handleEditClick(e, item)} className="p-1 text-amber-500 hover:bg-amber-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                            <button type="button" onClick={(e) => handleDeleteClick(e, item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white print:bg-slate-800">
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-right font-bold uppercase text-xs">Total Geral</td>
                    <td className="px-3 py-4 text-right font-bold text-base text-emerald-400 bg-slate-800 tabular-nums print:text-black print:bg-slate-300">
                      {formatCurrency(totalCompanyCost)}
                    </td>
                    <td></td>

                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end print:hidden export-ignore">
              <button type="button" onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-gray-50">
                Exportar CSV
              </button>
            </div>
          </div>
        )
      }

      {/* --- FOOTER ACTIONS (Floating Menu) - Hidden in Public Mode */}
      {!isPublic && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur shadow-2xl px-6 py-3 rounded-2xl border border-slate-200 z-50 print:hidden transition-all hover:bg-white">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md font-bold transition-all text-xs"
            title="Exportar PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            PDF
          </button>

          <button
            onClick={handleExportPNG}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold transition-all text-xs"
            title="Exportar PNG"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            PNG
          </button>

          <button
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl shadow-md font-bold transition-all text-xs"
            title="Copiar HTML"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            HTML
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button
            onClick={handleShareBulk}
            disabled={isGeneratingPDF}
            className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl shadow-md font-bold transition-all text-xs ${isGeneratingPDF ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            title="Compartilhar Todos os Recibos"
          >
            {isGeneratingPDF ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                GERANDO...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 8.684m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                COMPARTILHAR
              </>
            )}
          </button>


          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <button
            onClick={handleSaveBackup}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-bold transition-all text-xs"
            title="Salvar Backup JSON"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            BACKUP
          </button>

          <div className="relative">
            <input
              type="file"
              id="payroll-restore"
              className="hidden"
              accept=".json"
              onChange={handleLoadBackup}
            />
            <label
              htmlFor="payroll-restore"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md font-bold transition-all text-xs cursor-pointer"
              title="Restaurar Backup JSON"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              CARREGAR
            </label>
          </div>

          <button
            onClick={() => onSaveBulk(history)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold transition-all text-xs"
            title="Salvar Dados no Banco de Dados"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            SALVAR
          </button>
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {receiptItem && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-4 border-b border-slate-100 bg-slate-50/50 print:hidden">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Recibo de Pagamento</h3>
                  <p className="text-xs text-slate-500 font-medium">{receiptItem.input.employeeName} • {receiptItem.input.referenceMonth}/{receiptItem.input.referenceYear}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadReceiptPDF(receiptItem)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-black text-sm shadow-lg shadow-emerald-200/50 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6L15.316 8.684m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  COMPARTILHAR
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-bold text-sm shadow-lg shadow-slate-200/50 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                  IMPRIMIR
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
                <button
                  onClick={() => setReceiptItem(null)}
                  className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white print:overflow-visible flex justify-center">
              <div id="receipt-content" className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] space-y-8 flex flex-col justify-between">
                <div>
                  <div className="space-y-4 print:space-y-4">
                    {/* Generating 1ª Copy */}
                    {(() => {
                      const item = receiptItem;
                      const employeeRegistry = registeredEmployees.find(re =>
                        re.name.toLowerCase() === item.input.employeeName.toLowerCase()
                      );

                      return (
                        <div className="bg-white border-[1px] border-slate-300 p-8 rounded-sm relative print:border-[1px] mb-8">
                          {/* Top Header */}
                          <div className="flex flex-col items-center gap-2 mb-6 text-center">
                            {activeCompany.logoUrl && (
                              <img src={activeCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" />
                            )}
                            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase italic">1ª VIA</span>
                              <div className="border border-slate-300 px-3 py-1 rounded font-black text-slate-900 text-base">
                                {formatCurrency(item.result.grossSalary)}
                              </div>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                            <p>
                              Recebi de <strong className="font-black uppercase">{activeCompany.name}</strong>
                              {activeCompany.cnpj && <> – CNPJ <span className="font-mono">{activeCompany.cnpj}</span></>}, a importância de
                              <strong className="font-bold"> {numberToWordsBRL(item.result.grossSalary).toUpperCase()}</strong>,
                              referente à <strong className="font-bold">{generateSmartSummary(item)}</strong>.
                            </p>

                            <p>
                              Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado,
                              concedendo <strong className="font-bold">quitação plena, geral e irrevogável</strong> pela quantia recebida.
                            </p>

                            <p className="text-[12px]">
                              Pagamento recebido por <strong className="font-bold">{item.input.employeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey}</strong>, {item.input.bankName}.
                            </p>

                            <div className="text-right italic text-slate-500 font-medium uppercase text-[11px] mt-6">
                              CANAVIEIRAS, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>

                            {/* Signature Area */}
                            <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col items-center">
                              <p className="font-black uppercase text-sm tracking-tight">{item.input.employeeName}</p>
                              <div className="flex gap-4 text-[10px] text-slate-500 italic mt-1 font-mono">
                                {employeeRegistry?.cpf && <span>CPF: {employeeRegistry.cpf}</span>}
                                {employeeRegistry?.phone && <span>{employeeRegistry.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="border-t-[1px] border-dashed border-slate-300 my-4 relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] text-slate-300 font-bold uppercase italic">Corte aqui</div>
                    </div>

                    {/* Generating 2ª Copy */}
                    {(() => {
                      const item = receiptItem;
                      const employeeRegistry = registeredEmployees.find(re =>
                        re.name.toLowerCase() === item.input.employeeName.toLowerCase()
                      );

                      return (
                        <div className="bg-white border-[1px] border-slate-300 p-8 rounded-sm relative print:border-[1px]">
                          {/* Top Header */}
                          <div className="flex flex-col items-center gap-2 mb-6 text-center">
                            {activeCompany.logoUrl && (
                              <img src={activeCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" />
                            )}
                            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase italic">2ª VIA</span>
                              <div className="border border-slate-300 px-3 py-1 rounded font-black text-slate-900 text-base">
                                {formatCurrency(item.result.grossSalary)}
                              </div>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                            <p>
                              Recebi de <strong className="font-black uppercase">{activeCompany.name}</strong>
                              {activeCompany.cnpj && <> – CNPJ <span className="font-mono">{activeCompany.cnpj}</span></>}, a importância de
                              <strong className="font-bold"> {numberToWordsBRL(item.result.grossSalary).toUpperCase()}</strong>,
                              referente à <strong className="font-bold">{generateSmartSummary(item)}</strong>.
                            </p>

                            <p>
                              Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado,
                              concedendo <strong className="font-bold">quitação plena, geral e irrevogável</strong> pela quantia recebida.
                            </p>

                            <p className="text-[12px]">
                              Pagamento recebido por <strong className="font-bold">{item.input.employeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey}</strong>, {item.input.bankName}.
                            </p>

                            <div className="text-right italic text-slate-500 font-medium uppercase text-[11px] mt-6">
                              CANAVIEIRAS, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>

                            {/* Signature Area */}
                            <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col items-center">
                              <p className="font-black uppercase text-sm tracking-tight">{item.input.employeeName}</p>
                              <div className="flex gap-4 text-[10px] text-slate-500 italic mt-1 font-mono">
                                {employeeRegistry?.cpf && <span>CPF: {employeeRegistry.cpf}</span>}
                                {employeeRegistry?.phone && <span>{employeeRegistry.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HIDDEN BULK RECEIPTS CONTAINER (Para extração de PDF) --- */}
      <div id="bulk-receipts-container" style={{ position: 'fixed', left: '-10000px', top: '0', opacity: 0, pointerEvents: 'none', zIndex: -100 }}>
        {history.map((item, idx) => (
          <div key={`bulk-${idx}`} className="bulk-receipt-page bg-white w-[210mm] h-[297mm] p-[15mm] space-y-8 flex flex-col justify-between">
            {/* Copy of individual receipt logic (1st via) */}
            <div className="bg-white border-[1px] border-slate-300 p-8 rounded-sm relative">
              <div className="flex flex-col items-center gap-2 mb-6 text-center">
                {activeCompany.logoUrl && (
                  <img src={activeCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" />
                )}
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase italic">1ª VIA</span>
                  <div className="border border-slate-300 px-3 py-1 rounded font-black text-slate-900 text-base">
                    {formatCurrency(item.result.grossSalary)}
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                <p>
                  Recebi de <strong className="font-black uppercase">{activeCompany.name}</strong>
                  {activeCompany.cnpj && <> – CNPJ <span className="font-mono">{activeCompany.cnpj}</span></>}, a importância de
                  <strong className="font-bold"> {numberToWordsBRL(item.result.grossSalary).toUpperCase()}</strong>,
                  referente à <strong className="font-bold">{generateSmartSummary(item)}</strong>.
                </p>
                <p>Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado, concedendo <strong className="font-bold">quitação plena, geral e irrevogável</strong> pela quantia recebida.</p>
                <p className="text-[12px]">Pagamento recebido por <strong className="font-bold">{item.input.employeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey}</strong>, {item.input.bankName}.</p>
                <div className="text-right italic text-slate-500 font-medium uppercase text-[11px] mt-6">CANAVIEIRAS, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col items-center">
                  <p className="font-black uppercase text-sm tracking-tight">{item.input.employeeName}</p>
                </div>
              </div>
            </div>

            <div className="border-t-[1px] border-dashed border-slate-300 my-4"></div>

            {/* Copy of individual receipt logic (2nd via) */}
            <div className="bg-white border-[1px] border-slate-300 p-8 rounded-sm relative">
              <div className="flex flex-col items-center gap-2 mb-6 text-center">
                {activeCompany.logoUrl && (
                  <img src={activeCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" />
                )}
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase italic">2ª VIA</span>
                  <div className="border border-slate-300 px-3 py-1 rounded font-black text-slate-900 text-base">
                    {formatCurrency(item.result.grossSalary)}
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                <p>
                  Recebi de <strong className="font-black uppercase">{activeCompany.name}</strong>
                  {activeCompany.cnpj && <> – CNPJ <span className="font-mono">{activeCompany.cnpj}</span></>}, a importância de
                  <strong className="font-bold"> {numberToWordsBRL(item.result.grossSalary).toUpperCase()}</strong>,
                  referente à <strong className="font-bold">{generateSmartSummary(item)}</strong>.
                </p>
                <p>Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado, concedendo <strong className="font-bold">quitação plena, geral e irrevogável</strong> pela quantia recebida.</p>
                <p className="text-[12px]">Pagamento recebido por <strong className="font-bold">{item.input.employeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey}</strong>, {item.input.bankName}.</p>
                <div className="text-right italic text-slate-500 font-medium uppercase text-[11px] mt-6">CANAVIEIRAS, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col items-center">
                  <p className="font-black uppercase text-sm tracking-tight">{item.input.employeeName}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
