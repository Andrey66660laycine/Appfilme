
import React, { useState } from 'react';

interface PaywallModalProps {
  onClose: () => void;
  onSelectPlan: (plan: 'premium' | 'ads') => void;
  movieTitle: string;
  backgroundUrl: string;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ onClose, onSelectPlan, movieTitle, backgroundUrl }) => {
  const [view, setView] = useState<'selection' | 'processing'>('selection');
  const [loadingText, setLoadingText] = useState('');

  const handleSelect = (plan: 'premium' | 'ads') => {
    setView('processing');
    if (plan === 'premium') {
        setLoadingText("Ativando Premium...");
    } else {
        setLoadingText("Carregando Anúncios...");
    }

    // Simulando tempo de processamento antes de chamar a função pai
    setTimeout(() => {
        onSelectPlan(plan);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black font-body text-white antialiased h-screen w-full relative overflow-hidden animate-fade-in flex items-center justify-center">
        
        {/* FAKE BACKGROUND (Simulating Details Page) */}
        <div className="absolute inset-0 z-0">
            <img 
                src={backgroundUrl || "https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg"} 
                className="w-full h-full object-cover opacity-60 blur-sm scale-105 transition-transform duration-1000" 
                alt="Background"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
        </div>

        {/* PAYWALL MODAL CARD */}
        <div className="relative z-50 w-full max-w-lg p-4">
            
            <div className="glass-modal w-full rounded-3xl p-1 relative overflow-hidden animate-pop-in shadow-2xl">
                
                {/* Glow Effect behind card */}
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-tr from-transparent via-primary/10 to-transparent animate-spin-slow pointer-events-none"></div>

                <div className="relative bg-[#121212]/90 backdrop-blur-2xl rounded-[22px] p-6 sm:p-8 overflow-hidden border border-white/10">
                    
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-20">
                        <span className="material-symbols-rounded">close</span>
                    </button>

                    {/* VIEW: SELECTION */}
                    {view === 'selection' && (
                        <div className="animate-fade-in">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-[0_0_20px_rgba(242,13,242,0.15)]">
                                    <span className="material-symbols-rounded text-primary text-3xl">lock_open</span>
                                </div>
                                <h2 className="text-2xl font-display font-bold text-white mb-2">Liberar Acesso</h2>
                                <p className="text-white/50 text-sm">Escolha como você quer assistir: <br/><span className="text-white font-bold">{movieTitle}</span></p>
                            </div>

                            {/* OPTIONS GRID */}
                            <div className="space-y-4">
                                
                                {/* OPTION 1: PREMIUM (Highlighted) */}
                                <div className="relative group cursor-pointer" onClick={() => handleSelect('premium')}>
                                    {/* Best Value Tag */}
                                    <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_#f20df2] z-10 animate-pulse-glow">
                                        RECOMENDADO
                                    </div>

                                    <div className="bg-gradient-to-br from-primary/10 to-purple-900/10 border-2 border-primary/50 hover:border-primary rounded-xl p-4 flex items-center justify-between transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(242,13,242,0.2)] group-active:scale-[0.98]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary shadow-inner">
                                                <span className="material-symbols-rounded">diamond</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-base group-hover:text-primary transition-colors">Plano Premium</h3>
                                                <p className="text-primary text-xs font-bold">Sem anúncios • 4K HDR</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-lg font-display font-bold text-white">R$ 9,99</span>
                                            <span className="text-[10px] text-white/40">/mês</span>
                                        </div>
                                    </div>
                                </div>

                                {/* OR DIVIDER */}
                                <div className="relative flex py-2 items-center">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 mx-4 text-white/20 text-xs font-bold uppercase tracking-wider">Ou continue grátis</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                {/* OPTION 2: FREE (Ads) */}
                                <div className="group cursor-pointer" onClick={() => handleSelect('ads')}>
                                    <div className="bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-xl p-4 flex items-center justify-between transition-all duration-300 group-active:scale-[0.98]">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
                                                <span className="material-symbols-rounded">ads_click</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-sm">Assistir com Anúncios</h3>
                                                <p className="text-white/40 text-xs group-hover:text-white/60 transition-colors">Qualidade HD • Com interrupções</p>
                                            </div>
                                        </div>
                                        <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white/40">
                                            <span className="material-symbols-rounded text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-2px] group-hover:translate-x-0">chevron_right</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer Text */}
                            <p className="text-center text-[10px] text-white/20 mt-6">
                                Processamento seguro via Stripe. Cancele quando quiser.
                            </p>
                        </div>
                    )}

                    {/* VIEW: LOADING */}
                    {view === 'processing' && (
                        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-primary animate-pulse">lock_open</span>
                                </div>
                            </div>
                            <p className="text-white font-display text-lg font-bold animate-pulse" id="loadingText">{loadingText}</p>
                            <p className="text-white/40 text-xs mt-2">Aguarde um momento...</p>
                        </div>
                    )}

                </div>
            </div>
        </div>

        {/* INJECTED STYLES FOR THIS COMPONENT */}
        <style>{`
            .glass-modal {
                background: rgba(20, 20, 20, 0.6);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.8);
            }
            .premium-gradient {
                background: linear-gradient(135deg, rgba(242, 13, 242, 0.1) 0%, rgba(88, 28, 135, 0.1) 100%);
            }
            .animate-pop-in {
                animation: popIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            @keyframes popIn {
                0% { opacity: 0; transform: scale(0.9) translateY(20px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-spin-slow {
                animation: spin 10s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
  );
};

export default PaywallModal;
