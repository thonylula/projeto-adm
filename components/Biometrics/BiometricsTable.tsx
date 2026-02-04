
import React from 'react';
import { BiometricsRow } from './BiometricsRow';

interface BiometricsTableProps {
    data: any[];
    isPublic: boolean;
    isDarkMode: boolean;
    onUpdateRow: (viveiro: string, field: any, value: any) => void;
    onDeleteRow: (viveiro: string) => void;
    onCopy: (text: string | number | null, label: string) => void;
}

export const BiometricsTable: React.FC<BiometricsTableProps> = ({
    data, isPublic, isDarkMode, onUpdateRow, onDeleteRow, onCopy
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className={`text-[10px] font-black uppercase tracking-[0.2em] border-b-2 ${isDarkMode ? 'text-slate-500 border-slate-800' : 'text-gray-400 border-gray-100'}`}>
                        <th className="py-4 pl-6 text-left">Viveiro / Dias</th>
                        <th className="py-4 text-center">Peso (g)</th>
                        <th className="py-4 text-center">Anterior</th>
                        <th className="py-4 text-center">Ganho</th>
                        <th className="py-4 text-center text-indigo-500">GPD</th>
                        <th className="py-4 text-left">Status</th>
                        {!isPublic && <th className="py-4 pr-6 text-right no-print"></th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item, idx) => (
                        <BiometricsRow
                            key={item.viveiro || idx}
                            item={item}
                            isPublic={isPublic}
                            isDarkMode={isDarkMode}
                            onUpdateRow={onUpdateRow}
                            onDeleteRow={onDeleteRow}
                            onCopy={onCopy}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
