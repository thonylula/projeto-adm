import React, { useState, useCallback, useEffect } from 'react';
import { extractInvoiceData } from '../services/geminiService';
import type { InvoiceData } from '../types';
import { ImageUploader } from './ImageUploader';
import { InvoiceSummary } from './InvoiceSummary';
import { SignatureSheet } from './SignatureSheet';
import { PantryList } from './PantryList';
import { ReceiptIcon, SignatureIcon, BasketIcon } from './icons';

type Tab = 'summary' | 'signature' | 'pantry';

const employeeNames = [
    "Albervan Souza Nobre", "Claudinei conceição dos Santos", "Cristiano Almeida dos Santos",
    "Edinaldo Santos de Oliveira", "Evaldo Santos de Jesus", "Flonilto dos Santos Reis.",
    "Gabriel Santos costa", "Jonh Pablo Henrique Dos Santos Dias", "Luis Pablo dos Santos Dias",
    "Márcio Marques leite", "Mateus Borges santos", "Wesley Silva dos Santos", "Luanthony Lula Oliveira"
];

const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            if (!event.target?.result) {
                return reject(new Error('Failed to read file.'));
            }
            const img = new Image();
            img.src = event.target.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Failed to get canvas context.'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg', // Force jpeg for compression
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', 0.9); // Use quality 0.9 to compress
            };
            img.onerror = (err) => reject(new Error('Failed to load image. It might be corrupted.'));
        };
        reader.onerror = (err) => reject(new Error('Failed to read file.'));
    });
};

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

const fileToBase64 = async (file: File): Promise<{ base64: string, mimeType: string }> => {
    let fileToProcess = file;

    // If file exceeds the limit, and it's an image, try to resize it.
    if (file.size > MAX_FILE_SIZE_BYTES && file.type.startsWith('image/')) {
        try {
            console.log(`Image ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)} MB), attempting to resize.`);
            fileToProcess = await resizeImage(file, 2048, 2048); // Resize to max 2048x2048
            console.log(`Resized image size: ${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB`);
        } catch (error) {
            console.error("Image resize failed:", error);
            throw new Error(`A imagem '${file.name}' é muito grande e falhou ao ser redimensionada. Verifique se o arquivo não está corrompido.`);
        }
    }

    // After potential resizing, check if the file is within the API limit.
    if (fileToProcess.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`O arquivo '${fileToProcess.name}' é muito grande (${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB). O limite é de 50 MB.`);
    }

    // Proceed with base64 conversion
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileToProcess);
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            resolve({ base64: base64String, mimeType: fileToProcess.type });
        };
        reader.onerror = error => reject(error);
    });
};

