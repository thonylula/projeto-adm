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
        <div className={`p-4 rounded-xl border-t-4 bg-white shadow-sm transition-all border-orange-400`}>
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-700">
                    {nurseryName}
                </h4>
                <div className="text-right">
                    <span className={`text-xl font-bold ${isHealthy ? 'text-green-600' : isCritical ? 'text-red-600' : 'text-orange-600'}`}>
                        {data.survivalRate.toFixed(1)}%
                    </span>
                    <p className="text-[10px] text-gray-400">Sobrevivência</p>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Est. Inicial</p>
                    <p className="text-lg font-bold text-gray-800">{(data.initialStocking || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-medium text-gray-500 mb-1">Est. Final</p>
                    <p className="text-lg font-bold text-gray-800">{(data.totalTransferred || 0).toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${isHealthy ? 'bg-green-500' : isCritical ? 'bg-red-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(data.survivalRate, 100)}%` }}
                />
            </div>

            {data.isParcial && (
                <p className="mt-2 text-[8px] font-bold text-orange-500 uppercase flex items-center gap-1">
                    ⚠️ Sobrevivência Parcial (Transferências em curso)
                </p>
            )}
        </div>
    );
};
