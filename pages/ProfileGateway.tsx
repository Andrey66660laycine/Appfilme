
import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { Profile } from '../types';

interface ProfileGatewayProps {
  onProfileSelect: (profile: Profile) => void;
  onLogout: () => void;
}

// Avatares Estáveis (Apenas Clássicos/Aventureiros para evitar bugs de carregamento)
const AVATAR_COLLECTIONS: Record<string, string[]> = {
  "Personagens": [
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Christopher",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Nala",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Leo",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Willow",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Socks",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Zoey",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Trouble",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Bandit",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Mist",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna",
      "https://api.dicebear.com/7.x/adventurer/svg?seed=Buddy"
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
  
  // Account Deletion States
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, [view]); // Reload profiles whenever view changes to update stats

  const loadProfiles = async () => {
    const data = await storageService.getProfiles();
    setProfiles(data);
    
    // Update dashboard profile if it exists to get fresh stats
    if (dashboardProfile) {
        const updated = data.find(p => p.id === dashboardProfile.id);
        if (updated) setDashboardProfile(updated);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!nameInput.trim()) return alert("Digite um nome!");
    
    // Default avatar if none selected
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
          if (success) {
              onLogout(); // Sai da conta e vai para o Welcome
          } else {
              alert("Erro ao apagar conta. Tente novamente.");
          }
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
      
      if (hours < 1) {
          return `${minutes}`;
      }
      return `${hours}`;
  }
  
  const getTimeLabel = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      return hours < 1 ? "Minutos" : "Horas";
  }

  return (
    <div className="min-h-screen bg-black text-white font-body overflow-x-hidden">
       {/* Global Background */}
       <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] animate-float"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
       </div>

       {/* AVATAR MODAL */}
       {showAvatarModal && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col animate-fade-in">
             <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/50">
                <div className="flex items-center gap-4">
                    <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><span className="material-symbols-rounded text-3xl">arrow_back</span></button>
                    <h2 className="text-xl font-display font-bold">Escolha um Ícone</h2>
                </div>
            </div>
            <div className="border-b border-white/5 bg-black/30">
                <div className="flex gap-4 px-6 py-4 overflow-x-auto hide-scrollbar">
                    {Object.keys(AVATAR_COLLECTIONS).map(cat => (
                        <button key={cat} onClick={() => setAvatarCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${avatarCategory === cat ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-6">
                    {AVATAR_COLLECTIONS[avatarCategory].map((src: string, index: number) => (
                        <div key={index} onClick={() => { setSelectedAvatar(src); setShowAvatarModal(false); }} className="aspect-square rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-white transition-all hover:scale-110 bg-white/5 relative group">
                            <img src={src} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 bg-surface" alt="Avatar" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
       )}

       {/* GATEWAY VIEW */}
       {view === 'gateway' && (
           <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4">
                <div className="text-center mb-12 animate-slide-up">
                    <h1 className="font-display font-bold text-3xl md:text-5xl mb-2">Quem está assistindo?</h1>
                </div>

                <div className="flex flex-wrap justify-center gap-6 md:gap-10 animate-slide-up">
                    {profiles.map(p => (
                        <div key={p.id} className="group flex flex-col items-center gap-3 cursor-pointer w-32" onClick={() => { setDashboardProfile(p); setView('dashboard'); }}>
                            <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden transition-all duration-300 group-hover:ring-4 group-hover:scale-105 group-hover:ring-white shadow-2xl">
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                                <img src={p.avatar} className="w-full h-full object-cover bg-surface" />
                            </div>
                            <span className="text-white/60 font-medium group-hover:text-white transition-colors text-lg">{p.name}</span>
                        </div>
                    ))}

                    {profiles.length < 5 && (
                        <div className="group flex flex-col items-center gap-3 cursor-pointer w-32" onClick={() => openEditor(null)}>
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg bg-white/10 border-2 border-white/20 flex items-center justify-center group-hover:bg-white group-hover:border-white transition-all duration-300 group-hover:scale-105">
                                <span className="material-symbols-rounded text-5xl text-white/50 group-hover:text-black">add_circle</span>
                            </div>
                            <span className="text-white/60 font-medium group-hover:text-white transition-colors text-lg">Adicionar</span>
                        </div>
                    )}
                </div>

                <div className="mt-16 animate-slide-up flex flex-col items-center gap-4">
                     <button onClick={() => setView('account_settings')} className="text-white/50 hover:text-white text-sm font-medium flex items-center gap-2 px-4 py-2 hover:bg-white/5 rounded-full transition-colors">
                        <span className="material-symbols-rounded">settings</span>
                        Configurações da Conta
                     </button>
                     <button onClick={onLogout} className="text-red-500 font-bold hover:underline">Sair da Conta</button>
                </div>
           </div>
       )}
       
       {/* ACCOUNT SETTINGS VIEW (DELETE ACCOUNT) */}
       {view === 'account_settings' && (
           <div className="relative z-10 w-full min-h-screen flex items-center justify-center p-4">
               <div className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl p-6 md:p-8 animate-fade-in shadow-2xl">
                   <div className="flex items-center justify-between mb-8">
                       <h2 className="text-2xl font-bold font-display text-white">Configurações</h2>
                       <button onClick={() => setView('gateway')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                           <span className="material-symbols-rounded">close</span>
                       </button>
                   </div>
                   
                   <div className="space-y-8">
                       <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                           <h3 className="text-red-500 font-bold flex items-center gap-2 mb-2">
                               <span className="material-symbols-rounded">warning</span>
                               Zona de Perigo
                           </h3>
                           <p className="text-white/70 text-sm mb-4">
                               Apagar sua conta excluirá permanentemente todos os perfis, histórico de visualização e lista. Esta ação não pode ser desfeita.
                           </p>
                           
                           <div className="space-y-3">
                               <label className="text-xs text-white/50 uppercase tracking-wide font-bold">Confirmação</label>
                               <input 
                                   type="text" 
                                   placeholder='Digite "DELETAR" para confirmar' 
                                   className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all outline-none"
                                   value={deleteConfirmation}
                                   onChange={(e) => setDeleteConfirmation(e.target.value)}
                               />
                               <button 
                                   onClick={handleAccountDeletion}
                                   disabled={deleteConfirmation !== "DELETAR" || isDeletingAccount}
                                   className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${deleteConfirmation === "DELETAR" ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                               >
                                   {isDeletingAccount ? (
                                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                   ) : (
                                       <>
                                           <span className="material-symbols-rounded">delete_forever</span>
                                           Apagar Conta Permanentemente
                                       </>
                                   )}
                               </button>
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* EDITOR VIEW */}
       {view === 'editor' && (
           <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center p-4">
                <main className="w-full max-w-2xl p-4 animate-slide-up">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl sm:text-4xl font-display font-bold text-white tracking-tight">{editingProfile ? 'Editar Perfil' : 'Novo Perfil'}</h1>
                        <button onClick={() => setView('gateway')} className="text-white/50 hover:text-white font-medium transition-colors">Cancelar</button>
                    </div>

                    <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-center md:items-start">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative group cursor-pointer w-40 h-40" onClick={() => setShowAvatarModal(true)}>
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary to-blue-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                <img src={selectedAvatar} className="relative w-full h-full object-cover rounded-2xl shadow-2xl ring-2 ring-white/10 group-hover:ring-primary transition-all duration-300 bg-surface" />
                                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px]">
                                    <span className="material-symbols-rounded text-4xl text-white">edit</span>
                                </div>
                            </div>
                            <p className="text-xs text-white/50 uppercase tracking-widest">Alterar Ícone</p>
                        </div>

                        <div className="flex-1 w-full space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-white/60 uppercase tracking-wider ml-1">Nome</label>
                                <input 
                                    type="text" 
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary transition-all font-display text-lg" 
                                    placeholder="Nome do Perfil" 
                                />
                            </div>

                            <div className="flex items-center justify-between group py-2 border-b border-white/10">
                                <div className="pr-4">
                                    <p className="text-base font-medium text-white">Perfil Infantil</p>
                                    <p className="text-xs text-white/40">Conteúdo até 12 anos.</p>
                                </div>
                                <div className="relative inline-block w-12 align-middle select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={isKidInput}
                                        onChange={(e) => setIsKidInput(e.target.checked)}
                                        className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-600 checked:right-0 checked:border-primary transition-all duration-300 left-0"
                                    />
                                    <div className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-300 ${isKidInput ? 'bg-primary' : 'bg-gray-700'}`}></div>
                                </div>
                            </div>

                            <div className="pt-6 flex flex-col sm:flex-row gap-4">
                                <button onClick={handleCreateOrUpdate} className="flex-1 bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]">Salvar</button>
                                {editingProfile && (
                                    <button onClick={handleDelete} className="flex-1 border border-white/10 text-white font-medium py-3.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95">Excluir</button>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
           </div>
       )}

       {/* DASHBOARD VIEW */}
       {view === 'dashboard' && dashboardProfile && (
           <div className="relative z-10 w-full min-h-screen flex-col animate-fade-in">
               <div className="sticky top-0 z-40 bg-background-dark/80 backdrop-blur-md border-b border-white/5 py-3 px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2 cursor-pointer hover:bg-white/10 p-2 rounded-lg transition-colors" onClick={() => setView('gateway')}>
                        <span className="material-symbols-rounded text-primary">arrow_back</span>
                        <span className="text-sm font-bold text-white/70 hover:text-white">Trocar Perfil</span>
                    </div>
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                        <img src={dashboardProfile.avatar} className="w-full h-full object-cover" />
                    </div>
               </div>

               <main className="max-w-3xl mx-auto w-full px-4 py-8 space-y-8">
                   <div className="flex flex-col items-center">
                       <div className="relative group">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-gray-500 to-gray-700 animate-pulse-glow">
                                <img src={dashboardProfile.avatar} className="w-full h-full rounded-full object-cover border-4 border-background-dark" />
                            </div>
                       </div>
                       <h1 className="mt-4 text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
                           {dashboardProfile.name}
                       </h1>
                       
                       <div className="mt-6 flex gap-3">
                            <button onClick={() => openEditor(dashboardProfile)} className="px-5 py-2 rounded-full bg-white/10 border border-white/10 hover:bg-white/20 text-sm font-medium transition-colors">Editar Perfil</button>
                            <button onClick={() => onProfileSelect(dashboardProfile)} className="px-5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-colors shadow-lg shadow-primary/20">Entrar no App</button>
                       </div>
                   </div>

                   <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center text-center border border-white/5">
                            <span className="text-2xl font-display font-bold text-white mb-1">{formatTime(dashboardProfile.total_watch_time)}</span>
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{getTimeLabel(dashboardProfile.total_watch_time)}</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center text-center border border-white/5">
                            <span className="text-2xl font-display font-bold text-white mb-1">{dashboardProfile.total_movies_watched}</span>
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Filmes</span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl flex flex-col items-center text-center border border-white/5">
                            <span className="text-2xl font-display font-bold text-white mb-1">{dashboardProfile.total_episodes_watched}</span>
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Séries</span>
                        </div>
                   </div>

                   <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/5">
                        <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2 text-white/90">
                            <span className="material-symbols-rounded text-primary">tune</span> Preferências
                        </h2>
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div><p className="text-sm font-medium">Autoplay</p><p className="text-xs text-white/40">Próximo episódio</p></div>
                                <div className="relative inline-block w-12 align-middle select-none">
                                    <input type="checkbox" className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-600 checked:right-0 checked:border-primary transition-all duration-300 left-0" checked readOnly/>
                                    <div className="block overflow-hidden h-6 rounded-full bg-primary cursor-pointer transition-colors duration-300"></div>
                                </div>
                            </div>
                        </div>
                   </div>
               </main>
           </div>
       )}
    </div>
  );
};

export default ProfileGateway;