export const CestasBasicas: React.FC = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const [companyLogoBase64, setCompanyLogoBase64] = useState<string | null>(null);
    const [sloganImageBase64, setSloganImageBase64] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('summary');

    useEffect(() => {
        if (invoiceData?.recipientName) {
            setCompanyName(invoiceData.recipientName);
        }
    }, [invoiceData]);

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setCompanyLogoBase64(reader.result as string);
            };
            reader.onerror = () => {
                setError('Falha ao carregar o logo.');
                setCompanyLogoBase64(null);
            }
        } else {
            setCompanyLogoBase64(null);
        }
    };

    const handleSloganImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                setSloganImageBase64(reader.result as string);
            };
            reader.onerror = () => {
                setError('Falha ao carregar a imagem do slogan.');
                setSloganImageBase64(null);
            }
        } else {
            setSloganImageBase64(null);
        }
    };


    const handleFilesReady = useCallback((selectedFiles: File[]) => {
        setFiles(selectedFiles);
        setInvoiceData(null);
        setError(null);
        setActiveTab('summary');
        setCompanyName('');
        setSloganImageBase64(null);
        setCompanyLogoBase64(null);
    }, []);

    const processInvoices = async () => {
        if (files.length === 0) {
            setError('Por favor, carregue pelo menos um arquivo de nota fiscal.');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const fileContents = await Promise.all(files.map(fileToBase64));
            const results = await Promise.all(
                fileContents.map(fc => extractInvoiceData(fc.base64, fc.mimeType))
            );

            if (results.length > 0) {
                const aggregatedData: InvoiceData = {
                    ...results[0], // Use first invoice for base metadata
                    totalValue: results.reduce((sum, data) => sum + data.totalValue, 0),
                    items: results.flatMap(data => data.items)
                };
                setInvoiceData(aggregatedData);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido durante o processamento.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const TabButton: React.FC<{ tabName: Tab, icon: React.ReactNode, label: string }> = ({ tabName, icon, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${activeTab === tabName
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-indigo-100 hover:text-indigo-700'
                }`}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <ReceiptIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">
                            Cestas Básicas
                        </h1>
                        <p className="text-gray-500 text-sm">Gerencie o recebimento e distribuição de cestas através de notas fiscais.</p>
                    </div>
                </div>
            </header>

            <main className="space-y-6">
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Carregar Notas Fiscais</h2>
                    <p className="text-gray-500 mb-6 text-sm">Carregue um ou mais arquivos de nota fiscal (imagem ou PDF) para iniciar.</p>

                    <div className="grid lg:grid-cols-2 gap-8 items-start">
                        <ImageUploader onFilesReady={handleFilesReady} disabled={isLoading} />

                        <div className="space-y-6">
                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={processInvoices}
                                    disabled={files.length === 0 || isLoading}
                                    className="w-full bg-indigo-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg shadow-indigo-600/20 disabled:shadow-none"
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processando com IA...
                                        </div>
                                    ) : `Analisar ${files.length > 0 ? files.length : ''} Nota(s) Fiscal(ais)`}
                                </button>
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center gap-3 text-red-600 text-sm font-medium">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                        </svg>
                                        {error}
                                    </div>
                                )}
                            </div>

                            {invoiceData && (
                                <div className="space-y-6 pt-6 border-t border-slate-100">
                                    <div>
                                        <label htmlFor="companyName" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Nome da Empresa</label>
                                        <input
                                            type="text"
                                            id="companyName"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Nome exibido na impressão"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-700 transition-all"
                                        />
                                    </div>

                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Logo (Opcional)</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={handleLogoChange}
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="h-12 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all overflow-hidden">
                                                    {companyLogoBase64 ? (
                                                        <img src={companyLogoBase64} alt="Logo" className="h-full w-auto object-contain p-1" />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Carregar Logo</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Slogan (Opcional)</label>
                                            <div className="relative group">
                                                <input
                                                    type="file"
                                                    onChange={handleSloganImageChange}
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="h-12 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center bg-slate-50 group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-all overflow-hidden">
                                                    {sloganImageBase64 ? (
                                                        <img src={sloganImageBase64} alt="Slogan" className="h-full w-auto object-contain p-1" />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">Carregar Slogan</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {invoiceData && (
                    <div className="space-y-6">
                        <div className="flex flex-wrap justify-center gap-3 bg-white p-2 rounded-2xl shadow-lg border border-slate-100 sticky top-4 z-40">
                            <TabButton tabName="summary" icon={<ReceiptIcon className="w-5 h-5" />} label="Resumo Financeiro" />
                            <TabButton tabName="signature" icon={<SignatureIcon className="w-5 h-5" />} label="Folha de Assinaturas" />
                            <TabButton tabName="pantry" icon={<BasketIcon className="w-5 h-5" />} label="Conferência / Logística" />
                        </div>

                        <div className="animate-in fade-in zoom-in-95 duration-500">
                            {activeTab === 'summary' && <InvoiceSummary data={invoiceData} companyName={companyName} recipientCnpj={invoiceData.recipientCnpj} sloganImage={sloganImageBase64} companyLogo={companyLogoBase64} />}
                            {activeTab === 'signature' && <SignatureSheet employeeNames={employeeNames} companyName={companyName} recipientCnpj={invoiceData.recipientCnpj} sloganImage={sloganImageBase64} companyLogo={companyLogoBase64} />}
                            {activeTab === 'pantry' && <PantryList data={invoiceData} employeeNames={employeeNames} sloganImage={sloganImageBase64} companyName={companyName} recipientCnpj={invoiceData.recipientCnpj} companyLogo={companyLogoBase64} />}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default CestasBasicas;
