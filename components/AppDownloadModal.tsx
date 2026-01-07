
import React, { useState } from 'react';

interface AppDownloadModalProps {
  onClose: (dontShowAgain: boolean) => void;
}

const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleDownload = () => {
    window.open('https://www.mediafire.com/file/3gkp4b2nzd2qvmr/Void+Max_1.0.apk/file', '_blank');
    handleClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
        onClose(dontShowAgain);
    }, 500);
  };

  return (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-500 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* BACKDROP BLUR & NOISE */}
        <div className="absolute inset-0 bg-[#050505]/90 backdrop-blur-3xl transition-opacity" onClick={handleClose}>
             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.05]"></div>
        </div>

        {/* MODAL CONTAINER */}
        <div className={`relative w-full max-w-sm group perspective-1000 transform transition-all duration-500 ${isClosing ? 'scale-90 translate-y-20 opacity-0' : 'scale-100 translate-y-0 opacity-100'}`}>
            
            {/* AMBIENT GLOW BEHIND */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-primary/20 via-blue-600/10 to-purple-500/20 rounded-full blur-[80px] opacity-60 animate-pulse-slow pointer-events-none"></div>

            {/* MAIN CARD */}
            <div className="relative bg-[#0F0F0F] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                
                {/* HOLOGRAPHIC SHINE OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent opacity-50 pointer-events-none"></div>
                
                {/* HEADER IMAGE / ICON AREA */}
                <div className="relative h-40 bg-gradient-to-b from-[#1a1a1a] to-[#0F0F0F] flex items-center justify-center overflow-hidden">
                    {/* Animated Grid Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
                    
                    {/* Floating 3D Icon */}
                    <div className="relative w-20 h-20 bg-black rounded-2xl border border-white/20 flex items-center justify-center shadow-[0_0_30px_rgba(242,13,242,0.3)] animate-float z-10">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-blue-500/20 rounded-2xl"></div>
                        <span className="material-symbols-rounded text-4xl text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">android</span>
                        
                        {/* Notification Dot */}
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary border-2 border-black rounded-full animate-bounce"></div>
                    </div>

                    {/* Circles Ripple */}
                    <div className="absolute w-40 h-40 border border-white/5 rounded-full animate-ping-slow"></div>
                    <div className="absolute w-60 h-60 border border-white/5 rounded-full animate-ping-slow" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* CONTENT BODY */}
                <div className="p-8 pt-4 text-center relative z-20">
                    
                    <h2 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">
                        Instale o App <span className="text-primary">Oficial</span>
                    </h2>
                    <p className="text-white/50 text-xs leading-relaxed mb-6 font-medium">
                        Tenha a experiência definitiva do Void Max. <br/> Mais rápido, fluido e sem interrupções.
                    </p>

                    {/* BENEFITS GRID */}
                    <div className="grid grid-cols-1 gap-3 mb-8">
                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 hover:border-white/20 p-3 rounded-2xl transition-colors group/item">
                            <div className="w-10 h-10 rounded-xl bg-[#151515] border border-white/10 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg">
                                <span className="material-symbols-rounded text-primary text-xl">speed</span>
                            </div>
                            <div className="text-left">
                                <p className="text-white text-sm font-bold">Player Turbo</p>
                                <p className="text-white/40 text-[10px] font-medium">Carregamento instantâneo</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 bg-white/5 border border-white/5 hover:border-white/20 p-3 rounded-2xl transition-colors group/item">
                            <div className="w-10 h-10 rounded-xl bg-[#151515] border border-white/10 flex items-center justify-center group-hover/item:scale-110 transition-transform shadow-lg">
                                <span className="material-symbols-rounded text-green-400 text-xl">ad_units</span>
                            </div>
                            <div className="text-left">
                                <p className="text-white text-sm font-bold">Zero Redirecionamentos</p>
                                <p className="text-white/40 text-[10px] font-medium">Navegação limpa e segura</p>
                            </div>
                        </div>
                    </div>

                    {/* DOWNLOAD BUTTON (LIQUID METAL EFFECT) */}
                    <button 
                        onClick={handleDownload}
                        className="relative w-full overflow-hidden rounded-xl group active:scale-[0.98] transition-transform duration-200"
                    >
                        <div className="absolute inset-0 bg-white"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        {/* Shine Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                        <div className="relative py-4 flex items-center justify-center gap-2">
                            <span className="material-symbols-rounded text-black font-bold text-xl">download</span>
                            <span className="text-black font-display font-bold text-sm tracking-wide uppercase">Baixar Agora</span>
                        </div>
                    </button>

                    {/* SECONDARY ACTION */}
                    <button 
                        onClick={handleClose}
                        className="mt-4 text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest transition-colors py-2"
                    >
                        Já tenho o aplicativo
                    </button>
                    
                </div>

                {/* FOOTER CHECKBOX AREA */}
                <div className="bg-[#0a0a0a] py-3 border-t border-white/5 flex justify-center">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-300 ${dontShowAgain ? 'bg-primary border-primary shadow-[0_0_10px_#f20df2]' : 'bg-transparent border-white/20 group-hover:border-white'}`}>
                            {dontShowAgain && <span className="material-symbols-rounded text-black text-[10px] font-bold">check</span>}
                        </div>
                        <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors font-medium">
                            Não mostrar novamente
                        </span>
                    </label>
                </div>

            </div>
        </div>
        
        <style>{`
            .perspective-1000 { perspective: 1000px; }
            
            .animate-float {
                animation: float 6s ease-in-out infinite;
            }
            @keyframes float {
                0% { transform: translateY(0px) rotate(0deg); }
                50% { transform: translateY(-10px) rotate(2deg); }
                100% { transform: translateY(0px) rotate(0deg); }
            }

            .animate-ping-slow {
                animation: pingSlow 3s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            @keyframes pingSlow {
                75%, 100% { transform: scale(2); opacity: 0; }
            }
        `}</style>
    </div>
  );
};

export default AppDownloadModal;
