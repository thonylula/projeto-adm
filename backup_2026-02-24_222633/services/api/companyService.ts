import { supabase } from '../../supabaseClient';
import { StorageService } from '../storageService';
import { Company } from '../../types';
import { payrollService } from './payrollService';

export const companyService = {
    async getCompanies(): Promise<Company[]> {
        const { data, error } = await supabase
            .from('companies')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error("Error fetching companies:", error);
            return [];
        }

        const companiesWithHistory = await Promise.all((data || []).map(async (company) => {
            const history = await payrollService.getPayrollHistory(company.id);
            return {
                ...company,
                logoUrl: company.logo_url, // Map DB snake_case to CamelCase
                employees: history
            };
        }));

        return companiesWithHistory;
    },

    async addCompany(name: string, cnpj?: string, logoUrl?: string | null): Promise<Company | null> {
        let finalLogoUrl = logoUrl;

        // If it's a new logo (base64 from UI), upload it
        if (logoUrl && logoUrl.startsWith('data:')) {
            const fileName = `logo_${Date.now()}.png`;
            const uploadedUrl = await StorageService.uploadFile('logos', fileName, logoUrl);
            if (uploadedUrl) finalLogoUrl = uploadedUrl;
        }

        const { data, error } = await supabase
            .from('companies')
            .insert([{ name, cnpj, logo_url: finalLogoUrl }])
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
        let finalLogoUrl = company.logoUrl;

        // Handle logo upload if it's base64
        if (company.logoUrl && company.logoUrl.startsWith('data:')) {
            const fileName = `logo_${company.id}_${Date.now()}.png`;
            const uploadedUrl = await StorageService.uploadFile('logos', fileName, company.logoUrl);
            if (uploadedUrl) finalLogoUrl = uploadedUrl;
        }

        const { error } = await supabase
            .from('companies')
            .update({
                name: company.name,
                cnpj: company.cnpj,
                logo_url: finalLogoUrl
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
    }
};
