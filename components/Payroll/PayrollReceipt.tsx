
import React from 'react';
import { PayrollHistoryItem, Company, RegistryEmployee } from '../../types';
import { numberToWordsBRL } from '../../utils';

interface PayrollReceiptProps {
    item: PayrollHistoryItem;
    activeCompany: Company;
    registeredEmployees: RegistryEmployee[];
    formatCurrency: (val: number) => string;
    generateSmartSummary: (item: PayrollHistoryItem) => string;
}

export const PayrollReceipt: React.FC<PayrollReceiptProps> = ({
    item, activeCompany, registeredEmployees, formatCurrency, generateSmartSummary
}) => {
    const employeeRegistry = registeredEmployees.find(re => re.name.toLowerCase() === item.input.employeeName.toLowerCase());

    const renderVia = (title: string) => (
        <div className="bg-white border-[1px] border-slate-300 p-8 rounded-sm relative print:border-[1px]">
            <div className="flex flex-col items-center gap-2 mb-6 text-center">
                {activeCompany.logoUrl && <img src={activeCompany.logoUrl} alt="Logo" className="h-10 w-auto object-contain mb-2" />}
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recibo de Pagamento</h1>
                <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase italic">{title}</span>
                    <div className="border border-slate-300 px-3 py-1 rounded font-black text-slate-900 text-base">{formatCurrency(item.result.grossSalary)}</div>
                </div>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-justify text-slate-800">
                <p>Recebi de <strong className="font-black uppercase">{activeCompany.name}</strong>{activeCompany.cnpj && <> – CNPJ <span className="font-mono">{activeCompany.cnpj}</span></>}, a importância de <strong className="font-bold"> {numberToWordsBRL(item.result.grossSalary).toUpperCase()}</strong>, referente à <strong className="font-bold">{generateSmartSummary(item)}</strong>.</p>
                <p>Para maior clareza, firmo o presente recibo, que comprova o recebimento integral do valor mencionado, concedendo <strong className="font-bold">quitação plena, geral e irrevogável</strong> pela quantia recebida.</p>
                <p className="text-[12px]">Pagamento recebido por <strong className="font-bold">{item.input.employeeName}</strong> através da chave Pix: <strong className="font-mono">{item.input.pixKey}</strong>, {item.input.bankName}.</p>
                <div className="text-right italic text-slate-500 font-medium uppercase text-[11px] mt-6">CANAVIEIRAS, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                <div className="mt-8 pt-4 border-t border-slate-300 flex flex-col items-center">
                    <p className="font-black uppercase text-sm tracking-tight">{item.input.employeeName}</p>
                    <div className="flex gap-4 text-[10px] text-slate-500 italic mt-1 font-mono">
                        {employeeRegistry?.cpf && <span>CPF: {employeeRegistry.cpf}</span>}
                        {employeeRegistry?.phone && <span>{employeeRegistry.phone}</span>}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div id="receipt-content" className="bg-white shadow-2xl print:shadow-none w-[210mm] min-h-[297mm] p-[15mm] space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
                {renderVia("1ª VIA")}
                <div className="border-t-[1px] border-dashed border-slate-300 my-4 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] text-slate-300 font-bold uppercase italic">Corte aqui</div>
                </div>
                {renderVia("2ª VIA")}
            </div>
        </div>
    );
};
