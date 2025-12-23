import React, { useState, useEffect } from 'react';
import { Company, MonthlyMortalityData, MortalityTankRecord, MortalityDailyRecord } from '../types';
import { SupabaseService } from '../services/supabaseService';

interface MortalidadeConsumoProps {
    activeCompany?: Company | null;
}

export const MortalidadeConsumo: React.FC<MortalidadeConsumoProps> = ({ activeCompany }) => {
    const [data, setData] = useState<MonthlyMortalityData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    useEffect(() => {
        if (!activeCompany) return;
        loadData();
    }, [activeCompany, month, year]);

    const loadData = async () => {
        setIsLoading(true);
        // Em um cenário real, buscaríamos do Supabase aqui. 
        // Por enquanto, vamos gerar um estado inicial vazio se não existir.
        const mockRecords: MortalityTankRecord[] = Array.from({ length: 5 }, (_, i) => ({
            id: `tank-${i}`,
            ve: `${i + 1}`,
            stockingDate: '2025-01-01',
            area: 3.48,
            initialPopulation: 580,
            density: 6.58,
            dailyRecords: daysArray.map(d => ({ day: d, feed: 0, mortality: 0 }))
        }));

        setData({
            id: 'temp-id',
            companyId: activeCompany?.id || '',
            month,
            year,
            records: mockRecords
        });
        setIsLoading(false);
    };

    const handleUpdate = (tankIndex: number, day: number, field: 'feed' | 'mortality', value: string) => {
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

    // activeCompany check is handled in App.tsx routing

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Mortalidade e Consumo</h1>
                    <p className="text-slate-500 text-sm">Controle diário de ração e perdas por tanque</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
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
                        className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-2 border border-slate-700 sticky left-0 z-20 bg-slate-900" rowSpan={2}>VE</th>
                                <th className="p-2 border border-slate-700" rowSpan={2}>Data Povoa</th>
                                <th className="p-2 border border-slate-700" rowSpan={2}>Área</th>
                                <th className="p-2 border border-slate-700" rowSpan={2}>População</th>
                                <th className="p-2 border border-slate-700" rowSpan={2}>Dens.</th>
                                <th className="p-2 border border-slate-700 z-10 sticky left-[40px] bg-slate-900" rowSpan={2}>Biometria</th>
                                <th className="p-1 border border-slate-700 text-center" colSpan={daysInMonth}>DIAS DO MÊS</th>
                                <th className="p-2 border border-slate-700" rowSpan={2}>Total</th>
                            </tr>
                            <tr className="bg-slate-800 text-slate-300">
                                {daysArray.map(d => (
                                    <th key={d} className="p-1 border border-slate-700 text-center min-w-[40px]">{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data?.records.map((record, idx) => (
                                <React.Fragment key={record.id}>
                                    {/* Linha Ração */}
                                    <tr className="hover:bg-orange-50 transition-colors">
                                        <td className="p-2 border border-slate-100 sticky left-0 z-10 bg-white font-bold text-center" rowSpan={2}>{record.ve}</td>
                                        <td className="p-2 border border-slate-100 text-center" rowSpan={2}>{record.stockingDate}</td>
                                        <td className="p-2 border border-slate-100 text-center" rowSpan={2}>{record.area}</td>
                                        <td className="p-2 border border-slate-100 text-center" rowSpan={2}>{record.initialPopulation}</td>
                                        <td className="p-2 border border-slate-100 text-center" rowSpan={2}>{record.density}</td>
                                        <td className="p-2 border border-slate-100 sticky left-[40px] z-10 bg-slate-50 font-bold text-center italic">Ração</td>
                                        {daysArray.map(d => (
                                            <td key={d} className="p-0 border border-slate-100">
                                                <input
                                                    type="number"
                                                    value={record.dailyRecords.find(dr => dr.day === d)?.feed || ''}
                                                    onChange={(e) => handleUpdate(idx, d, 'feed', e.target.value)}
                                                    className="w-full h-full p-2 bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-orange-500 outline-none border-none"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 border border-slate-100 text-center font-black bg-slate-50">
                                            {calculateRowTotal(record, 'feed')}
                                        </td>
                                    </tr>
                                    {/* Linha Mortalidade */}
                                    <tr className="bg-pink-50/30 hover:bg-pink-100/50 transition-colors">
                                        <td className="p-2 border border-slate-100 sticky left-[40px] z-10 bg-pink-50 font-bold text-center text-pink-700 italic">Mort.</td>
                                        {daysArray.map(d => (
                                            <td key={d} className="p-0 border border-slate-100">
                                                <input
                                                    type="number"
                                                    value={record.dailyRecords.find(dr => dr.day === d)?.mortality || ''}
                                                    onChange={(e) => handleUpdate(idx, d, 'mortality', e.target.value)}
                                                    className="w-full h-full p-2 bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-pink-500 outline-none border-none text-pink-600 font-bold"
                                                />
                                            </td>
                                        ))}
                                        <td className="p-2 border border-slate-100 text-center font-black bg-pink-50 text-pink-700">
                                            {calculateRowTotal(record, 'mortality')}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-900 text-white font-bold">
                                <td colSpan={6} className="p-3 text-right sticky left-0 z-10 bg-slate-900">TOTAIS DO DIA</td>
                                {daysArray.map(d => (
                                    <td key={d} className="p-2 border border-slate-700 text-center">
                                        <div className="flex flex-col text-[10px]">
                                            <span className="text-orange-400">{calculateDayTotal('feed', d)}</span>
                                            <span className="text-pink-400">{calculateDayTotal('mortality', d)}</span>
                                        </div>
                                    </td>
                                ))}
                                <td className="p-2 text-center bg-orange-600">
                                    {data?.records.reduce((sum, r) => sum + calculateRowTotal(r, 'feed'), 0)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};
