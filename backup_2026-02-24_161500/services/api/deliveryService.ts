import { supabase } from '../../supabaseClient';

export const deliveryService = {
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
    }
};
