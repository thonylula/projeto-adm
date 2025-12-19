
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PayrollInput, PayrollResult, PayrollHistoryItem, Company, RegistryEmployee } from '../types';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useGeminiParser } from '../hooks/useGeminiParser';

interface PayrollCardProps {
  activeCompany: Company;
  onBack: () => void;
  onAddEmployee: (newItem: PayrollHistoryItem) => void;
  onUpdateEmployee: (updatedItem: PayrollHistoryItem) => void;
  onDeleteEmployee: (itemId: string) => void;
  onBulkUpdateEmployees: (newEmployees: PayrollHistoryItem[]) => void;
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
  onBack,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onBulkUpdateEmployees
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

  // Lista de funcionários cadastrados para importação
  const [registeredEmployees, setRegisteredEmployees] = useState<RegistryEmployee[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Carregar funcionários do "Cadastros Gerais"
  useEffect(() => {
    try {
      const stored = localStorage.getItem('folha_registry_employees');
      if (stored) {
        setRegisteredEmployees(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Erro ao carregar cadastros", e);
    }
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
        companyLogo: activeCompany.logoUrl
      }));
    }
  }, [activeCompany, editingId]);

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

    try {
      const prompt = `
                Analise este documento (Holerite, Recibo de Pagamento, Ficha Financeira). 
                Extraia a data de competência (Mês/Ano), Nome do Funcionário, Cargo e Salário Base.
                
                Retorne um JSON estrito com as chaves:
                {
                    "referenceMonth": number (1-12),
                    "referenceYear": number (ex: 2024),
                    "employeeName": "Nome Completo",
                    "baseSalary": number (valor numérico puro, ex: 1518.00),
                    "role": "Cargo"
                }
                Se não encontrar algum dado, ignore-o.
            `;

      const data = await processFile(file, prompt);

      if (data) {
        setFormState(prev => ({
          ...prev,
          referenceMonth: data.referenceMonth || prev.referenceMonth,
          referenceYear: data.referenceYear || prev.referenceYear,
          employeeName: data.employeeName || prev.employeeName,
          baseSalary: data.baseSalary || prev.baseSalary,
          // We don't have a 'role' field in the main input state visible to user directly 
          // (it's mostly for print/record), but we can perhaps store it if we add it to 'notes' or similar?
          // For now, let's just use what matches.
        }));
      }

    } catch (error) {
      console.error("Smart Upload Error", error);
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

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    const calculatedResult = performCalculation(formState);
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
      parts.push(`PAGT 13º SALÁRIO REF A ${input.referenceYear}`);
      if (input.thirteenthCalculationType === 'CLT') {
        parts.push(`(${result.thirteenthTotalAvos}/12 AVOS).`);
      } else {
        parts.push(`(${result.thirteenthTotalDays} DIAS TRABALHADOS).`);
      }
    } else {
      parts.push(`PAGT REF A ${input.referenceMonth}/${input.referenceYear}`);
      if (input.workScale === '12x36') {
        parts.push(`(${input.daysWorked} PLANTÕES).`);
      } else {
        parts.push(`(${input.daysWorked} DIAS TRABALHADOS).`);
      }
    }

    // BASE
    parts.push(`SALÁRIO BASE ${formatCurrency(input.baseSalary)}`);

    // Ganhos Adicionais
    if (result.hazardPayValue > 0) parts.push(`PERICULOSIDADE ${formatCurrency(result.hazardPayValue)}`);

    // Adicional Noturno com Horas
    if (result.nightShiftValue > 0) {
      const nightDetails = result.effectiveNightHours
        ? `(${result.effectiveNightHours.toFixed(2).replace('.', ',')}h)`
        : '';
      parts.push(`ADIC. NOTURNO ${nightDetails} ${formatCurrency(result.nightShiftValue)}`);
    }

    // Horas Extras Detalhadas (Inclui HE, Domingos, Feriados)
    if (result.overtimeValue > 0) {
      const overtimeDetails = [];

      // HE 1
      if (input.overtimeHours > 0) {
        overtimeDetails.push(`${input.overtimeHours}h A ${input.overtimePercentage}%`);
      }
      // HE 2
      if (input.overtimeHours2 > 0) {
        overtimeDetails.push(`${input.overtimeHours2}h A ${input.overtimePercentage2}%`);
      }
      // Domingos
      if (input.sundaysAmount > 0) {
        overtimeDetails.push(`${input.sundaysAmount} DOM`);
      }
      // Feriados (Apenas 12x36)
      if (input.workScale === '12x36' && input.holidayHours > 0 && input.workedOnHoliday) {
        overtimeDetails.push(`${input.holidayHours}h FER`);
      }

      const detailsStr = overtimeDetails.length > 0 ? `(${overtimeDetails.join(' + ')})` : '';
      parts.push(`HORAS EXTRAS ${detailsStr} ${formatCurrency(result.overtimeValue)}`);
    }

    // DSR (Reflexos)
    const totalDsr = result.dsrOvertimeValue + result.dsrNightShiftValue;
    if (totalDsr > 0) {
      parts.push(`DSR (REFLEXOS) ${formatCurrency(totalDsr)}`);
    }

    // Novos Campos
    if (input.familyAllowance && input.familyAllowance > 0) parts.push(`SAL. FAMÍLIA ${formatCurrency(input.familyAllowance)}`);
    if (input.costAllowance && input.costAllowance > 0) parts.push(`AJUDA DE CUSTO ${formatCurrency(input.costAllowance)}`);
    if (result.visitsTotalValue > 0) parts.push(`VISITAS (${input.visitsAmount}) ${formatCurrency(result.visitsTotalValue)}`);
    if (input.productionBonus && input.productionBonus > 0) parts.push(`PRODUÇÃO ${formatCurrency(input.productionBonus)}`);

    // Empréstimo
    if (input.loanTotalValue > 0 || result.loanDiscountValue > 0) {
      const installmentsStr = (input.loanTotalInstallments > 0)
        ? `${input.loanCurrentInstallment}/${input.loanTotalInstallments}`
        : '';
      const partsLoan = [];
      if (installmentsStr) partsLoan.push(installmentsStr);
      partsLoan.push(formatCurrency(result.loanDiscountValue));
      parts.push(`EMPRÉSTIMO (${partsLoan.join(' ')})`);
    }



    // Dados Bancários
    if (input.bankName) {
      parts.push(`BANCO: ${input.bankName}`);
    }
    if (input.pixKey) {
      parts.push(`PIX: ${input.pixKey}`);
    }

    // Final
    parts.push(`TOTAL BRUTO ${formatCurrency(result.grossSalary)}.`);

    return parts.join(', ').toUpperCase();
  };

  const handleCopySummary = (e: React.MouseEvent, summary: string, id: string) => {
    e.stopPropagation(); e.preventDefault();
    navigator.clipboard.writeText(summary).then(() => {
      setCopiedSummaryId(id);
      setTimeout(() => setCopiedSummaryId(null), 2000);
    });
  };

  // --- EXPORT & BACKUP FUNCTIONS ---
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
    const history = activeCompany.employees;
    if (history.length === 0) return;
    const headers = [
      "Modo", "Competência", "Nome", "Ref. 13o (Avos/Dias)", "Salário Base", "Total Bruto"
    ];
    const rows = history.map(item => {
      let ref13 = "0";
      if (item.input.calculationMode === '13TH') {
        ref13 = item.input.thirteenthCalculationType === 'CLT'
          ? `${(item.result.thirteenthTotalAvos || 0)}/12 avos`
          : `${(item.result.thirteenthTotalDays || 0)} dias`;
      }

      return [
        item.input.calculationMode === '13TH' ? "13 SALARIO" : "MENSAL",
        `"${item.input.referenceMonth}/${item.input.referenceYear}"`,
        `"${item.input.employeeName}"`,
        ref13,
        item.input.baseSalary.toFixed(2),
        item.result.grossSalary.toFixed(2)
      ];
    });
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

  // Safe access to history
  const history = activeCompany.employees || [];
  const totalCompanyCost = history.reduce((acc, item) => {
    const val = safeNum(item.result?.grossSalary);
    return acc + val;
  }, 0);

  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthAbbr = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const isThirteenthMode = formState.calculationMode === '13TH';

  // Calculate current stats in real-time for display
  const currentCalculatedAvos = isThirteenthMode && formState.thirteenthDetailedDays
    ? Object.values(formState.thirteenthDetailedDays).filter((d: any) => d >= 15).length
    : 0;

  const currentTotalDays = isThirteenthMode && formState.thirteenthDetailedDays
    ? Object.values(formState.thirteenthDetailedDays).reduce((a: number, b: any) => a + (b || 0), 0)
    : 0;

  return (
    <div className="w-full max-w-6xl mx-auto print:max-w-none print:w-full">

      {/* INPUT CARD */}
      <div className={`w-full max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border transition-all duration-300 mb-12 print:hidden ${editingId ? 'border-amber-300 ring-4 ring-amber-50 shadow-amber-100' : 'border-gray-200/60 hover:shadow-2xl'}`}>

        <header className={`px-6 py-6 text-center relative overflow-hidden ${editingId ? 'bg-amber-500' : isThirteenthMode ? 'bg-slate-900' : 'bg-slate-900'}`}>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <button onClick={onBack} className="text-xs text-white/70 hover:text-white flex items-center gap-1 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Trocar Empresa
              </button>
              {editingId && <span className="text-xs font-bold text-white bg-black/20 px-2 py-1 rounded-full uppercase tracking-wide">Editando</span>}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight uppercase">
              {activeCompany.name} {isThirteenthMode ? '13º Proporcional' : ''}
            </h1>
            <p className="text-white/80 text-sm mt-2 font-medium">Folha de Pagamento Inteligente (Multi-Escala)</p>
          </div>
          {isThirteenthMode
            ? <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-200 via-orange-600 to-red-900" />
            : !editingId && <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-pink-500" />
          }
        </header>

        {/* --- SELETOR DE MODO DE CÁLCULO --- */}
        <div className="bg-slate-50 border-b border-gray-200 p-2 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setFormState(prev => ({ ...prev, calculationMode: 'MONTHLY' }))}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isThirteenthMode ? 'bg-white text-indigo-700 shadow-sm border border-indigo-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Folha Mensal
          </button>
          <button
            type="button"
            onClick={() => setFormState(prev => ({ ...prev, calculationMode: '13TH' }))}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isThirteenthMode ? 'bg-white text-red-600 shadow-sm border border-red-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            13º Salário
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

            <div className="pt-6 flex gap-3">
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
                <h2 className="text-xl font-bold text-slate-900 uppercase">{activeCompany.name}</h2>
                <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-[0.2em]">Folha Analítica</p>
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

                    <th className="px-2 py-2 text-center print:hidden export-ignore">Opções</th>
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
                      <td className="px-2 py-2 text-center print:hidden export-ignore">
                        <div className="flex justify-center gap-1 items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              const summary = generateSmartSummary(item);
                              navigator.clipboard.writeText(summary);
                              alert(`Copiado para área de transferência:\n\n${summary}`);
                            }}
                            className="p-1 text-slate-100 bg-slate-600 hover:bg-slate-800 rounded shadow-sm" title="Copiar Resumo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z" clipRule="evenodd" />
                            </svg>
                          </button>
                          <button type="button" onClick={(e) => handleEditClick(e, item)} className="p-1 text-amber-500 hover:bg-amber-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          <button type="button" onClick={(e) => handleDeleteClick(e, item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        </div>
                      </td>
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

      {/* --- FOOTER ACTIONS (Floating Menu) --- */}
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
      </div>

    </div>
  );
};
