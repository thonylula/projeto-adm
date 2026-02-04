
import React from 'react';

interface BiometricsSummaryProps {
    processedData: any[];
    isDarkMode: boolean;
}

export const BiometricsSummary: React.FC<BiometricsSummaryProps> = ({ processedData, isDarkMode }) => {
    const stats = {
        totalViveiros: processedData.length,
        activeBiometrics: processedData.filter(i => i.hasBiometrics).length,
        avgWeight: processedData.reduce((acc, curr) => acc + (parseFloat(curr.pMedDisplay) || 0), 0) / (processedData.filter(i => parseFloat(i.pMedDisplay) > 0).length || 1),
        avgGpd: processedData.reduce((acc, curr) => acc + (parseFloat(curr.gpdDisplay) || 0), 0) / (processedData.filter(i => parseFloat(i.gpdDisplay) > 0).length || 1),
    };

    const cardStyle = `p-6 rounded-[24px] border shadow-sm transition-all duration-500 ${isDarkMode ? 'bg-[#1e293b]/30 border-slate-800' : 'bg-white border-gray-100/50'}`;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 md:px-10 pb-8 no-print">
            <div className={cardStyle}>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Total Viveiros</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stats.totalViveiros}</span>
                    <span className="text-xs font-bold text-gray-400">unid</span>
                </div>
            </div>

            <div className={cardStyle}>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-2">Biometrias Realizadas</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.activeBiometrics}</span>
                    <span className="text-xs font-bold text-blue-400/60">boletins</span>
                </div>
            </div>

            <div className={cardStyle}>
                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest block mb-2">Peso Médio Geral</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{stats.avgWeight.toFixed(2)}</span>
                    <span className="text-xs font-bold text-orange-400/60">gramas</span>
                </div>
            </div>

            <div className={cardStyle}>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-2">GPD Médio</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{stats.avgGpd.toFixed(3)}</span>
                    <span className="text-xs font-bold text-indigo-400/60">g / dia</span>
                </div>
            </div>
        </div>
    );
};
