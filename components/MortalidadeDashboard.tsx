import React, { useMemo } from 'react';
import { MonthlyMortalityData } from '../types';
import {
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ScatterChart, Scatter, ZAxis
} from 'recharts';

interface MortalidadeDashboardProps {
    data: MonthlyMortalityData | null;
}

export const MortalidadeDashboard: React.FC<MortalidadeDashboardProps> = ({ data }) => {
    const analytics = useMemo(() => {
        if (!data || data.records.length === 0) return null;

        let totalInitialPop = 0;
        let totalCurrentPop = 0;
        let totalMortality = 0;
        let totalFeed = 0;
        let totalBiomass = 0;

        const tankMetrics = data.records.map(record => {
            const mortality = record.dailyRecords.reduce((s, day) => s + (day.mort || 0), 0);
            const feed = record.dailyRecords.reduce((s, day) => s + (day.feed || 0), 0);
            const currentPop = record.initialPopulation - mortality;
            const avgWeight = parseFloat(record.biometry) || 0; // gramas
            const biomass = (currentPop * avgWeight) / 1000; // kg
            const survival = (currentPop / record.initialPopulation) * 100;
            const density = record.density || 0;

            // Efficiency: kg feed per kg biomass (lower is better, assuming growth)
            // This is a proxy since we don't have exact weight gain without previous month data
            const feedBiomassRatio = biomass > 0 ? feed / biomass : 0;

            totalInitialPop += record.initialPopulation;
            totalCurrentPop += currentPop;
            totalMortality += mortality;
            totalFeed += feed;
            totalBiomass += biomass;

            return {
                name: record.ve,
                mortality,
                feed,
                currentPop,
                biomass,
                survival,
                density,
                avgWeight,
                feedBiomassRatio
            };
        });

        const globalSurvival = (totalCurrentPop / totalInitialPop) * 100;

        // Sort for charts: mainly by biomass
        const sortedByBiomass = [...tankMetrics].sort((a, b) => b.biomass - a.biomass);

        return {
            totalMortality,
            totalFeed,
            totalBiomass,
            globalSurvival,
            tankMetrics,
            sortedByBiomass
        };
    }, [data]);

    if (!data || !analytics) {
        return (
            <div className="flex items-center justify-center h-96 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-slate-400 font-medium">Nenhum dado disponível para análise.</p>
            </div>
        );
    }

    // Cor personalizada para Tooltip
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg">
                    <p className="font-bold text-slate-800 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-medium">
                                {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : entry.value}
                                {entry.unit || ''}
                            </span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 space-y-6">

            {/* 1. Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Biomassa Estimada</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h2 className="text-3xl font-black text-slate-800">
                            {analytics.totalBiomass.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </h2>
                        <span className="text-sm font-bold text-slate-400">kg</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ração Consumida</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h2 className="text-3xl font-black text-slate-800">
                            {analytics.totalFeed.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </h2>
                        <span className="text-sm font-bold text-slate-400">kg</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Sobrevivência Global</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h2 className={`text-3xl font-black ${analytics.globalSurvival >= 90 ? 'text-emerald-600' : 'text-amber-500'}`}>
                            {analytics.globalSurvival.toFixed(1)}%
                        </h2>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Mortalidade Total</p>
                    <div className="flex items-baseline gap-2 mt-2">
                        <h2 className="text-3xl font-black text-rose-600">
                            {analytics.totalMortality.toLocaleString('pt-BR')}
                        </h2>
                        <span className="text-sm font-bold text-slate-400">un</span>
                    </div>
                </div>
            </div>

            {/* 2. Advanced Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Efficiency Chart: Biomass vs Feed */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Eficiência Alimentar por Viveiro</h3>
                            <p className="text-sm text-slate-500">Relação entre Volume de Ração (kg) e Biomassa Atual (kg)</p>
                        </div>
                    </div>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={analytics.sortedByBiomass}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} label={{ value: 'Biomassa (kg)', angle: -90, position: 'insideLeft', style: { fill: '#64748b', fontSize: 12 } }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} label={{ value: 'Ração (kg)', angle: 90, position: 'insideRight', style: { fill: '#64748b', fontSize: 12 } }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar yAxisId="left" dataKey="biomass" name="Biomassa Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                <Line yAxisId="right" type="monotone" dataKey="feed" name="Ração Consumida" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Correlation: Density vs Survival */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Densidade vs. Sobrevivência</h3>
                    <p className="text-sm text-slate-500 mb-6">Correlação entre densidade de estocagem e taxa de sobrevivência.</p>
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" dataKey="density" name="Densidade" unit=" cam/m²" tickLine={false} axisLine={false} label={{ value: 'Densidade (cam/m²)', position: 'bottom', offset: 0, style: { fill: '#64748b', fontSize: 12 } }} />
                                <YAxis type="number" dataKey="survival" name="Sobrevivência" unit="%" domain={[0, 100]} tickLine={false} axisLine={false} />
                                <ZAxis type="number" dataKey="biomass" range={[60, 400]} name="Biomassa" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter name="Viveiros" data={analytics.tankMetrics} fill="#10b981" shape="circle" />
                            </ScatterChart>
                        </ResponsiveContainer>
                        <p className="text-center text-xs text-slate-500 mt-2">* Tamanho do círculo indica volume de biomassa</p>
                    </div>
                </div>
            </div>

            {/* 3. Detailed Data Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800">Detalhamento Operacional</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-xs border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Viveiro</th>
                                <th className="px-6 py-4 text-right">Pop. Atual (un)</th>
                                <th className="px-6 py-4 text-right">Peso Médio (g)</th>
                                <th className="px-6 py-4 text-right">Biomassa (kg)</th>
                                <th className="px-6 py-4 text-right">Ração (kg)</th>
                                <th className="px-6 py-4 text-right">Rel. Ração/Bio</th>
                                <th className="px-6 py-4 text-center">Sobrevivência</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {analytics.sortedByBiomass.map((tank) => (
                                <tr key={tank.name} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-700">{tank.name}</td>
                                    <td className="px-6 py-4 text-right font-medium text-slate-600">{tank.currentPop.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 text-right text-slate-600">{tank.avgWeight.toFixed(2)} g</td>
                                    <td className="px-6 py-4 text-right font-bold text-blue-600 bg-blue-50/50 rounded-lg">{tank.biomass.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                                    <td className="px-6 py-4 text-right text-amber-600 font-medium">{tank.feed.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 text-right text-slate-500">{tank.feedBiomassRatio.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold
                                            ${tank.survival >= 90 ? 'bg-emerald-100 text-emerald-800' :
                                                tank.survival >= 75 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-rose-100 text-rose-800'}`}>
                                            {tank.survival.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
