
import React, { useState } from 'react';
import { Company } from '../types';

interface CompanySelectionProps {
  companies: Company[];
  onAddCompany: (name: string, cnpj: string | undefined, logoUrl: string | null) => void;
  onUpdateCompany: (company: Company) => void;
  onDeleteCompany: (companyId: string) => void;
  onSelectCompany: (companyId: string) => void;
  title?: string;
  description?: string;
  buttonText?: string;
}

export const CompanySelection: React.FC<CompanySelectionProps> = ({
  companies,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onSelectCompany,
  title = "Gestão de Folha de Pagamento",
  description = "Selecione uma empresa ou cadastre uma nova para começar.",
  buttonText = "Gerenciar Folha"
}) => {
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyCnpj, setNewCompanyCnpj] = useState('');
  const [newCompanyLogo, setNewCompanyLogo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    if (editingId) {
      const companyToUpdate = companies.find(c => c.id === editingId);
      if (companyToUpdate) {
        onUpdateCompany({
          ...companyToUpdate,
          name: newCompanyName,
          cnpj: newCompanyCnpj,
          logoUrl: newCompanyLogo
        });
      }
      setEditingId(null);
    } else {
      onAddCompany(newCompanyName, newCompanyCnpj, newCompanyLogo);
    }

    setNewCompanyName('');
    setNewCompanyCnpj('');
    setNewCompanyLogo(null);
  };

  const handleEdit = (company: Company) => {
    setEditingId(company.id);
    setNewCompanyName(company.name);
    setNewCompanyCnpj(company.cnpj || '');
    setNewCompanyLogo(company.logoUrl);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewCompanyName('');
    setNewCompanyCnpj('');
    setNewCompanyLogo(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500">{description}</p>
      </div>

      {/* Cadastro de Empresa */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-indigo-600">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {editingId ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label htmlFor="newCompanyName" className="block text-sm font-medium text-slate-700 mb-1">
              Nome da Empresa
            </label>
            <input
              type="text"
              id="newCompanyName"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="block w-full px-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
              placeholder="Ex: Tech Corp Ltda"
            />
          </div>

          <div className="flex-1 w-full">
            <label htmlFor="newCompanyCnpj" className="block text-sm font-medium text-slate-700 mb-1">
              CNPJ
            </label>
            <input
              type="text"
              id="newCompanyCnpj"
              value={newCompanyCnpj}
              onChange={(e) => setNewCompanyCnpj(e.target.value)}
              className="block w-full px-3 py-2.5 sm:text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div className="w-full sm:w-auto flex-shrink-0">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Logo (Opcional)
            </label>
            <div className="flex items-center gap-3">
              {newCompanyLogo ? (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 bg-white">
                  <img src={newCompanyLogo} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setNewCompanyLogo(null)}
                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-xs"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label htmlFor="company-logo-upload" className="flex items-center justify-center w-10 h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <input
                    id="company-logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium rounded-lg transition-colors border border-slate-200"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className={`flex-1 sm:flex-none px-6 py-2.5 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'} text-white font-medium rounded-lg transition-colors shadow-sm`}
            >
              {editingId ? 'Salvar Alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Empresas */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Empresas Cadastradas ({companies.length})
        </h3>

        {companies.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
            <p className="text-slate-400">Nenhuma empresa cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col hover:shadow-md transition-shadow relative group/card">
                {/* Edit/Delete Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(company); }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Editar Empresa"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteCompany(company.id); }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Excluir Empresa"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden p-1">
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-lg font-bold text-slate-300">{company.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 truncate max-w-[180px]">{company.name}</h3>
                    <p className="text-xs text-slate-500">{company.employees.length} Funcionários</p>
                  </div>
                </div>

                <button
                  onClick={() => onSelectCompany(company.id)}
                  className="mt-auto w-full py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2 group"
                >
                  {buttonText}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
