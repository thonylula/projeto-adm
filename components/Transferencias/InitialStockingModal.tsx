import React, { useState } from 'react';

interface InitialStockingModalProps {
    isOpen: boolean;
    nurseryName: string;
    onSubmit: (nursery: string, stocking: number) => void;
    onClose: () => void;
}

export const InitialStockingModal: React.FC<InitialStockingModalProps> = ({
    isOpen, nurseryName, onSubmit, onClose
}) => {
    const [stocking, setStocking] = useState<string>('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-[#020617] p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F97316]/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                    <h3 className="text-xl font-black uppercase tracking-[0.1em] relative z-10">Estocagem Inicial</h3>
                    <p className="text-sm text-slate-400 relative z-10">Informe a quantidade povoada no {nurseryName}</p>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Quantidade de PLs</label>
                        <input
                            type="number"
                            autoFocus
                            value={stocking}
                            onChange={(e) => setStocking(e.target.value)}
                            placeholder="Ex: 500.000"
                            className="w-full text-4xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-[#F97316] transition-colors p-4 outline-none text-center bg-slate-50/30 rounded-t-3xl"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                        >
                            Pular
                        </button>
                        <button
                            onClick={() => {
                                if (stocking) {
                                    onSubmit(nurseryName, Number(stocking));
                                    setStocking('');
                                }
                            }}
                            disabled={!stocking}
                            className="flex-[2] py-4 bg-[#F97316] text-white font-black rounded-2xl shadow-2xl shadow-[#F97316]/20 hover:bg-[#EA580C] disabled:bg-slate-200 transition-all active:scale-95 text-xs uppercase tracking-[0.2em]"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
