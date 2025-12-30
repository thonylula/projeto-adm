
import React, { useState } from 'react';

interface ShowcaseSection {
    id: string;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const SECTIONS: ShowcaseSection[] = [
    {
        id: 'biometrics',
        label: 'Biometria',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-2.242 2.244l1.793 4.493a2.25 2.25 0 002.09 1.413h15.898a2.25 2.25 0 002.09-1.413l1.793-4.493A2.25 2.25 0 0021.59 9M2.41 9c.381 0 .75.028 1.11.082M21.59 9a14.25 14.25 0 00-1.11.082m-1.285.742a22.511 22.511 0 01-2.903-1.066m-10.584 0a22.511 22.511 0 01-2.903 1.066" />
            </svg>
        ),
        description: 'Acompanhamento de crescimento e peso.'
    },
    {
        id: 'showcase',
        label: 'Faturamento',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        ),
        description: 'Resumo de vendas e ordens de entrega.'
    },
    {
        id: 'mortalidade',
        label: 'Mortalidade e Consumo',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
        ),
        description: 'Controle operacional e eficiência.'
    },
    {
        id: 'campo',
        label: 'Campo/Viveiros',
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
            </svg>
        ),
        description: 'Status atual dos viveiros e lotes.'
    }
];

export const ShowcaseManager: React.FC = () => {
    const [selectedIds, setSelectedIds] = useState<string[]>(['showcase']);
    const [copied, setCopied] = useState(false);

    const toggleSection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    const generateLink = () => {
        const url = new URL(window.location.href.split('?')[0]);
        url.searchParams.set('showcase', 'true');
        if (selectedIds.length > 0) {
            url.searchParams.set('tabs', selectedIds.join(','));
        }
        return url.toString();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generateLink());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                    Gestão do <span className="text-orange-600">Faturamento</span>
                </h2>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    Selecione os módulos que deseja compartilhar. O gestor poderá visualizar e acompanhar todos em uma única tela harmoniosa.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SECTIONS.map((section) => {
                    const isSelected = selectedIds.includes(section.id);
                    return (
                        <button
                            key={section.id}
                            onClick={() => toggleSection(section.id)}
                            className={`
                group relative flex items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-300 text-left
                ${isSelected
                                    ? 'bg-orange-50 border-orange-500 shadow-lg shadow-orange-100'
                                    : 'bg-white border-slate-100 hover:border-orange-200 hover:shadow-md'}
              `}
                        >
                            <div className={`
                w-14 h-14 rounded-xl flex items-center justify-center transition-colors
                ${isSelected ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-orange-100 group-hover:text-orange-500'}
              `}>
                                {section.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold text-lg ${isSelected ? 'text-orange-900' : 'text-slate-700'}`}>
                                    {section.label}
                                </h3>
                                <p className={`text-sm ${isSelected ? 'text-orange-700/70' : 'text-slate-400'}`}>
                                    {section.description}
                                </p>
                            </div>
                            <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                ${isSelected ? 'bg-orange-600 border-orange-600' : 'border-slate-200'}
              `}>
                                {isSelected && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3.5 h-3.5 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32" />

                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <h4 className="text-xl font-bold">Link de Compartilhamento</h4>
                        <p className="text-slate-400 text-sm">
                            Use este link para dar acesso externo aos módulos selecionados.
                        </p>
                        <div className="mt-4 p-3 bg-slate-800 rounded-xl border border-slate-700 font-mono text-xs text-orange-400 break-all">
                            {generateLink()}
                        </div>
                    </div>

                    <button
                        onClick={handleCopy}
                        className={`
              shrink-0 px-8 py-4 rounded-2xl font-bold text-white transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2
              ${copied ? 'bg-green-600' : 'bg-orange-600 hover:bg-orange-500 shadow-xl shadow-orange-900/40'}
            `}
                    >
                        {copied ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                                Copiado!
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                                </svg>
                                Copiar Link
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
