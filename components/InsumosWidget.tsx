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
                    // This logic tries to extract the number from the VE name
                    const pondNumber = pondName.replace(/[^0-9]/g, ''); // "011" or "11"

                    // Find record matching the pond number
                    // We check if the record's VE matches the number (e.g. "11") or the full name logic if necessary
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
                    <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-gray-100 uppercase text-indigo-600">
                        {new Date(currentYear, currentMonth - 1).toLocaleString('pt-BR', { month: 'long' })}
                    </div>
                </div>

                {/* Main Metric: FEED */}
                <div className="flex items-baseline gap-2 mb-6 justify-center py-4">
                    {loading ? (
                        <div className="animate-pulse h-12 w-32 bg-gray-200 rounded"></div>
                    ) : (
                        <span className="text-5xl font-extrabold text-indigo-600 tracking-tighter">
                            {consumption > 0 ? consumption.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'}
                            <span className="text-2xl text-indigo-400 font-bold ml-1">kg</span>
                        </span>
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
