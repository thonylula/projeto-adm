import React from 'react';

interface HtmlViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
}

export const HtmlViewModal: React.FC<HtmlViewModalProps> = ({ isOpen, onClose, htmlContent }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-[#020617] p-8 text-white flex justify-between items-center shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#C5A059]/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black uppercase tracking-[0.1em]">Prévia do Relatório</h3>
                        <p className="text-sm text-slate-400">Escala e detalhes técnicos do documento final</p>
                    </div>
                    <button onClick={onClose} className="text-white opacity-40 hover:opacity-100 transition-opacity relative z-10 text-xl">✕</button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-100">
                    <div
                        className="bg-white p-8 shadow-2xl mx-auto max-w-[210mm] min-h-[297mm] rounded-b-3xl"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>
            </div>
        </div>
    );
};
