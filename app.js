const views = document.querySelectorAll('.view');
const toast = document.querySelector('#toast');
const nav = document.querySelector('#main-nav');
let toastTimer;
let authMode = 'login';
let language = 'pt';

const translations = {
  pt: {
    nav: ['Visão geral', 'Segurança', 'Sessões'], demo: 'ambiente de demonstração', login: 'Entrar', register: 'Criar conta', existing: 'Já tenho uma conta',
    eyebrow: 'identidade para produtos que crescem', title: 'Acesso simples.', accent: 'Controlo absoluto.', hero: 'Uma fundação reutilizável para autenticar pessoas, dispositivos e serviços com clareza.', trust: 'Fluxos prontos para ligar à tua API', status: 'ESTADO DA IDENTIDADE', protected: 'Protegido por<br /><em>padrão.</em>', availability: 'disponibilidade', alerts: 'alertas ativos', checked: 'última verificação', now: 'agora mesmo', secure: '✓ sessão segura', built: 'construído para começar', caps: [['Autenticação', 'Login e registo'], ['Proteção', 'MFA e recuperação'], ['Visibilidade', 'Sessões e dispositivos'], ['Comando', 'Painel administrativo']], map: 'mapa do produto', security: 'Segurança por', layers: 'camadas.', securityText: 'Os blocos que vão formar o sistema completo, organizados para crescer com o projeto.', features: [['Login e registo', 'A porta de entrada para cada identidade.'], ['Recuperação', 'Recuperar o acesso sem fricção.'], ['MFA e OAuth', 'Decisões de acesso mais fortes.'], ['Admin e sessões', 'Uma visão clara de quem está ligado.']], tryFlow: 'Experimentar fluxo →', next: 'próxima fase', viewPanel: 'Ver painel →', panel: 'painel de controlo', your: 'As tuas', sessions: 'sessões.', sessionsText: 'Nesta fase os dados são apenas exemplos locais. Nada é guardado.', activity: 'ATIVIDADE RECENTE', devices: 'Dispositivos ligados', active: '2 ativas', thisDevice: 'Este dispositivo', current: 'sessão atual', revoke: 'Revogar', note: 'A revogação será ligada ao servidor quando a API for adicionada.', demoNote: 'Modo demonstração: nenhuma informação será guardada.'
  },
  en: {
    nav: ['Overview', 'Security', 'Sessions'], demo: 'demo environment', login: 'Log in', register: 'Create account', existing: 'I already have an account', eyebrow: 'identity for products that grow', title: 'Simple access.', accent: 'Total control.', hero: 'A reusable foundation for authenticating people, devices and services with clarity.', trust: 'Flows ready to connect to your API', status: 'IDENTITY STATUS', protected: 'Protected by<br /><em>default.</em>', availability: 'availability', alerts: 'active alerts', checked: 'last checked', now: 'just now', secure: '✓ secure session', built: 'built to start', caps: [['Authentication', 'Log in and sign up'], ['Protection', 'MFA and recovery'], ['Visibility', 'Sessions and devices'], ['Control', 'Admin panel']], map: 'product map', security: 'Security in', layers: 'layers.', securityText: 'The building blocks for the complete system, organised to grow with your project.', features: [['Log in and sign up', 'The entry point for every identity.'], ['Recovery', 'Restore access without friction.'], ['MFA and OAuth', 'Stronger access decisions.'], ['Admin and sessions', 'A clear view of who is connected.']], tryFlow: 'Try the flow →', next: 'next phase', viewPanel: 'View panel →', panel: 'control panel', your: 'Your', sessions: 'sessions.', sessionsText: 'At this stage the data is local example content. Nothing is stored.', activity: 'RECENT ACTIVITY', devices: 'Connected devices', active: '2 active', thisDevice: 'This device', current: 'current session', revoke: 'Revoke', note: 'Revocation will connect to the server when the API is added.', demoNote: 'Demo mode: no information will be stored.'
  }
};

