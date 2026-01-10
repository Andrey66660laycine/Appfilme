
# 🌌 Void Max - Premium Streaming Experience

**Void Max** é uma plataforma de streaming de vídeo de última geração, desenvolvida como uma **Progressive Web App (PWA)** com foco obsessivo em UX/UI, performance e estética cinematográfica. 

O projeto combina o poder do **React 19** com a riqueza de metadados do **TMDb**, oferecendo uma interface imersiva, "Dark Mode" nativo e um player de vídeo personalizado com suporte a gestos e integração híbrida (WebView/Android).

---

## ⚡ Tecnologias & Stack

### Core
- **React 19**: Renderização moderna e Hooks avançados.
- **TypeScript**: Tipagem estrita para segurança e escalabilidade.
- **Vite**: Build tool ultra-rápido com HMR.
- **Tailwind CSS**: Estilização utilitária com design system customizado.

### Integrações e Serviços
- **TMDb API (V3)**: Fonte de dados global para filmes, séries, elenco e imagens.
- **Supabase**: Backend-as-a-Service para autenticação, banco de dados (perfis) e lógica de gamificação.
- **Hls.js**: Motor de reprodução para streams adaptativos (.m3u8).

---

## ✨ Funcionalidades Principais

### 1. Interface & Design System ("Void OS")
- **Cinematic UI**: Uso intensivo de *Backdrop Blur* (Glassmorphism), gradientes neon e animações de partículas.
- **Splash Screen Dinâmica**: Tela de carregamento com efeitos de "scanner", textos técnicos rotativos e transições suaves.
- **Navegação Fluida**: Transições de página via CSS, efeitos de parallax em capas de filmes e micro-interações táteis.
- **Acessibilidade**: Foco em contraste para telas OLED/AMOLED e áreas de toque otimizadas para mobile.

### 2. Player de Vídeo Personalizado (`CustomVideoPlayer`)
O coração do Void Max. Um player HTML5 escrito do zero:
- **Smart Sniffer & Anti-Ad**: Lógica interna que valida a duração do vídeo para ignorar trailers falsos ou anúncios (< 5min) injetados por iframes.
- **Gestos Mobile**: 
  - Deslize vertical (Esquerda) -> Brilho.
  - Deslize vertical (Direita) -> Volume.
  - Duplo toque -> Avançar/Retroceder 10s.
- **Skip Intro Inteligente**: Botão que aparece automaticamente baseado em metadados da API (tempo de abertura) ou fallback manual.
- **Multi-Servidor**: Alternância em tempo real entre servidores (Superflix / Playerflix) com prioridade automática para o mais rápido.
- **Lock Mode**: Bloqueio de tela para evitar toques acidentais, com interface "furtiva" que desaparece totalmente.

### 3. Ecossistema de Usuário
- **Multi-Perfis**: Suporte a múltiplos perfis por conta, com avatares customizáveis e modo "Kids".
- **Sincronização de Progresso**: O app salva o segundo exato onde você parou (resume playback) localmente e na nuvem.
- **Minha Lista & Biblioteca**: Gerenciamento de favoritos com modo de edição em massa.
- **Gamificação**: Sistema de conquistas ("Night Owl", "Maratonista") que desbloqueia troféus no perfil do usuário.

### 4. Inteligência & Descoberta
- **AI Match Modal**: Um modal que simula uma "Neural Net" para recomendar um filme baseado no histórico de visualização do usuário e tendências atuais, filtrando o que já foi assistido.
- **Smart Continue Watching**: Carrossel inteligente que remove itens já finalizados (>95%) e agrupa episódios de séries.

### 5. Integração Nativa (Android Bridge)
O Void Max foi projetado para rodar dentro de um wrapper Android (WebView), expondo métodos globais na `window`:
- **`window.receberVideo(url)`**: Recebe URLs de vídeo interceptadas pelo app nativo (Sniffer).
- **`window.Android.download(...)`**: Envia solicitação de download para o gerenciador nativo do Android.
- **`window.Android.castVideo(...)`**: Aciona o protocolo de transmissão (Chromecast/DLNA) nativo.
- **`window.Android.setOrientation(...)`**: Força a rotação de tela (ex: Paisagem ao abrir o player).

---

## 📂 Estrutura do Projeto

```bash
src/
├── components/          # Componentes de UI (Player, Cards, Modais)
│   ├── CustomVideoPlayer.tsx # Player avançado com gestos e HLS
│   ├── SplashScreen.tsx      # Animação de entrada
│   └── ...
├── pages/               # Rotas da aplicação
│   ├── Home.tsx         # Hero section, carrosséis
│   ├── MovieDetails.tsx # Página de detalhes (Parallax)
│   ├── Library.tsx      # Gerenciamento de lista
│   ├── Downloads.tsx    # Interface para downloads nativos
│   └── ...
├── services/            # Lógica de negócios e APIs
│   ├── tmdbService.ts   # Wrapper tipado da API TMDb
│   ├── storageService.ts# Gerenciador de LocalStorage/Supabase
│   └── ...
├── App.tsx              # Roteamento, Contexto Global e Bridge Nativa
└── types.ts             # Definições de tipos (TypeScript)
```

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Chave de API do TMDb (Configurada em `tmdbService.ts`)
- Projeto Supabase (Configurado em `supabase.ts`)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/void-max.git
   cd void-max
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Build para Produção:**
   ```bash
   npm run build
   ```
   A pasta `dist` conterá os arquivos estáticos otimizados prontos para deploy (Vercel, Netlify) ou para serem empacotados em uma WebView.

---

## 📱 Protocolo de Bridge (Para Desenvolvedores Android)

Se você estiver criando o wrapper Android para este front-end, implemente a seguinte interface JavaScript (`JavascriptInterface`):

| Método JS | Descrição | Parâmetros |
| :--- | :--- | :--- |
| `Android.download(url, meta)` | Inicia download nativo | `url` (string), `meta` (JSON string) |
| `Android.castVideo(url, title)` | Inicia cast nativo | `url` (string), `title` (string) |
| `Android.setOrientation(mode)` | Força orientação | `mode`: 'landscape' \| 'portrait' \| 'auto' |
| `Android.stopSniffer()` | Pausa a captura de links | - |
| `Android.startSniffer()` | Retoma captura de links | - |
| `Android.getDownloads()` | Solicita lista de downloads | - |

**Callback do Front-end:**
O app Android deve injetar javascript para chamar `window.receberVideo(url)` quando detectar um vídeo válido, ou `window.updateDownloadList(json)` para atualizar a tela de downloads.

---

## ⚖️ Aviso Legal

Este projeto é uma interface de demonstração educacional ("Front-end"). Ele não hospeda nenhum arquivo de vídeo protegido por direitos autorais. Todo o conteúdo é proveniente de APIs públicas de metadados (TMDb) e embeds de terceiros fornecidos publicamente na web. O uso desta aplicação é de total responsabilidade do usuário final.
