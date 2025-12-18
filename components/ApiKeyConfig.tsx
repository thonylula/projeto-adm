import React from 'react';

interface ApiKeyConfigProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    onSave: (key: string) => void;
    title?: string;
}

export const ApiKeyConfig: React.FC<ApiKeyConfigProps> = ({ isOpen, onClose, apiKey, onSave, title = "Configuração de API Key" }) => {
    const [tempKey, setTempKey] = React.useState(apiKey);

    React.useEffect(() => {
        setTempKey(apiKey);
    }, [apiKey, isOpen]);

    return (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'} transition-all duration-300`}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-in zoom-in-95">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 mb-4">Insira sua chave Google Gemini válida abaixo:</p>

                <input
                    type="text"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="Cole sua API Key aqui (AIza...)"
                    className="w-full p-3 border border-gray-300 rounded-xl font-mono text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                />

                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(tempKey)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
                    >
                        Salvar Chave
                    </button>
                </div>
            </div>
        </div>
    );
};
