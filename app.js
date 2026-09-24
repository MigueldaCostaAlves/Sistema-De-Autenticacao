const views = document.querySelectorAll('.view');
const toast = document.querySelector('#toast');
const nav = document.querySelector('#main-nav');
let toastTimer;
let authMode = 'login';

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
  container.innerHTML = `
    <form class="auth-form" id="auth-form">
      <h1>${isRegistering ? 'Criar a tua conta' : 'Bem-vindo de volta'}</h1>
      <p>${isRegistering ? 'Começa a construir uma identidade segura.' : 'Entra para continuares para o teu painel.'}</p>
      ${isRegistering ? '<label class="field"><span>Nome</span><input name="name" type="text" placeholder="Como te chamas?" required /></label>' : ''}
      <label class="field"><span>Email</span><input name="email" type="email" placeholder="nome@exemplo.pt" required /></label>
      <label class="field"><span>Palavra-passe</span><input name="password" type="password" placeholder="Pelo menos 8 caracteres" minlength="8" required /></label>
      <div class="form-row">
        <label><input name="remember" type="checkbox" /> <span style="font-size: 10px; color: var(--muted)">Manter sessão</span></label>
        ${!isRegistering ? '<button class="text-button" data-action="recover" type="button">Esqueci-me da palavra-passe</button>' : ''}
      </div>
      <button class="button button-primary" type="submit">${isRegistering ? 'Criar conta' : 'Entrar'} <span>↗</span></button>
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
renderAuthForm('login');
