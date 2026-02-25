import { supabase } from '../../supabaseClient';
import { configService } from './configService';

export const biometricsService = {
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

    async deleteBiometriesBulk(ids: string[]): Promise<{ success: boolean; count: number }> {
        if (!ids || ids.length === 0) return { success: true, count: 0 };

        const { error, count } = await supabase
            .from('biometrics')
            .delete()
            .in('id', ids);

        if (error) {
            console.error('Error bulk deleting biometrics:', error);
            return { success: false, count: 0 };
        }
        return { success: true, count: count || ids.length };
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

    async syncBiometryToMortality(companyId: string, month: number, year: number): Promise<boolean> {
        try {
            // 1. Get latest biometry
            const latestBiometry = await this.getLatestBiometry();
            if (!latestBiometry || !latestBiometry.data) return false;

            // 2. Get current mortality data for the target period
            const mortalityData = await configService.getMortalityData(companyId, month, year);
            if (!mortalityData || !mortalityData.records) return false;

            // 3. Helper to normalize names for better matching
            const normalize = (name: string) => (name || '').toUpperCase().trim().replace(/[^A-Z0-9]/g, '');

            // 4. Update biometry in mortality records
            let hasChanges = false;
            const updatedRecords = mortalityData.records.map((record: any) => {
                const normalizedRecordName = normalize(record.ve);

                // Find matching pond in biometry data
                const match = latestBiometry.data.find((bioItem: any) => {
                    const normalizedBioName = normalize(bioItem.viveiro);
                    return normalizedBioName === normalizedRecordName ||
                        normalizedBioName.endsWith(normalizedRecordName) ||
                        normalizedRecordName.endsWith(normalizedBioName);
                });

                if (match && match.pMedStr) {
                    const newVal = match.pMedStr.replace(',', '.');
                    if (record.biometry !== newVal) {
                        hasChanges = true;
                        return { ...record, biometry: newVal };
                    }
                }
                return record;
            });

            if (!hasChanges) return true;

            // 5. Save updated mortality data
            const { success } = await configService.saveMortalityData(companyId, month, year, {
                ...mortalityData,
                records: updatedRecords
            });

            return success;
        } catch (error) {
            console.error('[Supabase] Sync error:', error);
            return false;
        }
    }
};
