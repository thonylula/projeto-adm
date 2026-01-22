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
                <div className="bg-orange-600 p-6 text-white">
                    <h3 className="text-xl font-black uppercase tracking-tight">Estocagem Inicial</h3>
                    <p className="text-sm opacity-80">Informe a quantidade povoada no {nurseryName}</p>
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
                            className="w-full text-3xl font-black text-gray-800 border-b-4 border-orange-100 focus:border-orange-500 transition-colors p-2 outline-none"
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
                            className="flex-1 py-4 bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 disabled:bg-gray-200 transition-all active:scale-95"
                        >
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
