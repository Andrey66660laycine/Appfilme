
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { gamificationService } from '../services/gamificationService';
import { Profile } from '../types';

interface ProfileGatewayProps {
  onProfileSelect: (profile: Profile) => void;
  onLogout: () => void;
}

const AVATAR_COLLECTIONS: Record<string, string[]> = {
  "Personagens": [
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Christopher",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Nala",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Willow"
  ],
  "Anime": [
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&style=circle",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&style=circle",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Milo&style=circle",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Sora&style=circle",
      "https://api.dicebear.com/7.x/avataaars/svg?seed=Kaito&style=circle"
  ],
  "3D Bots": [
      "https://api.dicebear.com/7.x/bottts/svg?seed=1",
      "https://api.dicebear.com/7.x/bottts/svg?seed=2",
      "https://api.dicebear.com/7.x/bottts/svg?seed=3",
      "https://api.dicebear.com/7.x/bottts/svg?seed=4",
      "https://api.dicebear.com/7.x/bottts/svg?seed=5"
  ],
  "Minimalista": [
      "https://api.dicebear.com/7.x/thumbs/svg?seed=Luna",
      "https://api.dicebear.com/7.x/thumbs/svg?seed=Jasper",
      "https://api.dicebear.com/7.x/thumbs/svg?seed=Oliver",
      "https://api.dicebear.com/7.x/thumbs/svg?seed=Mila"
  ]
};

