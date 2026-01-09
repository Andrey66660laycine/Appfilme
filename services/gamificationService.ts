
import { supabase } from './supabase';

export const gamificationService = {
    
    // Verifica e desbloqueia conquistas baseadas em eventos
    checkAchievements: async (profileId: string, eventType: 'finish_movie' | 'finish_episode' | 'late_night' | 'weekend') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !profileId) return;

            let achievementId = '';

            // 1. Lógica Night Owl (2am - 5am)
            if (eventType === 'late_night') {
                const hour = new Date().getHours();
                if (hour >= 2 && hour < 5) achievementId = 'night_owl';
            }

            // 2. Lógica Horror Fan (Verificado ao terminar filme)
            // Requer consulta ao histórico, simplificado aqui para demonstração
            // No app real, chamaria countGenre(27)
            
            // 3. Desbloqueio Genérico
            if (achievementId) {
                await gamificationService.unlock(user.id, profileId, achievementId);
            }

        } catch (e) {
            console.error("Gamification check failed", e);
        }
    },

    unlock: async (userId: string, profileId: string, achievementId: string) => {
        try {
            // Tenta inserir. Se já existir (devido a UNIQUE constraint), ignora.
            const { error } = await supabase.from('user_achievements').insert({
                user_id: userId,
                profile_id: profileId,
                achievement_id: achievementId
            });

            if (!error) {
                // Dispara evento global para mostrar Toast
                window.dispatchEvent(new CustomEvent('achievement_unlocked', { 
                    detail: { id: achievementId } 
                }));
            }
        } catch (e) {
            // Ignore duplicate errors silently
        }
    },

    getUnlocked: async (profileId: string) => {
        const { data } = await supabase
            .from('user_achievements')
            .select('*, achievements(*)')
            .eq('profile_id', profileId);
        return data || [];
    },

    getAll: async () => {
        const { data } = await supabase.from('achievements').select('*');
        return data || [];
    }
};
