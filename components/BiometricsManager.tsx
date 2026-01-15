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

export const BiometricsManager: React.FC<{ isPublic?: boolean; initialFilter?: string; isModal?: boolean }> = ({ isPublic = false, initialFilter = '', isModal = false }) => {
    const [step, setStep] = useState<ViewStep>(isPublic ? 'DASHBOARD' : (isModal ? 'DASHBOARD' : 'UPLOAD')); // Modal assumes we want to see data if available
    const [logo, setLogo] = useState<string | null>(DEFAULT_LOGO);
    const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [currentData, setCurrentData] = useState<any[]>(defaultRawData);
    const [biometricsHistory, setBiometricsHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [needsSave, setNeedsSave] = useState(false);
    const [biometryDate, setBiometryDate] = useState(new Date().toISOString().split('T')[0]);
    const [loadedRecordId, setLoadedRecordId] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [filterText, setFilterText] = useState(initialFilter);
    const [showReferenceTable, setShowReferenceTable] = useState(false);
    const [showNewBiometryOptions, setShowNewBiometryOptions] = useState(false);

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
    }, [biometryDate]);

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
                const normalized = result.map(item => ({
                    ...item,
                    viveiro: item.viveiro?.toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005') || item.viveiro,
                    dataPovoamento: item.dataPovoamento || null
                }));

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
                    const normalized = result.map(item => ({
                        ...item,
                        viveiro: item.viveiro?.toUpperCase().trim().replace('OS-005', 'OC-005').replace('OS 005', 'OC-005') || item.viveiro,
                        dataPovoamento: item.dataPovoamento || null
                    }));

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
            }
            setBiometricsHistory([]);
            setLoadedRecordId(null);
            showToast(`✅ ${count} registros removidos do histórico.`);
        }
    };

    // --- LÓGICA DE EDIÇÃO ---
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

            let pesoTotal = "N/A";
            if (item.pesoTotalStr) {
                pesoTotal = item.pesoTotalStr;
            } else if (pMed !== null && quat !== null) {
                pesoTotal = (pMed * quat).toFixed(2);
            }

            const incSemanalStr = incSemanal !== 0 ? (incSemanal > 0 ? `+ ${incSemanal.toFixed(2)}` : incSemanal.toFixed(2)) : "-";

            return {
                ...item,
                pMedInputValue: item.pMedStr || '',
                quatInputValue: item.quat || '',
                pesoTotalInputValue: item.pesoTotalStr || pesoTotal,
                pMedDisplay: item.pMedStr || '-',
                pAntDisplay: item.pAntStr || '-',
                dataPovoamento: dataPov,
                diasCultivo: doc,
                diasCultivoDisplay: doc ?? '-',
                pesoTotal,
                incSemanalStr,
                gpdDisplay,
                analysisStatus,
                rowBgColor,
                statusTextColor,
                hasBiometrics: pMed !== null && pMed > 0
            };
        });

        return processed.filter(item => item.hasBiometrics);
    }, [currentData]);



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
        showToast('Gerando PDF Inteligente...');

        dashboardRef.current.classList.add('printing');
        document.body.classList.add('printing');

        const opt = {
            margin: [5, 5, 5, 5] as [number, number, number, number],
            filename: `Relatorio_Bio_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                ignoreElements: (element: Element) => {
                    const hasIgnoreClass = element.classList.contains('no-print');
                    return hasIgnoreClass;
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(dashboardRef.current).save().then(() => {
            dashboardRef.current?.classList.remove('printing');
            document.body.classList.remove('printing');
            showToast('PDF Gerado!');
        });
    };

    const exportPNG = () => {
        if (!dashboardRef.current) return;
        showToast('Gerando Imagem...');
        dashboardRef.current.classList.add('printing');
        document.body.classList.add('printing');

        html2canvas(dashboardRef.current, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element: Element) => {
                const hasIgnoreClass = element.classList.contains('no-print');
                return hasIgnoreClass;
            }
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Relatorio_Bio_${new Date().toLocaleDateString('pt-BR')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            dashboardRef.current?.classList.remove('printing');
            document.body.classList.remove('printing');
            showToast('Imagem Gerada!');
        });
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
                                            {item.pesoTotalInputValue} kg
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
.print-visible { display: none; }
`}</style>

            {!isPublic && (
                <div className="mb-8 flex flex-wrap justify-between items-center gap-4 no-print bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Data Biometria:</span>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={biometryDate}
                                    onChange={(e) => setBiometryDate(e.target.value)}
                                    disabled={isPublic}
                                    className={`text-sm font-bold text-slate-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none transition-all min-w-[180px] ${isPublic ? 'cursor-default opacity-80' : 'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 cursor-pointer'}`}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isPublic && (
                        <div className="flex flex-wrap items-end gap-3 pt-4 md:pt-0">
                            <button
                                onClick={() => setShowHistory(true)}
                                className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Histórico
                            </button>

                            <button
                                onClick={handleNewBiometry}
                                className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold text-orange-600 bg-white border-2 border-orange-500 hover:bg-orange-50 transition-all shadow-sm"
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
                                onClick={handleSaveBiometry}
                                className="flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                Salvar Biometria
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Seleção: Nova Biometria */}
            {showNewBiometryOptions && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300 no-print">
                    <div className="bg-white w-full max-sm:max-w-xs max-w-sm rounded-[32px] shadow-2xl border border-gray-100 p-8 animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                                📊
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Nova Biometria</h3>
                            <p className="text-sm text-gray-500 font-medium mt-2">Como deseja iniciar os lançamentos?</p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={startNewBiometryFromPrevious}
                                className="w-full flex items-center gap-4 p-5 rounded-[20px] bg-slate-50 border border-slate-100 hover:bg-orange-50 hover:border-orange-200 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                    📋
                                </div>
                                <div>
                                    <span className="block font-black text-slate-800 text-sm uppercase tracking-wider">Basear na Anterior</span>
                                    <span className="block text-xs text-gray-400 font-bold uppercase mt-0.5">Viveiros & Pesos Antigos</span>
                                </div>
                            </button>

                            <button
                                onClick={startNewBiometryFromIA}
                                className="w-full flex items-center gap-4 p-5 rounded-[20px] bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                    🪄
                                </div>
                                <div>
                                    <span className="block font-black text-indigo-700 text-sm uppercase tracking-wider">Importar via IA</span>
                                    <span className="block text-[10px] text-indigo-400 font-black uppercase mt-0.5">Imagem ou Documento</span>
                                </div>
                            </button>
                        </div>

                        <button
                            onClick={() => setShowNewBiometryOptions(false)}
                            className="w-full mt-8 py-4 text-xs font-black text-gray-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden AI File Input */}
            <input
                type="file"
                ref={aiFileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => handleFileSelect(e, true)}
                data-html2canvas-ignore="true"
            />

            <div id="dashboard-content" ref={dashboardRef} className="w-full max-w-5xl mx-auto bg-white rounded-2xl md:rounded-[32px] shadow-2xl shadow-blue-900/5 border border-gray-100 overflow-hidden relative">

                {/* --- PREMIUM HEADER --- */}
                <header className="bg-white px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-gray-50">

                    {/* Left: Branding (Enlarged and text removed) */}
                    <div className="flex-1 flex justify-start items-center">
                        <div
                            onClick={() => document.getElementById('logo-upload-input')?.click()}
                            className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[32px] bg-white flex items-center justify-center flex-shrink-0 shadow-xl shadow-gray-200/50 border border-gray-50/50 overflow-hidden group cursor-pointer hover:border-orange-200 transition-all"
                        >
                            {logo ? (
                                <img src={logo} alt="Logo" className="w-20 h-20 md:w-28 md:h-28 object-contain hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <div className="w-20 h-20 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-3xl">C</div>
                            )}
                            <input
                                id="logo-upload-input"
                                type="file"
                                className="hidden"
                                onChange={handleLogoUpload}
                                accept="image/*"
                            />
                        </div>
                    </div>

                    {/* Center: Title Section */}
                    <div className="flex-[2] flex flex-col items-center text-center order-first md:order-none">
                        <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tighter leading-none mb-2">
                            BIOMETRIA
                        </h1>
                        <p className="text-[10px] md:text-sm font-bold text-orange-500 uppercase tracking-[0.3em] font-sans">
                            Análise de Performance
                        </p>
                    </div>

                    {/* Right: Metadata */}
                    <div className="flex-1 flex flex-col items-center md:items-end text-center md:text-right gap-1 font-sans">
                        <div className="text-[10px] items-center gap-2 font-bold text-gray-400 uppercase tracking-widest mb-1 flex">
                            Relatório Técnico <span className="w-1 h-1 rounded-full bg-gray-300"></span> {new Date(biometryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        <p className="text-[10px] md:text-xs leading-none">
                            <span className="text-gray-400 font-medium">Gerente:</span>
                            <span className="text-slate-800 font-bold ml-1">Cleiton Manoel de Lima</span>
                        </p>
                        <p className="text-[10px] md:text-xs leading-none">
                            <span className="text-gray-400 font-medium">Analista Adm:</span>
                            <span className="text-slate-800 font-bold ml-1">Luanthony L. Oliveira</span>
                        </p>
                    </div>

                </header>

                {/* Tabela Principal */}
                <main className="px-4 md:px-6 pb-6 bg-white">
                    <div className="rounded-2xl border border-gray-100 overflow-x-auto mb-8 scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="w-full text-[10px] md:text-xs text-left min-w-[1000px] md:min-w-0">
                            <thead className="bg-[#F8FAFC] text-slate-500 uppercase font-black tracking-widest border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-4 min-w-[80px] sticky left-0 bg-[#F8FAFC] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">VIV.</th>
                                    <th className="px-4 py-4 text-center">D. POV.</th>
                                    <th className="px-4 py-4 text-center">DIAS</th>
                                    <th className="px-4 py-4 text-right">P.M (G)</th>
                                    <th className="px-4 py-4 text-right">QUANT.</th>
                                    <th className="px-4 py-4 text-right">PESO TOTAL (G)</th>
                                    <th className="px-4 py-4 text-right">P.M ANT.</th>
                                    <th className="px-4 py-4 text-right">INC. SEM.</th>
                                    <th className="px-4 py-4 text-right">GPD</th>
                                    <th className="px-6 py-4 text-left">STATUS ANALYSIS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {processedData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-gray-50 last:border-0 group">
                                        <td className="px-5 py-4 font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                                            <div className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50/50 text-emerald-700 font-extrabold tracking-tight min-w-[80px]">
                                                {item.viveiro}
                                            </div>
                                        </td>

                                        <td className="px-4 py-4 text-center group/date relative">
                                            {isPublic ? (
                                                <span className="bg-gray-100 text-slate-500 font-bold px-3 py-1.5 rounded-lg text-[10px] w-[110px] inline-block">
                                                    {item.dataPovoamento ? (item.dataPovoamento.includes('-') ? item.dataPovoamento.split('-').reverse().join('/') : item.dataPovoamento) : '-'}
                                                </span>
                                            ) : (
                                                <input
                                                    type="date"
                                                    value={item.dataPovoamento || ''}
                                                    onChange={(e) => handleUpdateRow(item.viveiro, 'dataPovoamento', e.target.value)}
                                                    className="bg-gray-100 text-slate-500 font-bold px-3 py-1.5 rounded-lg text-[10px] border-none outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer w-[110px]"
                                                />
                                            )}
                                        </td>

                                        <td className="px-4 py-4 text-center font-bold text-slate-400">{item.diasCultivo}</td>

                                        <td className="px-4 py-4 text-right">
                                            {isPublic ? (
                                                <span className="font-bold text-slate-400">{item.pMedInputValue}</span>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={item.pMedInputValue}
                                                    onChange={(e) => handleUpdateRow(item.viveiro, 'pMedStr', e.target.value)}
                                                    className="w-16 text-right bg-transparent border-b border-transparent focus:border-slate-200 outline-none transition-all font-bold text-slate-400"
                                                />
                                            )}
                                        </td>

                                        <td
                                            onClick={() => handleCopy(item.quatInputValue, 'Quantidade')}
                                            className="px-4 py-4 text-right font-bold text-slate-400 cursor-copy hover:text-slate-600 transition-colors"
                                        >
                                            {item.quatInputValue}
                                        </td>

                                        <td
                                            onClick={() => handleCopy(item.pesoTotal, 'Peso Total')}
                                            className="px-4 py-4 text-right font-black text-slate-800 cursor-copy hover:text-slate-900 transition-colors"
                                        >
                                            {item.pesoTotal}
                                        </td>

                                        <td className="px-4 py-4 text-right font-bold text-slate-300">
                                            {item.pAntDisplay}
                                        </td>

                                        <td className={`px-4 py-4 text-right font-black ${item.incSemanalStr.includes('+') ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {item.incSemanalStr}
                                        </td>

                                        <td className="px-4 py-4 text-right font-bold text-slate-400">
                                            {item.gpdDisplay}
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* Logic for Status Badge based on analysisStatus */}
                                                {(() => {
                                                    const status = item.analysisStatus.split(':')[0].toUpperCase();
                                                    const label = item.analysisStatus.split(':')[0];
                                                    const subLabel = item.analysisStatus.split(':')[1] || '';

                                                    let badgeClass = "";
                                                    let icon = null;

                                                    if (status.includes('ESPETACULAR') || status.includes('ÓTIMO')) {
                                                        badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-100";
                                                        icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>;
                                                    } else if (status.includes('REGULAR') || status.includes('BOM')) {
                                                        badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
                                                        icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" /></svg>;
                                                    } else if (status.includes('RUIM')) {
                                                        badgeClass = "bg-orange-50 text-orange-600 border-orange-100";
                                                        icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
                                                    } else {
                                                        badgeClass = "bg-rose-50 text-rose-600 border-rose-100";
                                                        icon = <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>;
                                                    }

                                                    return (
                                                        <div className={`flex flex-col border rounded-xl px-2 md:px-3 py-1 md:py-1.5 min-w-[120px] md:min-w-[140px] shadow-sm ${badgeClass}`}>
                                                            <div className="flex items-center gap-1.5 font-black uppercase text-[9px] md:text-[10px]">
                                                                {icon}
                                                                {label}
                                                            </div>
                                                            <div className="text-[8px] md:text-[9px] font-bold opacity-80 leading-none mt-0.5">{subLabel.replace('(', '').replace(')', '')}</div>
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
                    <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
                        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Ótimo</span>
                            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Regular / Bom</span>
                            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Ruim</span>
                            <span className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div> Crítico</span>
                        </div>

                        <button
                            onClick={() => setShowReferenceTable(!showReferenceTable)}
                            className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-slate-800 uppercase tracking-widest transition-all group"
                        >
                            {showReferenceTable ? 'Ocultar Tabela de Metas' : 'Ver Tabela de Metas'}
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showReferenceTable ? 'rotate-90' : 'group-hover:translate-x-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    {/* Tabela de Referência (Toggle) */}
                    {showReferenceTable && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2 text-center">Tabela de Referência de Crescimento (Peso em Gramas)</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center border-collapse border border-gray-200">
                                    <thead className="bg-gray-100 text-gray-600">
                                        <tr>
                                            <th className="border border-gray-200 p-1">Dias</th>
                                            <th className="border border-orange-100 p-1 bg-[#FFEDD5] text-[#7C2D12]">Espetacular</th>
                                            <th className="border border-orange-100 p-1 bg-[#FFF7ED] text-[#9A3412]">Ótimo</th>
                                            <th className="border border-orange-100 p-1 bg-white text-[#C2410C]">Bom</th>
                                            <th className="border border-orange-100 p-1 bg-white text-[#EA580C]">Regular</th>
                                            <th className="border border-orange-100 p-1 bg-white text-[#F97316]">Ruim</th>
                                            <th className="border border-orange-100 p-1 bg-red-50 text-[#B91C1C]">Péssimo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {GROWTH_TABLE.map((row) => (
                                            <tr key={row.day} className="hover:bg-gray-50">
                                                <td className="border border-gray-200 p-1 font-bold">{row.day}</td>
                                                <td className="border border-gray-200 p-1">{row.espetacular.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.otimo.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.bom.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.regular.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.ruim.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.pessimo.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- ACTION BUTTONS FOOTER --- */}
                    {!isPublic && (
                        <div className="mt-8 border-t border-gray-100 pt-6 flex flex-wrap justify-center gap-3 no-print" data-html2canvas-ignore="true">
                            <button
                                onClick={saveBackup}
                                className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm"
                                title="Baixar backup dos dados (JSON)"
                            >
                                <span>💾</span> Salvar Backup
                            </button>

                            <div className="relative">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-2 shadow-sm"
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

                            <div className="w-px h-8 bg-gray-200 mx-2 hidden md:block"></div>

                            <button onClick={exportPDF} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                                📄 PDF
                            </button>
                            <button onClick={exportPNG} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                                🖼️ PNG
                            </button>
                            <button onClick={copyHTML} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                                🌐 HTML
                            </button>
                        </div>
                    )}

                </main>
                {!isPublic && (
                    <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                        <p className="text-[10px] text-gray-400 font-mono opacity-60">
                            Sistema Integrado de Gestão • v2.0 (Backup & Input) • Conectado ao GitHub
                        </p>
                    </div>
                )}
            </div>
        </div>
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
                                onClick={() => setShowHistory(false)}
                                className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
