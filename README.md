
# Void Max - Premium Streaming Interface

**Void Max** é uma aplicação web progressiva (PWA) de streaming de vídeo de alta fidelidade, projetada com foco em experiência de usuário (UX) premium, animações fluidas e integração profunda com APIs de metadados. O projeto atua como um front-end sofisticado que consome dados do TMDb e gerencia o estado do usuário via Supabase e LocalStorage.

---

## 🚀 Tecnologias Utilizadas

### Core
- **React 19**: Biblioteca de UI moderna com Hooks.
- **TypeScript**: Tipagem estática para robustez do código.
- **Vite**: Build tool de alta performance.
- **Tailwind CSS**: Estilização utilitária com foco em Dark Mode e design responsivo.

### Serviços & APIs
- **TMDb API (The Movie Database)**: Fonte de dados para filmes, séries, elenco, tendências e imagens.
- **Supabase**: Autenticação, Gerenciamento de Perfis e Gamificação (Conquistas).
- **Hls.js**: Suporte para reprodução de streaming adaptativo (HLS/.m3u8).

### Persistência
- **LocalStorage**: Cache agressivo para Histórico de Reprodução (resume), Minha Lista e Preferências para garantir velocidade e funcionamento offline parcial.
- **Supabase DB**: Dados críticos da conta e sincronização de perfis.

---

## ✨ Funcionalidades Principais

### 1. Interface & UX (Design System "Void")
- **Splash Screen Cinematográfica**: Animação de entrada com revelação de logo e efeitos de luz.
- **Design Glassmorphism**: Uso intensivo de desfoque (backdrop-filter), gradientes neon e transparências.
- **Animações Fluidas**: Transições de página, efeitos de hover, micro-interações e feedback tátil visual.
- **Dark Mode Nativo**: Interface otimizada para telas OLED/AMOLED.

### 2. Sistema de Usuário
- **Múltiplos Perfis**: Suporte para até 5 perfis por conta, com avatares personalizados (API DiceBear) e Modo Infantil.
- **Autenticação**: Login, Registro e Recuperação de senha via Supabase Auth.
- **Gamificação**: Sistema de Conquistas (ex: "Night Owl", "Maratonista") e estatísticas de uso no Dashboard do perfil.

### 3. Home & Descoberta
- **Hero Section Parallax**: Destaque principal com imagem de fundo imersiva e metadados.
- **Continuar Assistindo Inteligente**:
  - Card com barra de progresso neon baseada no tempo exato parado.
  - Sincronização via LocalStorage.
  - Botão de fechamento rápido.
- **Listas de Tendências**: Top 10 com numeração estilizada e carrosséis horizontais (snap-scroll).
- **AI Suggestion Modal**: Um "assistente" simulado que analisa o histórico local e sugere um filme com base em algoritmos de match (Neural Net visual fx).

### 4. Player de Vídeo Personalizado (CustomVideoPlayer)
- **Controles Touch/Gestos**:
  - Deslizar esquerda/direita para brilho e volume.
  - Duplo toque para avançar/retroceder (10s).
- **Funcionalidades Avançadas**:
  - **Resume Playback**: Restaura o vídeo no segundo exato onde parou.
  - **Smart Sniffer**: Lógica para detectar URLs de vídeo (.mp4, .m3u8, .txt) injetadas externamente.
  - **Multi-Servidor**: Alternância entre servidores (PlayerFlix / SuperFlix).
  - **Menu Lateral**: Lista de episódios da temporada ou recomendações sem sair do vídeo.
  - **Speed Control**: Controle de velocidade de reprodução.
  - **Lock Mode**: Bloqueio de toques acidentais na tela.

### 5. Detalhes de Conteúdo
- **Páginas de Filmes e Séries**:
  - Informações completas, elenco, trailers (YouTube Modal).
  - Botões de ação rápida: Assistir, Trailer, Minha Lista, Avaliar, Compartilhar.
- **Gerenciamento de Séries**:
  - Seletor de Temporadas.
  - Lista de episódios com indicador visual de progresso e "Visto".
- **Coleções**: Visualização de sagas completas ordenadas por lançamento.

### 6. Biblioteca & Pesquisa
- **Minha Lista**: Filtros por Filmes, Séries e "Não Vistos".
- **Modo de Gerenciamento**: Seleção em massa para remoção de itens.
- **Busca Global**: Pesquisa em tempo real com histórico recente salvo localmente e filtros por categoria (4K, Gêneros).

### 7. Integração Mobile / Android Bridge
O app possui *hooks* específicos (`window.receberVideo`, `window.Android`) para rodar dentro de uma WebView Android nativa, permitindo:
- Detecção de links de vídeo (Sniffer).
- Download de conteúdo para o dispositivo.
- Transmissão (Cast) nativa.
- Reprodução offline de arquivos locais.

---

## 📂 Estrutura de Arquivos

```
/
├── index.html              # Entry point com configurações PWA e Tailwind
├── src/
│   ├── App.tsx             # Roteamento principal, Contextos e Lógica Global (Sniffer)
│   ├── components/         # Componentes UI Reutilizáveis
│   │   ├── CustomVideoPlayer.tsx  # O coração do player de vídeo
│   │   ├── AISuggestionModal.tsx  # Modal de recomendação inteligente
│   │   ├── PaywallModal.tsx       # Simulação de monetização
│   │   └── ... (Cards, Modais, Splash)
│   ├── pages/              # Telas da aplicação
│   │   ├── Home.tsx        # Tela inicial com lógica de histórico
│   │   ├── MovieDetails.tsx
│   │   ├── TVDetails.tsx
│   │   ├── ProfileGateway.tsx # Gerenciamento de perfis
│   │   ├── Library.tsx     # Minha Lista
│   │   └── ...
│   ├── services/           # Camada de Dados
│   │   ├── tmdbService.ts  # Wrapper da API TMDb
│   │   ├── storageService.ts # Abstração do LocalStorage/Supabase
│   │   └── gamificationService.ts # Lógica de conquistas
│   └── types.ts            # Definições de Tipos TypeScript
└── ...config files         # Vite, Tailwind, TSConfig
```

## 🛠️ Como Executar

1. **Instalar Dependências:**
   ```bash
   npm install
   ```

2. **Rodar em Desenvolvimento:**
   ```bash
   npm run dev
   ```

3. **Build para Produção:**
   ```bash
   npm run build
   ```

---

> **Nota:** Este projeto utiliza chaves de API públicas (TMDb e Supabase) para fins de demonstração. Em um ambiente de produção real, estas chaves devem ser protegidas via variáveis de ambiente (`.env`) e Proxy Servers.
