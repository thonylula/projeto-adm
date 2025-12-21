import React, { useState, useEffect, useRef, useMemo } from 'react';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { safeIncludes } from '../utils';
import { useGeminiParser } from '../hooks/useGeminiParser';
import { SupabaseService } from '../services/supabaseService';

// --- LOGO PADRÃO CARAPITANGA (SVG Data URI) ---
const DEFAULT_LOGO = "data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%270%200%20100%20100%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20fill%3D%27none%27%3E%3Cpath%20d%3D%27M78%2035C75%2025%2065%2018%2052%2018C35%2018%2022%2030%2022%2048C22%2062%2030%2072%2040%2078C45%2081%2052%2082%2058%2080%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%276%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M25%2045C28%2042%2035%2040%2040%2042%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M26%2055C30%2052%2038%2050%2044%2052%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M32%2065C36%2062%2044%2060%2050%2062%27%20stroke%3D%27%23fdba74%27%20stroke-width%3D%273%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M78%2035C82%2038%2084%2045%2080%2052C76%2058%2070%2060%2065%2058%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%276%27%20stroke-linecap%3D%27round%27%2F%3E%3Ccircle%20cx%3D%2770%27%20cy%3D%2732%27%20r%3D%273%27%20fill%3D%27black%27%2F%3E%3Cpath%20d%3D%27M78%2035C85%2025%2095%2020%2098%2015%27%20stroke%3D%27%23ea580c%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M75%2035C85%2010%2060%205%2050%208%27%20stroke%3D%27%23ea580c%27%20stroke-width%3D%271.5%27%20stroke-linecap%3D%27round%27%2F%3E%3Cpath%20d%3D%27M58%2080L62%2088M58%2080L54%2090M58%2080L66%2085%27%20stroke%3D%27%23f97316%27%20stroke-width%3D%274%27%20stroke-linecap%3D%27round%27%2F%3E%3C%2Fsvg%3E";

// --- TABELA DE REFERÊNCIA DE CRESCIMENTO (ATUALIZADA) ---
const GROWTH_TABLE = [
    { day: 30, espetacular: 1.8, otimo: 1.5, bom: 1.2, regular: 0.8, ruim: 0.4, pessimo: 0.2 },
    { day: 60, espetacular: 7.5, otimo: 6.5, bom: 6.0, regular: 4.5, ruim: 2.5, pessimo: 1.2 },
    { day: 90, espetacular: 17.5, otimo: 15.5, bom: 12.0, regular: 8.5, ruim: 5.0, pessimo: 2.5 },
    { day: 120, espetacular: 22.0, otimo: 20.0, bom: 16.0, regular: 12.0, ruim: 8.0, pessimo: 4.0 },
];

// --- DADOS BRUTOS PADRÃO (Cenários de Teste) ---
// --- DADOS BRUTOS PADRÃO (Vazio para evitar alucinações) ---
const defaultRawData: any[] = [];

// --- MANCHETES DE NOTÍCIAS (Carcinicultura) ---
const NEWS_HEADLINES_SOURCE = [
    "🦐 Última Hora: Exportações de camarão Vannamei batem recorde no trimestre.",
    "📈 Mercado Asiático: Demanda por camarão brasileiro cresce 22% este mês.",
    "🌊 Tecnologia: Novo sensor de oxigênio reduz custos de energia em 15%.",
    "🧬 Genética: Linhagem 'Turbo' mostra resistência superior a mancha branca.",
    "🇧🇷 Ceará: Produtores investem em berçários intensivos para reduzir ciclo.",
    "💰 Economia: Custo da ração apresenta leve queda no mercado internacional.",
    "🌱 Sustentabilidade: Fazendas com certificação ASC ganham prêmio na Europa.",
    "🤝 Evento: FENACAM confirma datas e promete trazer IA para o campo.",
    "🤖 Inovação: O APP gera a ordem correta dos viveiros e permite filtros.",
    "🌍 Europa: Aumenta a procura por camarão processado e descascado.",
    "📊 Relatório: Conversão alimentar média do setor melhora para 1.4.",
    "🧪 Nutrição: Uso de ácidos orgânicos melhora sobrevivência em 10%.",
    "🚚 Logística: Nova rota de exportação via Rio Grande do Norte é inaugurada.",
    "🦠 Sanitário: Monitoramento preventivo evita surtos de vibriose no estado.",
    "💡 Dica: Aeração estratégica no período noturno otimiza crescimento."
];

type ViewStep = 'UPLOAD' | 'PROCESSING' | 'DASHBOARD';

