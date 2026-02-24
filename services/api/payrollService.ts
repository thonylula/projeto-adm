import { supabase } from '../../supabaseClient';
import { PayrollHistoryItem } from '../../types';

export const payrollService = {
    async getPayrollHistory(companyId: string): Promise<PayrollHistoryItem[]> {
        try {
            const { data, error } = await supabase
                .from('payroll_history')
                .select('*')
                .eq('company_id', companyId)
                .order('raw_date', { ascending: false });

            if (error || !data) return [];
            return data.map(item => ({
                id: item.id,
                timestamp: item.timestamp,
                rawDate: item.raw_date,
                input: item.input,
                result: item.result
            }));
        } catch (e) {
            console.error("[Supabase] Error in getPayrollHistory:", e);
            return [];
        }
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
    }
};
