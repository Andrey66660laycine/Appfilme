
import React, { useEffect } from 'react';

const PrivacyPolicy: React.FC = () => {
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-body p-6 md:p-12 animate-fade-in">
      <nav className="fixed top-0 left-0 w-full p-4 z-50 flex items-center bg-black/90 backdrop-blur-xl border-b border-white/10">
        <button 
          onClick={() => window.history.back()} 
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <span className="material-symbols-rounded">arrow_back</span>
          <span className="font-bold text-sm uppercase tracking-wider">Voltar</span>
        </button>
        <span className="ml-auto font-display font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">VOID MAX</span>
      </nav>

      <div className="max-w-3xl mx-auto mt-20 space-y-8 text-white/80 leading-relaxed">
        
        <header className="border-b border-white/10 pb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Política de Privacidade</h1>
          <p className="text-sm text-white/40">Última atualização: {new Date().toLocaleDateString()}</p>
        </header>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">1. Introdução</h2>
          <p>
            Bem-vindo ao Void Max. Comprometemo-nos a proteger a sua privacidade. Esta Política de Privacidade explica como coletamos, usamos e compartilhamos suas informações pessoais ao utilizar nosso aplicativo.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">2. Informações Coletadas</h2>
          <p>Coletamos o mínimo necessário para fornecer uma experiência de streaming personalizada:</p>
          <ul className="list-disc pl-5 space-y-2 text-white/60">
            <li><strong>Informações da Conta:</strong> Nome, e-mail e preferências de perfil (ex: modo infantil).</li>
            <li><strong>Dados de Uso:</strong> Histórico de visualização, lista de favoritos e progresso de reprodução para funcionalidades como "Continuar Assistindo".</li>
            <li><strong>Informações Técnicas:</strong> Tipo de dispositivo e endereço IP para segurança e otimização do player.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">3. Uso das Informações</h2>
          <p>Utilizamos seus dados exclusivamente para:</p>
          <ul className="list-disc pl-5 space-y-2 text-white/60">
            <li>Fornecer e manter o serviço funcional.</li>
            <li>Personalizar recomendações de conteúdo via IA.</li>
            <li>Sincronizar seu progresso entre dispositivos.</li>
            <li>Detectar e prevenir problemas técnicos ou fraudes.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">4. Conteúdo e Direitos Autorais</h2>
          <p>
            O Void Max atua como um indexador de conteúdo. Não hospedamos arquivos de vídeo em nossos servidores. O aplicativo utiliza APIs públicas (como TMDb) para metadados e incorpora players de terceiros. A disponibilidade do conteúdo pode variar e não temos controle sobre a remoção de vídeos por parte dos provedores externos.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">5. Segurança</h2>
          <p>
            Implementamos medidas de segurança robustas para proteger seus dados contra acesso não autorizado. No entanto, nenhum método de transmissão pela Internet é 100% seguro.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white">6. Contato</h2>
          <p>
            Se tiver dúvidas sobre esta política ou quiser solicitar a exclusão de seus dados, entre em contato através da opção "Reportar Bug" na tela inicial ou pelo e-mail de suporte.
          </p>
        </section>

        <footer className="pt-10 border-t border-white/10 text-center text-white/30 text-xs">
          <p>© {new Date().getFullYear()} Void Max Inc. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
