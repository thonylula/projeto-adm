import { supabase } from '../../supabaseClient';

export const comparisonService = {
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
    }
};
