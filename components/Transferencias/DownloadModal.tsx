import React, { useState } from 'react';

interface DownloadDetails {
    companyName: string;
    companyLogo: string | null;
    managerName: string;
    generatedBy: string;
}

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (details: DownloadDetails) => void;
    isPreviewMode?: boolean;
    initialDetails: DownloadDetails;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
    isOpen, onClose, onSubmit, isPreviewMode, initialDetails
}) => {
    const [details, setDetails] = useState<DownloadDetails>(initialDetails);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Detalhes do Relatório</h3>
                        <p className="text-sm opacity-80">Personalize as informações do PDF/PNG</p>
                    </div>
                    <button onClick={onClose} className="text-white opacity-50 hover:opacity-100">✕</button>
                </div>

                <div className="p-8 space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nome da Fazenda/Empresa</label>
                        <input
                            type="text"
                            value={details.companyName}
                            onChange={(e) => setDetails({ ...details, companyName: e.target.value })}
                            className="w-full p-3 border border-gray-200 rounded-xl font-bold"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">URL da Logo (Opcional)</label>
                        <input
                            type="text"
                            value={details.companyLogo || ''}
                            onChange={(e) => setDetails({ ...details, companyLogo: e.target.value })}
                            className="w-full p-3 border border-gray-200 rounded-xl font-bold"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gerente Responsável</label>
                            <input
                                type="text"
                                value={details.managerName}
                                onChange={(e) => setDetails({ ...details, managerName: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Gerado Por</label>
                            <input
                                type="text"
                                value={details.generatedBy}
                                onChange={(e) => setDetails({ ...details, generatedBy: e.target.value })}
                                className="w-full p-3 border border-gray-200 rounded-xl font-bold"
                            />
                        </div>
                    </div>

                    <button
                        onClick={() => onSubmit(details)}
                        className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all active:scale-95 mt-4"
                    >
                        {isPreviewMode ? 'Visualizar Relatório' : 'Gerar Arquivo'}
                    </button>
                </div>
            </div>
        </div>
    );
};
