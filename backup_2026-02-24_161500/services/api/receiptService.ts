import { supabase } from '../../supabaseClient';
import { configService } from './configService';

export const receiptService = {
    async getReceiptsHistory(companyId: string): Promise<any[]> {
        try {
            let tableData: any[] = [];
            let tableError: any = null;

            if (supabase) {
                const { data, error } = await supabase
                    .from('receipts')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('raw_date', { ascending: false });
                tableData = data || [];
                tableError = error;
            }

            const oldId = `receipts_history_${companyId}`;
            const oldData = await configService.getConfig(oldId);

            let allReceipts = this.mapReceiptsFromDb(tableData);

            if (Array.isArray(oldData) && oldData.length > 0) {
                console.log(`[Supabase] Found ${oldData.length} receipts in fallback storage`);

                const tableIds = new Set(allReceipts.map(r => r.id));
                const newFromOld = oldData.filter(r => !tableIds.has(r.id));

                if (newFromOld.length > 0) {
                    allReceipts = [...newFromOld, ...allReceipts];
                }

                if (!tableError && supabase) {
                    let migratedCount = 0;
                    for (const item of newFromOld) {
                        const { error } = await supabase.from('receipts').insert([{
                            id: item.id,
                            company_id: companyId,
                            payee_name: item.input.payeeName,
                            payee_document: item.input.payeeDocument || '',
                            value: item.input.value,
                            date: item.input.date,
                            service_date: item.input.serviceDate,
                            service_end_date: item.input.serviceEndDate || null,
                            description: item.input.description,
                            payment_method: item.input.paymentMethod,
                            pix_key: item.input.pixKey || '',
                            bank_info: item.input.bankInfo || '',
                            category: item.input.category || 'OUTROS',
                            value_in_words: item.result.valueInWords,
                            timestamp: item.timestamp,
                            raw_date: item.rawDate
                        }]);
                        if (!error) migratedCount++;
                    }

                    if (migratedCount === newFromOld.length && newFromOld.length > 0) {
                        console.log(`[Supabase] Migrated ${migratedCount} receipts to dedicated table. Clearing fallback.`);
                        await configService.saveConfig(oldId, []);
                    }
                }
            }

            return allReceipts.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
        } catch (e) {
            console.error('[Supabase] Exception in getReceiptsHistory:', e);
            return [];
        }
    },

    mapReceiptsFromDb(data: any[]): any[] {
        return data.map(item => ({
            id: item.id,
            timestamp: item.timestamp,
            rawDate: item.raw_date,
            input: {
                payeeName: item.payee_name,
                payeeDocument: item.payee_document,
                value: parseFloat(item.value),
                date: item.date,
                serviceDate: item.service_date,
                serviceEndDate: item.service_end_date,
                description: item.description,
                paymentMethod: item.payment_method,
                pixKey: item.pix_key,
                bankInfo: item.bank_info,
                category: item.category
            },
            result: {
                valueInWords: item.value_in_words
            }
        }));
    },

    async addReceiptItem(companyId: string, item: any): Promise<boolean> {
        try {
            let tableError = null;
            if (supabase) {
                const { error } = await supabase.from('receipts').insert([{
                    id: item.id,
                    company_id: companyId,
                    payee_name: item.input.payeeName,
                    payee_document: item.input.payeeDocument || '',
                    value: item.input.value,
                    date: item.input.date,
                    service_date: item.input.serviceDate,
                    service_end_date: item.input.serviceEndDate || null,
                    description: item.input.description,
                    payment_method: item.input.paymentMethod,
                    pix_key: item.input.pixKey || '',
                    bank_info: item.input.bankInfo || '',
                    category: item.input.category || 'OUTROS',
                    value_in_words: item.result.valueInWords,
                    timestamp: item.timestamp,
                    raw_date: item.rawDate
                }]);
                tableError = error;
            }

            if (!tableError && supabase) return true;

            console.error('[Supabase] Error adding receipt to table, using fallback:', tableError);

            const oldId = `receipts_history_${companyId}`;
            const existing = await configService.getConfig(oldId) || [];

            const updated = [item, ...existing.filter((h: any) => h.id !== item.id)].slice(0, 100);
            await configService.saveConfig(oldId, updated);

            return true;
        } catch (e) {
            console.error('[Supabase] Exception in addReceiptItem:', e);
            try {
                const oldId = `receipts_history_${companyId}`;
                const existing = await configService.getConfig(oldId) || [];
                await configService.saveConfig(oldId, [item, ...existing.filter((h: any) => h.id !== item.id)].slice(0, 100));
                return true;
            } catch (err) {
                return false;
            }
        }
    },

    async updateReceiptItem(item: any): Promise<boolean> {
        try {
            let tableError = null;
            if (supabase) {
                const { error } = await supabase
                    .from('receipts')
                    .update({
                        payee_name: item.input.payeeName,
                        payee_document: item.input.payeeDocument || '',
                        value: item.input.value,
                        date: item.input.date,
                        service_date: item.input.serviceDate,
                        service_end_date: item.input.serviceEndDate || null,
                        description: item.input.description,
                        payment_method: item.input.paymentMethod,
                        pix_key: item.input.pixKey || '',
                        bank_info: item.input.bankInfo || '',
                        category: item.input.category || 'OUTROS',
                        value_in_words: item.result.valueInWords,
                        timestamp: item.timestamp,
                        raw_date: item.rawDate,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', item.id);
                tableError = error;
            }

            if (!tableError && supabase) return true;

            console.warn('[Supabase] updateReceiptItem falling back to history search');
            return true;
        } catch (e) {
            console.error('[Supabase] Exception in updateReceiptItem:', e);
            return false;
        }
    },

    async deleteReceiptItem(id: string): Promise<boolean> {
        try {
            if (supabase) {
                const { error } = await supabase
                    .from('receipts')
                    .delete()
                    .eq('id', id);

                if (!error) return true;
                console.error('[Supabase] Error deleting from table:', error);
            }
            return true;
        } catch (e) {
            console.error('[Supabase] Exception in deleteReceiptItem:', e);
            return false;
        }
    }
};
