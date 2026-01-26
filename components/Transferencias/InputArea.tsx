import React from 'react';

interface InputAreaProps {
    inputText: string;
    setInputText: (text: string) => void;
    inputFile: File | null;
    setInputFile: (file: File | null) => void;
    isLoading: boolean;
    onProcess: () => void;
    onClear: () => void;
    onRefresh: () => void;
    inputMode: 'text' | 'file';
    setInputMode: (mode: 'text' | 'file') => void;
}

export const InputArea: React.FC<InputAreaProps> = ({
    inputText, setInputText,
    inputFile, setInputFile,
    isLoading, onProcess,
    onClear, onRefresh,
    inputMode, setInputMode
}) => {
    return (
        <div className="space-y-4">
            <div className="flex gap-4 border-b border-gray-100 pb-2">
                <button
                    onClick={() => setInputMode('text')}
                    className={`pb-2 px-4 text-sm font-black uppercase tracking-[0.2em] transition-all ${inputMode === 'text' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Texto / Log
                </button>
                <button
                    onClick={() => setInputMode('file')}
                    className={`pb-2 px-4 text-sm font-black uppercase tracking-[0.2em] transition-all ${inputMode === 'file' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Arquivo / Imagem
                </button>
            </div>

            {inputMode === 'text' ? (
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Cole aqui o log de transferência ou o texto extraído..."
                    className="w-full h-48 p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#C5A059] focus:border-transparent resize-none font-mono text-sm bg-slate-50/30"
                />
            ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input
                        type="file"
                        onChange={(e) => setInputFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept="image/*,.pdf"
                    />
                    <div className="space-y-2">
                        <div className="text-4xl">📁</div>
                        <p className="text-sm text-gray-600">
                            {inputFile ? inputFile.name : 'Clique para selecionar ou arraste o arquivo aqui'}
                        </p>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG aceitos</p>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={onProcess}
                    disabled={isLoading || (inputMode === 'text' ? !inputText : !inputFile)}
                    className="flex-1 bg-[#C5A059] text-white py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-[#B59049] disabled:bg-slate-200 transition-all shadow-xl shadow-[#C5A059]/10 active:scale-95"
                >
                    {isLoading ? 'Processando...' : '🚀 Processar Dados'}
                </button>
                <button
                    onClick={onRefresh}
                    className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all font-bold"
                    title="Recarregar"
                >
                    🔄
                </button>
                <button
                    onClick={onClear}
                    className="p-3 bg-white border border-gray-200 text-red-500 rounded-xl hover:bg-red-50 transition-all font-bold"
                    title="Limpar"
                >
                    🗑️
                </button>
            </div>
        </div>
    );
};
