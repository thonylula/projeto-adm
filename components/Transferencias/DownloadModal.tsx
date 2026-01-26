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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setDetails(prev => ({ ...prev, companyLogo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-slate-800">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#020617] p-8 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059]/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black uppercase tracking-[0.1em]">Detalhes do Relatório</h3>
                        <p className="text-sm text-slate-400">Personalize as informações do PDF/PNG</p>
                    </div>
                    <button onClick={onClose} className="text-white opacity-40 hover:opacity-100 transition-opacity relative z-10 text-xl">✕</button>
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
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Logo da Empresa</label>
                        <div className="flex gap-4 items-center">
                            {details.companyLogo && (
                                <img src={details.companyLogo} alt="Logo" className="h-12 w-12 object-contain border rounded p-1" />
                            )}
                            <div className="flex-1 relative border-2 border-dashed border-gray-200 rounded-xl p-3 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer">
                                <input
                                    type="file"
                                    onChange={handleLogoUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    accept="image/*"
                                />
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Upload Nova Logo</p>
                            </div>
                        </div>
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
                        className="w-full py-4 bg-[#C5A059] text-white font-black rounded-2xl shadow-2xl shadow-[#C5A059]/20 hover:bg-[#B59049] transition-all active:scale-95 mt-8 uppercase tracking-[0.2em] text-xs"
                    >
                        {isPreviewMode ? 'Visualizar Relatório' : 'Gerar Arquivo'}
                    </button>
                </div>
            </div>
        </div>
    );
};
