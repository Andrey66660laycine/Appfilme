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

  // Intro Slides (Atualizado para ser mais realista sobre as funcionalidades do app)
  const slides = useMemo(() => [
    {
      title: <>Universo <br/> <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Cinematográfico.</span></>,
      desc: 'Explore milhares de filmes e séries em um só lugar. Catálogo sempre atualizado.'
    },
    {
      title: <>Sua Lista <br/> <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Pessoal.</span></>,
      desc: 'Organize o que você quer assistir e acompanhe o progresso das suas séries.'
    },
    {
      title: <>Descubra <br/> <span className="text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">Novas Histórias.</span></>,
      desc: 'Recomendações inteligentes baseadas no que você gosta de assistir.'
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
        <img key={idx} src={src} className="rounded-lg w-full aspect-[2/3] object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-700" alt="" loading="lazy"/>
    ));
  };

  const showToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: '' }), 4000);
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
        if (view === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                if (error.message.includes("Email not confirmed")) {
                    throw new Error("Por favor, verifique seu e-mail.");
                }
                throw error;
            }
            showToast("Iniciando Void Max...");
            onStart();
        } else if (view === 'register') {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } }
            });
            if (error) throw error;
            if (data.user?.identities?.length === 0) {
                 showToast("Conta já existe.");
                 setView('login');
            } else {
                 showToast("Link enviado para seu e-mail.");
                 setView('login');
                 setEmail(email); setPassword('');
            }
        } else if (view === 'forgot') {
            const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '#/reset-password' });
            if (error) throw error;
            showToast("Link de recuperação enviado.");
            setView('login');
        }
    } catch (error: any) {
        showToast(error.message || "Erro de conexão.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-black font-body text-white antialiased overflow-hidden h-screen w-screen relative selection:bg-white selection:text-black">
      
      <style>{`
        .glass-card {
            background: rgba(5, 5, 5, 0.8);
            backdrop-filter: blur(40px);
            -webkit-backdrop-filter: blur(40px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 1);
        }
        .input-minimal {
            background: transparent;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        }
        .input-minimal:focus-within {
            border-color: #fff;
        }
      `}</style>

      {/* BACKGROUND */}
      <div className={`absolute inset-0 overflow-hidden transition-opacity duration-1000 ${view === 'intro' ? 'opacity-30' : 'opacity-10'}`}>
          <div className="w-[150%] grid grid-cols-3 gap-4 animate-scroll-diagonal">
              <div className="flex flex-col gap-4">{renderColumn(0)}</div>
              <div className="flex flex-col gap-4 -mt-32">{renderColumn(5)}</div>
              <div className="flex flex-col gap-4">{renderColumn(10)}</div>
          </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/95 to-black/20 z-10 pointer-events-none"></div>

      {/* TOAST */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] bg-white text-black px-6 py-3 rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center gap-3 transition-all duration-500 w-max ${toast.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
        <span className="material-symbols-rounded">info</span>
        <span className="text-xs font-bold tracking-wider uppercase">{toast.msg}</span>
      </div>

      <div className="relative z-20 h-full flex flex-col items-center justify-center px-6 w-full">
          
          {/* BRAND LOGO */}
          <div className="absolute top-8 left-0 w-full flex justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-1">
                 <span className="font-display font-bold text-3xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500">VOID</span>
                 <span className="text-[8px] font-light tracking-[0.6em] text-white/30 uppercase">Cinematic Experience</span>
              </div>
          </div>

          {/* INTRO */}
          {view === 'intro' && (
             <div className="flex flex-col items-center text-center w-full max-w-lg animate-fade-in mt-10">
                <div className="h-40 flex flex-col justify-end mb-12">
                    <div key={fadeKey} className="animate-text-slide">
                        <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
                            {slides[currentSlide].title}
                        </h1>
                        <p className="text-white/40 text-sm md:text-base font-light tracking-wide max-w-sm mx-auto">
                            {slides[currentSlide].desc}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mb-12">
                    {slides.map((_, idx) => (
                        <div key={idx} className={`h-0.5 transition-all duration-500 ${currentSlide === idx ? 'w-12 bg-white' : 'w-4 bg-white/20'}`}></div>
                    ))}
                </div>

                <button 
                    onClick={() => setView('login')}
                    className="w-full bg-white text-black font-display font-bold text-sm tracking-widest uppercase py-5 rounded-full hover:bg-gray-200 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] mb-4"
                >
                    Entrar no Void
                </button>
                
                <p className="text-[10px] text-white/20 uppercase tracking-widest mt-4">
                    Privacidade • Termos • Suporte
                </p>
             </div>
          )}

          {/* FORMS */}
          {view !== 'intro' && (
             <div className="w-full max-w-[400px] animate-slide-up">
                <div className="glass-card rounded-2xl p-10 w-full relative">
                    
                    {/* LOGIN */}
                    {view === 'login' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-display font-bold text-white mb-1 tracking-wide">Bem-vindo de volta</h2>
                            <p className="text-white/30 text-xs mb-8">Acesse sua conta Void Max.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-6">
                                <div className="input-minimal pb-2">
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                </div>
                                <div className="input-minimal pb-2 flex justify-between gap-2">
                                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/30 hover:text-white transition-colors">
                                        <span className="material-symbols-rounded text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-gray-200 transition-all mt-4">
                                    {isLoading ? '...' : 'Acessar'}
                                </button>
                            </form>

                            <div className="mt-6 flex justify-between items-center text-xs text-white/40">
                                <button onClick={() => setView('register')} className="hover:text-white transition-colors">Criar conta</button>
                                <button onClick={() => setView('forgot')} className="hover:text-white transition-colors">Recuperar senha</button>
                            </div>
                        </div>
                    )}

                    {/* REGISTER */}
                    {view === 'register' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-display font-bold text-white mb-1 tracking-wide">Novo Acesso</h2>
                            <p className="text-white/30 text-xs mb-8">Junte-se ao Void Max.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-6">
                                <div className="input-minimal pb-2">
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                </div>
                                <div className="input-minimal pb-2">
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                </div>
                                <div className="input-minimal pb-2">
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                </div>

                                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-gray-200 transition-all mt-4">
                                    {isLoading ? '...' : 'Registrar'}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <button onClick={() => setView('login')} className="text-xs text-white/40 hover:text-white transition-colors">Voltar para login</button>
                            </div>
                        </div>
                    )}

                    {/* FORGOT */}
                    {view === 'forgot' && (
                        <div className="animate-fade-in">
                            <h2 className="text-xl font-display font-bold text-white mb-1 tracking-wide">Recuperação</h2>
                            <p className="text-white/30 text-xs mb-8">Digite seu e-mail cadastrado.</p>
                            
                            <form onSubmit={handleAuth} className="space-y-6">
                                <div className="input-minimal pb-2">
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-transparent border-none text-white text-sm w-full focus:ring-0 placeholder-white/20 p-0" required />
                                </div>
                                <button type="submit" disabled={isLoading} className="w-full bg-white text-black font-bold text-xs uppercase tracking-widest py-4 rounded-lg hover:bg-gray-200 transition-all mt-4">
                                    {isLoading ? '...' : 'Enviar Link'}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <button onClick={() => setView('login')} className="text-xs text-white/40 hover:text-white transition-colors">Voltar</button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-center">
                     <button onClick={() => setView('intro')} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:border-white transition-all">
                        <span className="material-symbols-rounded">close</span>
                     </button>
                </div>
             </div>
          )}

      </div>
    </div>
  );
};

export default Welcome;