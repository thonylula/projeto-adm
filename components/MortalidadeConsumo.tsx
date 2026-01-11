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
}

export const MortalidadeConsumo: React.FC<MortalidadeConsumoProps> = ({ activeCompany, activeYear, activeMonth, isPublic = false }) => {
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

    useEffect(() => {
        localStorage.setItem(`mortalidade_layout_${activeCompany?.id || 'default'}`, JSON.stringify(tableConfig));
    }, [tableConfig, activeCompany?.id]);

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
            const success = await orchestrator.routeToAgent('mortality-storage', {
                operation: 'save',
                companyId: activeCompany.id,
                month,
                year,
                data
            });

            if (success) {
                setMessage({ text: 'Dados salvos com sucesso!', type: 'success' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ text: 'Erro ao salvar dados.', type: 'error' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ text: 'Erro crítico ao salvar dados.', type: 'error' });
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
        if (isPublic) return null;
        return (
            <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 print:hidden">
                <button onClick={() => performExport('pdf')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg active:scale-95">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                    PDF
                </button>
                <button onClick={() => performExport('png')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-all shadow-lg active:scale-95">PNG</button>
                <button onClick={() => performExport('html')} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95">HTML</button>
                {!isPublic && (
                    <>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
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
                <button onClick={handleShare} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Compartilhar</button>

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

                <div className="flex bg-slate-100 p-1 rounded-lg">
                    {[0, 1, 2, 3, 4, 5].map(w => (
                        <button
                            key={w}
                            onClick={() => setSelectedWeek(w)}
                            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${selectedWeek === w
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {w === 0 ? 'MÊS' : `S${w}`}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-slate-200 mx-2" />
                <div className="relative">
                    {!isPublic && (
                        <button
                            onClick={() => setShowLayoutSettings(!showLayoutSettings)}
                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all shadow-lg active:scale-95 flex items-center gap-2 ${showLayoutSettings ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <span>⚙️</span> Ajustar Layout
                        </button>
                    )}

                    {showLayoutSettings && (
                        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                                <h3 className="font-black text-[10px] text-slate-900 uppercase">Ajustes de Tabela</h3>
                                <button onClick={() => setShowLayoutSettings(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                            </div>

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
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
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
                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>

                                <button
                                    onClick={() => setTableConfig({ dayColWidth: 55, headerColWidth: 65, fontSize: 10, rowHeight: 6, lineHeight: 30, veWidth: 56 })}
                                    className="w-full py-2 bg-slate-50 text-slate-500 text-[9px] font-bold rounded-lg hover:bg-slate-100 transition-colors uppercase"
                                >
                                    Resetar para Padrão
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                {!isPublic && (
                    <>
                        <div className="w-px h-8 bg-slate-200 mx-2" />
                        <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        <button onClick={() => document.getElementById('logo-upload-input')?.click()} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-purple-700 transition-all shadow-lg active:scale-95">📷 Logo</button>
                    </>
                )}
            </div>
        );
    };

    if (isLoading && !data) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
    }

    return (
        <div className="space-y-6" id="mortality-view">
            <ActionBar />

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'} animate-fade-in`}>
                    {message.text}
                </div>
            )}

            <div
                id="export-target"
                className={`bg-white rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden transition-all ${isExporting ? 'p-10' : 'p-0 sm:p-4'}`}
            >
                <header className="flex justify-between items-center mb-6 pb-6 border-b border-slate-100 p-4">
                    <div className="flex items-center gap-8">
                        {companyLogo && !companyLogo.startsWith('blob:') && (
                            <img src={companyLogo} alt="Logo" className="h-16 w-auto object-contain" />
                        )}
                        <div className="text-left">
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Mortalidade e Consumo</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                {activeCompany?.name || 'Controle diário de ração e perdas'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold">
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
                        className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-orange-500"
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
                        className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-1 focus:ring-orange-500"
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
                                ? 'bg-orange-600 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            📊 Tabela
                        </button>
                        {!isPublic && (
                            <button
                                onClick={() => setActiveView('dashboard')}
                                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeView === 'dashboard'
                                    ? 'bg-purple-600 text-white shadow-lg'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
                        scrollbar-color: #cbd5e1 transparent;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar {
                        height: 6px;
                    }
                    #export-target .overflow-x-auto::-webkit-scrollbar-thumb {
                        background-color: #cbd5e1;
                        border-radius: 10px;
                    }
                `}</style>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden m-4 mt-0">
                            <div id="interactive-table-container">
                                <div
                                    ref={topScrollRef}
                                    className="overflow-x-auto border-b border-slate-100 print:hidden"
                                    onScroll={(e) => {
                                        if (scrollRef.current) scrollRef.current.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
                                    }}
                                    data-html2canvas-ignore
                                >
                                    <div style={{ width: `${(tableConfig.veWidth + 140 + 90 + (tableConfig.headerColWidth * 3) + 50 + 75) + (daysArray.length * tableConfig.dayColWidth)}px`, height: '1px' }} />
                                </div>
                                <div
                                    ref={scrollRef}
                                    className="overflow-x-auto"
                                    onScroll={(e) => {
                                        if (topScrollRef.current) topScrollRef.current.scrollLeft = (e.currentTarget as HTMLDivElement).scrollLeft;
                                    }}
                                >
                                    <table className="w-full border-collapse" style={{
                                        minWidth: `${(tableConfig.veWidth + 140 + 90 + (tableConfig.headerColWidth * 3) + 50 + 75) + (daysArray.length * tableConfig.dayColWidth)}px`,
                                        fontSize: `${tableConfig.fontSize}px`
                                    }}>
                                        <thead>
                                            <tr className="bg-slate-900" style={{ height: `${tableConfig.rowHeight * 6}px` }}>
                                                <th className="p-2 text-white border border-slate-800 font-black uppercase tracking-wider sticky left-0 z-20 bg-slate-900 text-center" style={{ width: `${tableConfig.veWidth}px` }} rowSpan={2}>VE</th>
                                                <th className="p-2 text-white border border-slate-800 font-bold uppercase sticky z-20 bg-slate-900 w-[140px] text-center" style={{ left: `${tableConfig.veWidth}px` }} rowSpan={2}>Data Povoa</th>
                                                <th className="p-2 text-white border border-slate-800 font-bold uppercase text-center" style={{ width: '90px' }} rowSpan={2}>Área</th>
                                                <th className="p-2 text-white border border-slate-800 font-bold uppercase text-center" style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Pop.Ini</th>
                                                <th className="p-2 text-white border border-slate-800 font-bold uppercase text-center" style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Dens.</th>
                                                <th className="p-2 text-white border border-slate-800 font-bold uppercase text-center" style={{ width: `${tableConfig.headerColWidth}px` }} rowSpan={2}>Biom..</th>
                                                <th className="p-1 text-slate-400 bg-slate-900 border border-slate-800 font-black text-[0.8em] uppercase text-center min-w-[50px]" rowSpan={2}>Tipo</th>
                                                <th className="p-1 border border-slate-800 text-center text-slate-400 font-black uppercase tracking-widest text-[0.9em]" colSpan={daysArray.length}>Dias do Mês</th>
                                                <th className="p-2 text-white border border-slate-800 font-black uppercase sticky right-0 z-20 bg-slate-900 w-20 text-center" rowSpan={2}>Total</th>
                                            </tr>
                                            <tr className="bg-slate-800" style={{ height: `${tableConfig.rowHeight * 4}px` }}>
                                                {daysArray.map(d => (
                                                    <th
                                                        key={d}
                                                        className={`p-1 text-[0.9em] border border-slate-700 text-center ${isWeekend(d)
                                                            ? 'text-red-500 font-black'
                                                            : 'text-slate-300 font-bold'
                                                            }`}
                                                        style={{ minWidth: `${tableConfig.dayColWidth}px` }}
                                                    >
                                                        {d}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(data?.records || []).map((record, index) => (
                                                <React.Fragment key={record.id}>
                                                    <tr className="group hover:bg-slate-50 transition-all font-bold text-slate-700" style={{ height: `${tableConfig.lineHeight}px` }}>
                                                        <td className="p-0 border border-slate-100 sticky left-0 z-10 bg-white" style={{ width: `${tableConfig.veWidth}px` }} rowSpan={2}>
                                                            <div className="relative h-full flex items-center justify-center font-black text-slate-900 bg-slate-50 border-r border-slate-200" style={{ minHeight: `${tableConfig.lineHeight * 2}px` }}>
                                                                <input
                                                                    type="text"
                                                                    value={record.ve}
                                                                    onChange={e => handleUpdateHeader(index, 've', e.target.value)}
                                                                    className="w-full text-center bg-transparent border-none focus:ring-0 font-black text-slate-900 outline-none text-[1.1em]"
                                                                />
                                                                <button
                                                                    onClick={() => removeTank(index)}
                                                                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-red-50 text-red-400 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white print:hidden shadow-sm z-30"
                                                                    data-html2canvas-ignore
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2.5 h-2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="p-1 border border-slate-100 sticky z-10 bg-white w-[140px]" style={{ left: `${tableConfig.veWidth}px` }} rowSpan={2}>
                                                            <input type="text" value={record.stockingDate} onChange={e => handleUpdateHeader(index, 'stockingDate', e.target.value)} onPaste={e => handlePaste(e, index, 1)} className="w-full text-center bg-transparent border-none focus:ring-0 font-bold text-slate-600 outline-none text-[1em]" placeholder="00/00/0000" />
                                                        </td>
                                                        <td className="border border-slate-100" style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.area || ''} onChange={e => handleUpdateHeader(index, 'area', parseFloat(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 2)} className="w-full text-center bg-transparent border-none focus:ring-0 font-bold text-slate-500 outline-none text-[1em]" />
                                                        </td>
                                                        <td className="border border-slate-100" style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.initialPopulation || ''} onChange={e => handleUpdateHeader(index, 'initialPopulation', parseInt(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 3)} className="w-full text-center bg-transparent border-none focus:ring-0 font-bold text-slate-500 outline-none text-[1em]" />
                                                        </td>
                                                        <td className="border border-slate-100" style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="number" value={record.density || ''} onChange={e => handleUpdateHeader(index, 'density', parseFloat(e.target.value) || 0)} onPaste={e => handlePaste(e, index, 4)} className="w-full text-center bg-transparent border-none focus:ring-0 font-bold text-slate-500 outline-none text-[1em]" />
                                                        </td>
                                                        <td className="border border-slate-100 bg-indigo-50/10" style={{ padding: `${tableConfig.rowHeight}px 4px` }} rowSpan={2}>
                                                            <input type="text" value={record.biometry} onChange={e => handleUpdateHeader(index, 'biometry', e.target.value)} onPaste={e => handlePaste(e, index, 5)} className="w-full text-center bg-transparent border-none focus:ring-0 font-black text-indigo-600 outline-none text-[1em]" placeholder="..." />
                                                        </td>
                                                        <td className="border border-slate-100 bg-slate-50/50 font-black text-slate-400 text-center tracking-tighter italic border-r-2 border-r-slate-200 uppercase" style={{ fontSize: '0.9em', padding: `${tableConfig.rowHeight}px 2px`, minWidth: '45px' }}>Ração</td>
                                                        {daysArray.map(d => {
                                                            const val = (record.dailyRecords || []).find(dr => dr.day === d)?.feed;
                                                            return (
                                                                <td key={d} className="p-0 border border-slate-100 hover:bg-orange-50/30" style={{ minWidth: `${tableConfig.dayColWidth}px` }}>
                                                                    <input
                                                                        type="number"
                                                                        value={val === 0 ? '' : val}
                                                                        onChange={e => handleUpdateDay(index, d, 'feed', e.target.value)}
                                                                        onPaste={e => handlePaste(e, index, 'feed', d)}
                                                                        className="w-full text-center bg-transparent border-none focus:ring-0 font-bold text-slate-700 outline-none text-[1em]"
                                                                        style={{
                                                                            padding: `${Math.max(0, tableConfig.rowHeight)}px 2px`,
                                                                            marginTop: `${Math.min(0, tableConfig.rowHeight)}px`,
                                                                            marginBottom: `${Math.min(0, tableConfig.rowHeight)}px`
                                                                        }}
                                                                    />
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="p-1 border border-slate-100 sticky right-0 z-10 bg-orange-50 font-black text-orange-700 text-center shadow-[-4px_0_10px_rgba(0,0,0,0.02)] min-w-[75px]" rowSpan={2}>
                                                            <div className="flex flex-col gap-0.5 items-center justify-center italic">
                                                                <span className="text-[11px]">{calculateRowTotal(record, 'feed')} kg</span>
                                                                <div className="w-6 h-px bg-orange-200" />
                                                                <span className="text-pink-600 text-[10px]">{calculateRowTotal(record, 'mortality')} un</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-pink-50/10" style={{ height: `${tableConfig.lineHeight}px` }}>
                                                        <td className="border border-slate-100 text-pink-400 text-center tracking-tighter italic border-r-2 border-r-pink-100 uppercase" style={{ fontSize: '0.9em', padding: `${tableConfig.rowHeight}px 2px` }}>Mort.</td>
                                                        {daysArray.map(d => {
                                                            const val = (record.dailyRecords || []).find(dr => dr.day === d)?.mortality;
                                                            return (
                                                                <td key={d} className="p-0 border border-slate-100 hover:bg-pink-50/50">
                                                                    <input
                                                                        type="number"
                                                                        value={val === 0 ? '' : val}
                                                                        onChange={e => handleUpdateDay(index, d, 'mortality', e.target.value)}
                                                                        onPaste={e => handlePaste(e, index, 'mortality', d)}
                                                                        className="w-full text-center bg-transparent border-none focus:ring-0 font-black text-pink-600 outline-none text-[1em]"
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
                                                    <td colSpan={7} className="p-3">
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
                                            <tr className="bg-slate-900 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] relative z-30">
                                                <td colSpan={7} className="p-3 text-right border-r border-slate-800 sticky left-0 z-20 bg-slate-900" style={{ left: 0 }}>
                                                    <span className="text-white font-black uppercase tracking-widest text-[1em]">Total do Dia</span>
                                                </td>
                                                {daysArray.map(d => (
                                                    <td key={d} className="p-1 border-r border-slate-800">
                                                        <div className="flex flex-col items-center justify-center gap-0">
                                                            <span className="text-orange-400 font-black text-[10px] leading-tight">{calculateDayTotal('feed', d) || 0}</span>
                                                            <span className="text-pink-400 font-bold text-[8px] leading-tight">{calculateDayTotal('mortality', d) || 0}</span>
                                                        </div>
                                                    </td>
                                                ))}
                                                <td className="p-3 bg-orange-600 text-center sticky right-0 z-20">
                                                    <div className="flex flex-col items-center gap-0">
                                                        <span className="text-white font-black text-sm leading-none">
                                                            {data ? (data.records || []).reduce((sum, tank) => sum + calculateRowTotal(tank, 'feed'), 0).toLocaleString('pt-BR') : 0}
                                                        </span>
                                                        <span className="text-orange-200 text-[8px] font-bold uppercase tracking-tighter">TOTAL KG</span>
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
        </div>
    );
};
