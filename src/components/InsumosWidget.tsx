import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/supabaseService';

interface InsumosWidgetProps {
    activeCompanyId: string;
    pondName: string;
    initialMonth?: number;
    initialYear?: number;
}

export const InsumosWidget: React.FC<InsumosWidgetProps> = ({ activeCompanyId, pondName, initialMonth, initialYear }) => {
    const [loading, setLoading] = useState(true);
    const [consumption, setConsumption] = useState<number>(0);
    const [currentMonth, setCurrentMonth] = useState(initialMonth || new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(initialYear || new Date().getFullYear());

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch Mortality Data for the specific month/year
                const data = await SupabaseService.getMortalityData(activeCompanyId, currentMonth, currentYear);

                if (data && data.records) {
                    // Normalize pond name (e.g., "OC-011" -> "11")
                    const pondNumber = pondName.replace(/[^0-9]/g, '');

                    // Find record matching the pond number
                    const record = data.records.find((r: any) => {
                        const recVe = r.ve?.toString().replace(/[^0-9]/g, '');
                        return recVe && parseInt(recVe) === parseInt(pondNumber);
                    });

                    if (record && record.dailyRecords) {
                        // Sum feed consumption
                        const totalFeed = record.dailyRecords.reduce((sum: number, day: any) => sum + (day.feed || 0), 0);
                        setConsumption(totalFeed);
                    } else {
                        setConsumption(0);
                    }
                } else {
                    setConsumption(0);
                }
            } catch (error) {
                console.error("Error loading insumos data", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [activeCompanyId, pondName, currentMonth, currentYear]);

    const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const currentYearNum = new Date().getFullYear();
    const years = [currentYearNum, currentYearNum - 1];

    return (
        <div className="flex flex-col items-center justify-center p-6 h-full font-sans bg-white">
            <div className="relative overflow-hidden rounded-2xl shadow-lg border p-6 bg-gradient-to-br from-indigo-50 to-white w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-black text-gray-800 tracking-tight">{pondName}</h3>
                        <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">
                            Consumo de Ração
                        </p>
                    </div>

                    {/* Month/Year Selectors */}
                    <div className="flex gap-2">
                        <select
                            value={currentMonth}
                            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                            className="bg-white/80 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border border-gray-100 uppercase text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-all appearance-none cursor-pointer hover:bg-white"
                        >
                            {months.map((m, i) => (
                                <option key={m} value={i + 1}>{m}</option>
                            ))}
                        </select>

                        <select
                            value={currentYear}
                            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                            className="bg-white/80 backdrop-blur px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border border-gray-100 uppercase text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-300 transition-all appearance-none cursor-pointer hover:bg-white"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Main Metric: FEED */}
                <div className="flex items-baseline gap-2 mb-6 justify-center py-4">
                    {loading ? (
                        <div className="animate-pulse h-12 w-32 bg-gray-200 rounded"></div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <span className="text-5xl font-extrabold text-indigo-600 tracking-tighter">
                                {consumption > 0 ? consumption.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
                                <span className="text-2xl text-indigo-400 font-bold ml-1">kg</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* Decoration */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-indigo-100 to-transparent rounded-full opacity-50 blur-xl pointer-events-none"></div>
            </div>

            <p className="mt-4 text-xs text-slate-400 font-medium">
                Dados consolidados da aba Mortalidade/Consumo
            </p>
        </div>
    );
};
