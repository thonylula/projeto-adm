import React from 'react';
import type { NurserySurvivalData } from '../../types';

interface NurserySurvivalCardProps {
    nurseryName: string;
    data: NurserySurvivalData;
}

export const NurserySurvivalCard: React.FC<NurserySurvivalCardProps> = ({ nurseryName, data }) => {
    const isHealthy = data.survivalRate >= 80;
    const isCritical = data.survivalRate < 60;

    return (
        <div className={`p-4 rounded-2xl border transition-all ${isHealthy ? 'bg-green-50 border-green-100' : isCritical ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-tighter items-center flex gap-2">
                    <span className="text-xl">🍼</span> {nurseryName}
                </h4>
                <span className={`text-2xl font-black ${isHealthy ? 'text-green-600' : isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                    {data.survivalRate.toFixed(2)}%
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Povoamento Inicial</p>
                    <p className="text-sm font-black text-gray-800">{data.initialStocking.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Transferido</p>
                    <p className="text-sm font-black text-gray-800">{data.totalTransferred.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${isHealthy ? 'bg-green-500' : isCritical ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(data.survivalRate, 100)}%` }}
                />
            </div>

            {data.isParcial && (
                <p className="mt-2 text-[10px] font-bold text-orange-500 uppercase flex items-center gap-1">
                    ⚠️ Sobrevivência Parcial (Transferências em curso)
                </p>
            )}
        </div>
    );
};
