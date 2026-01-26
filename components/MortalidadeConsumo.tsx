// [AI-LOCK: OPEN]
import React, { useState, useEffect, useCallback } from 'react';
import { Company, MonthlyMortalityData, MortalityTankRecord, MortalityDailyRecord } from '../types';
import { getOrchestrator } from '../services/agentService';
import { exportToPdf, exportToPngPuppeteer, exportToHtml, shareAsImage } from '../utils/exportUtils';
import { fileToBase64 } from '../utils/fileUtils';
import { MortalidadeDashboard } from './MortalidadeDashboard';

interface MortalidadeConsumoProps {
    activeCompany?: Company | null;
    activeYear: number;
    activeMonth: number;
    isPublic?: boolean;
    isDarkMode?: boolean;
}

export const MortalidadeConsumo: React.FC<MortalidadeConsumoProps> = ({ activeCompany, activeYear, activeMonth, isPublic = false, isDarkMode = false }) => {
    const [data, setData] = useState<MonthlyMortalityData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [month, setMonth] = useState(activeMonth);
    const [year, setYear] = useState(activeYear);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [tankQuantity, setTankQuantity] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = Mes Inteiro, 1-5 = Semanas
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showLayoutSettings, setShowLayoutSettings] = useState(false);
    const [activeView, setActiveView] = useState<'table' | 'dashboard'>('table');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [tableConfig, setTableConfig] = useState(() => {
        const saved = localStorage.getItem(`mortalidade_layout_${activeCompany?.id || 'default'}`);
        return saved ? JSON.parse(saved) : {
            dayColWidth: 55,
            headerColWidth: 65,
            fontSize: 10,
            rowHeight: 6, // padding in px
            lineHeight: 30, // base height for records
            veWidth: 56
        };
    });
    // Visitor Zoom State
    const [zoomLevel, setZoomLevel] = useState(1.0);

    useEffect(() => {
        const layoutKey = `mortalidade_layout_${activeCompany?.id || 'default'}`;
        localStorage.setItem(layoutKey, JSON.stringify(tableConfig));

        // Sync with DB if user is admin (authenticated) and not public view
        if (!isPublic && activeCompany?.id) {
            const orchestrator = getOrchestrator();
            // Debounce save to prevent too many requests
            const timeoutId = setTimeout(() => {
                orchestrator.routeToAgent('mortality-storage', {
                    operation: 'save',
                    companyId: activeCompany.id,
                    month: 0, // 0 indicates config/metadata storage
                    year: 0,
                    data: { layout: tableConfig }
                });
            }, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [tableConfig, activeCompany?.id, isPublic]);

    // Load layout from DB on mount (for everyone, including visitors)
    useEffect(() => {
        const loadRemoteLayout = async () => {
            if (activeCompany?.id) {
                const orchestrator = getOrchestrator();
                const remoteConfig = await orchestrator.routeToAgent('mortality-storage', {
                    operation: 'load',
                    companyId: activeCompany.id,
                    month: 0,
                    year: 0
                });
                if (remoteConfig && remoteConfig.layout) {
                    setTableConfig(remoteConfig.layout);
                }
            }
        };
        loadRemoteLayout();
    }, [activeCompany?.id]);

    // Removed useGeminiParser as we now use agents

    useEffect(() => {
        setMonth(activeMonth);
        setYear(activeYear);
    }, [activeMonth, activeYear]);

    const daysInMonth = new Date(year, month, 0).getDate();

    // Filtro de dias por semana
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Função para verificar se um dia é sábado ou domingo
    const isWeekend = (day: number): boolean => {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // 0 = Domingo, 6 = Sábado
    };

    const filteredDaysArray = daysArray.filter(d => {
        if (selectedWeek === 0) return true;
        const start = (selectedWeek - 1) * 7 + 1;
        const end = Math.min(selectedWeek * 7, daysInMonth);
        return d >= start && d <= end;
    });

    const loadData = useCallback(async () => {
        if (!activeCompany?.id) return;
        setIsLoading(true);
        try {
            const orchestrator = getOrchestrator();
            const savedData = await orchestrator.routeToAgent('mortality-storage', {
                operation: 'load',
                companyId: activeCompany.id,
                month,
                year
            });

            if (savedData) {
                setData(savedData);
            } else {
                // Initial empty state
                const defaultRecords: MortalityTankRecord[] = Array.from({ length: 5 }, (_, i) => ({
                    id: crypto.randomUUID(),
                    ve: `${i + 1}`,
                    stockingDate: '',
                    area: 0,
                    initialPopulation: 0,
                    density: 0,
                    biometry: '',
                    dailyRecords: daysArray.map(d => ({ day: d, feed: 0, mortality: 0 }))
                }));

                setData({
                    id: crypto.randomUUID(),
                    companyId: activeCompany.id,
                    month,
                    year,
                    records: defaultRecords
                });
            }
        } catch (e) {
            console.error(e);
            setMessage({ text: 'Erro ao carregar dados.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [activeCompany?.id, month, year, daysArray.length]);

    useEffect(() => {
        loadData();

        const handleDataUpdate = () => {
            loadData();
        };

        window.addEventListener('app-data-updated', handleDataUpdate);
        return () => {
            window.removeEventListener('app-data-updated', handleDataUpdate);
        };
    }, [loadData]);

    useEffect(() => {
        // Safe logo loading logic
        const savedLogo = localStorage.getItem('company_logo');
        const companyLogoUrl = activeCompany?.logoUrl;

        // 1. Priority: Valid saved logo (that is NOT a blob)
        if (savedLogo && !savedLogo.startsWith('blob:')) {
            setCompanyLogo(savedLogo);
        }
        // 2. Fallback: Company logo from DB (that is NOT a blob)
        else if (companyLogoUrl && !companyLogoUrl.startsWith('blob:')) {
            setCompanyLogo(companyLogoUrl);
        } else {
            // Cleanup stale blobs if found
            if (savedLogo?.startsWith('blob:')) {
                localStorage.removeItem('company_logo');
            }
            setCompanyLogo(null);
        }
    }, [activeCompany?.id, activeCompany?.logoUrl]);

    // --- EXPORT & ACTIONS HANDLERS ---
    const performExport = async (type: 'pdf' | 'png' | 'html') => {
        const previousWeek = selectedWeek;
        setIsExporting(true);
        setSelectedWeek(0); // Força visão mensal para exportação completa

        // Aumentado para 800ms para garantir renderização completa em dispositivos mais lentos
        setTimeout(async () => {
            try {
                const suffix = `mortalidade_${month}_${year}`;
                const container = document.getElementById('export-container');
                if (container) container.style.overflow = 'visible'; // Remove scroll temporariamente

                if (type === 'pdf') await exportToPdf('export-target', suffix);
                if (type === 'png') await exportToPngPuppeteer('export-target', suffix);
                if (type === 'html') exportToHtml('export-target', suffix);

                if (container) container.style.overflow = ''; // Restaura scroll
            } catch (error) {
                console.error('Export failed:', error);
            } finally {
                setSelectedWeek(previousWeek); // Restaura visão anterior
                setIsExporting(false);
            }
        }, 500);
    };

    const handleShare = async () => {
        setIsExporting(true);
        // Pequeno delay para garantir que o estado de isExporting seja refletido (ajustes de padding/esconde botões)
        setTimeout(async () => {
            try {
                const suffix = `mortalidade_${month}_${year}`;
                const result = await shareAsImage('export-target', suffix);

                if (result?.success) {
                    if (result.method === 'clipboard') {
                        alert('✅ Imagem copiada! Cole (Ctrl+V) no WhatsApp Web');
                    } else if (result.method === 'download') {
                        alert('✅ Download concluído! Envie o arquivo para o WhatsApp');
                    }
                    // Share API doesn't need an alert, the user sees the native dialog
                }
            } finally {
                setIsExporting(false);
            }
        }, 300);
    };

    const handleBackup = () => {
        if (!data) return;
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_mortalidade_${activeCompany?.name}_${month}_${year}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                setData(json);
                setMessage({ text: 'Backup carregado com sucesso!', type: 'success' });
            } catch (err) {
                setMessage({ text: 'Erro ao carregar backup.', type: 'error' });
            }
        };
        reader.readAsText(file);
    };

    const handleAIPreencher = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !data) return;
        setIsAnalyzing(true);

        const systemPrompt = `
        PROMPT DETALHADO — Extrator de Tabelas Pericial (Alta Velocidade)

        Você é um Extrator de Tabelas Pericial. Sua tarefa é ler a imagem anexada da planilha de "Mortalidade e Consumo" (Aquicultura) e extrair todos os dados rigorosamente, linha por linha e coluna por coluna, sem pular nada.

        --- 1) DETECÇÃO E SEGMENTAÇÃO ---
        - Detecte o grid/tabulação. Cada viveiro (VE) tem DUAS LINHAS: Ração (superior) e Mortalidade (inferior).
        - Colunas: Viveiro (VE), Data Povoa, Área, Pop. Ini, Dens., Biometria, e DIAS (1 a 31).

        --- 2) OCR E LEITURA SEQUENCIAL (REGRA RÍGIDA) ---
        - Leia na ordem: Viveiro 1 Ração -> Viveiro 1 Mortalidade -> Viveiro 2 Ração ...
        - Processe células vazias ou ilegíveis como 0 para os campos de feed e mortality.

        --- 3) NORMALIZAÇÃO ---
        - Datas: DD/MM/AAAA (use ${year} se o ano estiver ausente).
        - Números: Ponto como separador decimal. Remova símbolos (R$, kg, %).

        --- 4) VALIDAÇÃO E INTEGRIDADE ---
        - Calcule somas e compare com os totais da imagem. Se houver divergência, informe no log.

        --- 5) ACELERAÇÃO E PROCESSAMENTO (VELOCIDADE MÁXIMA) ---
        - Processe a tabela em BLOCOS DE 10 LINHAS para otimizar o tempo de resposta.
        - Não suponha valores. Se não houver dado, use 0.

        --- SAÍDA FINAL (Obrigatória: JSON Válido) ---
        Retorne um JSON contendo um objeto com a chave "data" sendo o array de registros para o aplicativo.
        
        FORMATO JSON:
        {
          "data": [
            {
              "ve": "1",
              "stockingDate": "30/09/2025",
              "area": 15.23,
              "initialPopulation": 530,
              "density": 15.97,
              "biometry": "6.58",
              "dailyRecords": [
                { "day": 1, "feed": 210, "mortality": 3 },
                { "day": 2, "feed": 210, "mortality": 0 }
              ]
            }
          ],
          "summary": { "extractedTotalLines": 10, "avgConfidence": 0.98 },
          "log": "Células vazias tratadas como 0..."
        }

        Retorne APENAS o JSON.
        `;

        try {
            const orchestrator = getOrchestrator();
            const fc = await fileToBase64(file);

            const result = await orchestrator.routeToAgent('mortality-data', {
                image: fc.base64,
                mimeType: fc.mimeType,
                year
            });

            const parsedData = result?.data || result;

            if (parsedData && Array.isArray(parsedData)) {
                const newRecords = parsedData.map((dr: any) => ({
                    id: crypto.randomUUID(),
                    ve: dr.ve || '',
                    stockingDate: dr.stockingDate || '',
                    area: parseFloat(dr.area) || 0,
                    initialPopulation: parseInt(dr.initialPopulation) || 0,
                    density: parseFloat(dr.density) || 0,
                    biometry: dr.biometry || '',
                    dailyRecords: Array.from({ length: daysInMonth }, (_, i) => {
                        const day = i + 1;
                        const record = dr.dailyRecords?.find((r: any) => r.day === day);
                        return {
                            day,
                            feed: parseFloat(record?.feed) || 0,
                            mortality: parseInt(record?.mortality) || 0
                        };
                    })
                }));

                setData({ ...data, records: newRecords });
                setMessage({ text: 'Dados extraídos com perfeição pericial via IA!', type: 'success' });
            }
        } catch (err) {
            console.error("Erro no preenchimento IA:", err);
            setMessage({ text: 'Erro na extração pericial. Verifique o console.', type: 'error' });
        } finally {
            setIsAnalyzing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearData = () => {
        if (!data) return;
        if (window.confirm('Deseja realmente limpar todos os dados lançados deste mês? Esta ação não pode ser desfeita.')) {
            const clearedRecords = data.records.map(record => ({
                ...record,
                stockingDate: '',
                area: 0,
                initialPopulation: 0,
                density: 0,
                biometry: '',
                dailyRecords: record.dailyRecords.map(dr => ({ ...dr, feed: 0, mortality: 0 }))
            }));
            setData({ ...data, records: clearedRecords });
            setMessage({ text: 'Dados limpos com sucesso!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleSave = async () => {
        if (!activeCompany?.id || !data) return;

        try {
            const orchestrator = getOrchestrator();
            // Force status defaults to ensure no nulls
            const sanitizedRecords = data.records.map(r => ({ ...r, status: r.status || 'em_curso' }));

            const success = await orchestrator.routeToAgent('mortality-storage', {
                operation: 'save',
                companyId: activeCompany.id,
                month,
                year,
                data: { ...data, records: sanitizedRecords }
            });

            if (success && success.success) {
                setMessage({ text: 'Dados salvos com sucesso no Banco de Dados!', type: 'success' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                // Determine specific error message
                const errorMsg = success?.error || 'Erro desconhecido';
                const isTableMissing = errorMsg.includes('42P01') || (errorMsg.includes('global_configs') && errorMsg.includes('does not exist'));
                const isNullError = errorMsg.includes('23502');

                if (isTableMissing) {
                    setMessage({ text: `🚨 ERRO CRÍTICO: Tabela inexistente (${errorMsg}). Execute o SQL enviado!`, type: 'error' });
                } else if (isNullError) {
                    setMessage({ text: `⚠️ Erro de Validação: Tentativa de salvar dados vazios (${errorMsg}).`, type: 'error' });
                } else {
                    setMessage({ text: `⚠️ Falha ao salvar: ${errorMsg}. Verifique permissões.`, type: 'error' });
                }
            }
        } catch (error: any) {
            console.error("Save Error:", error);
            setMessage({ text: `Erro de conexão: ${error.message || 'Desconhecido'}`, type: 'error' });
        }
    };

    const handleAIAnalysis = async () => {
        if (!data || !data.records || data.records.length === 0) return;
        setIsAnalyzing(true);
        const orchestrator = getOrchestrator();

        try {
            // 1. Relatório Biológico e Alertas
            const report = await orchestrator.routeToAgent('mortality-report', data);

            // 2. Predição de Despesca
            const prediction = await orchestrator.routeToAgent('mortality-prediction', {
                records: data.records
            });

            if (report.success) {
                const alerts = report.criticalAlerts.length > 0
                    ? `\n\n🚨 ALERTAS CRÍTICOS:\n${report.criticalAlerts.join('\n')}`
                    : '\n\n✅ Nenhum alerta biológico crítico detectado.';

                alert(`📊 RELATÓRIO TÉCNICO IA\n\n${report.technicalSummary}${alerts}\n\n🔮 PREVISÃO DE COLHEITA:\n${JSON.stringify(prediction, null, 2)}`);
            }
        } catch (error) {
            console.error("AI Analysis Error", error);
            setMessage({ text: 'Erro na análise inteligente da mortalidade.', type: 'error' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                localStorage.setItem('company_logo', base64);
                setCompanyLogo(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    // --- LOGIC HELPERS ---

    const handleUpdateHeader = (index: number, field: keyof MortalityTankRecord, value: any) => {
        if (!data) return;
        const newRecords = [...data.records];
        newRecords[index] = { ...newRecords[index], [field]: value };
        setData({ ...data, records: newRecords });
    };

    const handleUpdateDay = (tankIndex: number, day: number, type: 'feed' | 'mortality', value: string) => {
        if (!data) return;
        const numValue = parseFloat(value) || 0;
        const newRecords = [...data.records];
        const tank = newRecords[tankIndex];
        const dayRecordIndex = tank.dailyRecords.findIndex(r => r.day === day);

        if (dayRecordIndex >= 0) {
            const newDaily = [...tank.dailyRecords];
            newDaily[dayRecordIndex] = { ...newDaily[dayRecordIndex], [type]: numValue };
            newRecords[tankIndex] = { ...tank, dailyRecords: newDaily };
            setData({ ...data, records: newRecords });
        }
    };

    const handlePaste = (e: React.ClipboardEvent, startTankIndex: number, startColumn: number | 'feed' | 'mortality', dayOffset: number = 0) => {
        e.preventDefault();
        if (!data) return;

        const clipboardText = e.clipboardData.getData('text');
        const rows = clipboardText.split(/\r?\n/).filter(line => line.trim() !== '');

        const newRecords = [...data.records];
        let currentTankIdx = startTankIndex;
        let currentMode: 'header' | 'daily' = typeof startColumn === 'number' ? 'header' : 'daily';
        let currentType: 'feed' | 'mortality' = typeof startColumn === 'string' ? startColumn : 'feed';

        rows.forEach((row, rowIdx) => {
            const cells = row.split(/\t/);

            if (rowIdx > 0) {
                if (currentMode === 'header') {
                    currentTankIdx++;
                } else {
                    if (currentType === 'feed') {
                        currentType = 'mortality';
                    } else {
                        currentType = 'feed';
                        currentTankIdx++;
                    }
                }
            }

            if (currentTankIdx >= newRecords.length) return;

            const tank = { ...newRecords[currentTankIdx] };
            const newDaily = [...tank.dailyRecords];

            cells.forEach((cell, cellIdx) => {
                const cleanVal = cell.trim();

                if (currentMode === 'header') {
                    // Mapeia colunas do cabeçalho
                    const targetCol = (startColumn as number) + cellIdx;
                    if (targetCol === 1) tank.stockingDate = cleanVal;
                    if (targetCol === 2) tank.area = parseFloat(cleanVal.replace(',', '.')) || 0;
                    if (targetCol === 3) tank.initialPopulation = parseInt(cleanVal) || 0;
                    if (targetCol === 4) tank.density = parseFloat(cleanVal.replace(',', '.')) || 0;
                    if (targetCol === 5) tank.biometry = cleanVal;

                    // Se a colagem for longa o suficiente para entrar nos dias (col 7 em diante)
                    if (targetCol >= 7) {
                        const day = targetCol - 6; // 7=dia 1, 8=dia 2...
                        const recordIdx = newDaily.findIndex(r => r.day === day);
                        if (recordIdx >= 0) {
                            newDaily[recordIdx] = { ...newDaily[recordIdx], feed: parseFloat(cleanVal.replace(',', '.')) || 0 };
                        }
                    }
                } else {
                    // Modo Diário (Ração ou Mortalidade)
                    const day = dayOffset + cellIdx;
                    const recordIdx = newDaily.findIndex(r => r.day === day);
                    if (recordIdx >= 0) {
                        const val = cleanVal.replace(',', '.') === '' ? 0 : (parseFloat(cleanVal.replace(',', '.')) || 0);
                        newDaily[recordIdx] = { ...newDaily[recordIdx], [currentType]: val };
                    }
                }
            });

            newRecords[currentTankIdx] = { ...tank, dailyRecords: newDaily };
        });

        setData({ ...data, records: newRecords });
        setMessage({ text: 'Bloco de dados processado com sucesso!', type: 'success' });
        setTimeout(() => setMessage(null), 3000);
    };

    const addTank = () => {
        if (!data || !activeCompany?.id) return;
        const newTanks: MortalityTankRecord[] = Array.from({ length: tankQuantity }, (_, i) => ({
            id: crypto.randomUUID(),
            ve: `${data.records.length + i + 1}`,
            stockingDate: '',
            area: 0,
            initialPopulation: 0,
            density: 0,
            biometry: '',
            dailyRecords: daysArray.map(d => ({ day: d, feed: 0, mortality: 0 }))
        }));
        setData({ ...data, records: [...data.records, ...newTanks] });
    };

    const removeTank = (index: number) => {
        if (!data) return;
        if (window.confirm('Remover este viveiro?')) {
            const newRecords = data.records.filter((_, i) => i !== index);
            setData({ ...data, records: newRecords });
        }
    };

    const calculateRowTotal = (record: MortalityTankRecord, type: 'feed' | 'mortality') => {
        return record.dailyRecords.reduce((sum, curr) => sum + (curr[type] || 0), 0);
    };

    const calculateDayTotal = (type: 'feed' | 'mortality', day: number) => {
        if (!data) return 0;
        return data.records.reduce((sum, tank) => {
            const dayRec = tank.dailyRecords.find(r => r.day === day);
            return sum + (dayRec ? (dayRec[type] || 0) : 0);
        }, 0);
    };

    const ActionBar = () => {
        return (
            <div className={`flex flex-wrap gap-2 mb-6 p-4 rounded-xl shadow-sm border transition-all duration-500 print:hidden ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100'}`}>
                {!isPublic && (
                    <button onClick={() => performExport('pdf')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        PDF
                    </button>
                )}
                <button onClick={() => performExport('png')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-all shadow-lg active:scale-95">PNG</button>
                {!isPublic && (
                    <button onClick={() => performExport('html')} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95">HTML</button>
                )}
                {!isPublic && (
                    <>
                        <div className={`w-px h-8 mx-2 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
                        <input type="file" ref={fileInputRef} onChange={handleAIPreencher} accept="image/*" className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isAnalyzing}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>🪄</span>
                            )}
                            {isAnalyzing ? 'Processando...' : 'IA Preencher Tudo'}
                        </button>
                    </>
                )}

                {!isPublic && (
                    <>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <button
                            onClick={handleAIAnalysis}
                            disabled={isAnalyzing}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isAnalyzing ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <span>📈</span>
                            )}
                            Análise Inteligente
                        </button>
                    </>
                )}

                <div className="w-px h-8 bg-slate-200 mx-2" />
                {!isPublic && (
                    <button onClick={handleShare} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Compartilhar</button>
                )}

                {!isPublic && (
                    <>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <button onClick={handleBackup} className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-800 transition-all shadow-lg active:scale-95">Backup</button>
                        <input type="file" id="load-backup-input" accept=".json" onChange={handleLoadBackup} className="hidden" />
                        <button onClick={() => document.getElementById('load-backup-input')?.click()} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-orange-600 transition-all shadow-lg active:scale-95">Carregar</button>
                        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95">Salvar</button>
                        <button onClick={handleClearData} className="bg-slate-400 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-500 transition-all shadow-lg active:scale-95">Limpar Tudo</button>
                    </>
                )}

                <div className="w-px h-8 bg-slate-200 mx-2" />

                {!isPublic && (
                    <div className={`flex p-1 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        {[0, 1, 2, 3, 4, 5].map(w => (
                            <button
                                key={w}
                                onClick={() => setSelectedWeek(w)}
                                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedWeek === w
                                    ? (isDarkMode ? 'bg-slate-700 text-orange-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm')
                                    : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')
                                    }`}
                            >
                                {w === 0 ? 'MÊS' : `S${w}`}
                            </button>
                        ))}
                    </div>
                )}

                <div className="w-px h-8 bg-slate-200 mx-2" />
                <div className="relative">
                    <button
                        onClick={() => setShowLayoutSettings(!showLayoutSettings)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg active:scale-95 flex items-center gap-2 ${showLayoutSettings
                            ? (isDarkMode ? 'bg-orange-600 text-white' : 'bg-indigo-600 text-white')
                            : (isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}`}
                    >
                        <span>⚙️</span> Ajustar Layout
                    </button>

                    {/* Visitor Zoom Controls */}
                    {isPublic && (
                        <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-sm transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                            <span className={`text-[9px] font-black uppercase px-2 tracking-wider ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Zoom</span>
                            <div className={`flex items-center rounded-md ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
                                <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className={`w-7 h-7 flex items-center justify-center rounded-md transition-all font-bold text-lg active:scale-90 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-orange-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}>-</button>
                                <span className={`text-[10px] font-black w-10 text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{(zoomLevel * 100).toFixed(0)}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className={`w-7 h-7 flex items-center justify-center rounded-md transition-all font-bold text-lg active:scale-90 ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-orange-400' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}>+</button>
                            </div>
                            <button onClick={() => setZoomLevel(1.0)} className={`px-2 text-[9px] font-bold uppercase transition-colors ${isDarkMode ? 'text-slate-500 hover:text-orange-400' : 'text-slate-400 hover:text-indigo-600'}`}>Reset</button>
                        </div>
                    )}

                    {showLayoutSettings && (
                        <div className={`absolute top-full mt-2 right-0 w-64 rounded-xl shadow-2xl border p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 transition-colors ${isDarkMode ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-200'}`}>
                            <div className={`flex justify-between items-center mb-4 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                                <h3 className={`font-black text-[10px] uppercase ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>Ajustes de Tabela</h3>
                                <button onClick={() => setShowLayoutSettings(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                            {isPublic && (
                                <div className={`mb-3 p-2 border rounded-lg ${isDarkMode ? 'bg-blue-900/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                                    <p className={`text-[8px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>💡 Ajustes Locais</p>
                                    <p className={`text-[8px] mt-1 ${isDarkMode ? 'text-blue-500' : 'text-blue-600'}`}>Suas preferências ficam salvas apenas no seu navegador.</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                        <span>Largura Col. Dias</span>
                                        <span className="text-indigo-600">{tableConfig.dayColWidth}px</span>
                                    </label>
                                    <input
                                        type="range" min="20" max="100"
                                        value={tableConfig.dayColWidth}
                                        onChange={e => setTableConfig({ ...tableConfig, dayColWidth: parseInt(e.target.value) })}
                                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                        <span>Largura Col. Fixas</span>
                                        <span className="text-indigo-600">{tableConfig.headerColWidth}px</span>
                                    </label>
                                    <input
                                        type="range" min="40" max="120"
                                        value={tableConfig.headerColWidth}
                                        onChange={e => setTableConfig({ ...tableConfig, headerColWidth: parseInt(e.target.value) })}
                                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                        <span>Tamanho da Fonte</span>
                                        <span className="text-indigo-600">{tableConfig.fontSize}px</span>
                                    </label>
                                    <input
                                        type="range" min="8" max="14"
                                        value={tableConfig.fontSize}
                                        onChange={e => setTableConfig({ ...tableConfig, fontSize: parseInt(e.target.value) })}
                                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                        <span>Altura da Linha</span>
                                        <span className="text-indigo-600">{tableConfig.lineHeight}px</span>
                                    </label>
                                    <input
                                        type="range" min="1" max="80"
                                        value={tableConfig.lineHeight}
                                        onChange={e => setTableConfig({ ...tableConfig, lineHeight: parseInt(e.target.value) })}
                                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="flex justify-between text-[9px] font-black text-slate-500 uppercase">
                                        <span>Respiro (Padding)</span>
                                        <span className="text-indigo-600">{tableConfig.rowHeight}px</span>
                                    </label>
                                    <input
                                        type="range" min="-25" max="15"
                                        value={tableConfig.rowHeight}
                                        onChange={e => setTableConfig({ ...tableConfig, rowHeight: parseInt(e.target.value) })}
                                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-600 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
                                    />
                                </div>

                                <button
                                    onClick={() => setTableConfig({ dayColWidth: 55, headerColWidth: 65, fontSize: 10, rowHeight: 6, lineHeight: 30, veWidth: 56 })}
                                    className={`w-full py-2 text-[9px] font-bold rounded-lg transition-colors uppercase ${isDarkMode ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Resetar para Padrão
                                </button>

                                {!isPublic && (
                                    <button
                                        onClick={() => {
                                            if (activeCompany?.id) {
                                                const orchestrator = getOrchestrator();
                                                orchestrator.routeToAgent('mortality-storage', {
                                                    operation: 'save',
                                                    companyId: activeCompany.id,
                                                    month: 0,
                                                    year: 0,
                                                    data: { layout: tableConfig }
                                                });
                                                setMessage({ text: 'Layout sincronizado com a nuvem!', type: 'success' });
                                                setTimeout(() => setMessage(null), 3000);
                                            }
                                        }}
                                        className={`w-full py-2 text-white text-[9px] font-bold rounded-lg transition-colors uppercase mt-2 shadow-sm ${isDarkMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                    >
                                        ☁️ Sincronizar Layout (Global)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {
                    !isPublic && (
                        <>
                            <div className="w-px h-8 bg-slate-200 mx-2" />
                            <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                            <button onClick={() => document.getElementById('logo-upload-input')?.click()} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-purple-700 transition-all shadow-lg active:scale-95">📷 Logo</button>
                        </>
                    )
                }
            </div >
        );
    };

    if (isLoading && !data) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
    }

    return (
        <div className="space-y-6" id="mortality-view">
            <ActionBar />

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold transition-colors duration-500 ${message.type === 'success'
                    ? (isDarkMode ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-50 text-emerald-700')
                    : (isDarkMode ? 'bg-red-900/30 text-red-400 border border-red-800/50' : 'bg-red-50 text-red-700')} animate-fade-in`}>
                    {message.text}
                </div>
            )}

            <div
                id="export-target"
                className={`rounded-3xl shadow-sm border relative overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-100'} ${isExporting ? 'p-10' : 'p-0 sm:p-4'}`}
            >
                <header className={`flex justify-between items-center mb-6 pb-6 border-b p-4 transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <div className="flex items-center gap-8">
                        {companyLogo && !companyLogo.startsWith('blob:') && (
                            <img src={companyLogo} alt="Logo" className="h-16 w-auto object-contain" />
                        )}
                        <div className="text-left">
                            <h1 className={`text-2xl font-black uppercase tracking-tight transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Mortalidade e Consumo</h1>
                            <p className={`text-xs font-bold uppercase tracking-widest mt-1 transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {activeCompany?.name || 'Controle diário de ração e perdas'}
                            </p>
                            <p className={`text-[10px] mt-1 font-bold transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {year}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="flex gap-2 mb-4 px-4 print:hidden" data-html2canvas-ignore>
                    <select
                        value={month}
                        onChange={(e) => {
                            const newMonth = parseInt(e.target.value);
                            setMonth(newMonth);
                            window.dispatchEvent(new CustomEvent('app-navigation', {
                                detail: { tab: 'mortalidade', year, month: newMonth }
                            }));
                        }}
                        className={`border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-orange-500 transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700'}`}
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                                {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}
                            </option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => {
                            const newYear = parseInt(e.target.value);
                            setYear(newYear);
                            window.dispatchEvent(new CustomEvent('app-navigation', {
                                detail: { tab: 'mortalidade', year: newYear, month }
                            }));
                        }}
                        className={`border-none rounded-lg px-3 py-1.5 text-xs font-bold focus:ring-1 focus:ring-orange-500 transition-colors duration-500 ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-700'}`}
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                {/* Tab Navigation */}
                {!isPublic && (
                    <div className="flex gap-2 mb-4 px-4 print:hidden" data-html2canvas-ignore>
                        <button
                            onClick={() => setActiveView('table')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeView === 'table'
                                ? (isDarkMode ? 'bg-orange-600 text-white shadow-lg' : 'bg-orange-600 text-white shadow-lg')
                                : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                }`}
                        >
                            📊 Tabela
                        </button>
                        {!isPublic && (
                            <button
                                onClick={() => setActiveView('dashboard')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeView === 'dashboard'
                                    ? (isDarkMode ? 'bg-purple-600 text-white shadow-lg' : 'bg-purple-600 text-white shadow-lg')
                                    : (isDarkMode ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                                    }`}
                            >
                                📈 Dashboard
                            </button>
                        )}
                    </div>
                )}

                {/* Conditional Rendering */}
                {activeView === 'dashboard' ? (
                    <MortalidadeDashboard data={data} />
                ) : (
                    <>

                        <style>{`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                    input[type=number] {
                        -moz-appearance: textfield;
                    }
                    #export-target .overflow-x-auto {
                        scrollbar-width: thin;
                        scrollbar-color: #f26522 transparent;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar {
                        height: 12px;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar-thumb {
                        background-color: #f26522;
                        border-radius: 2px;
                        border: 3px solid transparent;
                        background-clip: content-box;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                        background-color: #d95213;
                    }
                `}</style>

                        <div className={`rounded-xl shadow-sm border overflow-x-auto m-4 mt-0 transition-colors duration-500 ${isDarkMode ? 'bg-[#1E293B] border-slate-700' : 'bg-white border-slate-100'}`}>
                            <div id="interactive-table-container" className="min-w-max">
                                <div
                                    ref={topScrollRef}
                                    className={`overflow-x-auto transition-colors duration-500 print:hidden scrollbar-thin ${isDarkMode ? 'bg-slate-900 border-b border-slate-700' : 'bg-slate-50 border-b border-slate-200'}`}
                                    onScroll={(e) => {
                                        if (scrollRef.current) scrollRef.current.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
                                    }}
                                    data-html2canvas-ignore
                                >
                                    <div style={{ width: `${(tableConfig.veWidth + 140 + 90 + (tableConfig.headerColWidth * 3) + 80 + 50 + 75) + (daysArray.length * tableConfig.dayColWidth)}px`, height: '14px' }} />
                                </div>
                                <div
                                    ref={scrollRef}
                                    className="overflow-x-auto"
                                    onScroll={(e) => {
                                        if (topScrollRef.current) topScrollRef.current.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
                                    }}
                                    style={{
                                        transform: isPublic ? `scale(${zoomLevel})` : 'none',
                                        transformOrigin: 'top left',
                                        width: isPublic ? `${(1 / zoomLevel) * 100}%` : 'auto'
                                    }}
                                >
                                    <table className="w-full border-collapse" style={{
                                        minWidth: `${(tableConfig.veWidth + 140 + 90 + (tableConfig.headerColWidth * 3) + 80 + 50 + 75) + (daysArray.length * tableConfig.dayColWidth)}px`,
                                        fontSize: `${tableConfig.fontSize}px`
                                    }}>
                                        <thead>
                                            <tr className={isDarkMode ? 'bg-slate-900' : 'bg-slate-900'} style={{ height: `${tableConfig.rowHeight * 6}px` }}>
                                                <th className={`p-2 text-white border font-black uppercase tracking-wider sticky left-0 z-20 text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900'}`} style={{ width: `${tableConfig.veWidth}px` }} rowSpan={2}>VE</th>
                                                <th className={`p-2 text-white border font-bold uppercase sticky z-20 w-[140px] text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900'}`} style={{ left: `${tableConfig.veWidth}px` }} rowSpan={2}>Data Povoa</th>
                                                <th className={`p-2 text-white border font-bold uppercase text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-800'}`} style={{ width: '90px' }} rowSpan={2}>Área</th>
                                                <th className={`p-2 text-white border font-bold uppercase text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-800'}`} style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Pop.Ini</th>
                                                <th className={`p-2 text-white border font-bold uppercase text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-800'}`} style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Dens.</th>
                                                <th className={`p-2 text-white border font-bold uppercase text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-800'}`} style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Biom..</th>
                                                <th className={`p-2 text-white border font-bold uppercase text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-800'}`} style={{ width: `80px` }} rowSpan={2}>Situação</th>
                                                <th className={`p-1 border font-black text-[0.8em] uppercase text-center transition-colors duration-500 ${isDarkMode ? 'text-slate-500 bg-slate-900 border-slate-700' : 'text-slate-400 bg-slate-900 border-slate-800'}`} style={{ width: '50px', minWidth: '50px' }} rowSpan={2}>Tipo</th>
                                                <th className={`p-1 border text-center font-black uppercase tracking-widest text-[0.9em] transition-colors duration-500 ${isDarkMode ? 'border-slate-700 text-slate-500' : 'border-slate-800 text-slate-400'}`} colSpan={daysArray.length}>Dias do Mês</th>
                                                <th className={`p-2 text-white border font-black uppercase sticky right-0 z-20 w-20 text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-800 bg-slate-900'}`} rowSpan={2}>Total</th>
                                            </tr>
                                            <tr className={isDarkMode ? 'bg-slate-800' : 'bg-slate-800'} style={{ height: `${tableConfig.rowHeight * 4}px` }}>
                                                {daysArray.map(d => (
                                                    <th
                                                        key={d}
                                                        className={`p-1 text-[0.9em] border text-center transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-700'} ${isWeekend(d)
                                                            ? (isDarkMode ? 'text-rose-500 font-black' : 'text-red-500 font-black')
                                                            : (isDarkMode ? 'text-slate-500 font-bold' : 'text-slate-300 font-bold')
                                                            }`}
                                                        style={{ width: `${tableConfig.dayColWidth}px`, minWidth: `${tableConfig.dayColWidth}px` }}
                                                    >
                                                        {d}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.records || []).map((record, index) => (
                                                <React.Fragment key={record.id}>
                                                    <tr className={`transition-all font-bold group transition-colors duration-500 ${isDarkMode
                                                        ? (record.status === 'preparacao' ? 'bg-emerald-900/30' : 'hover:bg-slate-800/50 text-slate-300')
                                                        : (record.status === 'preparacao' ? 'bg-[#dcedc8] hover:!bg-[#c5e1a5]' : 'hover:bg-slate-50 text-slate-700')}`} style={{ height: `${tableConfig.lineHeight}px` }}>
                                                        <td className={`p-0 border sticky left-0 z-10 transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'} ${record.status === 'preparacao' ? (isDarkMode ? 'bg-emerald-900/40' : 'bg-[#dcedc8]') : (isDarkMode ? 'bg-[#1E293B]' : 'bg-white')}`} style={{ width: `${tableConfig.veWidth}px` }} rowSpan={2}>
                                                            <div className={`relative h-full flex items-center justify-center font-black border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} ${record.status === 'preparacao' ? 'bg-transparent' : (isDarkMode ? 'bg-slate-800/50 text-white' : 'bg-slate-50 text-slate-900')}`} style={{ minHeight: `${tableConfig.lineHeight * 2}px` }}>
                                                                <input
                                                                    type="text"
                                                                    value={record.ve}
                                                                    onChange={e => handleUpdateHeader(index, 've', e.target.value)}
                                                                    className={`w-full text-center bg-transparent border-none focus:ring-0 font-black outline-none text-[1.1em] ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
                                                                />
                                                                <button
                                                                    onClick={() => removeTank(index)}
                                                                    className={`absolute left-1 top-1/2 -translate-y-1/2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-sm z-30 print:hidden ${isDarkMode ? 'bg-rose-900/50 text-rose-400 hover:bg-rose-600 hover:text-white' : 'bg-red-50 text-red-400 hover:bg-red-500 hover:text-white'}`}
                                                                    data-html2canvas-ignore
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className={`p-1 border sticky z-10 w-[140px] transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'} ${record.status === 'preparacao' ? (isDarkMode ? 'bg-emerald-900/40' : 'bg-[#dcedc8]') : (isDarkMode ? 'bg-[#1E293B]' : 'bg-white')}`} style={{ left: `${tableConfig.veWidth}px` }} rowSpan={2}>
                                                            <input type="text" value={record.stockingDate} onChange={e => handleUpdateHeader(index, 'stockingDate', e.target.value)} onPaste={e => handlePaste(e, index, 1)} className={`w-full text-center bg-transparent border-none focus:ring-0 font-bold outline-none text-[1em] ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`} placeholder="00/00/0000" />
                                                        </td>
                                                        <td className={`border transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.area || ''} onChange={e => handleUpdateHeader(index, 'area', parseFloat(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 2)} className={`w-full text-center bg-transparent border-none focus:ring-0 font-bold outline-none text-[1em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                                        </td>
                                                        <td className={`border transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.initialPopulation || ''} onChange={e => handleUpdateHeader(index, 'initialPopulation', parseInt(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 3)} className={`w-full text-center bg-transparent border-none focus:ring-0 font-bold outline-none text-[1em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                                        </td>
                                                        <td className={`border transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.density || ''} onChange={e => handleUpdateHeader(index, 'density', parseFloat(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 4)} className={`w-full text-center bg-transparent border-none focus:ring-0 font-bold outline-none text-[1em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                                                        </td>
                                                        <td className={`border transition-colors duration-500 ${isDarkMode ? 'border-slate-700 bg-indigo-900/20' : 'border-slate-100 bg-indigo-50/10'}`} style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="text" value={record.biometry} onChange={e => handleUpdateHeader(index, 'biometry', e.target.value)} onPaste={e => handlePaste(e, index, 5)} className={`w-full text-center bg-transparent border-none focus:ring-0 font-black outline-none text-[1em] ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} placeholder="..." />
                                                        </td>
                                                        <td className={`border relative group/select transition-colors duration-500 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`} style={{ padding: 0, backgroundColor: record.status === 'preparacao' ? (isDarkMode ? 'transparent' : '#dcedc8') : (isDarkMode ? 'transparent' : 'white') }} rowSpan={2}>
                                                            <div className={`absolute inset-0 flex items-center justify-center font-bold text-[0.8em] uppercase ${record.status === 'preparacao' ? (isDarkMode ? 'text-emerald-400' : 'text-green-800') : (isDarkMode ? 'text-slate-500' : 'text-slate-500')}`}>
                                                                {record.status === 'preparacao' ? 'PREPARAÇÃO' : 'EM CURSO'}
                                                            </div>
                                                            <select
                                                                value={record.status === 'preparacao' ? 'preparacao' : 'em_curso'}
                                                                onChange={(e) => handleUpdateHeader(index, 'status', e.target.value)}
                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
                                                            >
                                                                <option value="em_curso">Em Curso</option>
                                                                <option value="preparacao">Preparação</option>
                                                            </select>
                                                        </td>
                                                        <td className={`border font-black tracking-tighter italic border-r-2 uppercase transition-all duration-500 ${isDarkMode ? 'border-slate-700 bg-slate-800/30 text-slate-500 border-r-slate-800' : 'border-slate-100 bg-slate-50/50 text-slate-400 border-r-slate-200'}`} style={{ fontSize: '0.9em', padding: `${tableConfig.rowHeight}px 2px`, width: '50px', minWidth: '50px' }}>Ração</td>
                                                        {daysArray.map(d => {
                                                            const val = (record.dailyRecords || []).find(dr => dr.day === d)?.feed;
                                                            return (
                                                                <td key={d} className={`p-0 border transition-colors duration-500 ${isDarkMode ? 'border-slate-700 hover:bg-orange-950/20' : 'border-slate-100 hover:bg-orange-50/30'}`} style={{ minWidth: `${tableConfig.dayColWidth}px` }}>
                                                                    <input
                                                                        type="number"
                                                                        value={val === 0 ? '' : val}
                                                                        onChange={e => handleUpdateDay(index, d, 'feed', e.target.value)}
                                                                        onPaste={e => handlePaste(e, index, 'feed', d)}
                                                                        className={`w-full text-center bg-transparent border-none focus:ring-0 font-bold outline-none text-[1em] ${isDarkMode ? 'text-orange-400/80' : 'text-slate-700'}`}
                                                                        style={{
                                                                            padding: `${Math.max(0, tableConfig.rowHeight)}px 2px`,
                                                                            marginTop: `${Math.min(0, tableConfig.rowHeight)}px`,
                                                                            marginBottom: `${Math.min(0, tableConfig.rowHeight)}px`
                                                                        }}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                        <td className={`p-1 border sticky right-0 z-10 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.02)] min-w-[75px] transition-colors duration-500 ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-orange-50'}`} rowSpan={2}>
                                                            <div className="flex flex-col gap-0.5 items-center justify-center italic">
                                                                <span className={`text-[11px] font-black ${isDarkMode ? 'text-orange-500' : 'text-orange-700'}`}>{calculateRowTotal(record, 'feed')} kg</span>
                                                                <div className={`w-6 h-px ${isDarkMode ? 'bg-orange-900' : 'bg-orange-200'}`} />
                                                                <span className={`text-[10px] font-black ${isDarkMode ? 'text-rose-500' : 'text-pink-600'}`}>{calculateRowTotal(record, 'mortality')} un</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr className={`transition-colors duration-500 ${isDarkMode ? (record.status === 'preparacao' ? 'bg-emerald-900/30' : 'bg-rose-950/10') : (record.status === 'preparacao' ? 'bg-[#dcedc8]' : 'bg-pink-50/10')}`} style={{ height: `${tableConfig.lineHeight}px` }}>
                                                        <td className={`border text-center tracking-tighter italic border-r-2 uppercase transition-all duration-500 ${isDarkMode ? 'border-slate-700 text-rose-500/70 border-r-rose-900/30' : 'border-slate-100 text-pink-400 border-r-pink-100'}`} style={{ fontSize: '0.9em', padding: `${tableConfig.rowHeight}px 2px`, width: '50px', minWidth: '50px' }}>Mort.</td>
                                                        {daysArray.map(d => {
                                                            const val = (record.dailyRecords || []).find(dr => dr.day === d)?.mortality;
                                                            return (
                                                                <td key={d} className={`p-0 border transition-colors duration-500 ${isDarkMode ? 'border-slate-700 hover:bg-rose-950/30' : 'border-slate-100 hover:bg-pink-50/50'}`}>
                                                                    <input
                                                                        type="number"
                                                                        value={val === 0 ? '' : val}
                                                                        onChange={e => handleUpdateDay(index, d, 'mortality', e.target.value)}
                                                                        onPaste={e => handlePaste(e, index, 'mortality', d)}
                                                                        className={`w-full text-center bg-transparent border-none focus:ring-0 font-black outline-none text-[1em] ${isDarkMode ? 'text-rose-500/80' : 'text-pink-600'}`}
                                                                        style={{
                                                                            padding: `${Math.max(0, tableConfig.rowHeight)}px 2px`,
                                                                            marginTop: `${Math.min(0, tableConfig.rowHeight)}px`,
                                                                            marginBottom: `${Math.min(0, tableConfig.rowHeight)}px`
                                                                        }}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                </React.Fragment>
                                            ))}

                                            {!isPublic && (
                                                <tr className="bg-slate-50 border-t-2 border-slate-200" data-html2canvas-ignore>
                                                    <td colSpan={8} className="p-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex bg-white rounded-lg shadow-sm border border-slate-200 p-0.5">
                                                                <input
                                                                    type="number"
                                                                    value={tankQuantity}
                                                                    onChange={(e) => setTankQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                                                    className="w-10 text-center bg-transparent border-none focus:ring-0 font-bold text-slate-600 text-xs"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={addTank}
                                                                className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-slate-800 transition-all flex items-center gap-2"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                                                                Adicionar Viveiros
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td colSpan={daysArray.length + 1}></td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className={`shadow-[0_-10px_20px_rgba(0,0,0,0.1)] relative z-30 transition-colors duration-500 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-900'}`}>
                                                <td colSpan={8} className={`p-3 text-right border-r sticky left-0 z-20 transition-colors duration-500 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-800 bg-slate-900'}`} style={{ left: 0 }}>
                                                    <span className="text-white font-black uppercase tracking-widest text-[1em]">Total do Dia</span>
                                                </td>
                                                {daysArray.map(d => (
                                                    <td key={d} className={`p-1 border-r transition-colors duration-500 ${isDarkMode ? 'border-slate-800' : 'border-slate-800'}`}>
                                                        <div className="flex flex-col items-center justify-center gap-0">
                                                            <span className={`font-black text-[10px] leading-tight transition-colors duration-500 ${isDarkMode ? 'text-orange-500' : 'text-orange-400'}`}>{calculateDayTotal('feed', d) || 0}</span>
                                                            <span className={`font-bold text-[8px] leading-tight transition-colors duration-500 ${isDarkMode ? 'text-rose-500/80' : 'text-pink-400'}`}>{calculateDayTotal('mortality', d) || 0}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className={`p-3 text-center sticky right-0 z-20 transition-colors duration-500 ${isDarkMode ? 'bg-orange-700' : 'bg-orange-600'}`}>
                                                    <div className="flex flex-col items-center gap-0">
                                                        <span className="text-white font-black text-sm leading-none">
                                                            {data ? (data.records || []).reduce((sum, tank) => sum + calculateRowTotal(tank, 'feed'), 0).toLocaleString('pt-BR') : 0}
                                                        </span>
                                                        <span className={`text-[8px] font-bold uppercase tracking-tighter transition-colors duration-500 ${isDarkMode ? 'text-orange-200/70' : 'text-orange-200'}`}>TOTAL KG</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};
