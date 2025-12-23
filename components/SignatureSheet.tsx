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
        <div
            className="bg-white rounded-sm shadow-sm overflow-hidden animate-in fade-in duration-500 font-sans text-[#444] print:shadow-none"
            style={{ border: '4px solid #f97316' }}
        >
            {/* Header Bar */}
            <div className="p-2 border-b-2" style={{ borderColor: '#f97316' }}>
                <div className="flex justify-between items-center">
                    <div className="space-y-0 flex-1">
                        <h1 className="text-[10px] font-black uppercase text-slate-800">{companyName}</h1>
                        <p className="text-[8px] text-slate-500 font-bold">CNPJ: {recipientCnpj || '---'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-700">Data: {new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
            </div>

            <div className="h-1.5 w-full rounded-none" style={{ backgroundColor: '#f97316' }} />

            {/* Signature Table */}
            <div className="w-full">
                {/* Table Headers */}
                <div
                    className="grid grid-cols-[1.5fr_2fr] border-b-2 bg-slate-50/30"
                    style={{ borderColor: '#f97316' }}
                >
                    <div className="p-2 border-r-2" style={{ borderColor: '#f97316' }}>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Nome Funcionário</span>
                    </div>
                    <div className="p-2">
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Assinatura de Recebimento</span>
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y-2" style={{ borderColor: '#f97316' }}>
                    {employeeNames.map((name, index) => (
                        <div key={index} className="grid grid-cols-[1.5fr_2fr] min-h-[32px]">
                            <div className="p-1 px-3 border-r-2 flex items-center" style={{ borderColor: '#f97316' }}>
                                <span className="text-[10px] font-black text-slate-800 uppercase leading-snug">{name}</span>
                            </div>
                            <div className="p-1 bg-white">
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
