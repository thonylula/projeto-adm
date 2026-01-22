import React from 'react';
import type { NurserySurvivalData } from '../../types';

interface NurserySurvivalCardProps {
    nurseryName: string;
    data: NurserySurvivalData;
}

export const NurserySurvivalCard: React.FC<NurserySurvivalCardProps> = ({ nurseryName, data }) => {
    const isHealthy = data.survivalRate >= 80;
    const isCritical = data.survivalRate < 60;
    const mortalityCount = (data.initialStocking || 0) - (data.totalTransferred || 0);

    return (
        <div className={`relative overflow-hidden p-5 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]`}>
            {/* Top Info Bar */}
            <div className="flex justify-between items-start mb-5">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {nurseryName}
                        </h4>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isHealthy ? 'bg-emerald-100 text-emerald-600' : isCritical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            {isHealthy ? 'Saudável' : isCritical ? 'Crítico' : 'Alerta'}
                        </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Monitoramento Técnico</p>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-black italic tracking-tighter ${isHealthy ? 'text-emerald-600' : isCritical ? 'text-rose-600' : 'text-amber-600'}`}>
                        {data.survivalRate.toFixed(1)}%
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] -mt-1">Sobrevivência</p>
                </div>
            </div>

            {/* Technical Grid */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Est. Inicial</p>
                    <p className="text-sm font-black text-slate-700">{(data.initialStocking || 0).toLocaleString('pt-BR')}</p>
                </div>
                <div className="space-y-0.5 border-x border-slate-50 px-4 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Mortalidade</p>
                    <p className="text-sm font-black text-rose-500">{mortalityCount > 0 ? `-${mortalityCount.toLocaleString('pt-BR')}` : '0'}</p>
                </div>
                <div className="space-y-0.5 text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Est. Final</p>
                    <p className="text-sm font-black text-slate-700">{(data.totalTransferred || 0).toLocaleString('pt-BR')}</p>
                </div>
            </div>

            {/* Visual Indicator */}
            <div className="relative h-2 bg-slate-50 rounded-full overflow-hidden">
                <div
                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${isHealthy ? 'bg-emerald-500' : isCritical ? 'bg-rose-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(data.survivalRate, 100)}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
            </div>

            {data.isParcial && (
                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                    <p className="text-[8px] font-bold text-amber-600 uppercase flex items-center gap-1.5">
                        <span className="animate-pulse">⚠️</span> Ciclo Parcial Detectado
                    </p>
                    <span className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Aguardando Conclusão</span>
                </div>
            )}
        </div>
    );
};
