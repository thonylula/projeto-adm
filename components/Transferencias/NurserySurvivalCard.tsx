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
        <div className="p-0 bg-transparent transition-all">
            <div className="flex justify-between items-end mb-8">
                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                    {nurseryName}
                </h4>
                <div className="text-right leading-none">
                    <span className="text-3xl font-black text-orange-500">
                        {data.survivalRate.toFixed(1)}%
                    </span>
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sobrevivência</p>
                </div>
            </div>

            <div className="flex justify-between items-end mb-5">
                <div>
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-2">Est. Inicial</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{(data.initialStocking || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-2">Est. Final</p>
                    <p className="text-2xl font-black text-gray-900 leading-none">{(data.totalTransferred || 0).toLocaleString('pt-BR')}</p>
                </div>
            </div>

            <div className="relative h-4 bg-gray-100 rounded-sm overflow-hidden border border-gray-50">
                <div
                    className="h-full bg-orange-500 transition-all duration-1000"
                    style={{ width: `${Math.min(data.survivalRate, 100)}%` }}
                />
            </div>

            {data.isParcial && (
                <p className="mt-4 text-[9px] font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1">
                    ⚠️ Transf. em curso
                </p>
            )}
        </div>
    );
};
