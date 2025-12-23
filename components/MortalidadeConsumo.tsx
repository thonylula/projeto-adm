import React, { useState, useEffect, useCallback } from 'react';
import { Company, MonthlyMortalityData, MortalityTankRecord, MortalityDailyRecord } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { exportToPdf } from '../utils/exportUtils';

interface MortalidadeConsumoProps {
    activeCompany?: Company | null;
}

export const MortalidadeConsumo: React.FC<MortalidadeConsumoProps> = ({ activeCompany }) => {
    const [data, setData] = useState<MonthlyMortalityData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const loadData = useCallback(async () => {
        if (!activeCompany) return;
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
    }, [activeCompany, month, year, daysArray.length]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateDay = (tankIndex: number, day: number, field: 'feed' | 'mortality', value: string) => {
        if (!data) return;
        const numValue = parseFloat(value) || 0;
        const newData = { ...data };
        const record = newData.records[tankIndex];
        const dayRecord = record.dailyRecords.find(dr => dr.day === day);
        if (dayRecord) {
            dayRecord[field] = numValue;
        } else {
            record.dailyRecords.push({
                day,
                feed: field === 'feed' ? numValue : 0,
                mortality: field === 'mortality' ? numValue : 0
            });
        }
        setData(newData);
    };

    const handleUpdateHeader = (tankIndex: number, field: keyof MortalityTankRecord, value: any) => {
        if (!data) return;
        const newData = { ...data };
        const record = newData.records[tankIndex];
        (record as any)[field] = value;
        setData(newData);
    };

    const addTank = () => {
        if (!data) return;
        const newRecord: MortalityTankRecord = {
            id: crypto.randomUUID(),
            ve: `${data.records.length + 1}`,
            stockingDate: '',
            area: 0,
            initialPopulation: 0,
            density: 0,
            biometry: '',
            dailyRecords: daysArray.map(d => ({ day: d, feed: 0, mortality: 0 }))
        };
        setData({ ...data, records: [...data.records, newRecord] });
    };

    const removeTank = (index: number) => {
        if (!data) return;
        if (!confirm('Deseja remover este viveiro?')) return;
        const newRecords = [...data.records];
        newRecords.splice(index, 1);
        setData({ ...data, records: newRecords });
    };

    const handleSave = async () => {
        if (!data || !activeCompany) return;
        setIsLoading(true);
        const success = await SupabaseService.saveMortalityData(activeCompany.id, month, year, data);
        setIsLoading(false);
        if (success) {
            setMessage({ text: 'Dados salvos com sucesso!', type: 'success' });
            setTimeout(() => setMessage(null), 3000);
        } else {
            setMessage({ text: 'Erro ao salvar dados.', type: 'error' });
        }
    };

    const calculateRowTotal = (record: MortalityTankRecord, field: 'feed' | 'mortality') => {
        return record.dailyRecords.reduce((sum, dr) => sum + (dr[field] || 0), 0);
    };

    const calculateDayTotal = (field: 'feed' | 'mortality', day: number) => {
        if (!data) return 0;
        return data.records.reduce((sum, record) => {
            const dr = record.dailyRecords.find(d => d.day === day);
            return sum + (dr?.[field] || 0);
        }, 0);
    };

    const ActionBar = () => (
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100 print:hidden">
            <button onClick={() => exportToPdf('mortality-view', `mortalidade_${month}_${year}`)} className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-red-700 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                PDF
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-700 transition-all">PNG</button>
            <button className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-slate-800 transition-all">HTML</button>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-700 transition-all">Compartilhar</button>
            <div className="w-px h-8 bg-slate-200 mx-2" />
            <button className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-emerald-800 transition-all">Backup</button>
            <button onClick={loadData} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-orange-600 transition-all">Carregar</button>
            <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-blue-600 transition-all shadow-lg active:scale-95">Salvar</button>
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

            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-tight">Mortalidade e Consumo</h1>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-1">Controle diário de ração e perdas por tanque</p>
                </div>
                <div className="flex gap-3 print:hidden">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
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
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-orange-500"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white uppercase">
                                <th className="p-2 border border-slate-700 sticky left-0 z-20 bg-slate-900 min-w-[50px]" rowSpan={2}>VE</th>
                                <th className="p-2 border border-slate-700 min-w-[100px]" rowSpan={2}>Data Povoa</th>
                                <th className="p-2 border border-slate-700 min-w-[60px]" rowSpan={2}>Área</th>
                                <th className="p-2 border border-slate-700 min-w-[70px]" rowSpan={2}>Pop. Ini</th>
                                <th className="p-2 border border-slate-700 min-w-[60px]" rowSpan={2}>Dens.</th>
                                <th className="p-2 border border-slate-700 z-10 sticky left-[50px] bg-slate-900 min-w-[80px]" rowSpan={2}>Biometria</th>
                                <th className="p-1 border border-slate-700 text-center" colSpan={daysInMonth}>DIAS DO MÊS</th>
                                <th className="p-2 border border-slate-700 min-w-[60px]" rowSpan={2}>Total</th>
                                <th className="p-2 border border-slate-700 print:hidden" rowSpan={2}>Ações</th>
                            </tr>
                            <tr className="bg-slate-800 text-slate-400">
                                {daysArray.map(d => (
                                    <th key={d} className="p-1 border border-slate-700 text-center min-w-[35px]">{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data?.records.map((record, idx) => (
                                <React.Fragment key={record.id}>
                                    {/* Linha Ração */}
                                    <tr className="hover:bg-orange-50 transition-colors">
                                        <td className="p-0 border border-slate-100 sticky left-0 z-10 bg-white" rowSpan={2}>
                                            <input
                                                type="text"
                                                value={record.ve}
                                                onChange={(e) => handleUpdateHeader(idx, 've', e.target.value)}
                                                className="w-full p-2 text-center font-black bg-transparent border-none outline-none focus:bg-orange-100"
                                            />
                                        </td>
                                        <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                            <input
                                                type="text"
                                                value={record.stockingDate}
                                                onChange={(e) => handleUpdateHeader(idx, 'stockingDate', e.target.value)}
                                                placeholder="DD/MM/AAAA"
                                                className="w-full p-2 text-center bg-transparent border-none outline-none focus:bg-orange-100"
                                            />
                                        </td>
                                        <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                            <input
                                                type="number"
                                                value={record.area || ''}
                                                onChange={(e) => handleUpdateHeader(idx, 'area', parseFloat(e.target.value) || 0)}
                                                className="w-full p-2 text-center bg-transparent border-none outline-none focus:bg-orange-100"
                                            />
                                        </td>
                                        <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                            <input
                                                type="number"
                                                value={record.initialPopulation || ''}
                                                onChange={(e) => handleUpdateHeader(idx, 'initialPopulation', parseInt(e.target.value) || 0)}
                                                className="w-full p-2 text-center bg-transparent border-none outline-none focus:bg-orange-100"
                                            />
                                        </td>
                                        <td className="p-0 border border-slate-100 text-center" rowSpan={2}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={record.density || ''}
                                                onChange={(e) => handleUpdateHeader(idx, 'density', parseFloat(e.target.value) || 0)}
                                                className="w-full p-2 text-center bg-transparent border-none outline-none focus:bg-orange-100"
                                            />
                                        </td>
                                        <td className="p-0 border border-slate-100 sticky left-[50px] z-10 bg-slate-50">
                                            <input
                                                type="text"
                                                value={record.biometry || 'RAÇÃO'}
                                                onChange={(e) => handleUpdateHeader(idx, 'biometry', e.target.value)}
                                                className="w-full p-2 text-center font-bold text-slate-600 bg-transparent border-none outline-none uppercase italic"
                                            />
                                        </td>
                                        {daysArray.map(d => (
                                            <td key={d} className="p-0 border border-slate-100">
                                                <input
                                                    type="number"
                                                    value={record.dailyRecords.find(dr => dr.day === d)?.feed || ''}
                                                    onChange={(e) => handleUpdateDay(idx, d, 'feed', e.target.value)}
                                                    className="w-full h-full p-1 bg-transparent text-center focus:bg-orange-100 outline-none border-none font-bold text-slate-700"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 border border-slate-100 text-center font-black bg-orange-50 text-orange-800">
                                            {calculateRowTotal(record, 'feed')}
                                        </td>
                                        <td className="p-2 border border-slate-100 text-center print:hidden" rowSpan={2}>
                                            <button onClick={() => removeTank(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                    {/* Linha Mortalidade */}
                                    <tr className="bg-pink-50/30 hover:bg-pink-100/50 transition-colors">
                                        <td className="p-2 border border-slate-100 sticky left-[50px] z-10 bg-pink-50 font-bold text-center text-pink-700 italic uppercase">Mort.</td>
                                        {daysArray.map(d => (
                                            <td key={d} className="p-0 border border-slate-100">
                                                <input
                                                    type="number"
                                                    value={record.dailyRecords.find(dr => dr.day === d)?.mortality || ''}
                                                    onChange={(e) => handleUpdateDay(idx, d, 'mortality', e.target.value)}
                                                    className="w-full h-full p-1 bg-transparent text-center focus:bg-pink-100 outline-none border-none text-pink-600 font-bold"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 border border-slate-100 text-center font-black bg-pink-100 text-pink-700">
                                            {calculateRowTotal(record, 'mortality')}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-900 text-white font-black uppercase">
                                <td colSpan={6} className="p-3 text-right sticky left-0 z-10 bg-slate-900 border-r border-slate-700">TOTAIS DO DIA</td>
                                {daysArray.map(d => (
                                    <td key={d} className="p-1 border-r border-slate-700 text-center">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-orange-400 leading-none">{calculateDayTotal('feed', d) || 0}</span>
                                            <span className="text-pink-400 leading-none">{calculateDayTotal('mortality', d) || 0}</span>
                                        </div>
                                    </td>
                                ))}
                                <td className="p-2 text-center bg-orange-600 border-l border-orange-500">
                                    {data?.records.reduce((sum, r) => sum + calculateRowTotal(r, 'feed'), 0)}
                                </td>
                                <td className="print:hidden"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 print:hidden">
                    <button
                        onClick={addTank}
                        className="w-full md:w-auto px-6 py-2 bg-slate-800 text-white rounded-xl text-xs font-black uppercase hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                    >
                        <span>+</span> Adicionar Novo Viveiro
                    </button>
                </div>
            </div>
        </div>
    );
};
