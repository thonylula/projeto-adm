import React, { useState, useEffect } from 'react';
import { Company, Viveiro } from '../types';
import { SupabaseService } from '../services/supabaseService';

interface CampoViveirosProps {
    activeCompany: Company | null;
    isPublic?: boolean;
}

export const CampoViveiros: React.FC<CampoViveirosProps> = ({ activeCompany, isPublic = false }) => {
    const [viveiros, setViveiros] = useState<Viveiro[]>([]);
    const [selectedViveiro, setSelectedViveiro] = useState<Viveiro | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingNotes, setEditingNotes] = useState('');
    const [editingArea, setEditingArea] = useState('');

    // Load viveiros when company changes
    useEffect(() => {
        if (activeCompany) {
            loadViveiros();
        }
    }, [activeCompany]);

    const loadViveiros = async () => {
        if (!activeCompany) return;
        const data = await SupabaseService.getViveiros(activeCompany.id);
        setViveiros(data);
    };

    const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
        if (!activeCompany || isPublic) return;

        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100; // Porcentagem
        const y = ((e.clientY - rect.top) / rect.height) * 100; // Porcentagem

        const name = prompt('Nome do viveiro:');
        if (!name) return;

        const areaInput = prompt('Área do viveiro (em hectares):', '1');
        if (!areaInput) return;

        const area = parseFloat(areaInput);

        const newViveiro = {
            company_id: activeCompany.id,
            name,
            coordinates: [{ lat: y, lng: x }], // Salvamos como % para posicionamento relativo
            area_m2: area // Usando o mesmo campo mas agora representa hectares
        };

        const added = await SupabaseService.addViveiro(newViveiro);
        if (added) {
            await loadViveiros();
        }
    };

    const handleSaveViveiro = async () => {
        if (!selectedViveiro) return;

        const success = await SupabaseService.updateViveiro(selectedViveiro.id, {
            name: editingName,
            notes: editingNotes,
            area_m2: parseFloat(editingArea)
        });

        if (success) {
            await loadViveiros();
            setSelectedViveiro(null);
        }
    };

    const handleDeleteViveiro = async () => {
        if (!selectedViveiro) return;

        if (confirm(`Deletar viveiro "${selectedViveiro.name}"?`)) {
            const success = await SupabaseService.deleteViveiro(selectedViveiro.id);
            if (success) {
                await loadViveiros();
                setSelectedViveiro(null);
            }
        }
    };

    if (!activeCompany) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-slate-500">Selecione uma empresa primeiro.</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Map Container */}
            <div className="flex-1 relative">
                <div className="w-full h-full flex items-center justify-center bg-slate-200 overflow-auto">
                    <div className="relative inline-block">
                        <img
                            src="/viveiros_map.png"
                            alt="Mapa dos Viveiros"
                            className="max-w-full max-h-screen cursor-crosshair"
                            onClick={handleImageClick}
                        />

                        {/* Markers for viveiros */}
                        {viveiros.map(v => {
                            const pos = v.coordinates[0];
                            if (!pos) return null;

                            return (
                                <div
                                    key={v.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedViveiro(v);
                                        setEditingName(v.name);
                                        setEditingNotes(v.notes || '');
                                        setEditingArea(v.area_m2.toString());
                                    }}
                                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${selectedViveiro?.id === v.id
                                        ? 'scale-125 z-20'
                                        : 'z-10'
                                        }`}
                                    style={{
                                        left: `${pos.lng}%`,
                                        top: `${pos.lat}%`
                                    }}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-lg ${selectedViveiro?.id === v.id
                                        ? 'bg-red-500 text-white ring-4 ring-red-300'
                                        : 'bg-green-500 text-white'
                                        }`}>
                                        {v.name.substring(0, 2).toUpperCase()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Instructions Overlay - Hidden for visitors */}
                {!isPublic && (
                    <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
                        <h3 className="font-bold text-slate-900 mb-2">🗺️ Como usar:</h3>
                        <ul className="text-sm text-slate-600 space-y-1">
                            <li>1. Clique no mapa onde está o viveiro</li>
                            <li>2. Digite o nome do viveiro</li>
                            <li>3. Digite a área em hectares</li>
                            <li>4. Clique no marcador para editar</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Sidebar - Hidden for visitors */}
            {!isPublic && (
                <div className="w-96 bg-white shadow-lg p-6 overflow-y-auto">
                    <h2 className="text-2xl font-black text-slate-900 mb-4">🐟 Viveiros</h2>

                    {/* Viveiros List */}
                    <div className="space-y-2 mb-6">
                        {viveiros.map(v => (
                            <div
                                key={v.id}
                                onClick={() => {
                                    setSelectedViveiro(v);
                                    setEditingName(v.name);
                                    setEditingNotes(v.notes || '');
                                    setEditingArea(v.area_m2.toString());
                                }}
                                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedViveiro?.id === v.id
                                    ? 'bg-indigo-100 border-2 border-indigo-500'
                                    : 'bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="font-bold text-slate-900">{v.name}</div>
                                <div className="text-sm text-slate-600">Área: {v.area_m2.toLocaleString('pt-BR')} ha</div>
                            </div>
                        ))}
                        {viveiros.length === 0 && (
                            <p className="text-slate-400 text-sm text-center py-8">
                                Nenhum viveiro cadastrado.<br />
                                Clique no mapa para adicionar.
                            </p>
                        )}
                    </div>

                    {/* Editor */}
                    {selectedViveiro && (
                        <div className="border-t pt-4">
                            <h3 className="font-bold text-slate-900 mb-3">Editar Viveiro</h3>

                            <label className="block mb-2">
                                <span className="text-sm text-slate-600">Nome:</span>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={e => setEditingName(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                                />
                            </label>

                            <label className="block mb-2">
                                <span className="text-sm text-slate-600">Área (hectares):</span>
                                <input
                                    type="number"
                                    value={editingArea}
                                    onChange={e => setEditingArea(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                                />
                            </label>

                            <label className="block mb-4">
                                <span className="text-sm text-slate-600">Notas:</span>
                                <textarea
                                    value={editingNotes}
                                    onChange={e => setEditingNotes(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border rounded-lg"
                                    rows={3}
                                />
                            </label>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveViveiro}
                                    className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700"
                                >
                                    ✅ Salvar
                                </button>
                                <button
                                    onClick={handleDeleteViveiro}
                                    className="px-4 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