const ProfileGateway: React.FC<ProfileGatewayProps> = ({ onProfileSelect, onLogout }) => {
  const [view, setView] = useState<'gateway' | 'editor' | 'dashboard' | 'account_settings'>('gateway');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [avatarCategory, setAvatarCategory] = useState("Personagens");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isKidInput, setIsKidInput] = useState(false);
  const [dashboardProfile, setDashboardProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [view]);

  useEffect(() => {
      if (view === 'dashboard' && dashboardProfile) {
          loadAchievements(dashboardProfile.id);
      }
  }, [view, dashboardProfile]);

  const loadProfiles = async () => {
    const data = await storageService.getProfiles();
    setProfiles(data);
    if (dashboardProfile) {
        const updated = data.find(p => p.id === dashboardProfile.id);
        if (updated) setDashboardProfile(updated);
    }
  };

  const loadAchievements = async (profileId: string) => {
      const unlocked = await gamificationService.getUnlocked(profileId);
      setAchievements(unlocked);
  }

  const handleCreateOrUpdate = async () => {
    if (!nameInput.trim()) return alert("Digite um nome!");
    const avatarToUse = selectedAvatar || AVATAR_COLLECTIONS["Personagens"][0];

    if (editingProfile) {
        await storageService.updateProfile(editingProfile.id, {
            name: nameInput,
            avatar: avatarToUse,
            is_kid: isKidInput
        });
    } else {
        await storageService.createProfile(nameInput, avatarToUse, isKidInput);
    }
    await loadProfiles();
    setView('gateway');
  };

  const handleDelete = async () => {
    if (editingProfile && confirm("Tem certeza?")) {
        await storageService.deleteProfile(editingProfile.id);
        await loadProfiles();
        setView('gateway');
    }
  };
  
  const handleAccountDeletion = async () => {
      if (deleteConfirmation !== "DELETAR") return;
      setIsDeletingAccount(true);
      try {
          const success = await storageService.deleteAccountData();
          if (success) onLogout();
          else alert("Erro ao apagar conta. Tente novamente.");
      } catch (e) {
          alert("Ocorreu um erro inesperado.");
      } finally {
          setIsDeletingAccount(false);
      }
  };

  const openEditor = (profile: Profile | null) => {
    if (profile) {
        setEditingProfile(profile);
        setNameInput(profile.name);
        setIsKidInput(profile.is_kid);
        setSelectedAvatar(profile.avatar);
    } else {
        setEditingProfile(null);
        setNameInput("");
        setIsKidInput(false);
        setSelectedAvatar(AVATAR_COLLECTIONS["Personagens"][Math.floor(Math.random() * 4)]);
    }
    setView('editor');
  };

  const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor(seconds / 60);
      if (hours < 1) return `${minutes}`;
      return `${hours}`;
  }
  
  const getTimeLabel = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      return hours < 1 ? "Minutos" : "Horas";
  }

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden selection:bg-primary selection:text-white">
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[150px] animate-float" style={{animationDelay: '2s'}}></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
       </div>

       {showAvatarModal && (
        <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in">
             <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowAvatarModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><span className="material-symbols-rounded text-3xl">arrow_back</span></button>
                    <h2 className="text-2xl font-display font-bold">Galeria de Ícones</h2>
                </div>
            </div>
            <div className="border-b border-white/5 bg-black/30 sticky top-0 z-10">
                <div className="flex gap-2 px-6 py-4 overflow-x-auto hide-scrollbar">
                    {Object.keys(AVATAR_COLLECTIONS).map(cat => (
                        <button key={cat} onClick={() => setAvatarCategory(cat)} className={`px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${avatarCategory === cat ? 'bg-white text-black border-white' : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/30'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
                    {AVATAR_COLLECTIONS[avatarCategory].map((src: string, index: number) => (
                        <div key={index} onClick={() => { setSelectedAvatar(src); setShowAvatarModal(false); }} className="aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-primary transition-all hover:scale-105 bg-white/5 relative group hover:shadow-[0_0_20px_rgba(242,13,242,0.3)]">
                            <img src={src} className="w-full h-full object-cover bg-[#121212]" alt="Avatar" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
       )}

       {view === 'gateway' && (
           <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4">
                <div className="text-center mb-16 animate-slide-up">
                    <h1 className="font-display font-bold text-4xl md:text-6xl mb-3 tracking-tight">Quem está assistindo?</h1>
                    <p className="text-white/40 text-sm">Selecione seu perfil para continuar</p>
                </div>

                <div className="flex flex-wrap justify-center gap-8 md:gap-12 animate-slide-up">
                    {profiles.map(p => (
                        <div key={p.id} className="group flex flex-col items-center gap-4 cursor-pointer w-36" onClick={() => { setDashboardProfile(p); setView('dashboard'); }}>
                            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-2xl overflow-hidden transition-all duration-300 group-hover:scale-110 shadow-2xl ring-2 ring-white/10 group-hover:ring-4 group-hover:ring-primary group-hover:shadow-[0_0_30px_rgba(242,13,242,0.4)]">
                                <img src={p.avatar} className="w-full h-full object-cover bg-[#121212]" />
                            </div>
                            <span className="text-white/60 font-medium group-hover:text-white transition-colors text-xl font-display tracking-wide">{p.name}</span>
                        </div>
                    ))}

                    {profiles.length < 5 && (
                        <div className="group flex flex-col items-center gap-4 cursor-pointer w-36" onClick={() => openEditor(null)}>
                            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white/5 border-2 border-white/20 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/50 transition-all duration-300 group-hover:scale-110">
                                <span className="material-symbols-rounded text-6xl text-white/30 group-hover:text-white transition-colors">add</span>
                            </div>
                            <span className="text-white/60 font-medium group-hover:text-white transition-colors text-xl font-display tracking-wide">Novo Perfil</span>
                        </div>
                    )}
                </div>

                <div className="mt-20 animate-slide-up flex flex-col items-center gap-6">
                     <button onClick={() => setView('account_settings')} className="text-white/40 hover:text-white text-sm font-bold uppercase tracking-widest flex items-center gap-2 px-6 py-3 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/10">
                        <span className="material-symbols-rounded">manage_accounts</span>
                        Gerenciar Conta
                     </button>
                </div>
           </div>
       )}
       
       {view === 'account_settings' && (
           <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-4">
               <div className="w-full max-w-lg bg-[#0F0F0F] border border-white/10 rounded-3xl p-8 md:p-10 animate-fade-in shadow-2xl">
                   <div className="flex items-center justify-between mb-8">
                       <h2 className="text-3xl font-bold font-display text-white">Configurações</h2>
                       <button onClick={() => setView('gateway')} className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                           <span className="material-symbols-rounded">close</span>
                       </button>
                   </div>
                   <div className="space-y-8">
                       <button onClick={onLogout} className="w-full py-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-white font-bold transition-all">
                           Sair da Conta
                       </button>

                       <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
                           <h3 className="text-red-500 font-bold flex items-center gap-2 mb-4 text-lg">
                               <span className="material-symbols-rounded">warning</span>
                               Zona de Perigo
                           </h3>
                           <p className="text-red-500/60 text-sm mb-4">Esta ação não pode ser desfeita. Todos os perfis e histórico serão perdidos.</p>
                           <div className="space-y-3">
                               <input type="text" placeholder='Digite "DELETAR"' className="w-full bg-black border border-red-500/30 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-red-500" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)}/>
                               <button onClick={handleAccountDeletion} disabled={deleteConfirmation !== "DELETAR" || isDeletingAccount} className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${deleteConfirmation === "DELETAR" ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}>Apagar Conta Permanentemente</button>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {view === 'editor' && (
           <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4">
                <main className="w-full max-w-2xl p-6 animate-slide-up bg-[#0F0F0F] border border-white/10 rounded-3xl shadow-2xl">
                    <div className="flex items-center justify-between mb-10">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{editingProfile ? 'Editar Perfil' : 'Criar Perfil'}</h1>
                        <button onClick={() => setView('gateway')} className="text-white/50 hover:text-white font-medium transition-colors">Cancelar</button>
                    </div>
                    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer w-44 h-44" onClick={() => setShowAvatarModal(true)}>
                                <img src={selectedAvatar} className="relative w-full h-full object-cover rounded-3xl shadow-2xl ring-4 ring-white/10 group-hover:ring-primary transition-all duration-300 bg-[#121212]" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                                    <span className="material-symbols-rounded text-white text-4xl">edit</span>
                                </div>
                            </div>
                            <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Toque para alterar</span>
                        </div>
                        <div className="flex-1 w-full space-y-8">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase tracking-wider ml-1">Nome do Perfil</label>
                                <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-display text-lg" placeholder="Ex: João" />
                            </div>
                            <div className="flex items-center justify-between group p-4 border border-white/10 rounded-xl bg-[#1a1a1a]">
                                <div>
                                    <p className="text-base font-bold text-white">Perfil Infantil</p>
                                    <p className="text-xs text-white/40">Exibir apenas conteúdo para crianças</p>
                                </div>
                                <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="toggle" id="toggle" checked={isKidInput} onChange={(e) => setIsKidInput(e.target.checked)} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 checked:right-0 right-6 checked:border-primary"/>
                                    <label htmlFor="toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${isKidInput ? 'bg-primary' : 'bg-gray-700'}`}></label>
                                </div>
                            </div>
                            <div className="pt-4 flex flex-col sm:flex-row gap-4">
                                <button onClick={handleCreateOrUpdate} className="flex-1 bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] text-lg">Salvar</button>
                                {editingProfile && <button onClick={handleDelete} className="flex-1 border border-white/10 text-white font-medium py-4 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50 transition-all active:scale-95">Excluir</button>}
                            </div>
                        </div>
                    </div>
                </main>
           </div>
       )}

       {view === 'dashboard' && dashboardProfile && (
           <div className="relative z-10 w-full min-h-screen flex-col animate-fade-in">
               <div className="sticky top-0 z-40 bg-background-dark/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-white/10 py-2 px-4 rounded-full transition-colors border border-transparent hover:border-white/10" onClick={() => setView('gateway')}>
                        <span className="material-symbols-rounded text-white/70">arrow_back</span>
                        <span className="text-sm font-bold text-white/90">Trocar Perfil</span>
                    </div>
               </div>

               <main className="max-w-4xl mx-auto w-full px-6 py-12 space-y-12">
                   <div className="flex flex-col items-center">
                       <div className="relative group mb-6">
                            <div className="w-40 h-40 rounded-3xl p-1 bg-gradient-to-tr from-white/20 to-white/5 animate-pulse-glow">
                                <img src={dashboardProfile.avatar} className="w-full h-full rounded-[20px] object-cover bg-[#121212]" />
                            </div>
                       </div>
                       <h1 className="text-4xl font-display font-bold text-white tracking-tight flex items-center gap-3">
                           {dashboardProfile.name}
                           {dashboardProfile.is_premium && <span className="material-symbols-rounded text-yellow-500" title="Premium">verified</span>}
                       </h1>
                       <div className="mt-8 flex gap-4">
                            <button onClick={() => openEditor(dashboardProfile)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-bold transition-colors">Editar</button>
                            <button onClick={() => onProfileSelect(dashboardProfile)} className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,13,242,0.3)] hover:scale-105 active:scale-95">Entrar no App</button>
                       </div>
                   </div>

                   {/* STATS */}
                   <div className="grid grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-[#121212] border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center hover:border-white/20 transition-colors">
                            <span className="text-3xl font-display font-bold text-white mb-2">{formatTime(dashboardProfile.total_watch_time)}</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{getTimeLabel(dashboardProfile.total_watch_time)} Assistidas</span>
                        </div>
                        <div className="bg-[#121212] border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center hover:border-white/20 transition-colors">
                            <span className="text-3xl font-display font-bold text-white mb-2">{dashboardProfile.total_movies_watched}</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Filmes</span>
                        </div>
                        <div className="bg-[#121212] border border-white/10 p-6 rounded-3xl flex flex-col items-center text-center hover:border-white/20 transition-colors">
                            <span className="text-3xl font-display font-bold text-white mb-2">{dashboardProfile.total_episodes_watched}</span>
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Episódios</span>
                        </div>
                   </div>

                   {/* ACHIEVEMENT SHOWCASE */}
                   <div className="bg-gradient-to-br from-[#121212] to-black border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold font-display flex items-center gap-3 text-white">
                                <span className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                                    <span className="material-symbols-rounded text-yellow-500">emoji_events</span>
                                </span>
                                Galeria de Troféus
                            </h2>
                            <span className="text-xs font-bold text-white/40 bg-white/5 px-3 py-1 rounded-full">{achievements.length} Desbloqueados</span>
                        </div>
                        
                        {achievements.length === 0 ? (
                            <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <span className="material-symbols-rounded text-4xl text-white/20 mb-2">lock</span>
                                <p className="text-white/40 text-sm">Continue assistindo para desbloquear conquistas secretas!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {achievements.map((item, idx) => (
                                    <div key={idx} className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center gap-3 hover:bg-white/5 transition-colors group">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-400 text-black flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.4)] group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-rounded text-2xl">{item.achievements.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white group-hover:text-yellow-400 transition-colors">{item.achievements.title}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                   </div>
               </main>
           </div>
       )}
    </div>
  );
};

export default ProfileGateway;
