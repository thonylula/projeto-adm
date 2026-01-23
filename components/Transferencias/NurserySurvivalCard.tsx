import React from 'react';
import type { NurserySurvivalData } from '../../types';

interface NurserySurvivalCardProps {
    nurseryName: string;
    data: NurserySurvivalData;
    onEditInitialStocking?: (value: number) => void;
    isPublic?: boolean;
}

export const NurserySurvivalCard: React.FC<NurserySurvivalCardProps> = ({
    nurseryName,
    data,
    onEditInitialStocking,
    isPublic = false
}) => {
    const isHealthy = data.survivalRate >= 80;
    const isCritical = data.survivalRate < 60;

    return (
        <div className="p-0 bg-transparent transition-all">
            <div className="flex justify-between items-end mb-8">
                <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">
                    {nurseryName}
                </h4>
                <div className="flex flex-col items-center leading-none">
                    <span className="text-4xl font-black text-orange-500">
                        {data.survivalRate.toFixed(1)}%
                    </span>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mt-2">Sobrevivência</p>
                </div>
            </div>

            <div className="flex justify-between items-end mb-6">
                <div className="flex flex-col items-center">
                    {!isPublic && onEditInitialStocking ? (
                        <input
                            type="number"
                            defaultValue={data.initialStocking || 0}
                            key={data.initialStocking} // Force re-render if external state changes
                            onBlur={(e) => onEditInitialStocking(Number(e.target.value))}
                            className="text-2xl font-black text-gray-900 leading-none bg-orange-50/50 border-b-2 border-orange-500 focus:bg-orange-100 outline-none w-32 text-center transition-all rounded-t-lg"
                        />
                    ) : (
                        <p className="text-2xl font-black text-gray-900 leading-none">{(data.initialStocking || 0).toLocaleString('pt-BR')}</p>
                    )}
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-3">Est. Inicial</p>
                </div>
                <div className="flex flex-col items-center">
                    <p className="text-2xl font-black text-gray-900 leading-none">{(data.totalTransferred || 0).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-3">Est. Final</p>
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