function t(key) { return translations[language][key]; }

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function showView(viewName) {
  views.forEach((view) => view.classList.toggle('active', view.id === `view-${viewName}`));
  nav.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAuthForm(mode = authMode) {
  authMode = mode;
  const isRegistering = mode === 'register';
  const container = document.querySelector('#auth-form-container');
  const labels = language === 'pt'
    ? { title: isRegistering ? 'Criar a tua conta' : 'Bem-vindo de volta', text: isRegistering ? 'Começa a construir uma identidade segura.' : 'Entra para continuares para o teu painel.', name: 'Nome', namePlaceholder: 'Como te chamas?', email: 'Email', emailPlaceholder: 'nome@exemplo.pt', password: 'Palavra-passe', passwordPlaceholder: 'Pelo menos 8 caracteres', remember: 'Manter sessão', forgot: 'Esqueci-me da palavra-passe' }
    : { title: isRegistering ? 'Create your account' : 'Welcome back', text: isRegistering ? 'Start building a secure identity.' : 'Log in to continue to your dashboard.', name: 'Name', namePlaceholder: 'What should we call you?', email: 'Email', emailPlaceholder: 'name@example.com', password: 'Password', passwordPlaceholder: 'At least 8 characters', remember: 'Keep me signed in', forgot: 'Forgot password?' };
  container.innerHTML = `
    <form class="auth-form" id="auth-form">
      <h1>${labels.title}</h1>
      <p>${labels.text}</p>
      ${isRegistering ? `<label class="field"><span>${labels.name}</span><input name="name" type="text" placeholder="${labels.namePlaceholder}" required /></label>` : ''}
      <label class="field"><span>${labels.email}</span><input name="email" type="email" placeholder="${labels.emailPlaceholder}" required /></label>
      <label class="field"><span>${labels.password}</span><input name="password" type="password" placeholder="${labels.passwordPlaceholder}" minlength="8" required /></label>
      <div class="form-row">
        <label><input name="remember" type="checkbox" /> <span style="font-size: 10px; color: var(--muted)">${labels.remember}</span></label>
        ${!isRegistering ? `<button class="text-button" data-action="recover" type="button">${labels.forgot}</button>` : ''}
      </div><button class="button button-primary" type="submit">${isRegistering ? t('register') : t('login')} <span>↗</span></button>
    </form>`;
  document.querySelectorAll('.auth-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.auth === mode));
  container.querySelector('form').addEventListener('submit', handleAuthSubmit);
  container.querySelectorAll('[data-action="recover"]').forEach((button) => button.addEventListener('click', renderRecoveryForm));
}

function renderRecoveryForm() {
  document.querySelector('#auth-form-container').innerHTML = `
    <form class="auth-form" id="recovery-form">
      <h1>Recuperar acesso</h1>
      <p>Enviamos um link de demonstração para o teu email.</p>
      <label class="field"><span>Email</span><input name="email" type="email" placeholder="nome@exemplo.pt" required /></label>
      <button class="button button-primary" type="submit">Enviar link <span>↗</span></button>
      <button class="text-button" data-action="back-login" type="button">← Voltar ao login</button>
    </form>`;
  document.querySelector('#recovery-form').addEventListener('submit', (event) => {
    event.preventDefault();
    showToast('Link de recuperação simulado com sucesso.');
  });
  document.querySelector('[data-action="back-login"]').addEventListener('click', () => renderAuthForm('login'));
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name?.value || 'utilizador';
  showToast(authMode === 'register' ? `Conta de ${name} criada apenas nesta demonstração.` : 'Login simulado com sucesso.');
  showView('sessoes');
}

document.addEventListener('click', (event) => {
  const actionTarget = event.target.closest('[data-action]');
  const viewTarget = event.target.closest('[data-view]');
  const authTarget = event.target.closest('[data-auth]');
  if (viewTarget) showView(viewTarget.dataset.view);
  if (actionTarget?.dataset.action === 'open-login') { showView('auth'); renderAuthForm('login'); }
  if (actionTarget?.dataset.action === 'open-register') { showView('auth'); renderAuthForm('register'); }
  if (authTarget) renderAuthForm(authTarget.dataset.auth);
  if (actionTarget?.dataset.action === 'revoke-session') {
    actionTarget.closest('.session-row').remove();
    showToast('Sessão do iPhone revogada nesta demonstração.');
  }
});

document.querySelector('#menu-toggle').addEventListener('click', () => nav.classList.toggle('open'));

function applyLanguage() {
  const text = (selector, value) => { const element = document.querySelector(selector); if (element) element.textContent = value; };
  document.documentElement.lang = language === 'pt' ? 'pt-PT' : 'en-GB';
  document.querySelectorAll('.main-nav a').forEach((link, index) => { link.textContent = t('nav')[index]; });
  text('.topbar-meta span:last-child', t('demo')); text('.main-nav .button', t('login'));
  document.querySelector('.hero-copy .eyebrow').innerHTML = `<span></span> ${t('eyebrow')}`; document.querySelector('.hero-copy h1').innerHTML = `${t('title')}<br /><em>${t('accent')}</em>`;
  text('.hero-text', t('hero')); text('.hero-actions [data-action="open-register"]', `${t('register')} ↗`); text('.hero-actions [data-action="open-login"]', `${t('existing')} →`); text('.trust-line span', t('trust'));
  text('.card-kicker', t('status')); document.querySelector('.security-card h2').innerHTML = t('protected'); document.querySelectorAll('.metrics small')[0].textContent = t('availability'); document.querySelectorAll('.metrics small')[1].textContent = t('alerts'); text('.card-footer span', t('checked')); text('.card-footer b', t('now')); text('.chip', t('secure')); text('.strip-title', t('built'));
  document.querySelectorAll('.capability-strip > span:not(.strip-title)').forEach((item, index) => { item.querySelector('strong').textContent = t('caps')[index][0]; item.querySelector('small').textContent = t('caps')[index][1]; });
  document.querySelector('#view-seguranca .section-heading .eyebrow').innerHTML = `<span></span> ${t('map')}`; document.querySelector('#view-seguranca .section-heading h1').innerHTML = `${t('security')}<br /><em>${t('layers')}</em>`; text('#view-seguranca .section-heading > p:last-child', t('securityText'));
  document.querySelectorAll('.feature-card').forEach((card, index) => { card.querySelector('h2').textContent = t('features')[index][0]; card.querySelector('p').textContent = t('features')[index][1]; const action = card.querySelector('.text-button'); if (action) action.textContent = index === 0 ? t('tryFlow') : t('viewPanel'); const phase = card.querySelector('i'); if (phase) phase.textContent = t('next'); });
  document.querySelector('#view-sessoes .section-heading .eyebrow').innerHTML = `<span></span> ${t('panel')}`; document.querySelector('#view-sessoes .section-heading h1').innerHTML = `${t('your')} <em>${t('sessions')}</em>`; text('#view-sessoes .section-heading > p:last-child', t('sessionsText')); text('.dashboard-head small', t('activity')); text('.dashboard-head h2', t('devices')); text('.dashboard-head > b', t('active')); text('.session-row strong', t('thisDevice')); text('.session-row > i', t('current')); text('.revoke-button', t('revoke'));
  text('.demo-note', `◈ ${t('demoNote')}`); text('#language-toggle-label', language === 'pt' ? 'EN-UK' : 'PT-PT'); document.querySelector('#language-toggle').setAttribute('aria-label', language === 'pt' ? 'Mudar para inglês UK' : 'Mudar para português PT-PT');
  document.querySelectorAll('.auth-tab').forEach((tab) => { tab.textContent = tab.dataset.auth === 'login' ? t('login') : t('register'); });
  renderAuthForm(authMode);
}

document.querySelector('#language-toggle').addEventListener('click', () => { language = language === 'pt' ? 'en' : 'pt'; applyLanguage(); });

const themeToggle = document.querySelector('#theme-toggle');
const themeIcon = themeToggle.querySelector('.theme-toggle-icon');
const themeLabel = document.querySelector('#theme-toggle-label');

function updateThemeControl() {
  const isDark = document.body.dataset.theme === 'dark';
  themeIcon.textContent = isDark ? '☀' : '☾';
  themeLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
  themeToggle.setAttribute('aria-label', isDark ? 'Voltar ao light mode' : 'Ativar dark mode');
}

themeToggle.addEventListener('click', () => {
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  updateThemeControl();
});

updateThemeControl();
applyLanguage();