export const BiometricsManager: React.FC = () => {
    const [step, setStep] = useState<ViewStep>('UPLOAD');
    const [logo, setLogo] = useState<string | null>(DEFAULT_LOGO);
    const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const [currentData, setCurrentData] = useState<any[]>(defaultRawData);

    const { processFile, isProcessing } = useGeminiParser();
    const [filterText, setFilterText] = useState('');
    const [showReferenceTable, setShowReferenceTable] = useState(false);

    // --- NEWS ROTATION STATE ---
    const [newsList, setNewsList] = useState<string[]>(NEWS_HEADLINES_SOURCE);
    const [newsIndex, setNewsIndex] = useState(0);

    const dashboardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- PERSISTÊNCIA AUTOMÁTICA (SUPABASE) ---
    useEffect(() => {
        const load = async () => {
            const data = await SupabaseService.getBiometrics();
            if (data && data.length > 0) {
                // In our implementation, we stored it as an array inside a record with id 'global_biometrics' 
                // but SupabaseService.getBiometrics returns an array of data property. 
                // Since we used upsert([{id: 'global_biometrics', data}]), data should be exactly our array.
                // The getBiometrics implementation returns: return data.map(d => d.data);
                // So if we have one record, it will return [dataArray].
                if (data[0]) {
                    setCurrentData(data[0]);
                    setStep('DASHBOARD');
                }
            }
        };
        load();
    }, []);

    useEffect(() => {
        if (currentData.length > 0) {
            SupabaseService.saveBiometrics(currentData);
        }
    }, [currentData]);

    // --- BACKUP MANUAL (ARQUIVO JSON) ---
    const saveBackup = () => {
        const json = JSON.stringify(currentData, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '_');
        a.download = `backup_biometria_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Backup salvo na pasta de Downloads!");
    };

    const loadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string;
                const parsed = JSON.parse(json);
                if (Array.isArray(parsed)) {
                    setCurrentData(parsed);
                    setStep('DASHBOARD');
                    showToast("Backup carregado com sucesso!");
                } else {
                    showToast("Erro: Arquivo inválido (não é uma lista).");
                }
            } catch (err) {
                showToast("Erro: Arquivo corrompido ou inválido.");
            }
        };
        reader.readAsText(file);
    };

    // --- EFEITO DE NOTÍCIAS (Shuffle e Rotação) ---
    useEffect(() => {
        // Embaralha as notícias ao montar o componente para parecer sempre "fresco"
        const shuffled = [...NEWS_HEADLINES_SOURCE].sort(() => 0.5 - Math.random());
        setNewsList(shuffled);
    }, []);

    useEffect(() => {
        let interval: any;
        if (step === 'PROCESSING') {
            interval = setInterval(() => {
                setNewsIndex(prev => (prev + 1) % newsList.length);
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [step, newsList]);

    // --- LÓGICA DE UPLOAD / INPUT ---
    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleProcess = async () => {
        setStep('PROCESSING');

        if (files.length > 0) {
            try {
                const prompt = `
                    ANALISE A IMAGEM E EXTRAIA **TODOS** OS DADOS DA TABELA PARA JSON.
                    
                    Retorne UM ARRAY DE OBJETOS no seguinte formato:
                    [
                      {
                        "viveiro": "string",
                        "diasCultivo": number,
                        "pMedStr": "string (ex: 5,25)",
                        "quat": number,
                        "pAntStr": "string (ex: 4,25)"
                      }
                    ]
                    
                    Instruções CRÍTICAS:
                    1. Extraia linha por linha, sem pular nenhuma.
                    2. NÃO use markdown, APENAS o JSON puro.
                `;

                const result = await processFile(files[0], prompt);

                if (Array.isArray(result)) {
                    setCurrentData(sortData(result));
                    setTimeout(() => {
                        setStep('DASHBOARD');
                        showToast(`Sucesso: ${result.length} linhas extraídas.`);
                    }, 2000);
                } else {
                    throw new Error("Resposta da IA não é um array válido.");
                }
            } catch (error: any) {
                console.error("Erro AI:", error);
                showToast(`Erro: ${error.message || 'Falha ao processar arquivo'}`);
                setStep('UPLOAD');
            }
        }

        // --- 2. PROCESSAMENTO MANUAL ---
        if (textInput.trim()) {
            try {
                const parsed = JSON.parse(textInput);
                if (Array.isArray(parsed)) setCurrentData(parsed);
            } catch (e) {
                showToast('Erro no formato JSON manual.');
            }
        } else if (files.length === 0) {
            setCurrentData(defaultRawData);
        }

    };


    const handleReset = () => {
        setStep('UPLOAD');
        setFiles([]);
        setTextInput('');
    };

    // --- LÓGICA DE EDIÇÃO ---
    // --- LÓGICA DE EDIÇÃO E CÁLCULOS ---

    // Helper de Ordenação (OC-01, OC-02...)
    // Helper de Ordenação (OC-01, OC-02... VP-01...)
    const sortData = (data: any[]) => {
        return [...data].sort((a, b) => {
            // Extrai prefixo (letras) e número
            const getParts = (str: string) => {
                const clean = str.toUpperCase().replace(/\s+/g, '');
                const match = clean.match(/^([A-Z]+)-?(\d+)/);
                if (match) {
                    return { prefix: match[1], num: parseInt(match[2]) };
                }
                return { prefix: clean, num: 9999 };
            };

            const partA = getParts(a.viveiro);
            const partB = getParts(b.viveiro);

            if (partA.prefix !== partB.prefix) {
                return partA.prefix.localeCompare(partB.prefix);
            }
            return partA.num - partB.num;
        });
    };

    const handleUpdateRow = (viveiroKey: string, field: 'pMedStr' | 'quat' | 'pesoTotalStr' | 'pAntStr' | 'dataPovoamento', value: string | number | null) => {
        setCurrentData(prev => {
            let updated = prev.map(item => {
                if (item.viveiro === viveiroKey) {
                    const newItem = { ...item, [field]: value };

                    // Auto-Cálculo de DIAS se mudar Data Povoamento
                    if (field === 'dataPovoamento' && value) {
                        try {
                            const pDate = new Date(value as string);
                            // Validar se data é válida antes de calcular
                            if (!isNaN(pDate.getTime())) {
                                const today = new Date();
                                const diffTime = Math.abs(today.getTime() - pDate.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                newItem.diasCultivo = diffDays;
                            }
                        } catch (e) {
                            console.warn("Data inválida para cálculo", value);
                        }
                    }
                    return newItem;
                }
                return item;
            });
            // Sempre mantem ordenado
            return sortData(updated);
        });
    };

    // --- UTILS DE CÓPIA ---
    const handleCopy = (text: string | number | null, label: string) => {
        if (!text || text === '-' || text === 'N/A') return;
        const val = String(text);
        navigator.clipboard.writeText(val).then(() => {
            showToast(`${label} copiado: ${val}`);
        });
    };

    // --- MOTOR DE CÁLCULO ZOOTÉCNICO (SENIOR ANALYST) ---

    // Função de Interpolação Linear para calcular metas exatas entre dias tabelados
    const calculateTargets = (doc: number) => {
        // Tabela atualizada com 6 categorias
        const initial = { espetacular: 0, otimo: 0, bom: 0, regular: 0, ruim: 0, pessimo: 0 };
        if (doc <= 0) return initial;

        // Se o dia for menor que o primeiro da tabela (30), interpola do zero
        if (doc < GROWTH_TABLE[0].day) {
            const ratio = doc / GROWTH_TABLE[0].day;
            return {
                espetacular: GROWTH_TABLE[0].espetacular * ratio,
                otimo: GROWTH_TABLE[0].otimo * ratio,
                bom: GROWTH_TABLE[0].bom * ratio,
                regular: GROWTH_TABLE[0].regular * ratio,
                ruim: GROWTH_TABLE[0].ruim * ratio,
                pessimo: GROWTH_TABLE[0].pessimo * ratio
            };
        }

        // Se o dia for maior que o último, projeta com base na última inclinação
        if (doc >= GROWTH_TABLE[GROWTH_TABLE.length - 1].day) {
            const last = GROWTH_TABLE[GROWTH_TABLE.length - 1];
            const prev = GROWTH_TABLE[GROWTH_TABLE.length - 2];
            const ratio = (doc - last.day) / (last.day - prev.day);
            return {
                espetacular: last.espetacular + (last.espetacular - prev.espetacular) * ratio,
                otimo: last.otimo + (last.otimo - prev.otimo) * ratio,
                bom: last.bom + (last.bom - prev.bom) * ratio,
                regular: last.regular + (last.regular - prev.regular) * ratio,
                ruim: last.ruim + (last.ruim - prev.ruim) * ratio,
                pessimo: last.pessimo + (last.pessimo - prev.pessimo) * ratio
            };
        }

        // Encontra o intervalo correto
        for (let i = 0; i < GROWTH_TABLE.length - 1; i++) {
            const curr = GROWTH_TABLE[i];
            const next = GROWTH_TABLE[i + 1];

            if (doc >= curr.day && doc < next.day) {
                const range = next.day - curr.day;
                const progress = doc - curr.day;
                const percentage = progress / range;

                return {
                    espetacular: curr.espetacular + (next.espetacular - curr.espetacular) * percentage,
                    otimo: curr.otimo + (next.otimo - curr.otimo) * percentage,
                    bom: curr.bom + (next.bom - curr.bom) * percentage,
                    regular: curr.regular + (next.regular - curr.regular) * percentage,
                    ruim: curr.ruim + (next.ruim - curr.ruim) * percentage,
                    pessimo: curr.pessimo + (next.pessimo - curr.pessimo) * percentage
                };
            }
        }

        return { ...GROWTH_TABLE[0], ...initial }; // Fallback seguro
    };


    // Processamento e Classificação
    // Processamento e Classificação
    const processedData = useMemo(() => {
        // 1. Filtragem
        const filtered = currentData.filter(item =>
            safeIncludes((item.viveiro || '').toLowerCase(), filterText.toLowerCase())
        );

        // 2. Ordenação Robusta (Prefix + Number)
        const sortViveiros = (a: any, b: any) => {
            const getParts = (str: string) => {
                const clean = str.toUpperCase().replace(/\s+/g, '');
                const match = clean.match(/^([A-Z]+)-?(\d+)/);
                if (match) {
                    return { prefix: match[1], num: parseInt(match[2]) };
                }
                return { prefix: clean, num: 9999 };
            };
            const partA = getParts(a.viveiro || '');
            const partB = getParts(b.viveiro || '');

            if (partA.prefix !== partB.prefix) {
                return partA.prefix.localeCompare(partB.prefix);
            }
            return partA.num - partB.num;
        };

        const sortedData = [...filtered].sort(sortViveiros);

        const processed = sortedData.map(item => {
            let pMed = null;
            if (typeof item.pMedStr === 'string') {
                pMed = parseFloat(item.pMedStr.replace(',', '.'));
            } else if (typeof item.pMedStr === 'number') {
                pMed = item.pMedStr;
            }
            if (isNaN(pMed)) pMed = null;

            let pAnt = null;
            if (typeof item.pAntStr === 'string') {
                pAnt = parseFloat(item.pAntStr.replace(',', '.'));
            } else if (typeof item.pAntStr === 'number') {
                pAnt = item.pAntStr;
            }
            if (isNaN(pAnt)) pAnt = null;

            let quat = null;
            const qVal = item.quat;
            if (typeof qVal === 'string') {
                quat = parseFloat(qVal.replace(',', '.'));
            } else if (typeof qVal === 'number') {
                quat = qVal;
            }
            if (isNaN(quat)) quat = null;

            let incSemanal = 0;
            let gpd = 0;
            let gpdDisplay = "-";

            if (pMed !== null && pAnt !== null) {
                incSemanal = pMed - pAnt;
                gpd = incSemanal / 7;
                gpdDisplay = gpd.toFixed(3);
            }

            // Análise Combinada com Nova Tabela
            let analysisStatus = "Aguardando";
            let rowBgColor = "";
            let statusTextColor = "text-gray-400";

            if (pMed !== null && item.diasCultivo) {
                const doc = item.diasCultivo;
                const targets = calculateTargets(doc);

                // CLASSIFICAÇÃO ATUALIZADA (6 NÍVEIS)
                if (pMed >= targets.espetacular) {
                    analysisStatus = `🟣 ESPETACULAR: Topo de Linha! (> ${targets.espetacular.toFixed(2)}g)`;
                    rowBgColor = "bg-purple-50 hover:bg-purple-100";
                    statusTextColor = "text-purple-900 font-extrabold";
                } else if (pMed >= targets.otimo) {
                    analysisStatus = `🟢 ÓTIMO: Acima da meta (${targets.otimo.toFixed(2)}g)`;
                    rowBgColor = "bg-[#d1e7dd] hover:bg-green-200";
                    statusTextColor = "text-green-900 font-bold";
                } else if (pMed >= targets.bom) {
                    analysisStatus = `🔵 BOM: Dentro do esperado.`;
                    rowBgColor = "bg-blue-50 hover:bg-blue-100";
                    statusTextColor = "text-blue-900 font-bold";
                } else if (pMed >= targets.regular) {
                    analysisStatus = `🟡 REGULAR: Atenção (${targets.regular.toFixed(2)}g)`;
                    rowBgColor = "bg-yellow-50 hover:bg-yellow-100";
                    statusTextColor = "text-yellow-800 font-bold";
                } else if (pMed >= targets.ruim) {
                    analysisStatus = `🟠 RUIM: Abaixo da média (< ${targets.regular.toFixed(2)}g)`;
                    rowBgColor = "bg-orange-50 hover:bg-orange-100";
                    statusTextColor = "text-orange-800 font-bold";
                } else {
                    analysisStatus = `⚫ PÉSSIMO: Crítico (< ${targets.ruim.toFixed(2)}g)`;
                    rowBgColor = "bg-[#f8d7da] hover:bg-red-200";
                    statusTextColor = "text-red-900 font-bold";
                }

            } else if (pMed === null) {
                analysisStatus = "Sem leitura";
            }

            let pesoTotal = "N/A";
            if (item.pesoTotalStr) {
                pesoTotal = item.pesoTotalStr;
            } else if (pMed !== null && quat !== null) {
                pesoTotal = (pMed * quat).toFixed(2);
            }

            const incSemanalStr = incSemanal !== 0 ? (incSemanal > 0 ? `+${incSemanal.toFixed(2)}` : incSemanal.toFixed(2)) : "-";

            return {
                ...item,
                pMedInputValue: item.pMedStr || '',
                quatInputValue: item.quat || '',
                pesoTotalInputValue: item.pesoTotalStr || pesoTotal,
                pMedDisplay: item.pMedStr || '-',
                pAntDisplay: item.pAntStr || '-',
                diasCultivoDisplay: item.diasCultivo ?? '-',
                pesoTotal,
                incSemanalStr,
                gpdDisplay,
                analysisStatus,
                rowBgColor,
                statusTextColor,
                hasBiometrics: pMed !== null && pMed > 0
            };
        });

        return processed.filter(item => item.hasBiometrics);
    }, [currentData]);



    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => { if (ev.target?.result) setLogo(ev.target.result as string); };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const showToast = (msg: string) => {
        setToast({ msg, visible: true });
        setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    };

    // --- EXPORTAÇÃO ---
    const exportPDF = () => {
        if (!dashboardRef.current) return;
        showToast('Gerando PDF Inteligente...');

        dashboardRef.current.classList.add('printing');
        document.body.classList.add('printing');

        const opt = {
            margin: [5, 5, 5, 5] as [number, number, number, number],
            filename: `Relatorio_Bio_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                ignoreElements: (element: Element) => {
                    const hasIgnoreClass = element.classList.contains('no-print');
                    return hasIgnoreClass;
                }
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
        };

        html2pdf().set(opt).from(dashboardRef.current).save().then(() => {
            dashboardRef.current?.classList.remove('printing');
            document.body.classList.remove('printing');
            showToast('PDF Gerado!');
        });
    };

    const exportPNG = () => {
        if (!dashboardRef.current) return;
        showToast('Gerando Imagem...');
        dashboardRef.current.classList.add('printing');
        document.body.classList.add('printing');

        html2canvas(dashboardRef.current, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#ffffff',
            ignoreElements: (element: Element) => {
                const hasIgnoreClass = element.classList.contains('no-print');
                return hasIgnoreClass;
            }
        }).then(canvas => {
            const link = document.createElement('a');
            link.download = `Relatorio_Bio_${new Date().toLocaleDateString('pt-BR')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            dashboardRef.current?.classList.remove('printing');
            document.body.classList.remove('printing');
            showToast('Imagem Gerada!');
        });
    };

    const copyHTML = () => {
        if (!dashboardRef.current) return;
        navigator.clipboard.writeText(dashboardRef.current.outerHTML).then(() => showToast('HTML Copiado!'));
    };

    // --- RENDERIZADORES ---



    const renderUploadScreen = () => (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">

            <div className="absolute top-0 right-0">
                {/* Manual Key Config Removed for Security */}
            </div>

            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">Análise de Performance Biológica</h1>
                <p className="text-gray-500">Avaliação avançada: <span className="text-indigo-600 font-bold">Histórico de Peso</span> vs <span className="text-indigo-600 font-bold">Velocidade (GPD)</span>.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="p-10 border-b border-gray-100 flex flex-col items-center justify-center text-center hover:bg-orange-50/30 cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop}>
                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
                        <span className="text-4xl">🦐</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Importar Biometria</h3>
                    <p className="text-sm text-gray-500 mb-6">Arraste a foto do boletim ou planilha.</p>
                    <label className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 cursor-pointer shadow-sm">
                        Selecionar Arquivos <input type="file" multiple className="hidden" onChange={handleFileSelect} />
                    </label>
                </div>
                {files.length > 0 && (
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                        {files.map((file, idx) => (
                            <div key={idx} className="flex justify-between bg-white p-3 rounded mb-2 border">
                                <span className="text-sm font-bold">{file.name}</span>
                                <button onClick={() => removeFile(idx)} className="text-red-500 font-bold">X</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="p-6 bg-white border-t border-gray-200 flex justify-end">
                    <button onClick={handleProcess} className="px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg flex items-center gap-2">
                        <span>Processar Análise</span>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="flex flex-col items-center justify-center min-h-[400px] animate-in fade-in duration-500 px-6">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-3xl pb-1">🦐</div>
            </div>

            <div className="max-w-xl text-center">
                <div className="mb-4">
                    <span className="inline-block bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                        Atualização do Setor
                    </span>
                </div>
                {/* NOTÍCIA DINÂMICA */}
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 leading-snug transition-all duration-300 min-h-[90px] flex items-center justify-center">
                    "{newsList[newsIndex]}"
                </h2>
                <div className="flex gap-2 justify-center mt-8">
                    {newsList.slice(0, 5).map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === (newsIndex % 5) ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200'}`} />
                    ))}
                </div>
                <p className="text-gray-400 text-xs mt-8 font-medium">Calculando curvas de crescimento, Incremento Semanal e GPD...</p>
            </div>
        </div>
    );

    const renderDashboard = () => (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* INJECTED STYLES FOR EXPORT */}
            <style>{`
                .printing .print-visible { display: block !important; }
                .printing .print-hidden { display: none !important; }
                .print-visible { display: none; }
            `}</style>

            <div className="mb-6 flex justify-between items-center no-print">
                <button onClick={handleReset} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white px-4 py-2 rounded-lg border shadow-sm">
                    Inserir Novos Dados
                </button>
            </div>

            <div id="dashboard-content" ref={dashboardRef} className="w-full max-w-5xl mx-auto bg-white rounded-3xl shadow-xl border border-orange-100 overflow-hidden relative">

                {/* --- HEADER --- */}
                {/* --- HEADER (SPEC COMPLIANT) --- */}
                <header className="bg-[#FFF8F2] px-[12mm] py-[12mm] border-b border-orange-100 flex items-center justify-between h-[80mm] md:h-auto box-border gap-4">

                    {/* 1. Coluna Esquerda: Logo (25%) */}
                    <div className="flex-1 flex justify-start items-center min-w-0">
                        {logo ? (
                            <div className="relative group max-w-[90%]">
                                <img src={logo} alt="Logo" className="h-20 w-auto object-contain mix-blend-multiply" />
                                <label
                                    htmlFor="logo-upload"
                                    className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center rounded transition-opacity no-print"
                                    data-html2canvas-ignore="true"
                                >
                                    <span className="text-[9px] bg-white px-2 py-1 rounded shadow-sm text-gray-600 font-medium whitespace-nowrap">Alterar Logo</span>
                                </label>
                                <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                            </div>
                        ) : null}
                    </div>

                    {/* 2. Coluna Central: Título e Subtítulo (50%) */}
                    <div className="flex-[2] flex flex-col items-center justify-center text-center min-w-0 px-4">
                        <div className="flex items-center gap-2 mb-2 no-print opacity-50">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Relatório Técnico</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-gray-400">{new Date().toLocaleDateString('pt-BR')}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-[#0F1B2D] tracking-tight leading-none mb-2" style={{ fontFamily: "'Poppins', 'Montserrat', sans-serif" }}>
                            BIOMETRIA
                        </h1>
                        <p className="text-sm md:text-base font-semibold text-[#FF8A4B] uppercase tracking-wide" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                            Análise de Performance
                        </p>
                    </div>

                    {/* 3. Coluna Direita: Nomes e Funções (25%) */}
                    {/* 3. Coluna Direita: Nomes e Funções (25%) */}
                    <div className="flex-1 flex flex-col items-end justify-center text-right gap-[8px] min-w-0" style={{ fontFamily: "'Inter', sans-serif" }}>
                        <p className="text-right leading-none">
                            <span className="text-[11px] text-[#7A7A7A] font-normal">Gerente: </span>
                            <span className="text-[13px] text-[#0F1B2D] font-bold ml-1">Cleiton Manoel de Lima</span>
                        </p>
                        <p className="text-right leading-none">
                            <span className="text-[11px] text-[#7A7A7A] font-normal">Analista Adm: </span>
                            <span className="text-[13px] text-[#0F1B2D] font-bold ml-1">Luanthony L. Oliveira</span>
                        </p>
                    </div>

                </header>

                {/* Tabela Principal */}
                <main className="p-6 bg-white">
                    <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-orange-50 text-orange-800 uppercase font-bold border-b border-orange-100">
                                <tr>
                                    <th className="px-4 py-3 min-w-[80px]">
                                        <div className="flex flex-col gap-1">
                                            <span>VIV.</span>
                                            <input
                                                type="text"
                                                placeholder="Filtrar..."
                                                className="w-full text-[10px] p-1 rounded border border-orange-200 focus:outline-none focus:border-orange-500 font-normal normal-case text-gray-600 placeholder-gray-400 print-hidden"
                                                value={filterText}
                                                onChange={(e) => setFilterText(e.target.value)}
                                            />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-center bg-orange-100/50 min-w-[110px]">D. POV</th>
                                    <th className="px-4 py-3 text-center">DIAS</th>
                                    <th className="px-4 py-3 text-right min-w-[100px]">P.M (g)</th>
                                    <th className="px-4 py-3 text-right">QUANT.</th>
                                    <th className="px-4 py-3 text-right text-gray-600 bg-gray-50">PESO TOTAL</th>
                                    <th className="px-4 py-3 text-right text-gray-400">P.M ANT</th>
                                    <th className="px-4 py-3 text-right text-gray-700 bg-gray-50" title="Incremento Semanal">Inc. Sem.</th>
                                    <th className="px-4 py-3 text-right text-indigo-700">GPD (g/dia)</th>
                                    <th className="px-4 py-3 w-1/3">Status Analysis</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {processedData.map((item, idx) => (
                                    <tr key={idx} className={`${item.rowBgColor} transition-colors border-b border-gray-50 last:border-0`}>
                                        <td className="px-4 py-3 font-bold text-gray-800">{item.viveiro}</td>

                                        {/* DATA POVOAMENTO (Novo Input) */}
                                        <td className="px-2 py-3 text-center bg-orange-50/30">
                                            <input
                                                type="text"
                                                placeholder="DD/MM/AAAA"
                                                maxLength={10}
                                                className="w-full text-center bg-white text-sm font-bold text-gray-900 border border-gray-400 rounded focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none h-9 px-1 shadow-sm placeholder-gray-300"
                                                value={item.dataPovoamento ? item.dataPovoamento.split('-').reverse().join('/') : ''}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                                                    if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5);

                                                    if (val.length === 10) {
                                                        const [d, m, y] = val.split('/');
                                                        const iso = `${y}-${m}-${d}`;
                                                        if (!isNaN(new Date(iso).getTime())) {
                                                            handleUpdateRow(item.viveiro, 'dataPovoamento', iso);
                                                        } else {
                                                            handleUpdateRow(item.viveiro, 'dataPovoamento', val);
                                                        }
                                                    } else {
                                                        handleUpdateRow(item.viveiro, 'dataPovoamento', val);
                                                    }
                                                }}
                                            />
                                        </td>

                                        <td className="px-4 py-3 text-center font-mono font-bold text-gray-600 bg-gray-50">{item.diasCultivo}</td>

                                        {/* Input Editável Peso */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="print-visible font-mono font-extrabold text-black text-sm">
                                                {item.pMedInputValue}
                                            </div>
                                            <input
                                                type="text"
                                                value={item.pMedInputValue}
                                                onChange={(e) => handleUpdateRow(item.viveiro, 'pMedStr', e.target.value)}
                                                className="print-hidden w-full text-right bg-transparent font-extrabold text-black outline-none border-b border-transparent focus:border-orange-500"
                                            />
                                        </td>

                                        {/* QUANTIDADE (Input Editável) */}
                                        <td className="px-4 py-3 text-right">
                                            <div className="print-visible font-mono font-bold text-gray-700 text-sm">
                                                {item.quatInputValue}
                                            </div>
                                            <input
                                                type="text"
                                                value={item.quatInputValue}
                                                onChange={(e) => handleUpdateRow(item.viveiro, 'quat', e.target.value)}
                                                className="print-hidden w-full text-right bg-transparent font-bold text-gray-700 outline-none border-b border-transparent focus:border-orange-500"
                                            />
                                        </td>

                                        {/* PESO TOTAL (Editável) */}
                                        <td className="px-4 py-3 text-right bg-gray-50/50">
                                            <div className="print-visible font-mono font-bold text-gray-600 text-sm">
                                                {item.pesoTotal}
                                            </div>
                                            <input
                                                type="text"
                                                value={item.pesoTotalInputValue}
                                                onChange={(e) => handleUpdateRow(item.viveiro, 'pesoTotalStr', e.target.value)}
                                                className="print-hidden w-full text-right bg-transparent font-bold text-gray-600 outline-none border-b border-transparent focus:border-orange-500"
                                            />
                                        </td>

                                        {/* P.M ANTERIOR (Agora Editável) */}
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="text"
                                                value={item.pAntStr || ''}
                                                onChange={(e) => handleUpdateRow(item.viveiro, 'pAntStr', e.target.value)}
                                                className="print-hidden w-full text-right bg-transparent font-mono text-gray-500 outline-none border-b border-transparent focus:border-orange-500 hover:border-gray-200 transaction-colors"
                                                placeholder="-"
                                            />
                                            <span className="print-visible hidden">{item.pAntDisplay}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 bg-gray-50/50">{item.incSemanalStr}</td>
                                        <td className="px-4 py-3 text-right font-mono font-black text-indigo-700 text-sm">{item.gpdDisplay}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] uppercase tracking-wide font-bold ${item.statusTextColor}`}>
                                                {item.analysisStatus}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-4 flex flex-col md:flex-row justify-between gap-4 text-[10px] text-gray-500 bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="font-bold text-gray-700 mb-1">Legenda de Status</p>
                                <div className="flex flex-wrap gap-3">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-200 border border-purple-400"></div> Espetacular</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#d1e7dd] border border-green-300"></div> Ótimo</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-100 border border-blue-300"></div> Bom</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-100 border border-yellow-300"></div> Regular</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-100 border border-orange-300"></div> Ruim</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-100 border border-red-300"></div> Péssimo</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <button
                                onClick={() => setShowReferenceTable(!showReferenceTable)}
                                className="text-indigo-600 font-bold hover:underline mb-1 no-print"
                            >
                                {showReferenceTable ? 'Ocultar Tabela de Metas' : 'Ver Tabela de Metas'}
                            </button>
                            <p className="text-gray-400">Classificação baseada em tabela de crescimento padrão.</p>
                        </div>
                    </div>

                    {/* Tabela de Referência (Toggle) */}
                    {showReferenceTable && (
                        <div className="mt-4 animate-in slide-in-from-top-2">
                            <h4 className="text-xs font-bold text-gray-700 uppercase mb-2 text-center">Tabela de Referência de Crescimento (Peso em Gramas)</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-center border-collapse border border-gray-200">
                                    <thead className="bg-gray-100 text-gray-600">
                                        <tr>
                                            <th className="border border-gray-200 p-1">Dias</th>
                                            <th className="border border-gray-200 p-1 bg-purple-50 text-purple-800">Espetacular</th>
                                            <th className="border border-gray-200 p-1 bg-green-50 text-green-800">Ótimo</th>
                                            <th className="border border-gray-200 p-1 bg-blue-50 text-blue-800">Bom</th>
                                            <th className="border border-gray-200 p-1 bg-yellow-50 text-yellow-800">Regular</th>
                                            <th className="border border-gray-200 p-1 bg-orange-50 text-orange-800">Ruim</th>
                                            <th className="border border-gray-200 p-1 bg-red-50 text-red-800">Péssimo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {GROWTH_TABLE.map((row) => (
                                            <tr key={row.day} className="hover:bg-gray-50">
                                                <td className="border border-gray-200 p-1 font-bold">{row.day}</td>
                                                <td className="border border-gray-200 p-1">{row.espetacular.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.otimo.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.bom.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.regular.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.ruim.toFixed(2)}</td>
                                                <td className="border border-gray-200 p-1">{row.pessimo.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- ACTION BUTTONS FOOTER --- */}
                    <div className="mt-8 border-t border-gray-100 pt-6 flex flex-wrap justify-center gap-3 no-print" data-html2canvas-ignore="true">
                        <button
                            onClick={saveBackup}
                            className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-2 shadow-sm"
                            title="Baixar backup dos dados (JSON)"
                        >
                            <span>💾</span> Salvar Backup
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-2 shadow-sm"
                                title="Carregar backup dos dados (JSON)"
                            >
                                <span>📂</span> Carregar Backup
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="application/json"
                                onChange={loadBackup}
                            />
                        </div>

                        <div className="w-px h-8 bg-gray-200 mx-2 hidden md:block"></div>

                        <button onClick={exportPDF} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                            📄 PDF
                        </button>
                        <button onClick={exportPNG} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                            🖼️ PNG
                        </button>
                        <button onClick={copyHTML} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
                            🌐 HTML
                        </button>
                    </div>

                </main>
                <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                    <p className="text-[10px] text-gray-400 font-mono opacity-60">
                        Sistema Integrado de Gestão • v2.0 (Backup & Input) • Conectado ao GitHub
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full">
            {step === 'UPLOAD' && renderUploadScreen()}
            {step === 'PROCESSING' && renderProcessing()}
            {step === 'DASHBOARD' && renderDashboard()}

            {/* Toast Notification */}
            {toast.visible && (
                <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 z-50 flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    {toast.msg}
                </div>
            )}
        </div>
    );
};
