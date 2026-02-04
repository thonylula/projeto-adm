
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { getOrchestrator } from '../services/agentService';
import { showToast } from '../components/shared';
import { BiometricsService } from '../services/biometricsService';

export function useBiometrics(isPublic: boolean = false, initialFilter: string = '') {
    const [step, setStep] = useState<'UPLOAD' | 'PROCESSING' | 'DASHBOARD'>(isPublic ? 'DASHBOARD' : 'UPLOAD');
    const [currentData, setCurrentData] = useState<any[]>([]);
    const [biometricsHistory, setBiometricsHistory] = useState<any[]>([]);
    const [biometryDate, setBiometryDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [needsSave, setNeedsSave] = useState(false);
    const [filterText, setFilterText] = useState(initialFilter);

    // Load initial data
    useEffect(() => {
        const load = async () => {
            const history = await SupabaseService.getBiometricsHistory();
            setBiometricsHistory(history || []);
            const latest = await SupabaseService.getLatestBiometry();
            if (latest?.data) {
                setCurrentData(latest.data);
                setStep('DASHBOARD');
            }
        };
        load();
    }, []);

    // Auto-save logic
    useEffect(() => {
        if (needsSave && currentData.length > 0) {
            const performSave = async () => {
                const label = `Biometria ${new Date(biometryDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
                try {
                    const success = await getOrchestrator().routeToAgent('biometry-storage', {
                        operation: 'save',
                        data: currentData,
                        label,
                        timestamp: new Date(biometryDate + 'T12:00:00').toISOString()
                    });
                    setNeedsSave(false);
                    if (success) {
                        showToast.success('✅ Biometria salva!');
                        const activeCompanyId = localStorage.getItem('activeCompanyId');
                        if (activeCompanyId) {
                            await SupabaseService.syncBiometryToMortality(activeCompanyId, new Date(biometryDate).getMonth() + 1, new Date(biometryDate).getFullYear());
                            window.dispatchEvent(new CustomEvent('app-data-updated'));
                        }
                        const updatedHistory = await getOrchestrator().routeToAgent('biometry-storage', { operation: 'list' });
                        setBiometricsHistory(updatedHistory || []);
                    }
                } catch (e) {
                    console.error(e);
                    setNeedsSave(false);
                }
            };
            performSave();
        }
    }, [needsSave, currentData, biometryDate]);

    // Sync with history helper
    const syncWithHistory = useCallback(() => {
        if (!currentData.length || !biometricsHistory.length) return;
        let hasChanges = false;
        const synced = currentData.map(item => {
            const history = biometricsHistory.find(r => r.data?.some((h: any) => BiometricsService.normalizePondName(h.viveiro) === BiometricsService.normalizePondName(item.viveiro)))?.data?.find((h: any) => BiometricsService.normalizePondName(h.viveiro) === BiometricsService.normalizePondName(item.viveiro));
            if (!history) return item;
            const updated = { ...item };
            let changed = false;
            if (!item.dataPovoamento && history.dataPovoamento) { updated.dataPovoamento = history.dataPovoamento; changed = true; }
            if ((!item.quat || item.quat === 0) && history.quat) { updated.quat = history.quat; changed = true; }
            if (changed) hasChanges = true;
            return changed ? updated : item;
        });
        if (hasChanges) {
            setCurrentData(synced);
            showToast.success("🔄 Dados sincronizados!");
        }
    }, [currentData, biometricsHistory]);

    const handleProcessAI = async (file: File) => {
        setStep('PROCESSING');
        try {
            const extraction = await getOrchestrator().routeToAgent('biometry-data', { image: file });
            if (Array.isArray(extraction.data)) {
                setCurrentData(BiometricsService.sortData(extraction.data));
                setStep('DASHBOARD');
                showToast.success('✅ Processado pela IA');
            }
        } catch (e) { console.error(e); setStep('DASHBOARD'); }
    };

    // Processed and filtered data for display
    const processedData = useMemo(() => {
        const filtered = currentData.filter(item =>
            (item.viveiro || '').toLowerCase().includes(filterText.toLowerCase())
        );

        const sortedData = BiometricsService.sortData(filtered.map(item => ({
            ...item,
            viveiro: (item.viveiro || '').toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005')
        })));

        return sortedData.map(item => {
            const pMed = typeof item.pMedStr === 'string' ? parseFloat(item.pMedStr.replace(',', '.')) : (typeof item.pMedStr === 'number' ? item.pMedStr : null);
            const pAnt = typeof item.pAntStr === 'string' ? parseFloat(item.pAntStr.replace(',', '.')) : (typeof item.pAntStr === 'number' ? item.pAntStr : null);
            const quat = typeof item.quat === 'string' ? parseFloat(item.quat.replace(',', '.')) : (typeof item.quat === 'number' ? item.quat : null);

            let doc = item.diasCultivo || 0;
            if (item.dataPovoamento && biometryDate) {
                doc = BiometricsService.calculateDaysCultivo(item.dataPovoamento, biometryDate);
            }

            const targets = BiometricsService.calculateTargets(doc);
            let analysisStatus = "Aguardando";
            let rowBgColor = "";
            let statusTextColor = "text-gray-400";

            if (pMed !== null && doc > 0) {
                if (pMed >= targets.espetacular) {
                    analysisStatus = `💥 ESPETACULAR: Topo de Linha!(> ${targets.espetacular.toFixed(2)}g)`;
                    rowBgColor = "bg-[#FFEDD5] hover:bg-[#FED7AA]"; statusTextColor = "text-[#7C2D12] font-extrabold";
                } else if (pMed >= targets.otimo) {
                    analysisStatus = `🔥 ÓTIMO: Acima da meta(${targets.otimo.toFixed(2)}g)`;
                    rowBgColor = "bg-[#FFF7ED] hover:bg-[#FFEDD5]"; statusTextColor = "text-[#9A3412] font-bold";
                } else if (pMed >= targets.bom) {
                    analysisStatus = `💪 BOM: Dentro do esperado.`;
                    rowBgColor = "bg-white hover:bg-[#FFF7ED]"; statusTextColor = "text-[#C2410C] font-bold";
                } else if (pMed >= targets.regular) {
                    analysisStatus = `⚡ REGULAR: Atenção(${targets.regular.toFixed(2)}g)`;
                    rowBgColor = "bg-white hover:bg-orange-50/50"; statusTextColor = "text-[#EA580C] font-bold";
                } else if (pMed >= targets.ruim) {
                    analysisStatus = `⚠️ RUIM: Abaixo da média(< ${targets.regular.toFixed(2)} g)`;
                    rowBgColor = "bg-white hover:bg-orange-50/30"; statusTextColor = "text-[#F97316] font-bold";
                } else {
                    analysisStatus = `🚨 PÉSSIMO: Crítico(< ${targets.ruim.toFixed(2)} g)`;
                    rowBgColor = "bg-[#FEF2F2] hover:bg-[#FEE2E2]"; statusTextColor = "text-[#B91C1C] font-bold";
                }
            } else if (pMed === null) { analysisStatus = "Sem leitura"; }

            const incSemanal = (pMed !== null && pAnt !== null) ? pMed - pAnt : 0;
            const gpd = incSemanal / 7;
            const pesoTotal = (pMed !== null && quat !== null) ? ((pMed * quat) / 1000).toFixed(3) : (item.pesoTotalStr || "0.000");

            return {
                ...item,
                pMedInputValue: item.pMedStr || '',
                quatInputValue: item.quat || '',
                pMedDisplay: pMed || '-',
                pAntDisplay: pAnt || '-',
                diasCultivoDisplay: doc,
                incSemanalStr: incSemanal !== 0 ? (incSemanal > 0 ? `+ ${incSemanal.toFixed(2)}` : incSemanal.toFixed(2)) : "-",
                gpdDisplay: (pMed !== null && pAnt !== null) ? gpd.toFixed(3) : "-",
                analysisStatus,
                rowBgColor,
                statusTextColor,
                pesoTotal,
                hasBiometrics: pMed !== null && pMed > 0
            };
        });
    }, [currentData, filterText, biometryDate]);

    return {
        step, setStep, currentData, setCurrentData, biometricsHistory, setBiometricsHistory,
        biometryDate, setBiometryDate, loadedRecordId, setLoadedRecordId, isAnalyzing, setIsAnalyzing,
        setNeedsSave, filterText, setFilterText, handleProcessAI, syncWithHistory, processedData
    };
}
