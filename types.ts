
/**
 * Global type definitions for the Payroll Calculator.
 */

export interface PayrollInput {
  // Identificação (Campos de input do funcionário)
  employeeName: string;

  // Dados da Empresa (Opcionais no input pois vêm do contexto, mas mantidos para compatibilidade do histórico)
  companyName: string;
  companyLogo: string | null;

  // --- MODO DE CÁLCULO (NOVO) ---
  calculationMode: 'MONTHLY' | '13TH';

  // 13º Salário Detalhado
  thirteenthDetailedDays: Record<number, number>; // Mapa: Mês (1-12) -> Dias Trabalhados
  thirteenthCalculationType: 'CLT' | 'DAILY_EXACT'; // Novo: CLT (Regra 15 dias) ou Avulso (Dias exatos)

  // Configuração do Mês (Novo para DSR e Automação)
  referenceMonth: number; // 1 = Janeiro, 12 = Dezembro
  referenceYear: number;
  selectedState: string; // UF (Ex: SP, RJ)
  businessDays: number; // Dias úteis no mês (ex: 25)
  nonBusinessDays: number; // Domingos e Feriados (ex: 5)

  // --- Gestão de Escalas (NOVO) ---
  workScale: 'STANDARD' | '12x36'; // Padrão ou 12x36
  shiftScheduleType: 'ODD' | 'EVEN' | null; // 12x36: Dias Ímpares ou Pares
  customDivisor: number; // Divisor de horas (220, 210, 180...)
  calculateDsrOn12x36: boolean; // Calcular reflexo DSR no 12x36?
  workedOnHoliday: boolean; // Trabalhou em feriado (12x36)?
  holidayHours: number; // Qtd horas no feriado (Dobra)

  // --- Calculadora de Jornada ---
  shiftStartTime: string; // Ex: "22:00"
  shiftEndTime: string;   // Ex: "05:00"
  shiftBreakStart: string; // Ex: "02:00"
  shiftBreakEnd: string;   // Ex: "03:00"
  extendNightShift: boolean; // Prorrogação Súmula 60

  // Financeiro
  baseSalary: number; // Salário Base (Contratual)
  daysWorked: number; // Dias Trabalhados (Padrão 30) ou Plantões (Padrão 15)

  // Cálculo de Domingos
  startDate: string;
  endDate: string;
  sundaysAmount: number;

  costAllowance: number; // Ajuda de Custo
  hasHazardPay: boolean; // Periculosidade
  nightHours: number; // Qtd Horas Noturnas (Relógio)
  applyNightShiftReduction: boolean; // Aplicar fator 1.1428 (52m30s)?
  nightShiftPercentage: number; // % Adicional Noturno

  // Hora Extra 1
  overtimeHours: number;
  overtimePercentage: 50 | 100;

  familyAllowance: number; // Salário Família 

  // Empréstimos (Novo)
  loanTotalValue: number; // Valor Total do Empréstimo
  loanDiscountValue: number; // Valor do Desconto Atual
  loanTotalInstallments: number; // Total de Parcelas (Ex: 5)
  loanCurrentInstallment: number; // Parcela Atual (Ex: 3)


  // Hora Extra 2 (Novo)
  overtimeHours2: number;
  overtimePercentage2: 50 | 100;

  productionBonus: number; // Participação de Produção
  visitsAmount: number; // Qtd Visitas
  visitUnitValue: number; // Valor por Visita

  // Dados para Summary (Novo)
  bankName: string;
  pixKey: string;
}

export interface PayrollResult {
  proportionalSalary: number; // Salário calculado com base nos dias trabalhados
  hourlyRate: number;
  hazardPayValue: number;

  effectiveNightHours: number; // Horas noturnas computadas (já com redução)
  nightShiftValue: number; // Valor já com hora reduzida
  dsrNightShiftValue: number; // Reflexo DSR s/ Noturno

  overtimeValue: number; // Soma total de HE + Domingos + Feriados
  overtime1Value: number; // Valor específico HE1
  overtime2Value: number; // Valor específico HE2
  holidayValue: number;   // Valor específico Feriados

  dsrOvertimeValue: number; // Reflexo DSR s/ Hora Extra

  sundayBonusValue: number; // Valor total dos Domingos (HE 50% ou similar)

  visitsTotalValue: number;

  // Empréstimo
  loanDiscountValue: number;

  // dsrProductionValue removido conforme nova regra de negócio

