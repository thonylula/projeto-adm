
import React from 'react';

interface BiometricsRowProps {
    item: any;
    isPublic: boolean;
    isDarkMode: boolean;
    onUpdateRow: (viveiro: string, field: any, value: any) => void;
    onDeleteRow: (viveiro: string) => void;
    onCopy: (text: string | number | null, label: string) => void;
}

export const BiometricsRow: React.FC<BiometricsRowProps> = ({
    item, isPublic, isDarkMode, onUpdateRow, onDeleteRow, onCopy
}) => {
    return (
        <tr className={`group transition-all duration-300 border-b border-dashed ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} ${item.rowBgColor}`}>
            <td className="py-4 pl-6">
                <div className="flex flex-col">
                    <span className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.viveiro}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">{item.diasCultivoDisplay} dias</span>
                </div>
            </td>
            <td className="py-4">
                <input
                    type="text"
                    value={item.pMedInputValue}
                    onChange={(e) => onUpdateRow(item.viveiro, 'pMedStr', e.target.value)}
                    disabled={isPublic}
                    className={`w-16 text-center font-bold rounded-lg p-1 outline-none transition-all ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-gray-200 text-slate-800'} ${isPublic ? 'border-none bg-transparent' : 'border'}`}
                />
            </td>
            <td className="py-4">
                <span className={`text-sm font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.pAntDisplay}</span>
            </td>
            <td className="py-4">
                <span className={`text-sm font-bold ${parseFloat(item.incSemanalStr) > 0 ? 'text-green-600' : 'text-gray-400'}`}>{item.incSemanalStr}</span>
            </td>
            <td className="py-4">
                <span className="text-sm font-black text-indigo-600">{item.gpdDisplay}</span>
            </td>
            <td className="py-4">
                <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${item.statusTextColor} bg-white/50 backdrop-blur-sm border border-black/5`}>
                    {item.analysisStatus}
                </div>
            </td>
            {!isPublic && (
                <td className="py-4 pr-6 text-right no-print">
                    <button onClick={() => onDeleteRow(item.viveiro)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </td>
            )}
        </tr>
    );
};
