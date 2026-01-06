
import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { tmdb } from '../services/tmdbService';
import { supabase } from '../services/supabase';

interface WelcomeProps {
  onStart: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onStart }) => {
  // States for Intro
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [posters, setPosters] = useState<string[]>([]);
  
  // States for Auth Flow
  const [view, setView] = useState<'intro' | 'login' | 'register' | 'forgot'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{show: boolean, msg: string}>({ show: false, msg: '' });

  // Form Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Intro Slides
  const slides = useMemo(() => [
    {
      title: <>Filmes e Séries <br/> <span className="text-primary">Ilimitados.</span></>,
      desc: 'Assista onde quiser. Totalmente Grátis.'
    },
    {
      title: <>Baixe e assista <br/> <span className="text-primary">Offline.</span></>,
      desc: 'Economize seus dados. Leve seus filmes para qualquer lugar.'
    },
    {
      title: <>Qualidade <br/> <span className="text-primary">4K Ultra HD.</span></>,
      desc: 'Imersão total com áudio Dolby Atmos e HDR.'
    }
  ], []);

  // Slide Rotation Logic
  useEffect(() => {
    if (view !== 'intro') return;
    const interval = setInterval(() => {
      setFadeKey(prev => prev + 1);
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length, view]);

  // Load Background Posters
  useEffect(() => {
    const loadPosters = async () => {
        try {
            const movies = await tmdb.getTrending();
            const urls = movies
                .filter(m => m.poster_path)
                .map(m => tmdb.getPosterUrl(m.poster_path, 'w500'));
            setPosters(urls);
        } catch (e) {
            console.error("Failed to load welcome posters", e);
        }
    };
    loadPosters();
  }, []);

  // Helper to render poster columns
  const renderColumn = (offset: number) => {
    if (posters.length === 0) {
        return Array(8).fill(0).map((_, i) => (
             <div key={i} className="w-full aspect-[2/3] bg-white/5 rounded-lg animate-pulse"></div>
        ));
    }
    const list = [...posters, ...posters, ...posters, ...posters];
    const shifted = list.slice(offset).concat(list.slice(0, offset));
    return shifted.map((src, idx) => (
        <img key={idx} src={src} className="rounded-lg w-full aspect-[2/3] object-cover opacity-60" alt="" loading="lazy"/>
    ));
  };

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 4000);
  };

  // Auth Handlers
  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (view === 'login') {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    throw new Error("Por favor, verifique seu e-mail para confirmar a conta antes de entrar.");
                }
                throw error;
            }
            showToast("Bem-vindo de volta!");
            onStart();
        } else if (view === 'register') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });
            if (error) throw error;
            
            if (data.user && data.user.identities && data.user.identities.length === 0) {
                 showToast("Esta conta já existe. Tente fazer login.");
                 setView('login');
            } else {
                 showToast("Conta criada! Enviamos um link de confirmação para o seu e-mail.");
                 // Switch to login view immediately
                 setView('login');
                 setEmail(email); // Keep email filled
                 setPassword('');
            }
        } else if (view === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '#/reset-password', // Garante redirecionamento correto
            });
            if (error) throw error;
            showToast("Email de recuperação enviado! Verifique sua caixa de entrada.");
            setView('login');
        }
    } catch (error: any) {
        showToast(error.message || "Ocorreu um erro. Tente novamente.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-background-dark font-body text-white antialiased overflow-hidden h-screen w-screen relative selection:bg-primary selection:text-white">
      
      {/* INJECTED STYLES FOR AUTH UI */}
      <style>{`
        .glass-card {
            background: rgba(10, 10, 10, 0.65);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        }
        .input-group:focus-within {
            border-color: #f20df2;
            box-shadow: 0 0 15px rgba(242, 13, 242, 0.2);
            background: rgba(242, 13, 242, 0.05);
        }
        .form-view {
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {/* BACKGROUND */}
      <div className={`absolute inset-0 overflow-hidden transition-opacity duration-1000 ${view === 'intro' ? 'opacity-40' : 'opacity-20'}`}>
          <div className="w-[150%] grid grid-cols-3 gap-3 animate-scroll-diagonal grayscale-[30%]">
              <div className="flex flex-col gap-3">{renderColumn(0)}</div>
              <div className="flex flex-col gap-3 -mt-32">{renderColumn(5)}</div>
              <div className="flex flex-col gap-3">{renderColumn(10)}</div>
          </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/90 to-black/40 z-10 pointer-events-none"></div>

      {/* TOAST */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-500 w-max max-w-[90vw] ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
        <span className="material-symbols-rounded text-primary">info</span>
        <span className="text-sm font-medium">{toast.msg}</span>
      </div>

      {/* CONTENT */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-4 w-full">
          
          {/* INTRO */}
          {view === 'intro' && (
             <div className="flex flex-col h-full justify-between pb-12 pt-10 w-full max-w-lg mx-auto animate-fade-in">
                <div className="flex justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_#f20df2]">
                            <span className="material-symbols-rounded text-white text-2xl">movie_filter</span>
                        </div>
                        <span className="font-display font-bold text-2xl tracking-tight text-white">StreamVerse</span>
                    </div>
                </div>

                <div className="flex flex-col items-center text-center w-full">
                    <div className="h-32 flex flex-col justify-end mb-8">
                        <div key={fadeKey} className="animate-text-slide">
                            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-2 leading-tight">
                                {slides[currentSlide].title}
                            </h1>
                            <p className="text-white/60 text-base md:text-lg">
                                {slides[currentSlide].desc}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-8">
                        {slides.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-primary' : 'w-2 bg-white/20'}`}></div>
                        ))}
                    </div>

                    <div className="w-full space-y-4">
                        <button 
                            onClick={() => setView('login')}
                            className="w-full bg-primary hover:bg-primary-hover text-white font-display font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(242,13,242,0.5)] animate-pulse-glow transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            Começar Agora
                            <span className="material-symbols-rounded group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                        
                        <button 
                            onClick={() => setView('login')} 
                            className="w-full bg-white/5 border border-white/10 backdrop-blur-md text-white font-medium text-lg py-4 rounded-xl hover:bg-white/10 transition-all active:scale-[0.98]"
                        >
                            Já tenho uma conta
                        </button>
                    </div>

                    <p className="text-xs text-white/30 mt-8">
                        Ao entrar, você concorda com nossos <a href="#" className="underline hover:text-white">Termos</a>.
                    </p>
                </div>
             </div>
          )}

          {/* FORMS */}
          {view !== 'intro' && (
             <div className="w-full max-w-[420px] animate-slide-up">
                
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('intro')}>
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_20px_#f20df2]">
                            <span className="material-symbols-rounded text-white text-2xl">movie_filter</span>
                        </div>
                        <h1 className="font-display font-bold text-2xl tracking-tight text-white drop-shadow-lg">StreamVerse</h1>
                    </div>
                </div>

                <div className="glass-card rounded-3xl p-8 w-full overflow-hidden relative min-h-[450px]">
                    
                    {/* LOGIN FORM */}
                    {view === 'login' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-display font-bold text-white mb-2">Bem-vindo</h2>
                            <p className="text-white/50 text-sm mb-8">Digite suas credenciais para acessar.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Email</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">mail</span>
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="exemplo@email.com" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Senha</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">lock</span>
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white transition-colors">
                                            <span className="material-symbols-rounded text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button type="button" onClick={() => setView('forgot')} className="text-xs text-white/50 hover:text-white transition-colors">Esqueceu a senha?</button>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(242,13,242,0.4)] hover:shadow-[0_0_30px_rgba(242,13,242,0.6)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group">
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <span>Entrar</span>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-white/50">
                                    Novo por aqui? 
                                    <button onClick={() => setView('register')} className="text-primary font-bold hover:underline ml-1">Crie sua conta</button>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* REGISTER FORM */}
                    {view === 'register' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-display font-bold text-white mb-2">Criar Conta</h2>
                            <p className="text-white/50 text-sm mb-6">Confirme o e-mail após o cadastro.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Nome</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">person</span>
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Seu nome" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Email</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">mail</span>
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="exemplo@email.com" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Senha</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">lock</span>
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Crie uma senha" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/40 hover:text-white transition-colors">
                                            <span className="material-symbols-rounded text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                        </button>
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                    ) : (
                                        <span>Cadastrar</span>
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 text-center">
                                <p className="text-sm text-white/50">
                                    Já tem uma conta? 
                                    <button onClick={() => setView('login')} className="text-primary font-bold hover:underline ml-1">Entrar</button>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* FORGOT PASSWORD FORM */}
                    {view === 'forgot' && (
                        <div className="animate-fade-in">
                            <button onClick={() => setView('login')} className="mb-6 flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                                <span className="material-symbols-rounded text-lg">arrow_back</span>
                                Voltar
                            </button>

                            <h2 className="text-2xl font-display font-bold text-white mb-2">Recuperar Conta</h2>
                            <p className="text-white/50 text-sm mb-8">Enviaremos um link de redefinição para o seu e-mail.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/70 ml-1 uppercase tracking-wider">Email Cadastrado</label>
                                    <div className="input-group flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3 transition-all duration-300">
                                        <span className="material-symbols-rounded text-white/40 text-xl mr-3">mail</span>
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="exemplo@email.com" 
                                            className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" 
                                            required 
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(242,13,242,0.4)] hover:shadow-[0_0_30px_rgba(242,13,242,0.6)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 relative overflow-hidden">
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span className="material-symbols-rounded">send</span>
                                            <span>Enviar Link</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                </div>
             </div>
          )}

      </div>
    </div>
  );
};

export default Welcome;
