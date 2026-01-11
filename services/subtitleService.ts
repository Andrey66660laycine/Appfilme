
import { SubtitleCue, SubtitleResult } from '../types';

export const subtitleService = {
    
    // Converte tempo string (00:00:20,500) para segundos (20.5)
    parseTime: (timeString: string): number => {
        if (!timeString) return 0;
        const parts = timeString.replace(',', '.').split(':');
        if (parts.length === 3) {
            const h = parseFloat(parts[0]);
            const m = parseFloat(parts[1]);
            const s = parseFloat(parts[2]);
            return (h * 3600) + (m * 60) + s;
        }
        return 0;
    },

    // Parser simples para SRT e VTT
    parseSubtitle: async (url: string): Promise<SubtitleCue[]> => {
        try {
            const response = await fetch(url);
            const text = await response.text();
            const cues: SubtitleCue[] = [];
            
            // Normaliza quebras de linha
            const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            const blocks = normalized.split('\n\n');

            blocks.forEach(block => {
                const lines = block.split('\n');
                if (lines.length >= 2) {
                    // Tenta achar a linha de tempo (ex: 00:00:01,000 --> 00:00:04,000)
                    const timeLineIndex = lines.findIndex(l => l.includes('-->'));
                    
                    if (timeLineIndex !== -1) {
                        const times = lines[timeLineIndex].split('-->');
                        if (times.length === 2) {
                            const start = subtitleService.parseTime(times[0].trim());
                            const end = subtitleService.parseTime(times[1].trim());
                            
                            // O resto é texto
                            const textLines = lines.slice(timeLineIndex + 1);
                            const content = textLines.join('\n')
                                .replace(/<[^>]*>/g, '') // Remove tags HTML/VTT
                                .trim();

                            if (content && end > start) {
                                cues.push({ start, end, text: content });
                            }
                        }
                    }
                }
            });

            return cues;
        } catch (e) {
            console.error("Erro ao processar legenda:", e);
            return [];
        }
    },

    // Simula uma busca online. Em produção, conectaria a uma API como OpenSubtitles
    searchSubtitles: async (tmdbId: number, season?: number, episode?: number): Promise<SubtitleResult[]> => {
        // Simulação de delay de rede
        await new Promise(r => setTimeout(r, 1500));

        const baseMock: SubtitleResult[] = [
            {
                id: '1',
                language: 'Português (Brasil)',
                format: 'srt',
                filename: 'Legendado.PT-BR.Official.srt',
                // URL de exemplo funcional (Legenda do Sintel, filme open source)
                url: 'https://raw.githubusercontent.com/Andrey66660laycine/Appfilme/main/sample_sub_ptbr.srt' 
            },
            {
                id: '2',
                language: 'Inglês',
                format: 'srt',
                filename: 'English.Original.srt',
                url: 'https://raw.githubusercontent.com/Andrey66660laycine/Appfilme/main/sample_sub_en.srt'
            }
        ];

        // Se quiser usar uma API real no futuro, substitua aqui.
        // Por enquanto retornamos o mock para funcionar no frontend puro.
        return baseMock;
    }
};
