import { biometricsService } from './biometricsService';
import { configService } from './configService';

export const aquacultureService = {
    // --- AQUACULTURE HISTORY ---
    async getAquacultureHistory(): Promise<any[]> {
        return (await configService.getConfig('aquaculture_history')) || [];
    },

    async saveAquacultureHistory(history: any[]): Promise<boolean> {
        const { success } = await configService.saveConfig('aquaculture_history', history);
        return success;
    },

    async getAquacultureInitialStockings(): Promise<Record<string, number>> {
        return (await configService.getConfig('aquaculture_initial_stockings')) || {};
    },

    async saveAquacultureInitialStockings(stockings: Record<string, number>): Promise<boolean> {
        const { success } = await configService.saveConfig('aquaculture_initial_stockings', stockings);
        return success;
    },

    async syncBiometryToMortality(companyId: string, month: number, year: number): Promise<boolean> {
        try {
            // 1. Get latest biometry
            const latestBiometry = await biometricsService.getLatestBiometry();
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
