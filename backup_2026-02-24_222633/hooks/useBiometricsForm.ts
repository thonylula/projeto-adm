
import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { getOrchestrator } from '../services/agentService';
import { useBiometricsData } from './useBiometricsData';

type ViewStep = 'UPLOAD' | 'PROCESSING' | 'DASHBOARD';

export const useBiometricsForm = (isPublic: boolean = false, isModal: boolean = false, initialFilter: string = '') => {
    const [step, setStep] = useState<ViewStep>(isPublic ? 'DASHBOARD' : (isModal ? 'DASHBOARD' : 'UPLOAD'));
    const [logo, setLogo] = useState<string | null>(null);
    const [currentData, setCurrentData] = useState<any[]>([]);
    const [biometricsHistory, setBiometricsHistory] = useState<any[]>([]);
    const [biometryDate, setBiometryDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [needsSave, setNeedsSave] = useState(false);
    const [filterText, setFilterText] = useState(initialFilter);
    const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });

    const { sortData } = useBiometricsData([], '', ''); // Use temporarily for sorting internal state

    const showToast = useCallback((msg: string) => {
        setToast({ msg, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    }, []);

    // --- CARREGAMENTO INICIAL ---
    useEffect(() => {
        const load = async () => {
            const savedLogo = await SupabaseService.getConfig('biometry_company_logo');
            if (savedLogo) setLogo(savedLogo);

            const history = await SupabaseService.getBiometricsHistory();
            setBiometricsHistory(history);

            const latest = await SupabaseService.getLatestBiometry();
            if (latest && latest.data) {
                setCurrentData(latest.data);
                setStep('DASHBOARD');
            } else if (isPublic) {
                setStep('DASHBOARD');
            }
        };
        load();
    }, [isPublic]);

    // --- PERSISTÊNCIA AUTOMÁTICA ---
    useEffect(() => {
        const performSave = async () => {
            if (needsSave && currentData.length > 0 && !isPublic) {
                const label = `Biometria ${new Date(biometryDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
                const orchestrator = getOrchestrator();

                showToast('Salvando biometria...');
                try {
                    const success = await orchestrator.routeToAgent('biometry-storage', {
                        operation: 'save',
                        data: currentData,
                        label: label,
                        timestamp: new Date(biometryDate + 'T12:00:00').toISOString()
                    });

                    setNeedsSave(false);
                    if (success) {
                        showToast('✅ Biometria salva com sucesso!');

                        // Sincronização com Mortalidade
                        const activeCompanyId = localStorage.getItem('activeCompanyId');
                        if (activeCompanyId) {
                            const bioDate = new Date(biometryDate + 'T12:00:00');
                            await SupabaseService.syncBiometryToMortality(activeCompanyId, bioDate.getMonth() + 1, bioDate.getFullYear());
                            window.dispatchEvent(new CustomEvent('app-data-updated'));
                        }

                        const updatedHistory = await orchestrator.routeToAgent('biometry-storage', { operation: 'list' });
                        setBiometricsHistory(updatedHistory);
                    } else {
                        showToast('❌ Erro ao salvar biometria.');
                    }
                } catch (error) {
                    console.error("Save error", error);
                    showToast('❌ Erro ao salvar biometria.');
                    setNeedsSave(false);
                }
            } else if (needsSave && isPublic) {
                setNeedsSave(false);
                showToast('⚠️ Modo Mostruário: Não é possível salvar alterações.');
            }
        };
        performSave();
    }, [needsSave, currentData, biometryDate, isPublic, showToast]);

    // --- LÓGICA DE IA ---
    const handleProcessAI = async (file: File) => {
        setStep('PROCESSING');
        const orchestrator = getOrchestrator();
        try {
            const extraction = await orchestrator.routeToAgent('biometry-data', { image: file });
            const result = extraction.data;

            if (Array.isArray(result)) {
                setCurrentData(sortData(result));
                setStep('DASHBOARD');
                showToast(`✅ IA: ${result.length} viveiros processados!`);
            } else {
                throw new Error("Resposta da IA inválida.");
            }
        } catch (error: any) {
            console.error("Erro AI:", error);
            showToast(`❌ Erro IA: ${error.message}`);
            setStep('DASHBOARD');
        }
    };

    // --- HELPERS DE MANIPULAÇÃO ---
    const handleUpdateRow = useCallback((viveiroKey: string, field: string, value: any) => {
        setCurrentData(prev => {
            const updated = prev.map(item => {
                if (item.viveiro === viveiroKey) {
                    return { ...item, [field]: value };
                }
                return item;
            });
            return sortData(updated);
        });
    }, [sortData]);

    const handleCopy = useCallback((text: string | number | null, label: string) => {
        if (!text || text === '-' || text === 'N/A') return;
        const val = String(text);
        navigator.clipboard.writeText(val).then(() => {
            showToast(`${label} copiado: ${val}`);
        });
    }, [showToast]);

    // --- GERENCIAMENTO DE HISTÓRICO ---
    const handleLoadHistory = useCallback((item: any) => {
        if (!item || !item.data) return;
        setCurrentData(sortData(item.data));
        setBiometryDate(item.timestamp.split('T')[0]);
        setLoadedRecordId(item.id);
        setStep('DASHBOARD');
        showToast('🕒 Histórico carregado!');
    }, [sortData, showToast]);

    const handleDeleteHistory = useCallback(async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!window.confirm('Excluir esta biometria permanentemente?')) return;

        const success = await getOrchestrator().routeToAgent('biometry-storage', { operation: 'delete', id });
        if (success) {
            setBiometricsHistory(prev => prev.filter(h => h.id !== id));
            showToast('🗑️ Biometria excluída.');
        }
    }, [showToast]);

    const handleDeleteSelectedHistory = useCallback(async (selectedIds: string[]) => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Excluir as ${selectedIds.length} biometrias selecionadas?`)) return;

        const orchestrator = getOrchestrator();
        let count = 0;
        for (const id of selectedIds) {
            const success = await orchestrator.routeToAgent('biometry-storage', { operation: 'delete', id });
            if (success) count++;
        }

        const history = await SupabaseService.getBiometricsHistory();
        setBiometricsHistory(history);
        showToast(`🗑️ ${count} biometrias excluídas.`);
    }, [showToast]);

    const handleDeleteAllHistory = useCallback(async () => {
        if (!window.confirm('LIMPAR TODO O HISTÓRICO? Esta ação não pode ser desfeita.')) return;

        const success = await getOrchestrator().routeToAgent('biometry-storage', { operation: 'clear' });
        if (success) {
            setBiometricsHistory([]);
            showToast('💥 Histórico limpo!');
        }
    }, [showToast]);

    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');

    const handleReset = useCallback(() => {
        setStep('UPLOAD');
        setFiles([]);
        setTextInput('');
        setLoadedRecordId(null);
    }, []);

    const handleAddNewTank = useCallback((tankData: { viveiro: string; dataPovoamento: string; quat: string }) => {
        if (!tankData.viveiro) {
            showToast('⚠️ Digite o nome do viveiro.');
            return false;
        }

        const newRecord = {
            viveiro: tankData.viveiro.toUpperCase().trim(),
            dataPovoamento: tankData.dataPovoamento || null,
            quat: tankData.quat ? parseFloat(tankData.quat) : null,
            pMedStr: '',
            pAntStr: '',
            pesoTotalStr: '',
            diasCultivo: 0
        };

        setCurrentData(prev => sortData([...prev, newRecord]));
        setNeedsSave(true);
        showToast(`✅ Viveiro ${newRecord.viveiro} adicionado!`);
        return true;
    }, [sortData, showToast]);

    const handleDeleteRow = useCallback((viveiro: string) => {
        if (window.confirm(`Tem certeza que deseja remover o viveiro ${viveiro}?`)) {
            setCurrentData(prev => prev.filter(item => item.viveiro !== viveiro));
            showToast(`🗑️ Viveiro ${viveiro} removido.`);
            setNeedsSave(true);
        }
    }, [showToast]);

    return {
        step, setStep,
        logo, setLogo,
        currentData, setCurrentData,
        biometricsHistory, setBiometricsHistory,
        biometryDate, setBiometryDate,
        loadedRecordId, setLoadedRecordId,
        isAnalyzing, setIsAnalyzing,
        needsSave, setNeedsSave,
        filterText, setFilterText,
        toast, showToast,
        files, setFiles,
        textInput, setTextInput,
        handleProcessAI,
        handleUpdateRow,
        handleCopy,
        handleLoadHistory,
        handleDeleteHistory,
        handleDeleteSelectedHistory,
        handleDeleteAllHistory,
        handleReset,
        handleAddNewTank,
        handleDeleteRow
    };
};
