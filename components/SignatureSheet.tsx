import React from 'react';

interface SignatureSheetProps {
    employeeNames: string[];
    companyName: string;
    recipientCnpj?: string;
    sloganImage?: string | null;
    companyLogo?: string | null;
}

export const SignatureSheet: React.FC<SignatureSheetProps> = ({ employeeNames, companyName, recipientCnpj, sloganImage, companyLogo }) => {
    return (
        <div className="bg-white border-2 border-orange-500 rounded-sm shadow-sm overflow-hidden animate-in fade-in duration-500 font-sans text-[#444] print:shadow-none print:border-2">
            {/* Header Bar */}
            <div className="p-4 border-b border-orange-500">
                <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                        <h1 className="text-sm font-bold uppercase text-slate-800">{companyName}</h1>
                        <p className="text-[10px] text-slate-500 font-medium">CNPJ: {recipientCnpj || '---'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] font-bold text-slate-700">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            <div className="h-1.5 w-full bg-orange-500 rounded-none shadow-sm" />

            {/* Signature Table */}
            <div className="w-full">
                {/* Table Headers */}
                <div className="grid grid-cols-[1fr_2fr] border-b border-orange-500 bg-slate-50/30">
                    <div className="p-3 border-r border-orange-500">
                        <span className="text-lg font-black text-slate-800 uppercase tracking-tight">Nomes</span>
                    </div>
                    <div className="p-3">
                        <span className="text-lg font-black text-slate-800 uppercase tracking-tight">Assinaturas</span>
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-orange-500">
                    {employeeNames.map((name, index) => (
                        <div key={index} className="grid grid-cols-[1fr_2fr] min-h-[48px]">
                            <div className="p-3 border-r border-orange-500 flex items-center">
                                <span className="text-sm font-bold text-slate-700 uppercase leading-snug">{name}</span>
                            </div>
                            <div className="p-3 bg-white">
                                {/* Space for signature */}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 flex justify-between items-center border-t border-orange-500 bg-slate-50/30 print:bg-transparent">
                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Protocolo de Recebimento Individualizado</div>
                {companyLogo && <img src={companyLogo} alt="Logo" className="h-8 w-auto opacity-40 grayscale" />}
            </div>

            <div className="mt-8 text-center print:hidden p-4">
                <button
                    onClick={() => window.print()}
                    className="bg-orange-600 text-white px-8 py-3 rounded-sm font-black uppercase text-sm hover:bg-orange-700 transition-all shadow-lg active:scale-95"
                >
                    Imprimir Folha de Assinaturas
                </button>
            </div>
        </div>
    );
};
