import { supabase } from '../../supabaseClient';
import { StorageService } from '../storageService';
import { RegistryEmployee, RegistrySupplier, RegistryClient } from '../../types';

export const registryService = {
    // --- EMPLOYEES ---
    async getEmployees(): Promise<RegistryEmployee[]> {
        try {
            const { data, error } = await supabase.from('employees').select('*');
            if (error || !data || !Array.isArray(data)) return [];
            return data.map(item => ({
                ...item,
                photoUrl: item.photo_url,
                admissionDate: item.admission_date,
                isNonDrinker: item.is_non_drinker,
                zipCode: item.zip_code,
                bankName: item.bank_name,
                pixKey: item.pix_key
            }));
        } catch (e) {
            console.error("[Supabase] Error fetching employees:", e);
            return [];
        }
    },

    async saveEmployee(employee: RegistryEmployee): Promise<boolean> {
        let finalPhotoUrl = employee.photoUrl;

        // Handle photo upload if it's base64
        if (employee.photoUrl && employee.photoUrl.startsWith('data:')) {
            const fileName = `photo_${employee.id || Date.now()}.png`;
            const uploadedUrl = await StorageService.uploadFile('employees', fileName, employee.photoUrl);
            if (uploadedUrl) finalPhotoUrl = uploadedUrl;
        }

        const { error } = await supabase.from('employees').upsert({
            id: employee.id,
            name: employee.name,
            photo_url: finalPhotoUrl,
            cpf: employee.cpf,
            role: employee.role,
            admission_date: employee.admissionDate,
            salary: employee.salary,
            phone: employee.phone,
            email: employee.email,
            active: employee.active,
            is_non_drinker: employee.isNonDrinker,
            address: employee.address,
            zip_code: employee.zipCode,
            number: employee.number,
            district: employee.district,
            city: employee.city,
            state: employee.state,
            bank_name: employee.bankName,
            agency: employee.agency,
            account: employee.account,
            pix_key: employee.pixKey
        });
        return !error;
    },

    async deleteEmployee(id: string): Promise<boolean> {
        const { error } = await supabase.from('employees').delete().eq('id', id);
        return !error;
    },

    // --- SUPPLIERS ---
    async getSuppliers(): Promise<RegistrySupplier[]> {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) return [];
        return data.map(item => ({
            ...item,
            companyName: item.company_name,
            tradeName: item.trade_name,
            contactPerson: item.contact_person,
            zipCode: item.zip_code,
            bankName: item.bank_name,
            pixKey: item.pix_key
        }));
    },

    async saveSupplier(supplier: RegistrySupplier): Promise<boolean> {
        const { error } = await supabase.from('suppliers').upsert({
            id: supplier.id,
            company_name: supplier.companyName,
            trade_name: supplier.tradeName,
            cnpj: supplier.cnpj,
            contact_person: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email,
            category: supplier.category,
            address: supplier.address,
            zip_code: supplier.zipCode,
            number: supplier.number,
            district: supplier.district,
            city: supplier.city,
            state: supplier.state,
            bank_name: supplier.bankName,
            agency: supplier.agency,
            account: supplier.account,
            pix_key: supplier.pixKey
        });
        return !error;
    },

    async deleteSupplier(id: string): Promise<boolean> {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        return !error;
    },

    // --- CLIENTS ---
    async getClients(): Promise<RegistryClient[]> {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) return [];
        return (data || []).map(item => ({
            ...item,
            zipCode: item.zip_code,
            bankName: item.bank_name,
            pixKey: item.pix_key
        }));
    },

    async saveClient(client: RegistryClient): Promise<boolean> {
        const { error } = await supabase.from('clients').upsert({
            id: client.id,
            name: client.name,
            document: client.document,
            type: client.type,
            phone: client.phone,
            email: client.email,
            status: client.status,
            address: client.address,
            zip_code: client.zipCode,
            number: client.number,
            district: client.district,
            city: client.city,
            state: client.state,
            bank_name: client.bankName,
            agency: client.agency,
            account: client.account,
            pix_key: client.pixKey
        });
        return !error;
    },

    async deleteClient(id: string): Promise<boolean> {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        return !error;
    }
};
