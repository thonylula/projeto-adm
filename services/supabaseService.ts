import { supabase } from '../supabaseClient';
import { Company, PayrollHistoryItem, RegistryEmployee, RegistrySupplier, RegistryClient, ItemConfiguration, Viveiro } from '../types';

/**
 * Service for Supabase database operations.
 * Centralizes all data fetching and persistence.
 */
export const SupabaseService = {
    // --- COMPANIES ---
    async getCompanies(): Promise<Company[]> {
        const { data, error } = await supabase
            .from('companies')
            .select('*');

        if (error) {
            console.error("Error fetching companies:", error);
            return [];
        }

        // We need to fetch employees (history) separately or use a join
        // For now, let's just return the companies. The employees field in Company type
        // refers to the payroll history items for that company.

        const companiesWithHistory = await Promise.all((data || []).map(async (company) => {
            const history = await this.getPayrollHistory(company.id);
            return {
                ...company,
                logoUrl: company.logo_url, // Map DB snake_case to CamelCase
                employees: history
            };
        }));

        return companiesWithHistory;
    },

    async addCompany(name: string, cnpj?: string, logoUrl?: string | null): Promise<Company | null> {
        const { data, error } = await supabase
            .from('companies')
            .insert([{ name, cnpj, logo_url: logoUrl }])
            .select()
            .single();

        if (error) {
            console.error("Error adding company:", error);
            return null;
        }

        return {
            ...data,
            logoUrl: data.logo_url,
            employees: []
        };
    },

    async updateCompany(company: Company): Promise<boolean> {
        const { error } = await supabase
            .from('companies')
            .update({
                name: company.name,
                cnpj: company.cnpj,
                logo_url: company.logoUrl
            })
            .eq('id', company.id);

        if (error) {
            console.error("Error updating company:", error);
            return false;
        }
        return true;
    },

    async deleteCompany(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('companies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting company:", error);
            return false;
        }
        return true;
    },

    // --- REGISTRATIONS (GLOBAL) ---
    async getEmployees(): Promise<RegistryEmployee[]> {
        const { data, error } = await supabase.from('employees').select('*');
        if (error) return [];
        return data.map(item => ({ ...item, photoUrl: item.photo_url, admissionDate: item.admission_date, isNonDrinker: item.is_non_drinker }));
    },

    async saveEmployee(employee: RegistryEmployee): Promise<boolean> {
        const { error } = await supabase.from('employees').upsert({
            id: employee.id,
            name: employee.name,
            photo_url: employee.photoUrl,
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

    async getSuppliers(): Promise<RegistrySupplier[]> {
        const { data, error } = await supabase.from('suppliers').select('*');
        if (error) return [];
        return data.map(item => ({ ...item, companyName: item.company_name, tradeName: item.trade_name, contactPerson: item.contact_person }));
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

    async getClients(): Promise<RegistryClient[]> {
        const { data, error } = await supabase.from('clients').select('*');
        if (error) return [];
        return data;
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
    },

    // --- PAYROLL HISTORY ---
    async getPayrollHistory(companyId: string): Promise<PayrollHistoryItem[]> {
        const { data, error } = await supabase
            .from('payroll_history')
            .select('*')
            .eq('company_id', companyId)
            .order('raw_date', { ascending: false });

        if (error) return [];
        return data.map(item => ({
            id: item.id,
            timestamp: item.timestamp,
            rawDate: item.raw_date,
            input: item.input,
            result: item.result
        }));
    },

    async addPayrollItem(companyId: string, item: PayrollHistoryItem): Promise<boolean> {
        const { error } = await supabase.from('payroll_history').insert([{
            id: item.id,
            company_id: companyId,
            employee_name: item.input.employeeName,
            timestamp: item.timestamp,
            raw_date: item.rawDate,
            input: item.input,
            result: item.result
        }]);
        return !error;
    },

    async updatePayrollItem(item: PayrollHistoryItem): Promise<boolean> {
        const { error } = await supabase
            .from('payroll_history')
            .update({
                input: item.input,
                result: item.result,
                timestamp: item.timestamp,
                raw_date: item.rawDate
            })
            .eq('id', item.id);
        return !error;
    },

    async deletePayrollItem(id: string): Promise<boolean> {
        const { error } = await supabase.from('payroll_history').delete().eq('id', id);
        return !error;
    },

    async saveBulkPayrollItems(companyId: string, items: PayrollHistoryItem[]): Promise<boolean> {
        const { error } = await supabase.from('payroll_history').upsert(
            items.map(item => ({
                id: item.id,
                company_id: companyId,
                employee_name: item.input.employeeName,
                timestamp: item.timestamp,
                raw_date: item.rawDate,
                input: item.input,
                result: item.result
            }))
        );
        if (error) {
            console.error("Error saving bulk payroll items:", error);
            return false;
        }
        return true;
    },

    // --- BASKET CONFIGS ---
    async getBasketConfigs(): Promise<ItemConfiguration[]> {
        const { data, error } = await supabase.from('basket_item_configs').select('*');
        if (error) return [];
        return data.map(item => ({ id: item.id, description: item.description, config: item.config }));
    },

    async saveBasketConfigs(configs: ItemConfiguration[]): Promise<boolean> {
        // Upsert multiple configs
        const { error } = await supabase.from('basket_item_configs').upsert(
            configs.map(c => ({ description: c.description, config: c.config }))
        );
        return !error;
    },

    // --- BIOMETRICS HISTORY ---
    async getBiometricsHistory(): Promise<any[]> {
        const { data, error } = await supabase
            .from('biometrics')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) {
            console.error('Error fetching biometrics history:', error);
            return [];
        }
        return data || [];
    },

    async getLatestBiometry(): Promise<{ id: string; data: any[]; label: string; timestamp: string } | null> {
        const { data, error } = await supabase
            .from('biometrics')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;
        return data;
    },

    async saveBiometry(biometryData: any[], label?: string, customTimestamp?: string): Promise<boolean> {
        const { error } = await supabase
            .from('biometrics')
            .insert([{
                data: biometryData,
                label: label || `Biometria ${new Date().toLocaleDateString('pt-BR')}`,
                timestamp: customTimestamp || new Date().toISOString()
            }]);

        if (error) {
            console.error('Error saving biometry:', error);
            return false;
        }
        return true;
    },

    async deleteBiometry(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('biometrics')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting biometry:', error);
            return false;
        }
        return true;
    },

    // Legacy methods for backward compatibility (deprecated)
    async getBiometrics(): Promise<any[]> {
        const latest = await this.getLatestBiometry();
        if (!latest) return [];
        return [latest.data];
    },

    async saveBiometrics(data: any[]): Promise<boolean> {
        // This is now a no-op - use saveBiometry instead
        return true;
    },

    // --- DELIVERY ORDERS ---
    async getDeliveryOrders(): Promise<{ data: any[], logo: string | null }> {
        const { data, error } = await supabase.from('delivery_orders').select('*');
        if (error || !data || data.length === 0) return { data: [], logo: null };
        const record = data[0];
        return { data: record.data || [], logo: record.logo_url };
    },

    async saveDeliveryOrders(data: any[], logo: string | null): Promise<boolean> {
        const { error } = await supabase.from('delivery_orders').upsert([{
            id: 'global_delivery_orders',
            data,
            logo_url: logo
        }]);
        return !error;
    },

    // --- USERS ---
    async getUsers(): Promise<any[]> {
        const { data, error } = await supabase.from('app_users').select('*');
        if (error) return [];
        return data;
    },

    async saveUser(username: string, password: string): Promise<boolean> {
        const { error } = await supabase.from('app_users').upsert([{ username, password }]);
        return !error;
    },

    // --- GLOBAL CONFIGS ---
    async getConfig(id: string): Promise<any | null> {
        try {
            const { data, error } = await supabase
                .from('global_configs')
                .select('value')
                .eq('id', id)
                .maybeSingle(); // Use maybeSingle to avoid 406/error when not found

            if (error) {
                console.warn(`[Supabase] Erro ao buscar config ${id}:`, error.message);
                return null;
            }
            return data?.value || null;
        } catch (e) {
            return null;
        }
    },

    async saveConfig(id: string, value: any): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('global_configs')
                .upsert({ id, value }, { onConflict: 'id' });

            if (error) {
                console.error(`[Supabase Error] saveConfig(${id}):`, error.message, error.details);
                return false;
            }
            return true;
        } catch (e) {
            console.error(`[Supabase Exception] saveConfig(${id}):`, e);
            return false;
        }
    },

    // --- COMPARISON HISTORY ---
    async getComparisonHistory(): Promise<any[]> {
        const { data, error } = await supabase
            .from('ai_comparisons')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(10);
        if (error) return [];
        return data;
    },

    async saveComparison(record: { source_a_label: string; source_b_label: string; analysis_result: any }): Promise<boolean> {
        const { error } = await supabase
            .from('ai_comparisons')
            .insert([record]);
        return !error;
    },

    async updateComparison(id: string, updates: { source_a_label?: string; source_b_label?: string }): Promise<boolean> {
        const { error } = await supabase
            .from('ai_comparisons')
            .update(updates)
            .eq('id', id);
        return !error;
    },

    async deleteComparison(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('ai_comparisons')
            .delete()
            .eq('id', id);
        return !error;
    },

    // --- MORTALITY DATA ---
    async getMortalityData(companyId: string, month: number, year: number): Promise<any | null> {
        const id = `mortality_${companyId}_${year}_${month}`;
        return this.getConfig(id);
    },

    async saveMortalityData(companyId: string, month: number, year: number, data: any): Promise<boolean> {
        const id = `mortality_${companyId}_${year}_${month}`;
        return this.saveConfig(id, data);
    },

    // --- VIVEIROS (FISH PONDS) ---
    async getViveiros(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('viveiros')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching viveiros:', error);
            return [];
        }
        return data || [];
    },

    async addViveiro(viveiro: { company_id: string; name: string; coordinates: any[]; area_m2: number; status?: string; notes?: string }): Promise<any | null> {
        const { data, error } = await supabase
            .from('viveiros')
            .insert([viveiro])
            .select()
            .single();

        if (error) {
            console.error('Error adding viveiro:', error);
            return null;
        }
        return data;
    },

    async updateViveiro(id: string, updates: { name?: string; coordinates?: any[]; area_m2?: number; status?: string; notes?: string }): Promise<boolean> {
        const { error } = await supabase
            .from('viveiros')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error('Error updating viveiro:', error);
            return false;
        }
        return true;
    },

    async deleteViveiro(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('viveiros')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting viveiro:', error);
            return false;
        }
        return true;
    },

    // --- TRANSFERÊNCIAS ---
    async getTransferencias(companyId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('transferencias')
            .select('*')
            .eq('company_id', companyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transferencias:', error);
            return [];
        }
        return data || [];
    },

    async saveTransferencia(transfer: any): Promise<boolean> {
        const { error } = await supabase
            .from('transferencias')
            .upsert([transfer]);

        if (error) {
            console.error('Error saving transferencia:', error);
            return false;
        }
        return true;
    },

    async getTransferCount(year: number): Promise<number> {
        const { count, error } = await supabase
            .from('transferencias')
            .select('*', { count: 'exact', head: true })
            .gte('data_transferencia', `${year}-01-01`)
            .lte('data_transferencia', `${year}-12-31`);

        if (error) {
            console.error('Error getting transfer count:', error);
            return 0;
        }
        return count || 0;
    }
};
