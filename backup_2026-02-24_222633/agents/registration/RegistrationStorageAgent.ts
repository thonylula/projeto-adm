import { BaseAgent } from '../base/BaseAgent';
import { SupabaseService } from '../../services/supabaseService';
import { RegistryEmployee, RegistrySupplier, RegistryClient } from '../../types';

/**
 * RegistrationStorageAgent
 * Manages persistence for registrations (Employees, Suppliers, Clients) in Supabase.
 */
export class RegistrationStorageAgent extends BaseAgent {
    constructor() {
        super({
            name: 'RegistrationStorageAgent',
            systemPrompt: `Você é um Especialista em Persistência de Dados Cadastrais.`
        });
    }

    async process(input: {
        operation: 'save' | 'load' | 'delete',
        type: 'EMPLOYEE' | 'SUPPLIER' | 'CLIENT',
        id?: string,
        data?: any
    }): Promise<any> {
        this.log(`Registration Storage: ${input.operation} ${input.type}`);

        const { type, operation, data, id } = input;

        if (operation === 'load') {
            if (type === 'EMPLOYEE') return await SupabaseService.getEmployees();
            if (type === 'SUPPLIER') return await SupabaseService.getSuppliers();
            if (type === 'CLIENT') return await SupabaseService.getClients();
        }

        if (operation === 'save') {
            if (type === 'EMPLOYEE') return await SupabaseService.saveEmployee(data as RegistryEmployee);
            if (type === 'SUPPLIER') return await SupabaseService.saveSupplier(data as RegistrySupplier);
            if (type === 'CLIENT') return await SupabaseService.saveClient(data as RegistryClient);
        }

        if (operation === 'delete' && id) {
            if (type === 'EMPLOYEE') return await SupabaseService.deleteEmployee(id);
            if (type === 'SUPPLIER') return await SupabaseService.deleteSupplier(id);
            if (type === 'CLIENT') return await SupabaseService.deleteClient(id);
        }

        throw new Error(`Unsupported registration storage operation: ${operation} for ${type}`);
    }
}
