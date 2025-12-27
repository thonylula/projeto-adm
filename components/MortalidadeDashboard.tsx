import React, { useMemo } from 'react';
import { MonthlyMortalityData } from '../types';
import {
    LineChart, Line, BarChart, Bar, AreaChart, Area, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface MortalidadeDashboardProps {
    data: MonthlyMortalityData | null;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export const MortalidadeDashboard: React.FC<MortalidadeDashboardProps> = ({ data }) => {
    const analytics = useMemo(() => {
        if (!data || data.records.length === 0) return null;

        // Calcular métricas
        const totalMortality = data.records.reduce((sum, record) => {
            return sum + record.dailyRecords.reduce((s, day) => s + (day.mort || 0), 0);
        }, 0);

        const totalFeed = data.records.reduce((sum, record) => {
            return sum + record.dailyRecords.reduce((s, day) => s + (day.feed || 0), 0);
        }, 0);

        const avgMortality = totalMortality / data.records.length;

        // Mortalidade por viveiro
        const mortalityByTank = data.records.map(record => ({
            name: record.ve,
            mortality: record.dailyRecords.reduce((s, day) => s + (day.mort || 0), 0),
            feed: record.dailyRecords.reduce((s, day) => s + (day.feed || 0), 0),
            survivalRate: ((record.initialPopulation - record.dailyRecords.reduce((s, day) => s + (day.mort || 0), 0)) / record.initialPopulation * 100) || 0,
            density: record.density || 0,
            biomass: parseFloat(record.biometry) || 0
        }));

        // Evolução diária (média de todos os viveiros)
        const dailyEvolution = Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
            const dayData = {
                day,
                mortality: 0,
                feed: 0,
                count: 0
            };
            data.records.forEach(record => {
                const dayRecord = record.dailyRecords.find(d => d.day === day);
                if (dayRecord) {
                    dayData.mortality += dayRecord.mort || 0;
                    dayData.feed += dayRecord.feed || 0;
                    dayData.count++;
                }
            });
            return {
                day: `Dia ${day}`,
                mortalidade: dayData.count > 0 ? Math.round(dayData.mortality / dayData.count) : 0,
                ração: dayData.count > 0 ? Math.round(dayData.feed / dayData.count) : 0
            };
        }).filter(d => d.mortalidade > 0 || d.ração > 0);

        // Radar Chart data
        const radarData = mortalityByTank.slice(0, 5).map(tank => ({
            subject: tank.name,
            sobrevivência: tank.survivalRate,
            densidade: (tank.density / 20) * 100, // normalizar
            biomassa: (tank.biomass / 10) * 100, // normalizar
            consumo: (tank.feed / 1000) * 100 // normalizar
        }));

        // Melhores e piores
        const sorted = [...mortalityByTank].sort((a, b) => b.survivalRate - a.survivalRate);
        const best = sorted[0];
        const worst = sorted[sorted.length - 1];

        return {
            totalMortality,
            totalFeed,
            avgMortality,
            mortalityByTank,
            dailyEvolution,
            radarData,
            best,
            worst
        };
    }, [data]);

    if (!data || !analytics) {
        return (
            <div className="flex items-center justify-center h-[600px]">
                <p className="text-slate-500">Nenhum dado disponível para análise.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        📊 Dashboard Analítico
                    </h1>
                    <p className="text-slate-400">Análise detalhada de mortalidade e consumo</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-200 text-sm font-medium">Total Mortes</span>
                            <span className="text-3xl">💀</span>
                        </div>
                        <p className="text-4xl font-black text-white">{analytics.totalMortality.toLocaleString('pt-BR')}</p>
                        <p className="text-purple-200 text-xs mt-1">no mês</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-200 text-sm font-medium">Consumo Total</span>
                            <span className="text-3xl">🐟</span>
                        </div>
                        <p className="text-4xl font-black text-white">{analytics.totalFeed.toLocaleString('pt-BR')}</p>
                        <p className="text-blue-200 text-xs mt-1">kg de ração</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-green-200 text-sm font-medium">Melhor VE</span>
                            <span className="text-3xl">🏆</span>
                        </div>
                        <p className="text-4xl font-black text-white">{analytics.best.name}</p>
                        <p className="text-green-200 text-xs mt-1">{analytics.best.survivalRate.toFixed(1)}% sobrevivência</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-red-200 text-sm font-medium">Pior VE</span>
                            <span className="text-3xl">⚠️</span>
                        </div>
                        <p className="text-4xl font-black text-white">{analytics.worst.name}</p>
                        <p className="text-red-200 text-xs mt-1">{analytics.worst.survivalRate.toFixed(1)}% sobrevivência</p>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Evolução Diária */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                        <h3 className="text-xl font-bold text-white mb-4">📈 Evolução Diária (Média)</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.dailyEvolution}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                <XAxis dataKey="day" stroke="#fff" />
                                <YAxis stroke="#fff" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Legend />
                                <Line type="monotone" dataKey="mortalidade" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} />
                                <Line type="monotone" dataKey="ração" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Mortalidade por Viveiro */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                        <h3 className="text-xl font-bold text-white mb-4">🎯 Mortalidade por Viveiro</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.mortalityByTank}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                <XAxis dataKey="name" stroke="#fff" />
                                <YAxis stroke="#fff" />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Bar dataKey="mortality" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Taxa de Sobrevivência */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                        <h3 className="text-xl font-bold text-white mb-4">💚 Taxa de Sobrevivência</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.mortalityByTank}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                                <XAxis dataKey="name" stroke="#fff" />
                                <YAxis stroke="#fff" domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="survivalRate" stroke="#10b981" fill="url(#colorSurvival)" strokeWidth={2} />
                                <defs>
                                    <linearGradient id="colorSurvival" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Comparação Multi-Métrica */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                        <h3 className="text-xl font-bold text-white mb-4">🎨 Comparação Multi-Métrica</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <RadarChart data={analytics.radarData}>
                                <PolarGrid stroke="#ffffff30" />
                                <PolarAngleAxis dataKey="subject" stroke="#fff" />
                                <PolarRadiusAxis stroke="#fff" domain={[0, 100]} />
                                <Radar name="Performance" dataKey="sobrevivência" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tabela Resumo */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
                    <h3 className="text-xl font-bold text-white mb-4">📋 Resumo por Viveiro</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-white">
                            <thead>
                                <tr className="border-b border-white/20">
                                    <th className="text-left p-3">Viveiro</th>
                                    <th className="text-right p-3">Mortalidade</th>
                                    <th className="text-right p-3">Ração (kg)</th>
                                    <th className="text-right p-3">Sobrevivência</th>
                                    <th className="text-right p-3">Densidade</th>
                                    <th className="text-right p-3">Biomassa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.mortalityByTank.map((tank, i) => (
                                    <tr key={i} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                                        <td className="p-3 font-bold">{tank.name}</td>
                                        <td className="p-3 text-right text-red-300">{tank.mortality}</td>
                                        <td className="p-3 text-right text-green-300">{tank.feed.toLocaleString('pt-BR')}</td>
                                        <td className="p-3 text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${tank.survivalRate > 90 ? 'bg-green-500' : tank.survivalRate > 80 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                {tank.survivalRate.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-blue-300">{tank.density.toFixed(2)}</td>
                                        <td className="p-3 text-right text-purple-300">{tank.biomass.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
