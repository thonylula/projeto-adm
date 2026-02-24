
export interface AddressData {
  zipCode?: string;
  address?: string; // Logradouro
  number?: string;
  district?: string; // Bairro
  city?: string;
  state?: string;
}

export interface BankData {
  bankName?: string;
  agency?: string;
  account?: string;
  accountType?: string; // Corrente / Poupança
  pixKey?: string;
}

export type ViewMode = 'SELECTION' | 'CALCULATOR' | 'COMPARATOR';