  grossSalary: number;

  // 13º Salário Específico
  thirteenthTotalAvos?: number; // Avos finais considerados (CLT)
  thirteenthTotalDays?: number; // Dias totais considerados (Avulso)
}

export interface PayrollHistoryItem {
  id: string;
  timestamp: string; // Data formatada para exibição
  rawDate: string;   // Data ISO para ordenação se necessário
  input: PayrollInput;
  result: PayrollResult;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string; // Novo campo
  logoUrl: string | null;
  employees: PayrollHistoryItem[];
}

export type ViveiroStatus = 'VAZIO' | 'PREPARADO' | 'POVOADO' | 'DESPESCA';

export interface Viveiro {
  id: string;
  company_id: string;
  name: string;
  coordinates: { lat: number; lng: number }[];
  area_m2: number;
  status?: ViveiroStatus;
  notes?: string;
  created_at: string;
}

export type ViewMode = 'SELECTION' | 'CALCULATOR' | 'COMPARATOR';

// --- NOVOS TIPOS DE CADASTRO ---

interface AddressData {
  zipCode?: string;
  address?: string; // Logradouro
  number?: string;
  district?: string; // Bairro
  city?: string;
  state?: string;
}

interface BankData {
  bankName?: string;
  agency?: string;
  account?: string;
  accountType?: string; // Corrente / Poupança
  pixKey?: string;
}

export interface RegistryEmployee extends AddressData, BankData {
  id: string;
  name: string;
  photoUrl?: string | null; // Foto 3x4
  cpf: string;
  role: string; // Cargo
  admissionDate: string;
  salary: number;
  phone: string;
  email: string;
  active: boolean;
  isNonDrinker: boolean;
}

export interface RegistrySupplier extends AddressData, BankData {
  id: string;
  companyName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  cnpj: string;
  contactPerson: string;
  phone: string;
  email: string;
  category: string; // Categoria do fornecimento
}

export interface RegistryClient extends AddressData, BankData {
  id: string;
  name: string; // Nome ou Razão Social
  document: string; // CPF ou CNPJ
  type: 'PF' | 'PJ';
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LEAD';
}
// --- TIPOS PARA CESTAS BÁSICAS / NOTAS FISCAIS ---

export interface InvoiceItem {
  id: string;
  code: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  issuerName?: string;
  issuerAddress?: string;
}

export interface InvoiceData {
  recipientName: string;
  recipientCnpj: string;
  issuerName: string;
  issuerAddress: string;
  invoiceNumber: string;
  series: string;
  issueDate: string;
  totalValue: number;
  items: InvoiceItem[];
}

export interface ItemAllocationConfig {
  mode: 'ALL' | 'NON_DRINKER' | 'DRINKER' | 'CUSTOM';
  customQtyNonDrinker?: number;
  customQtyDrinker?: number;
}

export interface ItemConfiguration {
  id: string;
  description: string;
  config: ItemAllocationConfig;
}

// --- MORTALIDADE E CONSUMO ---

export interface MortalityDailyRecord {
  day: number;
  feed: number;
  mortality: number;
}

export interface MortalityTankRecord {
  id: string;
  ve: string;
  stockingDate: string;
  area: number;
  initialPopulation: number;
  density: number;
  biometry?: string; // Manual biometry data
  dailyRecords: MortalityDailyRecord[];
}

export interface MonthlyMortalityData {
  id: string;
  companyId: string;
  month: number;
  year: number;
  records: MortalityTankRecord[];
}

export interface Transferencia {
  id: string; // Unique ID formatted as TR-YYYY-XXXX or UUID
  company_id: string;
  origem_id: string;
  destino_id: string;
  data_transferencia: string;
  turno: string;
  povoamento_origem_id?: string;
  quantidade: number;
  peso_medio: number;
  observacao?: string;
  created_at?: string;
  updated_at?: string;
}

// --- RECEIPT TYPES ---

export interface ReceiptInput {
  payeeName: string;
  payeeDocument?: string;
  value: number;
  date: string; // Data de Emissão
  serviceDate: string; // Data da Prestação do Serviço
  description: string;
  paymentMethod: string;
  pixKey?: string;
  bankInfo?: string;
  category?: string;
}

export interface ReceiptResult {
  valueInWords: string;
}

export interface ReceiptHistoryItem {
  id: string;
  timestamp: string;
  rawDate: string;
  input: ReceiptInput;
  result: ReceiptResult;
}
