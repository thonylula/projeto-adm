import { supabase } from '../../supabaseClient';
import { Viveiro } from '../../types';

export const viveirosService = {
    async getViveiros(companyId: string): Promise<Viveiro[]> {
        const { data, error } = await supabase
            .from('viveiros')
            .select('*')
            .eq('company_id', companyId)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching viveiros:', error);
            return [];
        }
        return data || [];
    },

    async saveViveiro(viveiro: Partial<Viveiro>): Promise<boolean> {
        const { error } = await supabase
            .from('viveiros')
            .upsert([viveiro]);

        if (error) {
            console.error('Error saving viveiro:', error);
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

    async addViveiro(viveiro: { company_id: string; name: string; tipo: string; coordinates: any[]; area_m2: number; unit_area?: string; status?: string; notes?: string }): Promise<any | null> {
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

    async updateViveiro(id: string, updates: { name?: string; tipo?: string; coordinates?: any[]; area_m2?: number; unit_area?: string; status?: string; notes?: string }): Promise<boolean> {
        const { error, data } = await supabase
            .from('viveiros')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating viveiro:', error);
            return false;
        }

        if (!data || data.length === 0) {
            console.warn('Update succeeded but no rows returned. Check RLS or ID mismatch for ID:', id);
            return false;
        }

        return true;
    }
};
