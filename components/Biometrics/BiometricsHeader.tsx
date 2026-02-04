
import React from 'react';
import { BiometricsService, SHRIMP_LOGO } from '../../services/biometricsService';

interface BiometricsHeaderProps {
    logo: string | null;
    companyName?: string;
    biometryDate: string;
    isDarkMode: boolean;
    onLogoClick: () => void;
}

export const BiometricsHeader: React.FC<BiometricsHeaderProps> = ({
    logo, companyName, biometryDate, isDarkMode, onLogoClick
}) => {
    return (
        <header className={`px-6 py-8 md:px-10 md:py-10 flex flex-col md:flex-row items-center justify-between gap-6 border-b transition-colors duration-500 export-header-row ${isDarkMode ? 'bg-[#0B0F1A] border-slate-800' : 'bg-white border-gray-50'}`}>
            <div className="flex-1 flex justify-start items-center">
                <div
                    onClick={onLogoClick}
                    className={`w-32 h-20 md:w-48 md:h-28 rounded-xl md:rounded-[32px] flex items-center justify-center flex-shrink-0 shadow-2xl border-2 overflow-hidden group cursor-pointer transition-all duration-700 hover:rotate-2 no-print-bg-fix ${isDarkMode ? 'bg-[#1e293b]/50 border-slate-700 shadow-orange-950/20' : 'bg-white border-orange-50 shadow-orange-100/50'}`}
                >
                    {logo ? (
                        <img src={logo} alt="Logo" className="w-24 h-16 md:w-40 md:h-24 object-contain" />
                    ) : (
                        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-inner">
                            {companyName?.charAt(0) || 'C'}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-[2] flex flex-col items-center text-center order-first md:order-none export-title-block">
                <h1 className={`text-3xl md:text-6xl font-black tracking-tighter leading-none mb-1 transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                    BIOMETRIA
                </h1>
                <p className="text-[9px] md:text-xs font-black text-orange-500 uppercase tracking-[0.5em] font-sans opacity-90">
                    RELATÓRIO DE PERFORMANCE
                </p>
            </div>

            <div className="flex-1 flex flex-col items-end gap-2 export-seal-block">
                <div className={`px-5 py-2.5 rounded-2xl border shadow-sm flex items-center gap-3 transition-all duration-500 ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mb-1">Data de Emissão</span>
                        <span className={`text-sm font-bold tabular-nums ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                            {new Date(biometryDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                </div>
                <div className="flex items-center gap-2 pr-2 opacity-60">
                    <img src={SHRIMP_LOGO} className="w-5 h-5 grayscale contrast-125" alt="seal-icon" />
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Carapitanga Certified</span>
                </div>
            </div>
        </header>
    );
};
