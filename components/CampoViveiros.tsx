import React, { useState, useEffect, useRef } from 'react';
import { Company, Viveiro } from '../types';
import { SupabaseService } from '../services/supabaseService';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

interface CampoViveirosProps {
    activeCompany: Company | null;
}

export const CampoViveiros: React.FC<CampoViveirosProps> = ({ activeCompany }) => {
    const [viveiros, setViveiros] = useState<Viveiro[]>([]);
    const [selectedViveiro, setSelectedViveiro] = useState<Viveiro | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingNotes, setEditingNotes] = useState('');

    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<google.maps.Map | null>(null);
    const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
    const polygonsRef = useRef<Map<string, google.maps.Polygon>>(new Map());

    // Load Google Maps (você precisará adicionar a API key no .env)
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const { isLoaded, loadError } = useGoogleMaps(apiKey);

    // Load viveiros when company changes
    useEffect(() => {
        if (activeCompany) {
            loadViveiros();
        }
    }, [activeCompany]);

    // Initialize map after Google Maps loads
    useEffect(() => {
        if (isLoaded && mapRef.current && !googleMapRef.current) {
            initializeMap();
        }
    }, [isLoaded]);

    // Re-render polygons when viveiros change
    useEffect(() => {
        if (googleMapRef.current && viveiros.length > 0) {
            renderAllPolygons();
        }
    }, [viveiros]);

    const loadViveiros = async () => {
        if (!activeCompany) return;
        const data = await SupabaseService.getViveiros(activeCompany.id);
        setViveiros(data);
    };

    const initializeMap = () => {
        if (!mapRef.current) return;

        // Default center (Brazil - adjust as needed)
        const defaultCenter = { lat: -15.7801, lng: -47.9292 };

        const map = new google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 18,
            mapTypeId: 'satellite',
            tilt: 0
        });

        googleMapRef.current = map;

        // Initialize Drawing Manager
        const drawingManager = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON]
            },
            polygonOptions: {
                fillColor: '#00FF00',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#FFFF00',
                clickable: true,
                editable: true,
                zIndex: 1
            }
        });

        drawingManager.setMap(map);
        drawingManagerRef.current = drawingManager;

        // Listen for polygon complete
        google.maps.event.addListener(drawingManager, 'polygoncomplete', handlePolygonComplete);
    };

    const handlePolygonComplete = async (polygon: google.maps.Polygon) => {
        if (!activeCompany) return;

        const path = polygon.getPath();
        const coordinates = [];
        for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i);
            coordinates.push({ lat: point.lat(), lng: point.lng() });
        }

        // Calculate area in square meters
        const area = google.maps.geometry.spherical.computeArea(path);

        const name = prompt('Nome do viveiro:');
        if (!name) {
            polygon.setMap(null);
            return;
        }

        const newViveiro = {
            company_id: activeCompany.id,
            name,
            coordinates,
            area_m2: Math.round(area)
        };

        const added = await SupabaseService.addViveiro(newViveiro);
        if (added) {
            await loadViveiros();
            polygon.setMap(null);
            drawingManagerRef.current?.setDrawingMode(null);
        }
    };

    const renderAllPolygons = () => {
        if (!googleMapRef.current) return;

        // Clear existing polygons
        polygonsRef.current.forEach(p => p.setMap(null));
        polygonsRef.current.clear();

        // Render each viveiro
        viveiros.forEach(viveiro => {
            const polygon = new google.maps.Polygon({
                paths: viveiro.coordinates,
                fillColor: selectedViveiro?.id === viveiro.id ? '#FF0000' : '#00FF00',
                fillOpacity: 0.4,
                strokeWeight: 2,
                strokeColor: '#FFFF00',
                clickable: true,
                map: googleMapRef.current!
            });

            polygon.addListener('click', () => {
                setSelectedViveiro(viveiro);
                setEditingName(viveiro.name);
                setEditingNotes(viveiro.notes || '');
            });

            polygonsRef.current.set(viveiro.id, polygon);
        });

        // Fit bounds to show all polygons
        if (viveiros.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            viveiros.forEach(v => {
                v.coordinates.forEach(coord => {
                    bounds.extend(new google.maps.LatLng(coord.lat, coord.lng));
                });
            });
            googleMapRef.current?.fitBounds(bounds);
        }
    };

    const handleSaveViveiro = async () => {
        if (!selectedViveiro) return;

        const success = await SupabaseService.updateViveiro(selectedViveiro.id, {
            name: editingName,
            notes: editingNotes
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

    if (loadError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <p className="text-red-500 font-bold">❌ Erro ao carregar Google Maps</p>
                <p className="text-slate-600">Verifique se a API Key está configurada corretamente no arquivo .env</p>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-slate-500">🌍 Carregando Google Maps...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Map Container */}
            <div className="flex-1 relative">
                <div ref={mapRef} className="w-full h-full" />

                {/* Instructions Overlay */}
                <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
                    <h3 className="font-bold text-slate-900 mb-2">🗺️ Como usar:</h3>
                    <ul className="text-sm text-slate-600 space-y-1">
                        <li>1. Clique no ícone de polígono no topo</li>
                        <li>2. Desenhe o contorno do viveiro no mapa</li>
                        <li>3. Clique no ponto inicial para fechar</li>
                        <li>4. Digite o nome do viveiro</li>
                        <li>5. A área será calculada automaticamente</li>
                    </ul>
                </div>
            </div>

            {/* Sidebar */}
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

                                // Center map on this viveiro
                                if (googleMapRef.current && v.coordinates.length > 0) {
                                    const bounds = new google.maps.LatLngBounds();
                                    v.coordinates.forEach(coord => bounds.extend(coord));
                                    googleMapRef.current.fitBounds(bounds);
                                }
                            }}
                            className={`p-3 rounded-lg cursor-pointer transition-all ${selectedViveiro?.id === v.id
                                    ? 'bg-indigo-100 border-2 border-indigo-500'
                                    : 'bg-slate-50 hover:bg-slate-100'
                                }`}
                        >
                            <div className="font-bold text-slate-900">{v.name}</div>
                            <div className="text-sm text-slate-600">Área: {v.area_m2.toLocaleString('pt-BR')} m²</div>
                        </div>
                    ))}
                    {viveiros.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-8">Nenhum viveiro cadastrado</p>
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
        </div>
    );
};
