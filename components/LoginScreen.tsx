
import React, { useState, useEffect } from 'react';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  
  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // UI States
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize default user if storage is empty
  useEffect(() => {
    try {
      const usersStr = localStorage.getItem('folha_users');
      if (!usersStr) {
        const defaultUsers = [{ username: 'admin', password: '1234' }];
        localStorage.setItem('folha_users', JSON.stringify(defaultUsers));
      }
    } catch (e) {
      console.error("Erro ao acessar localStorage", e);
    }
  }, []);

  const resetForm = () => {
    setError('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const switchMode = (newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    setTimeout(() => {
      try {
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem('folha_users') || '[]');
        } catch (e) {
            users = [];
        }

        if (mode === 'LOGIN') {
          const user = users.find((u: any) => u.username === username && u.password === password);
          if (user) {
            onLogin(user.username);
          } else {
            setError('Usuário ou senha incorretos.');
            setIsLoading(false);
          }
        } 
        else if (mode === 'REGISTER') {
          if (!username || !password) {
             setError('Preencha todos os campos.');
             setIsLoading(false);
             return;
          }
          if (password !== confirmPassword) {
             setError('As senhas não conferem.');
             setIsLoading(false);
             return;
          }
          if (users.find((u: any) => u.username === username)) {
             setError('Este usuário já existe.');
             setIsLoading(false);
             return;
          }

          users.push({ username, password });
          localStorage.setItem('folha_users', JSON.stringify(users));
          
          setIsLoading(false);
          setSuccessMsg('Conta criada com sucesso!');
          setTimeout(() => {
             switchMode('LOGIN');
             setPassword(''); 
          }, 1500);
        } 
        else if (mode === 'FORGOT') {
          const user = users.find((u: any) => u.username === username);
          setIsLoading(false);
          
          if (user) {
             setSuccessMsg(`Recuperação (Local): Sua senha é "${user.password}"`);
          } else {
             setError('Usuário não encontrado.');
          }
        }
      } catch (err) {
        setError('Erro interno ao processar dados.');
        setIsLoading(false);
      }
    }, 800);
  };

  // Dynamic Titles & Button Text
  let title = ''; // No title for login (using Logo)
  let subTitle = 'Entre com suas credenciais';
  let buttonText = 'Entrar no Sistema';

  if (mode === 'REGISTER') {
    title = 'Criar Conta';
    subTitle = 'Preencha os dados para cadastro';
    buttonText = 'Cadastrar';
  } else if (mode === 'FORGOT') {
    title = 'Recuperar Senha';
    subTitle = 'Informe seu usuário para recuperação';
    buttonText = 'Recuperar';
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden transition-all duration-300">
        
        {/* Header Section */}
        <div className={`px-6 pt-6 pb-4 text-center relative overflow-hidden transition-colors duration-500 ${mode === 'REGISTER' ? 'bg-orange-700' : mode === 'FORGOT' ? 'bg-slate-800' : 'bg-white'}`}>
           <div className="relative z-10">
              
              {/* Lógica de Exibição da Logo/Ícone */}
              {mode === 'LOGIN' ? (
                  // MODO LOGIN: Imagem PNG do Google Drive (Link Direto Atualizado)
                  <div className="w-full flex justify-center items-center mb-4">
                      <img 
                        src="https://lh3.googleusercontent.com/d/1dxnfHKS09Mu424q1TiXUcUB6WJhAjWrG" 
                        alt="Logo Carapitanga" 
                        className="w-[150px] h-[150px] object-contain drop-shadow-md hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                             parent.innerHTML = '<div class="flex flex-col items-center justify-center p-4 border border-dashed border-red-200 rounded-xl bg-red-50"><span class="text-3xl font-extrabold text-orange-600 tracking-tighter mb-2">CARAPITANGA</span><span class="text-xs text-red-500">Imagem indisponível. Verifique permissões do Drive.</span></div>';
                          }
                        }}
                      />
                  </div>
              ) : (
                  // OUTROS MODOS: Ícone Genérico com Container
                  <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 transition-all shadow-md ${mode === 'REGISTER' ? 'bg-white/10 border border-white/20' : 'bg-white/10 border border-white/20'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-white">
                          {mode === 'REGISTER' && <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />}
                          {mode === 'FORGOT' && <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />}
                      </svg>
                  </div>
              )}
              
              {/* Título (Apenas se NÃO for Login, pois a logo já tem o texto) */}
              {mode !== 'LOGIN' && (
                <h2 className={`text-xl font-extrabold tracking-tight transition-all text-white`}>
                    {title}
                </h2>
              )}

              {/* Subtítulo */}
              <p className={`text-xs mt-1 font-medium ${mode === 'LOGIN' ? 'text-gray-500' : 'text-orange-50'}`}>
                {subTitle}
              </p>
           </div>
           
           {/* Decorative Background for non-login modes */}
           {mode !== 'LOGIN' && (
                <div className={`absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] opacity-30 transition-all duration-500 ${mode === 'REGISTER' ? 'from-orange-400 via-red-500 to-orange-900' : 'from-gray-600 via-slate-900 to-black'}`} />
           )}
           {/* Decorative Background for Login (Subtle) */}
           {mode === 'LOGIN' && (
               <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-50/50 via-transparent to-transparent pointer-events-none" />
           )}
        </div>

        {/* Form Content */}
        <div className="p-6 bg-white pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 text-gray-900 text-sm transition-colors placeholder-gray-400"
                placeholder={mode === 'FORGOT' ? "Digite seu usuário" : "Seu nome de usuário"}
              />
            </div>

            {/* Password Field (Not for Forgot) */}
            {mode !== 'FORGOT' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Senha
                </label>
                <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 text-gray-900 text-sm transition-colors placeholder-gray-400"
                    placeholder="••••••••"
                />
                </div>
            )}

            {/* Confirm Password (Register Only) */}
            {mode === 'REGISTER' && (
                 <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Confirmar Senha
                    </label>
                    <input
                        id="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-gray-50 text-gray-900 text-sm transition-colors placeholder-gray-400"
                        placeholder="••••••••"
                    />
                </div>
            )}

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-xs text-red-600 animate-in fade-in zoom-in-95">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-xs text-green-700 animate-in fade-in zoom-in-95">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                {successMsg}
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-2.5 px-4 rounded-xl text-white text-sm font-bold shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all duration-300 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : mode === 'REGISTER' 
                    ? 'bg-orange-600 hover:bg-orange-700 hover:shadow-orange-500/40 hover:-translate-y-0.5' 
                    : mode === 'FORGOT'
                        ? 'bg-slate-600 hover:bg-slate-700 hover:-translate-y-0.5'
                        : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/40 hover:-translate-y-0.5'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </>
              ) : (
                buttonText
              )}
            </button>
          </form>

          {/* Navigation Links */}
          <div className="mt-6 flex flex-col gap-2 text-center border-t border-gray-100 pt-4">
            {mode === 'LOGIN' && (
                <>
                    <button 
                        onClick={() => switchMode('REGISTER')}
                        className="text-xs font-medium text-orange-600 hover:text-orange-800 hover:underline transition-colors"
                    >
                        Não tem conta? Cadastre-se
                    </button>
                    <button 
                        onClick={() => switchMode('FORGOT')}
                        className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        Esqueci minha senha
                    </button>
                </>
            )}

            {mode === 'REGISTER' && (
                <button 
                    onClick={() => switchMode('LOGIN')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                >
                    Já tem conta? Faça Login
                </button>
            )}

            {mode === 'FORGOT' && (
                <button 
                    onClick={() => switchMode('LOGIN')}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                >
                    Voltar para Login
                </button>
            )}
          </div>
        </div>
      </div>
      
      {mode === 'LOGIN' && (
        <div className="mt-4 text-center">
            <p className="text-[10px] text-orange-400/80 mt-2 inline-block px-3 py-1 bg-orange-50/50 rounded-full border border-orange-100/50">
            Padrão: admin / 1234
            </p>
        </div>
      )}
    </div>
  );
};
