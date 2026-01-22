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
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-black uppercase tracking-tight">Prévia do Relatório (HTML)</h3>
                    <button onClick={onClose} className="text-white opacity-50 hover:opacity-100">✕</button>
                </div>
                <div className="flex-1 overflow-auto p-8 bg-gray-100">
                    <div
                        className="bg-white p-8 shadow-xl mx-auto max-w-[210mm] min-h-[297mm]"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>
            </div>
        </div>
    );
};
