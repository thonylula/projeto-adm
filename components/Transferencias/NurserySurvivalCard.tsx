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
                    <span className="text-4xl font-black text-[#C5A059]">
                        {data.survivalRate.toFixed(1)}%
                    </span>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Sobrevivência</p>
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
                            className="text-2xl font-black text-slate-900 leading-none bg-slate-50 border-b-2 border-[#C5A059] focus:bg-[#C5A059]/5 outline-none w-32 text-center transition-all rounded-t-2xl"
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

            <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                <div
                    className="h-full bg-[#065F46] transition-all duration-1000 rounded-full"
                    style={{ width: `${Math.min(data.survivalRate, 100)}%` }}
                />
            </div>

            {data.isParcial && (
                <p className="mt-4 text-[9px] font-black text-[#C5A059] uppercase tracking-[0.2em] flex items-center gap-1.5 px-3 py-1 bg-[#C5A059]/10 rounded-full w-fit">
                    ⚠️ Transf. em curso
                </p>
            )}
        </div>
    );
};
