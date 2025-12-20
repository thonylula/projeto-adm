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
        <div className="bg-white p-8 rounded-xl shadow-lg print:shadow-none print:p-0">
            <div className="flex justify-between items-center mb-10 border-b-2 border-slate-900 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{companyName}</h1>
                    {recipientCnpj && <p className="text-sm font-bold text-slate-500">CNPJ: {recipientCnpj}</p>}
                    <h2 className="text-xl font-bold text-indigo-600 mt-2">Protocolo de Recebimento - Cesta Básica</h2>
                </div>
                {companyLogo && <img src={companyLogo} alt="Logo" className="h-20 w-auto" />}
            </div>

            <div className="grid grid-cols-1 gap-y-4">
                {employeeNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-4 py-4 border-b border-slate-200">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                            {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-slate-800 uppercase">{name}</p>
                        </div>
                        <div className="w-64 border-b-2 border-slate-900 h-8 self-end"></div>
                    </div>
                ))}
            </div>

            <div className="mt-12 flex justify-between items-end">
                <div className="text-xs text-slate-400">
                    Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                </div>
                {sloganImage && <img src={sloganImage} alt="Slogan" className="h-10 w-auto grayscale" />}
            </div>

            <div className="mt-8 text-center print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                    Imprimir Folha de Assinaturas
                </button>
            </div>
        </div>
    );
};
