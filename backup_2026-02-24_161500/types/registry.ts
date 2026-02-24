
import { AddressData, BankData } from './common';

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
    inactivityReason?: 'DISMISSED' | 'INSS' | 'OTHER' | null;
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
