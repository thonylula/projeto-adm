import { supabase } from '../../supabaseClient';

export const transferService = {
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
