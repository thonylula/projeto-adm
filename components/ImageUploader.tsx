import React, { useState } from 'react';

interface ImageUploaderProps {
    onFilesReady: (files: File[]) => void;
    disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesReady, disabled }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (!disabled && e.dataTransfer.files.length > 0) {
            onFilesReady(Array.from(e.dataTransfer.files));
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        if (!disabled && e.clipboardData.files.length > 0) {
            onFilesReady(Array.from(e.clipboardData.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!disabled && e.target.files && e.target.files.length > 0) {
            onFilesReady(Array.from(e.target.files));
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isDragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <input
                type="file"
                multiple
                onChange={handleFileInput}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                accept="image/*,application/pdf"
            />
            <div className="flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-indigo-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                    <span className="text-indigo-600">Arraste, cole</span> ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500">PNG, JPG ou PDF (Máx. 50MB)</p>
            </div>
        </div>
    );
};
