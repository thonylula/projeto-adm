// [AI-LOCK: OPEN]
import React, { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { safeIncludes } from '../utils';
import { getOrchestrator } from '../services/agentService';
import { SupabaseService } from '../services/supabaseService';

const DEFAULT_LOGO = "https://lh3.googleusercontent.com/d/1dxnfHKS09Mu424q1TiXUcUB6WJhAjWrG"; // Logo Carapitanga Oficial
const SHRIMP_LOGO = "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%270%200%20100%20100%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M78%2035C75%2025%2065%2018%2052%2018C35%2018%2022%2030%2022%2048C22%2062%2030%2072%2040%2078C45%2081%2052%2082%2058%2080%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%276%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M25%2045C28%2042%2035%2040%2040%2042%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M26%2055C30%2052%2038%2050%2044%2052%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M32%2065C36%2062%2044%2060%2050%2062%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M78%2035C82%2038%2084%2045%2080%2052C76%2058%2070%2060%2065%2058%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%276%27%20stroke-linecap%3D%27round%27%2F%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2732%27%20r%3D%273%27%20fill%3D%27black%27%2F%3E%3Cpath%20d%3D%27M78%2035C85%2025%2095%2020%2098%2015%27%20stroke%3D%27%23ea580c%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M75%2035C85%2010%2060%205%2050%208%27%20stroke%3D%27%23ea580c%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M58%2080L62%2088M58%2080L54%2090M58%2080L66%2085%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%274%27%20stroke-linecap%3D%27round%27%2F%3E%3C%2Fsvg%3E";

// --- TABELA DE REFERÊNCIA DE CRESCIMENTO (ATUALIZADA) ---
const GROWTH_TABLE = [
    { day: 30, espetacular: 1.8, otimo: 1.5, bom: 1.2, regular: 0.8, ruim: 0.4, pessimo: 0.2 },
    { day: 60, espetacular: 7.5, otimo: 6.5, bom: 6.0, regular: 4.5, ruim: 2.5, pessimo: 1.2 },
    { day: 90, espetacular: 17.5, otimo: 15.5, bom: 12.0, regular: 8.5, ruim: 5.0, pessimo: 2.5 },
    { day: 120, espetacular: 22.0, otimo: 20.0, bom: 16.0, regular: 12.0, ruim: 8.0, pessimo: 4.0 },
];

// --- DADOS BRUTOS PADRÃO (Cenários de Teste) ---
// --- DADOS BRUTOS PADRÃO (Vazio para evitar alucinações) ---
const defaultRawData: any[] = [];

// --- MANCHETES DE NOTÍCIAS (Carcinicultura) ---
const NEWS_HEADLINES_SOURCE = [
    "🦐 Última Hora: Exportações de camarão Vannamei batem recorde no trimestre.",
    "📈 Mercado Asiático: Demanda por camarão brasileiro cresce 22% este mês.",
    "🌊 Tecnologia: Novo sensor de oxigênio reduz custos de energia em 15%.",
    "🧬 Genética: Linhagem 'Turbo' mostra resistência superior a mancha branca.",
    "🇧🇷 Ceará: Produtores investem em berçários intensivos para reduzir ciclo.",
    "💰 Economia: Custo da ração apresenta leve queda no mercado internacional.",
    "🌱 Sustentabilidade: Fazendas com certificação ASC ganham prêmio na Europa.",
    "🤝 Evento: FENACAM confirma datas e promete trazer IA para o campo.",
    "🤖 Inovação: O APP gera a ordem correta dos viveiros e permite filtros.",
    "🌍 Europa: Aumenta a procura por camarão processado e descascado.",
    "📊 Relatório: Conversão alimentar média do setor melhora para 1.4.",
    "🧪 Nutrição: Uso de ácidos orgânicos melhora sobrevivência em 10%.",
    "🚚 Logística: Nova rota de exportação via Rio Grande do Norte é inaugurada.",
    "🦠 Sanitário: Monitoramento preventivo evita surtos de vibriose no estado.",
    "💡 Dica: Aeração estratégica no período noturno otimiza crescimento."
];

type ViewStep = 'UPLOAD' | 'PROCESSING' | 'DASHBOARD';

export const BiometricsManager: React.FC<{ isPublic?: boolean; initialFilter?: string; isModal?: boolean; isDarkMode?: boolean }> = ({ isPublic = false, initialFilter = '', isModal = false, isDarkMode = false }) => {
    const [step, setStep] = useState<ViewStep>(isPublic ? 'DASHBOARD' : (isModal ? 'DASHBOARD' : 'UPLOAD')); // Modal assumes we want to see data if available
    const [logo, setLogo] = useState<string | null>(DEFAULT_LOGO);
    const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [currentData, setCurrentData] = useState<any[]>(defaultRawData);
    const [biometricsHistory, setBiometricsHistory] = useState<any[]>([]);
    const [showAIUpload, setShowAIUpload] = useState(false);
    const [needsSave, setNeedsSave] = useState(false);
    const [biometryDate, setBiometryDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [filterText, setFilterText] = useState(initialFilter);
    const [showReferenceTable, setShowReferenceTable] = useState(false);
    const [showNewBiometryOptions, setShowNewBiometryOptions] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showAddTankModal, setShowAddTankModal] = useState(false);
    const [newTankData, setNewTankData] = useState({ viveiro: '', dataPovoamento: '', quat: '' });

    // --- NEWS ROTATION STATE ---
    const [newsList, setNewsList] = useState<string[]>(NEWS_HEADLINES_SOURCE);
    const [newsIndex, setNewsIndex] = useState(0);

    const dashboardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const aiFileInputRef = useRef<HTMLInputElement>(null);

    // --- PERSISTÊNCIA AUTOMÁTICA (SUPABASE) ---
    useEffect(() => {
        const load = async () => {
            // Carregar logo persistente
            const savedLogo = await SupabaseService.getConfig('biometry_company_logo');
            if (savedLogo) setLogo(savedLogo);

            // Carregar histórico completo
            const history = await SupabaseService.getBiometricsHistory();
            setBiometricsHistory(history);

            // Carregar última biometria para exibir
            const latest = await SupabaseService.getLatestBiometry();
            if (latest && latest.data) {
                setCurrentData(latest.data);
                setStep('DASHBOARD');
            }
        };
        load();
    }, []);

    // Auto-save quando needsSave é true
    useEffect(() => {
        const performSave = async () => {
            if (needsSave && currentData.length > 0) {
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
                        // Recarregar histórico usando o agente
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
            }
        };
        performSave();
    }, [needsSave, currentData, biometryDate]);


    // --- RE-CALCULAR DIAS QUANDO MUDA DATA DA BIOMETRIA ---
    useEffect(() => {
        if (currentData.length > 0) {
            setCurrentData(prev => prev.map(item => {
                let itemDataPovoamento = item.dataPovoamento;
                if (!itemDataPovoamento) return item;

                // Normalização robusta de data (DD/MM/YY ou DD/MM/YYYY para YYYY-MM-DD)
                if (itemDataPovoamento.includes('/')) {
                    let [d, m, y] = itemDataPovoamento.split('/');
                    if (y && y.length === 2) y = '20' + y;
                    if (y && m && d) itemDataPovoamento = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                }

                try {
                    const pDate = new Date(itemDataPovoamento + 'T12:00:00');
                    const bDate = new Date(biometryDate + 'T12:00:00');
                    if (!isNaN(pDate.getTime()) && !isNaN(bDate.getTime())) {
                        const diffTime = (bDate.getTime() - pDate.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        return { ...item, dataPovoamento: itemDataPovoamento, diasCultivo: diffDays > 0 ? diffDays : 0 };
                    }
                } catch (e) { }
                return item;
            }));
        }
    }, [biometryDate, currentData.length]); // Added currentData.length to ensure it runs when new ponds are added

    // --- BACKUP MANUAL (ARQUIVO JSON) ---
    const saveBackup = () => {
        const json = JSON.stringify(currentData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
        a.download = 'backup_biometria_' + dateStr + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Backup salvo na pasta de Downloads!");
    };

    const loadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                if (Array.isArray(parsed)) {
                    setCurrentData(parsed);
                    setStep('DASHBOARD');
                    showToast("Backup carregado com sucesso!");
                } else {
                    showToast("Erro: Arquivo inválido (não é uma lista).");
                }
            } catch (err) {
                showToast("Erro: Arquivo corrompido ou inválido.");
            }
        };
        reader.readAsText(file);
    };

    // --- EFEITO DE NOTÍCIAS (Shuffle e Rotação) ---
    useEffect(() => {
        // Embaralha as notícias ao montar o componente para parecer sempre "fresco"
        const shuffled = [...NEWS_HEADLINES_SOURCE].sort(() => 0.5 - Math.random());
        setNewsList(shuffled);
    }, []);

    useEffect(() => {
        let interval: any;
        if (step === 'PROCESSING') {
            interval = setInterval(() => {
                setNewsIndex(prev => (prev + 1) % newsList.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [step, newsList]);
    // --- HELPER: NORMALIZAÇÃO DE VIVEIROS ---
    const normalizePondName = (name: string) => {
        return (name || '').toUpperCase().trim().replace(/\s+/g, '').replace('OS-005', 'OC-005').replace('OS005', 'OC-005');
    };

    // --- HELPER: BUSCAR DADOS DO VIVEIRO NO HISTÓRICO ---
    const getPondDataFromHistory = (pondName: string) => {
        if (!biometricsHistory || biometricsHistory.length === 0) return { dataPovoamento: null, quat: null };

        const normalizedSearch = normalizePondName(pondName);

        // Percorrer histórico do mais recente para o mais antigo
        for (const record of biometricsHistory) {
            if (record.data && Array.isArray(record.data)) {
                const found = record.data.find((item: any) => {
                    return normalizePondName(item.viveiro) === normalizedSearch;
                });

                if (found && (found.dataPovoamento || found.quat)) {
                    return {
                        dataPovoamento: found.dataPovoamento || null,
                        quat: found.quat || null
                    };
                }
            }
        }
        return { dataPovoamento: null, quat: null };
    };

    // --- FUNÇÃO DE SINCRONIZAÇÃO COMPLETA ---
    const syncCurrentDataWithHistory = () => {
        if (currentData.length === 0 || biometricsHistory.length === 0) return;

        let hasChanges = false;
        const synced = currentData.map(item => {
            const history = getPondDataFromHistory(item.viveiro);
            const updated = { ...item };
            let changed = false;

            if (!item.dataPovoamento && history.dataPovoamento) {
                updated.dataPovoamento = history.dataPovoamento;
                changed = true;
            }
            if ((!item.quat || item.quat === 0) && history.quat) {
                updated.quat = history.quat;
                changed = true;
            }

            if (changed) {
                hasChanges = true;
                return updated;
            }
            return item;
        });

        if (hasChanges) {
            setCurrentData(synced);
            showToast("🔄 Dados sincronizados com o histórico!");
        }
    };

    // --- PROACTIVE SYNC: AUTO-FILL MISSING DATA FROM HISTORY ---
    useEffect(() => {
        syncCurrentDataWithHistory();
    }, [biometricsHistory.length, currentData.length]);

    // --- LÓGICA DE UPLOAD / INPUT ---
    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isAI: boolean = false) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            if (isAI) {
                handleProcessAI(selectedFiles[0]);
            }
        }
    };

    const handleProcessAI = async (file: File) => {
        setStep('PROCESSING');
        const orchestrator = getOrchestrator();
        try {
            const extraction = await orchestrator.routeToAgent('biometry-data', { image: file });
            const result = extraction.data;

            if (Array.isArray(result)) {
                const normalized = result.map(item => {
                    const viveiro = item.viveiro?.toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005') || item.viveiro;
                    const historyData = getPondDataFromHistory(viveiro);

                    // IA extracted values rounding
                    const quatRaw = item.quat || historyData.quat || null;
                    const pMedRaw = item.pMed || null;
                    let pesoTotalStr = item.pesoTotalStr || null;

                    if (!pesoTotalStr && pMedRaw && quatRaw) {
                        pesoTotalStr = ((pMedRaw * quatRaw) / 1000).toFixed(3);
                    }

                    return {
                        ...item,
                        viveiro,
                        dataPovoamento: item.dataPovoamento || historyData.dataPovoamento || null,
                        quat: quatRaw,
                        pesoTotalStr
                    };
                });

                setCurrentData(sortData(normalized));
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

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = async () => {
        setStep('PROCESSING');
        const orchestrator = getOrchestrator();

        if (files.length > 0) {
            try {
                const extraction = await orchestrator.routeToAgent('biometry-data', { image: files[0] });
                const result = extraction.data;

                if (Array.isArray(result)) {
                    // Normalização de Nomes e Datas
                    const normalized = result.map(item => {
                        const viveiro = item.viveiro?.toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005') || item.viveiro;
                        const historyData = getPondDataFromHistory(viveiro);

                        return {
                            ...item,
                            viveiro,
                            dataPovoamento: item.dataPovoamento || historyData.dataPovoamento || null,
                            quat: item.quat || historyData.quat || null
                        };
                    });

                    setCurrentData(sortData(normalized));
                    setTimeout(() => {
                        setStep('DASHBOARD');
                        showToast(`Sucesso: ${result.length} linhas extraídas.`);
                    }, 2000);
                } else {
                    throw new Error("Resposta da IA não é um array válido.");
                }
            } catch (error: any) {
                console.error("Erro AI:", error);
                showToast(`Erro: ${error.message || 'Falha ao processar arquivo'}`);
                setStep('UPLOAD');
            }
        }

        // --- 2. PROCESSAMENTO MANUAL ---
        if (textInput.trim()) {
            try {
                const parsed = JSON.parse(textInput);
                if (Array.isArray(parsed)) setCurrentData(parsed);
            } catch (e) {
                showToast('Erro no formato JSON manual.');
            }
        } else if (files.length === 0) {
            setCurrentData(defaultRawData);
        }

    };


    const handleReset = () => {
        setStep('UPLOAD');
        setFiles([]);
        setTextInput('');
        setLoadedRecordId(null);
    };

    const handleNewBiometry = () => {
        setShowNewBiometryOptions(true);
    };

    const startNewBiometryFromPrevious = () => {
        if (currentData.length === 0) {
            showToast('Nenhuma biometria anterior para carregar.');
            return;
        }

        setLoadedRecordId(null);
        // Copiar dados atuais e mover PM para P.Ant, limpar PM
        const newData = currentData.map(item => ({
            ...item,
            pAntStr: item.pMedStr || item.pAntStr, // PM anterior = PM atual (ou mantém anterior se PM estiver vazio)
            pMedStr: '', // Limpar PM para novo lançamento
            diasCultivo: item.diasCultivo, // Será recalculado automaticamente pela data
            dataPovoamento: item.dataPovoamento // Manter data de povoamento
        }));

        setCurrentData(newData);
        setShowNewBiometryOptions(false);
        showToast('✅ Biometria anterior carregada! Preencha os novos pesos médios.');
    };

    const startNewBiometryFromIA = () => {
        setShowNewBiometryOptions(false);
        aiFileInputRef.current?.click();
    };

    const handleAIAnalysis = async () => {
        if (currentData.length === 0) return;
        setIsAnalyzing(true);
        const orchestrator = getOrchestrator();

        try {
            // 1. Análise Técnica
            const analysis = await orchestrator.routeToAgent('biometry-analysis', currentData);

            // 2. Relatório Executivo
            const report = await orchestrator.routeToAgent('biometry-report', analysis);

            if (report.success) {
                alert(`📊 RELATÓRIO DE PERFORMANCE IA\n\n${report.formattedText}\n\nAlertas Críticos:\n${report.criticalAlerts.join('\n') || 'Nenhum'}`);
            }
        } catch (error: any) {
            console.error("AI Analysis Error", error);
            showToast(`❌ Erro na análise: ${error.message || 'Falha na comunicação com Agente'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveBiometry = () => {
        if (currentData.length === 0) {
            showToast('⚠️ Nenhum dado para salvar.');
            return;
        }
        setNeedsSave(true);
    };

    const handleLoadHistory = (record: any) => {
        if (record.data) {
            setCurrentData(record.data);
            setLoadedRecordId(record.id);
            // Tentar extrair a data do registro se disponível
            if (record.timestamp) {
                setBiometryDate(new Date(record.timestamp).toISOString().split('T')[0]);
            }
            setShowHistory(false);
            showToast('✅ Biometria carregada do histórico!');
        }
    };

    const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Deseja realmente excluir este registro do histórico?')) {
            const success = await SupabaseService.deleteBiometry(id);
            if (success) {
                setBiometricsHistory(prev => prev.filter(item => item.id !== id));
                if (loadedRecordId === id) setLoadedRecordId(null);
                showToast('Registro excluído com sucesso.');
            }
        }
    };

    const handleDeleteCurrent = async () => {
        if (!loadedRecordId) return;
        if (window.confirm('Deseja excluir este registro PERMANENTEMENTE do banco de dados?')) {
            const success = await SupabaseService.deleteBiometry(loadedRecordId);
            if (success) {
                setBiometricsHistory(prev => prev.filter(item => item.id !== loadedRecordId));
                setLoadedRecordId(null);
                setCurrentData(defaultRawData);
                setStep('UPLOAD');
                showToast('✅ Registro removido permanentemente.');
            }
        }
    };

    const handleDeleteAllHistory = async () => {
        if (biometricsHistory.length === 0) return;
        if (window.confirm('CUIDADO! Isso irá excluir TODO o histórico de biometrias para sempre. Deseja prosseguir?')) {
            // No SupabaseService, deleteBiometry apaga por ID. Precisamos de um delete all ou loop.
            // Para segurança e performance, usaremos um loop aqui mas seria ideal um RPC no Postgres.
            let count = 0;
            for (const item of biometricsHistory) {
                const ok = await SupabaseService.deleteBiometry(item.id);
                if (ok) count++;
                setBiometricsHistory([]);
                setLoadedRecordId(null);
                showToast(`✅ ${count} registros removidos do histórico.`);
            }
        }
    };

    const handleDeleteRow = (viveiro: string) => {
        if (window.confirm(`Tem certeza que deseja remover o viveiro ${viveiro}?`)) {
            setCurrentData(prev => prev.filter(item => item.viveiro !== viveiro));
            showToast(`🗑️ Viveiro ${viveiro} removido.`);
            setNeedsSave(true);
        }
    };

    // --- LÓGICA DE EDIÇÃO ---

    const handleAddNewTank = () => {
        if (!newTankData.viveiro) {
            showToast('⚠️ Digite o nome do viveiro.');
            return;
        }

        const newRecord = {
            viveiro: newTankData.viveiro.toUpperCase().trim(),
            dataPovoamento: newTankData.dataPovoamento || null,
            quat: newTankData.quat ? parseFloat(newTankData.quat) : null,
            // Campos padrão vazios para biometria
            pMedStr: '',
            pAntStr: '',
            pesoTotalStr: '',
            diasCultivo: 0
        };

        // Recalcular dias de cultivo se houver data
        if (newRecord.dataPovoamento) {
            try {
                const pDate = new Date(newRecord.dataPovoamento);
                const bioDate = new Date(biometryDate);
                const diffTime = Math.abs(bioDate.getTime() - pDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                newRecord.diasCultivo = diffDays;
            } catch (e) {
                console.error("Erro ao calcular dias para novo viveiro");
            }
        }

        setCurrentData(prev => sortData([...prev, newRecord]));
        setNewTankData({ viveiro: '', dataPovoamento: '', quat: '' });
        setShowAddTankModal(false);
        showToast(`✅ Viveiro ${newRecord.viveiro} adicionado!`);
        setNeedsSave(true);
    };
    // --- LÓGICA DE EDIÇÃO E CÁLCULOS ---

    // Helper de Ordenação (OC-01, OC-02...)
    // Helper de Ordenação (OC-01, OC-02... VP-01...)
    const sortData = (data: any[]) => {
        return [...data].sort((a, b) => {
            // Extrai prefixo (letras) e número
            const getParts = (str: string) => {
                const clean = str.toUpperCase().replace(/\s+/g, '');
                const match = clean.match(/^([A-Z]+)-?(\d+)/);
                if (match) {
                    return { prefix: match[1], num: parseInt(match[2]) };
                }
                return { prefix: clean, num: 9999 };
            };

            const partA = getParts(a.viveiro);
            const partB = getParts(b.viveiro);

            if (partA.prefix !== partB.prefix) {
                return partA.prefix.localeCompare(partB.prefix);
            }
            return partA.num - partB.num;
        });
    };

    const handleUpdateRow = (viveiroKey: string, field: 'pMedStr' | 'quat' | 'pesoTotalStr' | 'pAntStr' | 'dataPovoamento', value: string | number | null) => {
        setCurrentData(prev => {
            let updated = prev.map(item => {
                if (item.viveiro === viveiroKey) {
                    const newItem = { ...item, [field]: value };

                    // Auto-Cálculo de DIAS se mudar Data Povoamento
                    if (field === 'dataPovoamento' && value) {
                        try {
                            const pDate = new Date(value as string);
                            // Validar se data é válida antes de calcular
                            if (!isNaN(pDate.getTime())) {
                                const bioDate = new Date(biometryDate);
                                const diffTime = Math.abs(bioDate.getTime() - pDate.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                newItem.diasCultivo = diffDays;
                            }
                        } catch (e) {
                            console.warn("Data inválida para cálculo", value);
                        }
                    }
                    return newItem;
                }
                return item;
            });
            // Sempre mantem ordenado
            return sortData(updated);
        });
    };

    // --- UTILS DE CÓPIA ---
    const handleCopy = (text: string | number | null, label: string) => {
        if (!text || text === '-' || text === 'N/A') return;
        const val = String(text);
        navigator.clipboard.writeText(val).then(() => {
            showToast(`${label} copiado: ${val}`);
        });
    };

    // --- MOTOR DE CÁLCULO ZOOTÉCNICO (SENIOR ANALYST) ---

    // Função de Interpolação Linear para calcular metas exatas entre dias tabelados
    const calculateTargets = (doc: number) => {
        // Tabela atualizada com 6 categorias
        const initial = { espetacular: 0, otimo: 0, bom: 0, regular: 0, ruim: 0, pessimo: 0 };
        if (doc <= 0) return initial;

        // Se o dia for menor que o primeiro da tabela (30), interpola do zero
        if (doc < GROWTH_TABLE[0].day) {
            const ratio = doc / GROWTH_TABLE[0].day;
            return {
                espetacular: GROWTH_TABLE[0].espetacular * ratio,
                otimo: GROWTH_TABLE[0].otimo * ratio,
                bom: GROWTH_TABLE[0].bom * ratio,
                regular: GROWTH_TABLE[0].regular * ratio,
                ruim: GROWTH_TABLE[0].ruim * ratio,
                pessimo: GROWTH_TABLE[0].pessimo * ratio
            };
        }

        // Se o dia for maior que o último, projeta com base na última inclinação
        if (doc >= GROWTH_TABLE[GROWTH_TABLE.length - 1].day) {
            const last = GROWTH_TABLE[GROWTH_TABLE.length - 1];
            const prev = GROWTH_TABLE[GROWTH_TABLE.length - 2];
            const ratio = (doc - last.day) / (last.day - prev.day);
            return {
                espetacular: last.espetacular + (last.espetacular - prev.espetacular) * ratio,
                otimo: last.otimo + (last.otimo - prev.otimo) * ratio,
                bom: last.bom + (last.bom - prev.bom) * ratio,
                regular: last.regular + (last.regular - prev.regular) * ratio,
                ruim: last.ruim + (last.ruim - prev.ruim) * ratio,
                pessimo: last.pessimo + (last.pessimo - prev.pessimo) * ratio
            };
        }

        // Encontra o intervalo correto
        for (let i = 0; i < GROWTH_TABLE.length - 1; i++) {
            const curr = GROWTH_TABLE[i];
            const next = GROWTH_TABLE[i + 1];

            if (doc >= curr.day && doc < next.day) {
                const range = next.day - curr.day;
                const progress = doc - curr.day;
                const percentage = progress / range;

                return {
                    espetacular: curr.espetacular + (next.espetacular - curr.espetacular) * percentage,
                    otimo: curr.otimo + (next.otimo - curr.otimo) * percentage,
                    bom: curr.bom + (next.bom - curr.bom) * percentage,
                    regular: curr.regular + (next.regular - curr.regular) * percentage,
                    ruim: curr.ruim + (next.ruim - curr.ruim) * percentage,
                    pessimo: curr.pessimo + (next.pessimo - curr.pessimo) * percentage
                };
            }
        }

        return { ...GROWTH_TABLE[0], ...initial }; // Fallback seguro
    };


    // Processamento e Classificação
    // Processamento e Classificação
    const processedData = useMemo(() => {
        // 1. Filtragem
        const filtered = currentData.filter(item =>
            safeIncludes((item.viveiro || '').toLowerCase(), filterText.toLowerCase())
        );

        // 2. Ordenação Robusta (Prefix + Number)
        const sortViveiros = (a: any, b: any) => {
            const getParts = (str: string) => {
                const clean = str.toUpperCase().replace(/\s+/g, '');
                const match = clean.match(/^([A-Z]+)-?(\d+)/);
                if (match) {
                    return { prefix: match[1], num: parseInt(match[2]) };
                }
                return { prefix: clean, num: 9999 };
            };
            const partA = getParts(a.viveiro || '');
            const partB = getParts(b.viveiro || '');

            if (partA.prefix !== partB.prefix) {
                return partA.prefix.localeCompare(partB.prefix);
            }
            return partA.num - partB.num;
        };

        const sortedData = [...filtered].map(item => ({
            ...item,
            viveiro: (item.viveiro || '').toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005')
        })).sort(sortViveiros);

        const processed = sortedData.map(item => {
            let pMed = null;
            if (typeof item.pMedStr === 'string') {
                pMed = parseFloat(item.pMedStr.replace(',', '.'));
            } else if (typeof item.pMedStr === 'number') {
                pMed = item.pMedStr;
            }
            if (isNaN(pMed)) pMed = null;

            let pAnt = null;
            if (typeof item.pAntStr === 'string') {
                pAnt = parseFloat(item.pAntStr.replace(',', '.'));
            } else if (typeof item.pAntStr === 'number') {
                pAnt = item.pAntStr;
            }
            if (isNaN(pAnt)) pAnt = null;

            let quat = null;
            const qVal = item.quat;
            if (typeof qVal === 'string') {
                quat = parseFloat(qVal.replace(',', '.'));
            } else if (typeof qVal === 'number') {
                quat = qVal;
            }
            if (isNaN(quat)) quat = null;

            let incSemanal = 0;
            let gpd = 0;
            let gpdDisplay = "-";

            if (pMed !== null && pAnt !== null) {
                incSemanal = pMed - pAnt;
                gpd = incSemanal / 7;
                gpdDisplay = gpd.toFixed(3);
            }

            // --- LÓGICA DE DATAS E DIAS ---
            let doc = item.diasCultivo;
            let dataPov = item.dataPovoamento;

            // Normalização robusta de data no processamento
            if (dataPov && dataPov.includes('/')) {
                let [d, m, y] = dataPov.split('/');
                if (y && y.length === 2) y = '20' + y;
                if (y && m && d) dataPov = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }

            // Sempre recalcular os dias se tiver as duas datas para evitar dessincronização
            if (dataPov && biometryDate) {
                try {
                    const pDate = new Date(dataPov + 'T12:00:00');
                    const bDate = new Date(biometryDate + 'T12:00:00');
                    if (!isNaN(pDate.getTime()) && !isNaN(bDate.getTime())) {
                        const diffTime = (bDate.getTime() - pDate.getTime());
                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                        doc = diffDays > 0 ? diffDays : 0;
                    }
                } catch (e) { }
            }

            // Análise Combinada com Nova Tabela
            let analysisStatus = "Aguardando";
            let rowBgColor = "";
            let statusTextColor = "text-gray-400";

            if (pMed !== null && doc) {
                const targets = calculateTargets(doc);

                // CLASSIFICAÇÃO ATUALIZADA (6 NÍVEIS) - TEMA LARANJA TOM SOBRE TOM
                if (pMed >= targets.espetacular) {
                    analysisStatus = `💥 ESPETACULAR: Topo de Linha!(> ${targets.espetacular.toFixed(2)}g)`;
                    rowBgColor = "bg-[#FFEDD5] hover:bg-[#FED7AA]"; // orange-100 -> orange-200
                    statusTextColor = "text-[#7C2D12] font-extrabold"; // orange-950
                } else if (pMed >= targets.otimo) {
                    analysisStatus = `🔥 ÓTIMO: Acima da meta(${targets.otimo.toFixed(2)}g)`;
                    rowBgColor = "bg-[#FFF7ED] hover:bg-[#FFEDD5]"; // orange-50 -> orange-100
                    statusTextColor = "text-[#9A3412] font-bold"; // orange-900
                } else if (pMed >= targets.bom) {
                    analysisStatus = `💪 BOM: Dentro do esperado.`;
                    rowBgColor = "bg-white hover:bg-[#FFF7ED]";
                    statusTextColor = "text-[#C2410C] font-bold"; // orange-700
                } else if (pMed >= targets.regular) {
                    analysisStatus = `⚡ REGULAR: Atenção(${targets.regular.toFixed(2)}g)`;
                    rowBgColor = "bg-white hover:bg-orange-50/50";
                    statusTextColor = "text-[#EA580C] font-bold"; // orange-600
                } else if (pMed >= targets.ruim) {
                    analysisStatus = `⚠️ RUIM: Abaixo da média(< ${targets.regular.toFixed(2)} g)`;
                    rowBgColor = "bg-white hover:bg-orange-50/30";
                    statusTextColor = "text-[#F97316] font-bold"; // orange-500
                } else {
                    analysisStatus = `🚨 PÉSSIMO: Crítico(< ${targets.ruim.toFixed(2)} g)`;
                    rowBgColor = "bg-[#FEF2F2] hover:bg-[#FEE2E2]"; // Mantém um tom de alerta leve
                    statusTextColor = "text-[#B91C1C] font-bold"; // Vermelho para crítico
                }

            } else if (pMed === null) {
                analysisStatus = "Sem leitura";
            }

            let pesoTotal = "0.000";
            if (item.pesoTotalStr) {
                const pStr = typeof item.pesoTotalStr === 'string' ? item.pesoTotalStr.replace(',', '.') : String(item.pesoTotalStr);
                const val = parseFloat(pStr);
                pesoTotal = isNaN(val) ? "0.000" : val.toFixed(3);
            } else if (pMed !== null && quat !== null) {
                pesoTotal = ((pMed * quat) / 1000).toFixed(3);
            }

            const incSemanalStr = incSemanal !== 0 ? (incSemanal > 0 ? `+ ${incSemanal.toFixed(2)}` : incSemanal.toFixed(2)) : "-";

            return {
                ...item,
                pMedInputValue: item.pMedStr || '',
                quatInputValue: item.quat || '',
                pesoTotalInputValue: pesoTotal,
                pMedDisplay: item.pMedStr || '-',
                pAntDisplay: item.pAntStr || '-',
                dataPovoamento: dataPov,
                diasCultivo: doc,
                diasCultivoDisplay: doc ?? '-',
                pesoTotal: pesoTotal, // Already a string "0.000"
                incSemanalStr,
                gpdDisplay,
                analysisStatus,
                rowBgColor,
                statusTextColor,
                hasBiometrics: pMed !== null && pMed > 0
            };
        });

        return processed;
    }, [currentData, filterText, biometryDate]);



    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                if (ev.target?.result) {
                    const newLogo = ev.target.result as string;
                    setLogo(newLogo);
                    // Salvar permanentemente no banco
                    await SupabaseService.saveConfig('biometry_company_logo', newLogo);
                    showToast("✅ Logo salva permanentemente!");
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const showToast = (msg: string) => {
        setToast({ msg, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // --- EXPORTAÇÃO ---
    const exportPDF = () => {
        if (!dashboardRef.current) return;
        showToast('Gerando PDF de Alta Fidelidade...');

        const el = dashboardRef.current;
        const originalStyle = el.style.width;

        // Force desktop width for PDF consistency
        el.style.width = '1200px';
        el.classList.add('printing');
        document.body.classList.add('printing');

        const opt = {
            margin: 0,
            filename: `Relatorio_Biometria_${biometryDate}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                backgroundColor: isDarkMode ? '#0B0F1A' : '#ffffff',
                width: 1200,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('dashboard-content');
                    if (clonedEl) {
                        clonedEl.style.width = '1200px';
                        clonedEl.style.margin = '0 auto';
                    }
                }
            },
            jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait', compress: true },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(el).toPdf().get('pdf').then((pdf: any) => {
            // Se houver mais de uma página, tentamos forçar em uma ou apenas salvar
            // html2pdf já deve respeitar avoid-all, mas o scale vs format é a chave
            pdf.save(`Biometria_${biometryDate}.pdf`);
        }).finally(() => {
            el.style.width = originalStyle;
            el.classList.remove('printing');
            document.body.classList.remove('printing');
            showToast('PDF Exportado!');
        });
    };

    const exportPNG = () => {
        if (!dashboardRef.current) return;
        showToast('Gerando Imagem Profissional...');

        const el = dashboardRef.current;
        const originalStyle = el.style.width;

        // Force desktop width for high-fidelity export
        el.style.width = '1200px';
        dashboardRef.current.classList.add('printing');
        document.body.classList.add('printing');

        setTimeout(() => {
            html2canvas(el, {
                scale: 3,
                useCORS: true,
                backgroundColor: isDarkMode ? '#0B0F1A' : '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('dashboard-content');
                    if (clonedEl) {
                        clonedEl.style.width = '1200px';
                        clonedEl.style.borderRadius = '32px';
                    }
                },
                ignoreElements: (element: Element) => {
                    return element.classList.contains('no-print');
                }
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `Biometria_${biometryDate}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();

                // Restaura estado original
                el.style.width = originalStyle;
                dashboardRef.current?.classList.remove('printing');
                document.body.classList.remove('printing');
                showToast('Imagem Exportada!');
            });
        }, 100);
    };

    const copyHTML = () => {
        if (!dashboardRef.current) return;
        navigator.clipboard.writeText(dashboardRef.current.outerHTML).then(() => showToast('HTML Copiado!'));
    };

    // --- RENDERIZADORES ---



    // --- RENDERIZADORES ---

    // 1. MODO SIMPLIFICADO (Modal do Mapa)
    if (isModal) {
        const data = processedData; // Já filtrado e processado

        return (
            <div className="flex flex-col items-center justify-center p-6 h-full font-sans">
                {data.length === 0 ? (
                    <div className="text-center text-gray-400">
                        <div className="text-4xl mb-2">📊</div>
                        <p>Nenhuma biometria recente encontrada para <span className="font-bold">{initialFilter || 'este viveiro'}</span>.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-md space-y-4">
                        {data.map((item, idx) => (
                            <div key={idx} className={`relative overflow-hidden rounded-2xl shadow-lg border p-6 ${item.rowBgColor || 'bg-white'}`}>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-2xl font-black text-gray-800 tracking-tight">{item.viveiro}</h3>
                                        <p className="text-sm text-gray-500 font-medium">
                                            {item.dataPovoamento ? `Povoado em ${new Date(item.dataPovoamento).toLocaleDateString('pt-BR')}` : 'Data Povoamento N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-gray-100">
                                        {item.diasCultivoDisplay} dias
                                    </div>
                                </div>

                                {/* Main Metric: PESO */}
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-5xl font-extrabold text-blue-600 tracking-tighter">
                                        {typeof item.pMedDisplay === 'number' ? item.pMedDisplay.toFixed(2) : item.pMedDisplay}
                                        <span className="text-2xl text-blue-400 font-bold ml-1">g</span>
                                    </span>
                                </div>

                                {/* Status Badge */}
                                <div className={`inline-block px-3 py-1 rounded-lg text-sm mb-6 ${item.statusTextColor} bg-white/60 border border-white/50 backdrop-blur-sm`}>
                                    {item.analysisStatus}
                                </div>

                                {/* Secondary Metrics Grid */}
                                <div className="grid grid-cols-2 gap-3 bg-white/50 rounded-xl p-3 backdrop-blur-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Inc. Semanal</span>
                                        <span className={`text-lg font-bold ${parseFloat(item.incSemanalStr) > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                            {item.incSemanalStr} g
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">GPD (g/dia)</span>
                                        <span className="text-lg font-bold text-indigo-600">
                                            {item.gpdDisplay}
                                        </span>
                                    </div>

                                    {/* Updated Metrics as per User Request */}
                                    <div className="flex flex-col border-t border-gray-200/50 pt-2 mt-1">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Quantidade</span>
                                        <span className="text-base font-bold text-slate-700">
                                            {item.quatInputValue} mil
                                        </span>
                                    </div>
                                    <div className="flex flex-col border-t border-gray-200/50 pt-2 mt-1">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Peso Total</span>
                                        <span className="text-base font-bold text-slate-700">
                                            {item.pesoTotal} kg
                                        </span>
                                    </div>
                                </div>

                                {/* Decoration */}
                                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-blue-100 to-transparent rounded-full opacity-50 blur-xl pointer-events-none"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    const renderUploadScreen = () => (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            <div className="absolute top-0 right-0">
                {/* Manual Key Config Removed for Security */}
            </div>

            {!isModal && (
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">Análise de Performance Biológica</h1>
                    <p className="text-gray-500">Avaliação avançada: <span className="text-indigo-600 font-bold">Histórico de Peso</span> vs <span className="text-indigo-600 font-bold">Velocidade (GPD)</span>.</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-10 border-b border-gray-100 flex flex-col items-center justify-center text-center hover:bg-orange-50/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}>
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
                        {logo ? (
                            <img src={logo} alt="Logo" className="w-14 h-14 object-contain" />
                        ) : (
                            <span className="text-4xl text-orange-500">🦐</span>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Importar Biometria</h3>
                    <p className="text-sm text-gray-500 mb-6">Arraste a foto do boletim ou planilha.</p>
                    <label className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 cursor-pointer shadow-sm">
                        Selecionar Arquivos <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                    </label>
                </div>
                {files.length > 0 && (
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex justify-between bg-white p-3 rounded mb-2 border">
                                <span className="text-sm font-bold">{file.name}</span>
                                <button onClick={() => removeFile(idx)} className="text-red-500 font-bold">X</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="p-6 bg-white border-t border-gray-200 flex justify-end">
                    <button onClick={handleProcess} className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                        <span>Processar Análise</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500 px-6">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl pb-1">🦐</div>
            </div>

            <div className="max-w-xl text-center">
                <div className="mb-4">
                    <span className="inline-block bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                        Atualização do Setor
                    </span>
                </div>
                {/* NOTÍCIA DINÂMICA */}
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-snug transition-all duration-300 min-h-[90px] flex items-center justify-center">
                    "{newsList[newsIndex]}"
                </h2>
                <div className="flex gap-2 justify-center mt-8">
                    {newsList.slice(0, 5).map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === (newsIndex % 5) ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200'}`} />
                    ))}
                </div>
                <p className="text-gray-400 text-xs mt-8 font-medium">Calculando curvas de crescimento, Incremento Semanal e GPD...</p>
            </div>
        </div>
    );




    {/* --- DASHBOARD VIEW --- */ }
    const renderDashboard = () => (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* INJECTED STYLES FOR EXPORT */}
            <style>{`
@media print {
    @page { margin: 3mm; size: auto; }
    body { zoom: 0.9!important; -webkit-print-color-adjust: exact; }
    * { -webkit-print-color-adjust: exact!important; color-adjust: exact!important; }
}
/* Ensure elements are visible during export (PNG and PDF) */
.printing .print-visible { display: block!important; visibility: visible!important; opacity: 1!important; }
.printing .print-hidden { display: none!important; }
.printing .no-export { display: none !important; }
.printing .export-header-row { 
    flex-direction: row !important; 
    align-items: center !important; 
    justify-content: space-between !important;
    padding-bottom: 2rem !important;
    border-bottom: 2px solid #f8fafc !important;
    margin-bottom: 2rem !important;
}
.printing #dashboard-content { 
    width: 1200px !important; 
    max-width: none !important; 
    padding: 3rem !important;
    background: #ffffff !important;
    border: none !important;
    box-shadow: none !important;
}
.printing .export-title-block {
    text-align: center !important;
    align-items: center !important;
    flex: 2 !important;
}
.printing .export-seal-block {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    min-width: auto !important;
    flex: 1 !important;
    align-items: flex-end !important;
}
.printing input, .printing select {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    height: auto !important;
    line-height: 1 !important;
}
.printing .status-badge-container {
    justify-content: center !important;
    align-items: center !important;
}
.print-visible { display: none; }
`}</style>

            {!isPublic && (
                <div className={`mb-8 flex flex-wrap justify-between items-center gap-4 no-print p-4 rounded-2xl shadow-sm border transition-all duration-500 ${isDarkMode
                    ? 'bg-[#0F172A] border-slate-800'
                    : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-1 ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>Data Biometria:</span>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={biometryDate}
                                    onChange={(e) => setBiometryDate(e.target.value)}
                                    disabled={isPublic}
                                    className={`text-sm font-bold rounded-xl px-4 py-2.5 outline-none transition-all min-w-[180px] ${isDarkMode
                                        ? 'text-slate-200 bg-slate-900/50 border-slate-700 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'
                                        : 'text-slate-700 bg-gray-50 border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500'} ${isPublic ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                                />
                                <div className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-3 pt-4 md:pt-0">
                        <button
                            onClick={() => setShowHistory(true)}
                            className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold transition-all border shadow-sm ${isDarkMode
                                ? 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700'
                                : 'text-slate-600 bg-white border-gray-200 hover:bg-gray-50'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Histórico
                        </button>

                        <button
                            onClick={handleNewBiometry}
                            className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold transition-all border-2 shadow-sm ${isDarkMode
                                ? 'text-orange-400 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20'
                                : 'text-orange-600 bg-white border-orange-500 hover:bg-orange-50'}`}
                        >
                            <span className="text-lg">+</span> Nova Biometria
                        </button>

                        <button
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                            className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all ${isAnalyzing ? 'opacity-50' : ''}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Analisar com IA
                        </button>

                        <button
                            onClick={syncCurrentDataWithHistory}
                            className={`flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold transition-all border shadow-sm ${isDarkMode
                                ? 'text-blue-400 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20'
                                : 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
                            title="Sincronizar datas e quantidades com o histórico"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Sincronizar
                        </button>

                        <button
                            onClick={handleSaveBiometry}
                            className="flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                            Salvar Biometria
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Seleção: Nova Biometria */}
            {showNewBiometryOptions && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300 no-print">
                    <div className={`w-full max-sm:max-w-xs max-w-sm rounded-[32px] shadow-2xl border p-8 animate-in zoom-in-95 duration-300 transition-colors duration-500 ${isDarkMode
                        ? 'bg-[#0F172A] border-slate-800'
                        : 'bg-white border-gray-100'}`}>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                📊
                            </div>
                            <h3 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>Nova Biometria</h3>
                            <p className="text-sm text-gray-500 font-medium mt-2">Como deseja iniciar os lançamentos?</p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={startNewBiometryFromPrevious}
                                className={`w-full flex items-center gap-4 p-5 rounded-[20px] border transition-all group text-left ${isDarkMode
                                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-orange-500/30'
                                    : 'bg-slate-50 border-slate-100 hover:bg-orange-50 hover:border-orange-200'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                    📋
                                </div>
                                <div>
                                    <span className={`block font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Basear na Anterior</span>
                                    <span className="block text-xs text-gray-400 font-bold uppercase mt-0.5">Viveiros & Pesos Antigos</span>
                                </div>
                            </button>

                            <button
                                onClick={startNewBiometryFromIA}
                                className={`w-full flex items-center gap-4 p-5 rounded-[20px] border transition-all group text-left ${isDarkMode
                                    ? 'bg-indigo-900/20 border-indigo-800/50 hover:bg-indigo-900/30 hover:border-indigo-700'
                                    : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300'}`}
                            >
                                <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
                                    🪄
                                </div>
                                <div>
                                    <span className={`block font-black text-sm uppercase tracking-wider ${isDarkMode ? 'text-indigo-400' : 'text-indigo-700'}`}>Importar via IA</span>
                                    <span className={`block text-[10px] font-black uppercase mt-0.5 ${isDarkMode ? 'text-indigo-500/70' : 'text-indigo-400'}`}>Imagem ou Documento</span>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowNewBiometryOptions(false)}
                            className={`w-full mt-8 py-4 text-xs font-black uppercase tracking-[0.2em] transition-colors ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-slate-600'}`}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
            <div id="dashboard-content" ref={dashboardRef} className={`w-full max-w-5xl mx-auto rounded-2xl md:rounded-[32px] shadow-2xl transition-all duration-500 border ${isDarkMode
                ? 'bg-[#0B0F1A] border-slate-800 shadow-blue-900/20'
                : 'bg-white border-gray-100 shadow-blue-900/5'} overflow-hidden relative`}>

                {/* --- PREMIUM HEADER --- */}
                <header className={`px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b transition-colors duration-500 export-header-row ${isDarkMode
                    ? 'bg-[#0B0F1A] border-slate-800'
                    : 'bg-white border-gray-50'}`}>

                    {/* Left: Branding */}
                    <div className="flex-1 flex justify-start items-center">
                        <div
                            onClick={() => document.getElementById('logo-upload-input')?.click()}
                            className={`w-32 h-20 md:w-48 md:h-28 rounded-xl md:rounded-[32px] flex items-center justify-center flex-shrink-0 shadow-2xl border-2 overflow-hidden group cursor-pointer transition-all duration-700 hover:rotate-2 no-print-bg-fix ${isDarkMode
                                ? 'bg-[#1e293b]/50 border-slate-700 shadow-orange-950/20'
                                : 'bg-white border-orange-50 shadow-orange-100/50'}`}
                        >
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-24 h-16 md:w-40 md:h-24 object-contain" />
                            ) : (
                                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-inner">
                                    {companyName?.charAt(0) || 'C'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Center: Monumental Title */}
                    <div className="flex-[2] flex flex-col items-center text-center order-first md:order-none export-title-block">
                        <h1 className={`text-3xl md:text-6xl font-black tracking-tighter leading-none mb-1 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            BIOMETRIA
                        </h1>
                        <p className="text-[9px] md:text-xs font-black text-orange-500 uppercase tracking-[0.5em] font-sans opacity-90">
                            RELATÓRIO DE PERFORMANCE
                        </p>
                    </div>

                    {/* Right: Technical Seal */}
                    <div className="flex-1 flex flex-col items-center md:items-end gap-3 export-seal-block">
                        <div className={`p-4 md:p-5 rounded-[28px] border transition-all duration-700 min-w-[220px] ${isDarkMode
                            ? 'bg-slate-900/40 border-slate-800/80'
                            : 'bg-white border-orange-100/40 shadow-xl shadow-orange-500/[0.03]'}`}>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4 border-b border-dashed border-orange-500/10 pb-2">
                                    <span className="text-[7px] font-black uppercase tracking-[0.3em] text-orange-500 opacity-80">Registro</span>
                                    <span className={`text-[9px] font-black ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`}>{new Date(biometryDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <div className="flex flex-col">
                                        <span className={`text-[6px] font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Gerência Técnica</span>
                                        <span className={`text-[9px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Cleiton Manoel de Lima</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-[6px] font-black uppercase tracking-widest leading-none mb-1 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>Analista Administrativo</span>
                                        <span className={`text-[9px] font-black uppercase tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Luanthony L. Oliveira</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tabela Principal */}
                <main className={`px-4 md:px-6 pb-6 transition-colors duration-500 ${isDarkMode ? 'bg-[#0B0F1A]' : 'bg-white'}`}>

                    {/* BARRA DE FILTRO E ADICIONAR (OCULTOS NA EXPORTAÇÃO) */}
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6 no-export">
                        <div className="relative w-full max-w-lg group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-colors duration-300 ${isDarkMode ? 'text-slate-500 group-focus-within:text-orange-500' : 'text-slate-400 group-focus-within:text-orange-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Procurar por viveiro específico... (OC-001, VP-002)"
                                value={filterText}
                                onChange={(e) => setFilterText(e.target.value)}
                                className={`pl-12 pr-4 py-3.5 rounded-[20px] border-2 w-full transition-all text-sm font-bold outline-none shadow-sm ${isDarkMode
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-orange-500/80 focus:ring-4 focus:ring-orange-500/5'
                                    : 'bg-slate-50 border-white text-slate-800 placeholder-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10'}`}
                            />
                        </div>

                        {!isPublic && (
                            <button
                                onClick={() => setShowAddTankModal(true)}
                                className="group relative flex items-center gap-3 bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white px-8 py-4 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="relative z-10 leading-none">Novo Viveiro</span>
                            </button>
                        )}
                    </div>

                    <div className={`rounded-[32px] border-2 overflow-x-auto mb-10 shadow-2xl transition-all duration-700 ${isDarkMode ? 'border-slate-800/80 bg-slate-900/40 backdrop-blur-xl' : 'border-slate-100/50 bg-white'}`}>
                        <table className="w-full text-[10px] md:text-[12px] text-left min-w-[900px] border-collapse">
                            <thead className={`uppercase font-black tracking-[0.05em] border-b-2 transition-colors duration-500 ${isDarkMode
                                ? 'bg-slate-800/80 text-orange-500 border-slate-700/50'
                                : 'bg-slate-800 text-white border-slate-700'}`}>
                                <tr>
                                    <th className={`px-2 py-4 min-w-[80px] sticky left-0 z-10 text-center transition-colors duration-500 ${isDarkMode
                                        ? 'bg-slate-800/95 text-orange-500'
                                        : 'bg-slate-800 text-orange-400'}`}>VIV.</th>
                                    <th className="px-1 py-4 text-center">D. Pov.</th>
                                    <th className="px-1 py-4 text-center">Dias</th>
                                    <th className="px-2 py-4 text-center">P.M (g)</th>
                                    <th className="px-1 py-4 text-center">Quant. (und.)</th>
                                    <th className="px-2 py-4 text-center">Peso Total (kg)</th>
                                    <th className="px-1 py-4 text-center text-slate-400">P.M Ant.</th>
                                    <th className="px-1 py-4 text-center">Inc. Sem.</th>
                                    <th className="px-1 py-4 text-center">GPD</th>
                                    <th className="px-4 py-4 text-center bg-orange-500/5">Status Performance</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y transition-colors duration-500 ${isDarkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                                {processedData.map((item, idx) => (
                                    <tr key={idx} className={`transition-colors border-b last:border-0 group ${isDarkMode
                                        ? 'hover:bg-slate-800/40 border-slate-800/50'
                                        : 'hover:bg-slate-50/50 border-gray-50'}`}>
                                        <td className={`px-2 py-3 font-bold sticky left-0 z-10 whitespace-nowrap transition-colors duration-500 ${isDarkMode
                                            ? 'text-slate-100 bg-slate-900 group-hover:bg-slate-800'
                                            : 'text-slate-800 bg-white group-hover:bg-orange-50/30'}`}>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`inline-flex items-center justify-center px-2 py-1.5 rounded-lg border font-black tracking-tighter min-w-[75px] shadow-sm transition-all duration-300 group-hover:scale-105 ${isDarkMode
                                                    ? 'border-orange-500/20 bg-orange-500/10 text-orange-400'
                                                    : 'border-orange-100 bg-orange-50/50 text-orange-700'}`}>
                                                    {item.viveiro}
                                                </div>
                                                {!isPublic && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteRow(item.viveiro); }}
                                                        className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full p-1 transition-all opacity-0 group-hover:opacity-100 transform hover:rotate-12"
                                                        title="Excluir viveiro"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-2 py-3 text-center group/date relative">
                                            {/* Impressão: Texto Estático */}
                                            <span className="print-visible font-black px-2 py-1.5 rounded-lg text-[10px] w-full inline-block text-slate-900">
                                                {item.dataPovoamento ? (new Date(item.dataPovoamento + 'T12:00:00').toLocaleDateString('pt-BR')) : '-'}
                                            </span>

                                            {/* UI: Input/Display interativo */}
                                            <div className="print-hidden">
                                                {isPublic ? (
                                                    <span className={`font-black px-2 py-1.5 rounded-lg text-[10px] w-[95px] inline-block transition-colors duration-500 shadow-sm ${isDarkMode
                                                        ? 'bg-slate-800/50 text-slate-300'
                                                        : 'bg-slate-50 text-slate-600'}`}>
                                                        {item.dataPovoamento ? (new Date(item.dataPovoamento + 'T12:00:00').toLocaleDateString('pt-BR')) : '-'}
                                                    </span>
                                                ) : (
                                                    <input
                                                        type="date"
                                                        value={item.dataPovoamento || ''}
                                                        onChange={(e) => handleUpdateRow(item.viveiro, 'dataPovoamento', e.target.value)}
                                                        className={`font-black px-2 py-1.5 rounded-lg text-[10px] border outline-none transition-all cursor-pointer w-[105px] shadow-sm active:scale-95 ${isDarkMode
                                                            ? 'bg-slate-800 text-slate-100 border-slate-700 hover:border-orange-500/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10'
                                                            : 'bg-white text-slate-800 border-slate-100 hover:border-orange-200 focus:border-orange-400 focus:ring-4 focus:ring-orange-500/10'}`}
                                                    />
                                                )}
                                            </div>
                                        </td>

                                        <td className={`px-1 py-3 text-center font-black transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{item.diasCultivo}</td>

                                        <td className="px-2 py-3 text-center">
                                            {/* Impressão */}
                                            <span className="print-visible font-black text-sm text-slate-900">
                                                {item.pMedInputValue}g
                                            </span>

                                            {/* UI */}
                                            <div className="print-hidden">
                                                {isPublic ? (
                                                    <span className={`font-black text-sm transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{item.pMedInputValue}g</span>
                                                ) : (
                                                    <div className="relative inline-block group/input">
                                                        <input
                                                            type="text"
                                                            value={item.pMedInputValue}
                                                            placeholder="0.00"
                                                            onChange={(e) => handleUpdateRow(item.viveiro, 'pMedStr', e.target.value)}
                                                            className={`w-12 text-center bg-transparent border-b outline-none transition-all font-black text-sm pb-0.5 ${isDarkMode
                                                                ? 'text-white border-slate-700 focus:border-orange-500'
                                                                : 'text-slate-900 border-slate-200 focus:border-orange-500'}`}
                                                        />
                                                        <span className="ml-0.5 text-[9px] font-black text-slate-400">g</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-1 py-3 text-center">
                                            {/* Impressão */}
                                            <span className="print-visible font-black text-[10px] text-orange-700">
                                                {item.quatInputValue}
                                            </span>

                                            {/* UI */}
                                            <div className="print-hidden">
                                                {isPublic ? (
                                                    <span className={`font-black transition-colors duration-500 text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.quatInputValue}</span>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={item.quatInputValue}
                                                        placeholder="Unid."
                                                        onChange={(e) => handleUpdateRow(item.viveiro, 'quat', e.target.value)}
                                                        className={`w-16 px-1.5 py-1.5 rounded-lg text-center outline-none transition-all font-black border shadow-sm text-[10px] ${isDarkMode
                                                            ? 'bg-slate-800/80 text-orange-400 border-slate-700 focus:border-orange-500'
                                                            : 'bg-slate-50 text-orange-700 border-white focus:bg-white focus:border-orange-400'}`}
                                                    />
                                                )}
                                            </div>
                                        </td>

                                        <td
                                            onClick={() => handleCopy(item.pesoTotal, 'Peso Total')}
                                            className={`px-2 py-3 text-center font-black text-sm cursor-copy transition-all duration-300 hover:scale-110 active:scale-95 ${isDarkMode
                                                ? 'text-slate-100 hover:text-orange-400'
                                                : 'text-slate-900 hover:text-orange-600'}`}
                                        >
                                            {item.pesoTotal}
                                        </td>

                                        <td className={`px-1 py-3 text-center font-black transition-colors duration-500 opacity-60 text-[10px]`}>
                                            {isPublic ? (
                                                <span>{item.pAntDisplay}g</span>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <input
                                                        type="text"
                                                        value={item.pAntDisplay}
                                                        placeholder="-"
                                                        onChange={(e) => handleUpdateRow(item.viveiro, 'pAntStr', e.target.value)}
                                                        className={`w-10 text-center bg-transparent border-b border-dashed outline-none transition-all font-black text-[11px] ${isDarkMode
                                                            ? 'text-slate-500 border-slate-700 focus:border-orange-500/50 focus:text-slate-300'
                                                            : 'text-slate-400 border-slate-200 focus:border-orange-500 focus:text-slate-700'}`}
                                                    />
                                                    <span className="ml-0.5 text-[9px]">g</span>
                                                </div>
                                            )}
                                        </td>

                                        <td className={`px-1 py-3 text-center font-black text-xs transition-colors duration-500 ${item.incSemanalStr.includes('+') ? 'text-emerald-500' : (isDarkMode ? 'text-slate-700' : 'text-slate-300')}`}>
                                            {item.incSemanalStr}
                                        </td>

                                        <td className={`px-1 py-3 text-center font-black transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} text-[10px]`}>
                                            {item.gpdDisplay}
                                        </td>

                                        <td className="px-4 py-3 text-center bg-orange-500/[0.02]">
                                            <div className="flex items-center justify-center">
                                                {/* Logic for Status Badge based on analysisStatus */}
                                                {(() => {
                                                    const status = item.analysisStatus.split(':')[0].toUpperCase();
                                                    const label = item.analysisStatus.split(':')[0];
                                                    const subLabel = item.analysisStatus.split(':')[1] || '';

                                                    let badgeClass = "";
                                                    let icon = null;

                                                    if (status.includes('ESPETACULAR')) {
                                                        badgeClass = isDarkMode ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-orange-600 text-white shadow-xl shadow-orange-600/30 ring-2 ring-orange-200";
                                                        icon = <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
                                                    } else if (status.includes('ÓTIMO')) {
                                                        badgeClass = isDarkMode ? "bg-orange-500/20 text-orange-400 border-orange-500/40" : "bg-orange-50 text-orange-700 border-orange-200";
                                                        icon = <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.342l-7.106 5.33a1 1 0 00-.138 1.542l4.21 4.21c.394.394 1.027.394 1.42 0l6.395-6.395a1 1 0 00-.342-1.45l-3-1.895z" clipRule="evenodd" /><path d="M12.395 2.553l3 1.895-6.395 6.395-4.21-4.21L12.395 2.553z" /></svg>;
                                                    } else if (status.includes('BOM')) {
                                                        badgeClass = isDarkMode ? "bg-slate-800 text-slate-300 border-slate-700" : "bg-slate-100 text-slate-700 border-slate-200";
                                                        icon = <svg className="w-3.5 h-3.5 text-orange-500/50" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>;
                                                    } else if (status.includes('REGULAR')) {
                                                        badgeClass = isDarkMode ? "bg-slate-800/50 text-slate-500 border-slate-700/50" : "bg-white text-slate-400 border-slate-100";
                                                    } else if (status.includes('RUIM')) {
                                                        badgeClass = isDarkMode ? "bg-amber-900/20 text-amber-500 border-amber-900/30" : "bg-amber-50 text-amber-600 border-amber-100";
                                                        icon = <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
                                                    } else {
                                                        badgeClass = isDarkMode ? "bg-rose-900/20 text-rose-400 border-rose-900/30" : "bg-rose-50 text-rose-600 border-rose-100";
                                                        icon = <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
                                                    }

                                                    return (
                                                        <div className={`flex flex-col border rounded-xl px-2 py-1 min-w-[110px] md:min-w-[130px] transition-all duration-500 transform hover:scale-105 group/badge cursor-default status-badge-container ${badgeClass}`}>
                                                            <div className="flex items-center gap-1.5 justify-center font-black uppercase text-[8px] md:text-[9px] tracking-tight">
                                                                {icon}
                                                                {label}
                                                            </div>
                                                            <div className="text-[7px] md:text-[8px] text-center font-black opacity-60 leading-none mt-0.5 group-hover/badge:opacity-100 transition-opacity">{subLabel.replace('(', '').replace(')', '')}</div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>


                    {/* Status Legend */}
                    <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-8 no-print p-8 rounded-[32px] bg-slate-500/5 border border-orange-500/10">
                        <div className={`flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            <span className="flex items-center gap-3 group/legend cursor-default"><div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50 group-hover/legend:scale-125 transition-transform"></div> Espetacular / Ótimo</span>
                            <span className="flex items-center gap-3 group/legend cursor-default"><div className="w-3 h-3 rounded-full bg-slate-400 shadow-lg shadow-slate-400/50 group-hover/legend:scale-125 transition-transform"></div> Bom / Regular</span>
                            <span className="flex items-center gap-3 group/legend cursor-default"><div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50 group-hover/legend:scale-125 transition-transform"></div> Ruim</span>
                            <span className="flex items-center gap-3 group/legend cursor-default"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-lg shadow-rose-500/50 group-hover/legend:scale-125 transition-transform"></div> Crítico</span>
                        </div>

                        <button
                            onClick={() => setShowReferenceTable(!showReferenceTable)}
                            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 text-[11px] font-black uppercase tracking-widest transition-all group ${isDarkMode
                                ? 'border-slate-800 text-slate-400 hover:border-orange-500/30 hover:text-orange-400'
                                : 'border-slate-100 text-slate-400 hover:border-orange-200 hover:text-slate-800'}`}
                        >
                            <span className="relative">
                                {showReferenceTable ? 'Ocultar Parâmetros' : 'Ver Parâmetros de Metas'}
                                <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-500 transition-all group-hover:w-full"></div>
                            </span>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform duration-500 ${showReferenceTable ? 'rotate-180 text-orange-500' : 'group-hover:rotate-12'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>

                    {/* Tabela de Referência (Toggle) */}
                    {showReferenceTable && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <h4 className={`text-xs font-bold uppercase mb-2 text-center transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-gray-700'}`}>Tabela de Referência de Crescimento (Peso em Gramas)</h4>
                            <div className={`overflow-x-auto rounded-xl border transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>
                                <table className="w-full text-xs text-center border-collapse">
                                    <thead className={`transition-colors duration-500 ${isDarkMode ? 'bg-[#111827] text-slate-400' : 'bg-gray-100 text-gray-600'}`}>
                                        <tr>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>DIA</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>ESPETACULAR</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>ÓTIMO</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>BOM</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>REGULAR</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>RUIM</th>
                                            <th className={`border-b px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-200'}`}>PÉSSIMO</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-gray-500'}`}>
                                        {GROWTH_TABLE.map((row, i) => (
                                            <tr key={i} className={`transition-colors duration-500 ${isDarkMode ? 'bg-[#0B0F1A] border-t border-slate-800' : 'bg-white border-t border-gray-100'}`}>
                                                <td className={`font-bold border-r px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'bg-[#111827] border-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>{row.day}</td>
                                                <td className={`px-2 py-2 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.espetacular}g</td>
                                                <td className={`px-2 py-2 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.otimo}g</td>
                                                <td className={`px-2 py-2 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.bom}g</td>
                                                <td className={`px-2 py-2 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.regular}g</td>
                                                <td className={`px-2 py-2 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.ruim}g</td>
                                                <td className={`px-2 py-2 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>{row.pessimo}g</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- ACTION BUTTONS FOOTER --- */}
                    {!isPublic && (
                        <div className={`mt-8 border-t pt-6 flex flex-wrap justify-center gap-3 no-print transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`} data-html2canvas-ignore="true">
                            <button
                                onClick={saveBackup}
                                className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isDarkMode
                                    ? 'bg-blue-900/20 border-blue-800 text-blue-400 hover:bg-blue-900/30'
                                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                                title="Baixar backup dos dados (JSON)"
                            >
                                <span>💾</span> Salvar Backup
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isDarkMode
                                        ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400 hover:bg-emerald-900/30'
                                        : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'}`}
                                    title="Carregar backup dos dados (JSON)"
                                >
                                    <span>📂</span> Carregar Backup
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="application/json"
                                    onChange={loadBackup}
                                />
                            </div>

                            <div className={`w-px h-8 mx-2 hidden md:block ${isDarkMode ? 'bg-slate-800' : 'bg-gray-200'}`}></div>

                            <button onClick={exportPDF} className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                📄 PDF
                            </button>
                            <button onClick={exportPNG} className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                🖼️ PNG
                            </button>
                            <button onClick={copyHTML} className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${isDarkMode
                                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                🌐 HTML
                            </button>
                        </div>
                    )}
                </main>
            </div >
        </div > // Added missing closing div here
    );

    return (
        <div className="w-full">
            {step === 'UPLOAD' && renderUploadScreen()}
            {step === 'PROCESSING' && renderProcessing()}
            {step === 'DASHBOARD' && renderDashboard()}

            {/* --- MODAL DE HISTÓRICO --- */}
            {showHistory && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 no-print">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                        <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Histórico de Biometrias
                            </h3>
                            <button onClick={() => setShowHistory(false)} className="text-white/80 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-6">
                            {biometricsHistory.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <p>Nenhuma biometria salva no histórico.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {biometricsHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => handleLoadHistory(item)}
                                            className="group flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                                                    {new Date(item.timestamp).toLocaleDateString('pt-BR', { month: 'short' })}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 group-hover:text-blue-700 transition-colors uppercase text-sm">
                                                        {item.label}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 font-medium">
                                                        {new Date(item.timestamp).toLocaleTimeString('pt-BR')} • {item.data?.length || 0} viveiros
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDeleteHistory(item.id, e)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                                                    title="Excluir do histórico"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                                <div className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full group-hover:scale-105 transition-transform">
                                                    CARREGAR
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            {biometricsHistory.length > 0 ? (
                                <button
                                    onClick={handleDeleteAllHistory}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Limpar Histórico
                                </button>
                            ) : <div></div>}
                            <button
                                onClick={() => setShowAddTankModal(true)}
                                className="bg-orange-600 hover:bg-orange-700 text-white p-2 rounded-xl transition-colors shadow-sm active:scale-95"
                                title="Adicionar Novo Viveiro Manualmente"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ADICIONAR VIVEIRO */}
            {showAddTankModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800">Novo Viveiro</h3>
                                <p className="text-xs text-orange-600 font-bold uppercase tracking-wide">Adicionar ao lote atual</p>
                            </div>
                            <button onClick={() => setShowAddTankModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Viveiro (Ex: OC-030)</label>
                                <input
                                    type="text"
                                    value={newTankData.viveiro}
                                    onChange={e => setNewTankData({ ...newTankData, viveiro: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none uppercase"
                                    placeholder="OC-XXX"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Povoamento</label>
                                    <input
                                        type="date"
                                        value={newTankData.dataPovoamento}
                                        onChange={e => setNewTankData({ ...newTankData, dataPovoamento: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pop. Inicial (un)</label>
                                    <input
                                        type="number"
                                        value={newTankData.quat}
                                        onChange={e => setNewTankData({ ...newTankData, quat: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowAddTankModal(false)}
                                className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddNewTank}
                                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-sm transition-colors shadow-lg active:scale-95 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden AI File Input for 'startNewBiometryFromIA' functionality */}
            <input
                type="file"
                ref={aiFileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileSelect(e, true)}
                data-html2canvas-ignore="true"
            />

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};
