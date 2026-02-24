import { supabase } from '../../supabaseClient';
import { ItemConfiguration } from '../../types';

export const configService = {
    // --- GLOBAL CONFIGS ---
    async getConfig(id: string): Promise<any | null> {
        try {
            const { data, error } = await supabase
                .from('global_configs')
                .select('value')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.warn(`[Supabase] Erro ao buscar config ${id}:`, error.message);
                return null;
            }
            return data?.value || null;
        } catch (e) {
            return null;
        }
    },

    async saveConfig(id: string, value: any): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('global_configs')
                .upsert({ id, value }, { onConflict: 'id' });

            if (error) {
                console.error(`[Supabase Error] saveConfig(${id}):`, error.message, error.details);
                return { success: false, error: `${error.code} - ${error.message}` };
            }
            return { success: true };
        } catch (e: any) {
            console.error(`[Supabase Exception] saveConfig(${id}):`, e);
            return { success: false, error: e.message || 'Unknown Exception' };
        }
    },

    // --- BASKET CONFIGS ---
    async getBasketConfigs(): Promise<ItemConfiguration[]> {
        try {
            const { data, error } = await supabase.from('basket_item_configs').select('*');
            if (error || !data) return [];
            return data.map(item => ({ id: item.id, description: item.description, config: item.config }));
        } catch (e) {
            console.error("[Supabase] Error in getBasketConfigs:", e);
            return [];
        }
    },

    async saveBasketConfigs(configs: ItemConfiguration[]): Promise<boolean> {
        const { error } = await supabase.from('basket_item_configs').upsert(
            configs.map(c => ({ description: c.description, config: c.config }))
        );
        return !error;
    },

    // --- MORTALITY DATA ---
    async getMortalityData(companyId: string, month: number, year: number): Promise<any | null> {
        const id = `mortality_${companyId}_${year}_${month}`;
        return this.getConfig(id);
    },

    async saveMortalityData(companyId: string, month: number, year: number, data: any): Promise<{ success: boolean; error?: string }> {
        const id = `mortality_${companyId}_${year}_${month}`;
        return this.saveConfig(id, data);
    }
};
