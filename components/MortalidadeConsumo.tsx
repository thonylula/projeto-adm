// [AI-LOCK: OPEN]
import React, { useState, useEffect, useCallback } from 'react';
import { Company, MonthlyMortalityData, MortalityTankRecord, MortalityDailyRecord } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { exportToPdf, exportToPng, exportToHtml } from '../utils/exportUtils';

interface MortalidadeConsumoProps {
    activeCompany?: Company | null;
    activeYear: number;
    activeMonth: number;
}

export const MortalidadeConsumo: React.FC<MortalidadeConsumoProps> = ({ activeCompany, activeYear, activeMonth }) => {
    const [data, setData] = useState<MonthlyMortalityData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [month, setMonth] = useState(activeMonth);
    const [year, setYear] = useState(activeYear);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [tankQuantity, setTankQuantity] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const [companyLogo, setCompanyLogo] = useState<string | null>(null);
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMonth(activeMonth);
        setYear(activeYear);
    }, [activeMonth, activeYear]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const loadData = useCallback(async () => {
        if (!activeCompany?.id) return;
        setIsLoading(true);
        try {
            const savedData = await SupabaseService.getMortalityData(activeCompany.id, month, year);
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
        setIsExporting(true);
        setTimeout(async () => {
            try {
                const suffix = `mortalidade_${month}_${year}`;
                if (type === 'pdf') await exportToPdf('export-target', suffix);
                if (type === 'png') await exportToPng('export-target', suffix);
                if (type === 'html') exportToHtml('export-target', suffix);
            } catch (error) {
                console.error('Export failed:', error);
            } finally {
                setIsExporting(false);
            }
        }, 500);
    };

    const handleShare = async () => {
        setIsExporting(true);
        setTimeout(async () => {
            try {
                const element = document.getElementById('export-target');
                if (!element || !(window as any).html2canvas) return;
                const canvas = await (window as any).html2canvas(element, { scale: 1.5 });
                canvas.toBlob(async (blob: Blob | null) => {
                    if (!blob) return;
                    const file = new File([blob], `mortalidade_${month}_${year}.png`, { type: 'image/png' });
                    if (navigator.share) {
                        await navigator.share({ files: [file], title: 'Mortalidade' });
                    } else {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `mortalidade_${month}_${year}.png`;
                        link.click();
                    }
                });
            } finally {
                setIsExporting(false);
            }
        }, 100);
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

    const handleSave = async () => {
        if (!activeCompany?.id || !data) return;
        const success = await SupabaseService.saveMortalityData(activeCompany.id, month, year, data);
        if (success) {
            setMessage({ text: 'Dados salvos com sucesso!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } else {
            setMessage({ text: 'Erro ao salvar dados.', type: 'error' });
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

    const handlePaste = (e: React.ClipboardEvent, tankIndex: number, startDay: number, type: 'feed' | 'mortality') => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const values = text.split(/[\t\n\s]+/).map(v => parseFloat(v.replace(',', '.'))).filter(v => !isNaN(v));

        if (values.length === 0 || !data) return;

        const newRecords = [...data.records];
        const tank = newRecords[tankIndex];
        const newDaily = [...tank.dailyRecords];

        values.forEach((val, i) => {
            const currentDay = startDay + i;
            const recordIdx = newDaily.findIndex(r => r.day === currentDay);
            if (recordIdx >= 0) {
                newDaily[recordIdx] = { ...newDaily[recordIdx], [type]: val };
            }
        });

        newRecords[tankIndex] = { ...tank, dailyRecords: newDaily };
        setData({ ...data, records: newRecords });
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

    const ActionBar = () => (
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 print:hidden">
            <button onClick={() => performExport('pdf')} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg active:scale-95">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                PDF
            </button>
            <button onClick={() => performExport('png')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-all shadow-lg active:scale-95">PNG</button>
            <button onClick={() => performExport('html')} className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-all shadow-lg active:scale-95">HTML</button>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <button onClick={handleShare} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all shadow-lg active:scale-95">Compartilhar</button>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <button onClick={handleBackup} className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-800 transition-all shadow-lg active:scale-95">Backup</button>
            <input type="file" id="load-backup-input" accept=".json" onChange={handleLoadBackup} className="hidden" />
            <button onClick={() => document.getElementById('load-backup-input')?.click()} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-orange-600 transition-all shadow-lg active:scale-95">Carregar</button>
            <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95">Salvar</button>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <input type="file" id="logo-upload-input" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <button onClick={() => document.getElementById('logo-upload-input')?.click()} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-purple-700 transition-all shadow-lg active:scale-95">📷 Logo</button>
        </div>
    );

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

            <div id="mortality-table-export" className="bg-white p-4">
                <header className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-6">
                        {companyLogo && !companyLogo.startsWith('blob:') && (
                            <img
                                src={companyLogo}
                                alt="Logo"
                                className="h-16 w-auto object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    console.warn('Logo image failed to load, hiding from export.');
                                }}
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Mortalidade e Consumo</h1>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                {activeCompany?.name || 'Controle diário de ração e perdas por tanque'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {year}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 print:hidden" data-html2canvas-ignore>
                        <select
                            value={month}
                            onChange={(e) => {
                                const newMonth = parseInt(e.target.value);
                                setMonth(newMonth);
                                window.dispatchEvent(new CustomEvent('app-navigation', {
                                    detail: { tab: 'mortalidade', year, month: newMonth }
                                }));
                            }}
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500"
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
                            className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500"
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </header>

                <style>{`
                    input[type=number]::-webkit-inner-spin-button, 
                    input[type=number]::-webkit-outer-spin-button { 
                        -webkit-appearance: none; 
                        margin: 0; 
                    }
                    input[type=number] {
                        -moz-appearance: textfield;
                    }
                `}</style>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* --- VISÃO INTERATIVA (Edição) --- */}
                    <div id="interactive-table-container">
                        <div
                            ref={topScrollRef}
                            className="overflow-x-auto print:hidden"
                            onScroll={(e) => {
                                if (scrollRef.current) {
                                    scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                                }
                            }}
                        >
                            <div style={{ width: 'fit-content', height: '8px' }}>
                                <div style={{ width: `${(daysArray.length * 38) + 600}px`, height: '1px' }}></div>
                            </div>
                        </div>

                        <div
                            ref={scrollRef}
                            className="overflow-x-auto"
                            onScroll={(e) => {
                                if (topScrollRef.current) {
                                    topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
                                }
                            }}
                        >
                            <table className="w-full text-[9px] border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white uppercase font-bold">
                                        <th className="p-1 border border-slate-700 sticky left-0 z-20 bg-slate-900 min-w-[40px]" rowSpan={2}>VE</th>
                                        <th className="p-1 border border-slate-700 min-w-[70px]" rowSpan={2}>Data Povoa</th>
                                        <th className="p-1 border border-slate-700 min-w-[40px]" rowSpan={2}>Área</th>
                                        <th className="p-1 border border-slate-700 min-w-[50px]" rowSpan={2}>Pop. Ini</th>
                                        <th className="p-1 border border-slate-700 min-w-[40px]" rowSpan={2}>Dens.</th>
                                        <th className="p-1 border border-slate-700 z-10 sticky left-[40px] bg-slate-900 min-w-[60px]" rowSpan={2}>Biometria</th>
                                        <th className="p-1 border border-slate-700 min-w-[25px]" rowSpan={2}></th>
                                        <th className="p-0.5 border border-slate-700 text-center" colSpan={daysInMonth}>DIAS DO MÊS</th>
                                        <th className="p-1 border border-slate-700 min-w-[45px]" rowSpan={2}>Total</th>
                                        <th className="p-1 border border-slate-700 print:hidden" rowSpan={2}>Ações</th>
                                    </tr>
                                    <tr className="bg-slate-800 text-slate-400">
                                        {daysArray.map(d => (
                                            <th key={d} className="p-0.5 border border-slate-700 text-center min-w-[34px]">{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.records.map((record, idx) => (
                                        <React.Fragment key={record.id}>
                                            <tr className="hover:bg-orange-50 transition-colors">
                                                <td className="p-0 border border-slate-100 sticky left-0 z-10 bg-white" rowSpan={2}>
                                                    <input
                                                        type="text"
                                                        value={record.ve}
                                                        onChange={(e) => handleUpdateHeader(idx, 've', e.target.value)}
                                                        className="w-full p-1 text-center font-black bg-transparent border-none outline-none focus:bg-orange-100 text-[10px]"
                                                    />
                                                </td>
                                                <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                                    <input
                                                        type="text"
                                                        value={record.stockingDate}
                                                        onChange={(e) => handleUpdateHeader(idx, 'stockingDate', e.target.value)}
                                                        placeholder="DD/MM/AAAA"
                                                        className="w-full p-1 text-center bg-transparent border-none outline-none focus:bg-orange-100 text-[10px]"
                                                    />
                                                </td>
                                                <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                                    <input
                                                        type="number"
                                                        value={record.area || ''}
                                                        onChange={(e) => handleUpdateHeader(idx, 'area', parseFloat(e.target.value) || 0)}
                                                        className="w-full p-1 text-center bg-transparent border-none outline-none focus:bg-orange-100 text-[10px]"
                                                    />
                                                </td>
                                                <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                                    <input
                                                        type="number"
                                                        value={record.initialPopulation || ''}
                                                        onChange={(e) => handleUpdateHeader(idx, 'initialPopulation', parseInt(e.target.value) || 0)}
                                                        className="w-full p-1 text-center bg-transparent border-none outline-none focus:bg-orange-100 text-[10px]"
                                                    />
                                                </td>
                                                <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={record.density || ''}
                                                        onChange={(e) => handleUpdateHeader(idx, 'density', parseFloat(e.target.value) || 0)}
                                                        className="w-full p-1 text-center bg-transparent border-none outline-none focus:bg-orange-100 text-[10px]"
                                                    />
                                                </td>
                                                <td className="p-0 border border-slate-100 sticky left-[40px] z-10 bg-slate-50" rowSpan={2}>
                                                    <input
                                                        type="text"
                                                        value={record.biometry}
                                                        onChange={(e) => handleUpdateHeader(idx, 'biometry', e.target.value)}
                                                        className="w-full p-1 text-center font-bold text-slate-600 bg-transparent border-none outline-none text-[9px]"
                                                    />
                                                </td>
                                                <td className="p-1 border border-slate-100 text-center font-bold text-slate-600 bg-slate-50 uppercase italic text-[9px]">
                                                    RAÇÃO
                                                </td>
                                                {daysArray.map(d => (
                                                    <td key={d} className="p-0 border border-slate-100">
                                                        <input
                                                            type="number"
                                                            value={record.dailyRecords.find(dr => dr.day === d)?.feed || ''}
                                                            onChange={(e) => handleUpdateDay(idx, d, 'feed', e.target.value)}
                                                            onPaste={(e) => handlePaste(e, idx, d, 'feed')}
                                                            className="w-full h-full px-0 py-0.5 bg-transparent text-center focus:bg-orange-100 outline-none border-none font-medium text-slate-700 text-[9px]"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-1 border border-slate-100 text-center font-black bg-orange-50 text-orange-800 text-[10px]">
                                                    {calculateRowTotal(record, 'feed')}
                                                </td>
                                                <td className="p-1 border border-slate-100 text-center print:hidden" rowSpan={2}>
                                                    <button onClick={() => removeTank(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5">
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                            <tr className="bg-pink-50/30 hover:bg-pink-100/50 transition-colors">
                                                <td className="p-1 border border-slate-100 text-center font-bold text-pink-700 bg-pink-50 uppercase italic text-[9px]">MORT.</td>
                                                {daysArray.map(d => (
                                                    <td key={d} className="p-0 border border-slate-100">
                                                        <input
                                                            type="number"
                                                            value={record.dailyRecords.find(dr => dr.day === d)?.mortality || ''}
                                                            onChange={(e) => handleUpdateDay(idx, d, 'mortality', e.target.value)}
                                                            onPaste={(e) => handlePaste(e, idx, d, 'mortality')}
                                                            className="w-full h-full px-0 py-0.5 bg-transparent text-center focus:bg-pink-100 outline-none border-none text-pink-600 font-medium text-[9px]"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="p-1 border border-slate-100 text-center font-black bg-pink-100 text-pink-700 text-[10px]">
                                                    {calculateRowTotal(record, 'mortality')}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-slate-900 text-white font-black uppercase">
                                        <td colSpan={7} className="p-2 text-right sticky left-0 z-10 bg-slate-900 border-r border-slate-700">TOTAIS DO DIA</td>
                                        {daysArray.map(d => (
                                            <td key={d} className="p-0.5 border-r border-slate-700 text-center">
                                                <div className="flex flex-col gap-0">
                                                    <span className="text-orange-400 leading-tight text-[8px]">{calculateDayTotal('feed', d) || 0}</span>
                                                    <span className="text-pink-400 leading-tight text-[8px]">{calculateDayTotal('mortality', d) || 0}</span>
                                                </div>
                                            </td>
                                        ))}
                                        <td className="p-1 text-center bg-orange-600 border-l border-orange-500 text-[10px]">
                                            {data?.records.reduce((sum, r) => sum + calculateRowTotal(r, 'feed'), 0)}
                                        </td>
                                        <td className="print:hidden"></td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div className="p-3 bg-slate-50 border-t border-slate-100 print:hidden">
                                <div className="flex flex-col md:flex-row gap-3 items-center justify-center md:justify-start">
                                    <label className="text-xs font-bold text-slate-600 uppercase">Quantidade:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={tankQuantity}
                                        onChange={(e) => setTankQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                    <button
                                        onClick={addTank}
                                        className="px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                    >
                                        <span>+</span> Adicionar {tankQuantity > 1 ? `${tankQuantity} Viveiros` : 'Novo Viveiro'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- VISÃO DE EXPORTAÇÃO (Oculta, usada apenas para gerar PDF/PNG) --- */}
                    <div
                        id="export-target"
                        className={isExporting
                            ? "fixed top-0 left-0 bg-white z-[9999] p-8 w-[297mm] min-h-screen shadow-2xl"
                            : "hidden pointer-events-none fixed top-0 left-0 w-[297mm]"
                        }
                    >
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-black">
                            <div className="flex items-center gap-6">
                                {companyLogo && !companyLogo.startsWith('blob:') && (
                                    <img src={companyLogo} alt="Logo" className="h-20 w-auto object-contain" />
                                )}
                                <div>
                                    <h1 className="text-3xl font-black text-black uppercase tracking-tight">Mortalidade e Consumo</h1>
                                    <p className="text-black text-xs font-bold uppercase tracking-widest mt-1">
                                        {activeCompany?.name || 'Controle diário'}
                                    </p>
                                    <p className="text-sm text-black mt-1 font-bold">
                                        {new Date(year, month - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()} / {year}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <table className="w-full text-[8px] border-collapse border border-black">
                            <thead>
                                <tr className="bg-slate-200 text-black uppercase font-bold">
                                    <th className="p-1 border border-black text-center w-[40px]" rowSpan={2}>VE</th>
                                    <th className="p-1 border border-black text-center w-[60px]" rowSpan={2}>Data</th>
                                    <th className="p-1 border border-black text-center w-[40px]" rowSpan={2}>Área</th>
                                    <th className="p-1 border border-black text-center w-[50px]" rowSpan={2}>Pop.</th>
                                    <th className="p-1 border border-black text-center w-[40px]" rowSpan={2}>Dens.</th>
                                    <th className="p-1 border border-black text-center w-[60px]" rowSpan={2}>Bio</th>
                                    <th className="p-1 border border-black min-w-[30px]" rowSpan={2}></th>
                                    <th className="p-0.5 border border-black text-center" colSpan={daysInMonth}>Dias</th>
                                    <th className="p-1 border border-black w-[50px]" rowSpan={2}>Total</th>
                                </tr>
                                <tr className="bg-slate-100 text-black">
                                    {daysArray.map(d => (
                                        <th key={d} className="p-0.5 border border-black text-center w-[25px]">{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data?.records.map((record) => (
                                    <React.Fragment key={record.id}>
                                        <tr className="border-b border-black/20">
                                            <td className="p-1 border border-black text-center font-bold" rowSpan={2}>{record.ve}</td>
                                            <td className="p-1 border border-black text-center" rowSpan={2}>{record.stockingDate}</td>
                                            <td className="p-1 border border-black text-center" rowSpan={2}>{record.area}</td>
                                            <td className="p-1 border border-black text-center" rowSpan={2}>{record.initialPopulation}</td>
                                            <td className="p-1 border border-black text-center" rowSpan={2}>{record.density}</td>
                                            <td className="p-1 border border-black text-center font-bold" rowSpan={2}>{record.biometry}</td>
                                            <td className="p-1 border border-black text-center font-bold text-[7px] uppercase bg-slate-50">RAÇÃO</td>
                                            {daysArray.map(d => {
                                                const val = record.dailyRecords.find(dr => dr.day === d)?.feed;
                                                return <td key={d} className="border border-black text-center font-medium">{val || ''}</td>;
                                            })}
                                            <td className="p-1 border border-black text-center font-bold bg-slate-50">{calculateRowTotal(record, 'feed')}</td>
                                        </tr>
                                        <tr>
                                            <td className="p-1 border border-black text-center font-bold text-[7px] uppercase bg-slate-50">MORT.</td>
                                            {daysArray.map(d => {
                                                const val = record.dailyRecords.find(dr => dr.day === d)?.mortality;
                                                return <td key={d} className="border border-black text-center text-red-600 font-medium">{val || ''}</td>;
                                            })}
                                            <td className="p-1 border border-black text-center font-bold text-red-600 bg-slate-50">{calculateRowTotal(record, 'mortality')}</td>
                                        </tr>
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-800 text-white font-bold uppercase text-[7px]">
                                    <td colSpan={7} className="p-1 text-right border border-black">TOTAIS</td>
                                    {daysArray.map(d => (
                                        <td key={d} className="p-0.5 border border-black text-center">
                                            <div className="flex flex-col">
                                                <span>{calculateDayTotal('feed', d) || ''}</span>
                                                <span className="text-red-300">{calculateDayTotal('mortality', d) || ''}</span>
                                            </div>
                                        </td>
                                    ))}
                                    <td className="p-1 text-center bg-orange-600 border border-black font-bold text-[9px]">
                                        {data?.records.reduce((sum, r) => sum + calculateRowTotal(r, 'feed'), 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
