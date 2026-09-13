/**
 * ==============================================================================
 * GORDINHOS FINANCEIRO - MOTOR DO APLICATIVO (ESTILO JUROSAPP)
 * ==============================================================================
 */

const STORAGE_KEY = 'gordinhos_financeiro_debtors_v2';
const AUTH_USER_KEY = 'gordinhos_financeiro_user_v1';
const AUTH_PASSWORD_KEY = 'gordinhos_financeiro_pwd_v1';
const AUTH_SESSION_KEY = 'gordinhos_financeiro_session_v1';
const DEFAULT_USER = 'admin';
const DEFAULT_PASSWORD = '1234';

let appUsername = localStorage.getItem(AUTH_USER_KEY) || DEFAULT_USER;
let appPassword = localStorage.getItem(AUTH_PASSWORD_KEY) || DEFAULT_PASSWORD;
let debtors = [];
let currentFilter = 'all';
let searchQuery = '';
let activeDebtorForAction = null;

// ==============================================================================
// INICIALIZAÇÃO E SEGURANÇA (AUTENTICAÇÃO)
// ==============================================================================

function initializeApp() {
  try {
    initAuthSystem();
    initDateInput();
    loadData();
    setupEventListeners();
    updateLivePreview();
    render();
  } catch (err) {
    console.error('Erro na inicialização do sistema:', err);
  }
}

function listenForAuthSync() {
  if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
    try {
      window.firebaseDb.ref('config/appUsername').on('value', (snapshot) => {
        const cloudUser = snapshot.val();
        if (cloudUser && typeof cloudUser === 'string' && cloudUser.trim() !== '') {
          appUsername = cloudUser.trim();
          localStorage.setItem(AUTH_USER_KEY, appUsername);
          console.log('🔒 Usuário sincronizado via Realtime Database:', appUsername);
        }
      });

      window.firebaseDb.ref('config/appPassword').on('value', (snapshot) => {
        const cloudPwd = snapshot.val();
        if (cloudPwd && typeof cloudPwd === 'string' && cloudPwd.trim() !== '') {
          appPassword = cloudPwd;
          localStorage.setItem(AUTH_PASSWORD_KEY, cloudPwd);
          console.log('🔒 Senha sincronizada via Realtime Database');
        }
      });
    } catch (e) {
      console.warn('Erro ao escutar credenciais no Firebase:', e);
    }
  }
}

function setAppCredentials(newUser, newPassword) {
  if (newUser && newUser.trim() !== '') {
    appUsername = newUser.trim();
    localStorage.setItem(AUTH_USER_KEY, appUsername);
  }
  if (newPassword && newPassword.trim() !== '') {
    appPassword = newPassword;
    localStorage.setItem(AUTH_PASSWORD_KEY, newPassword);
  }

  if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
    try {
      window.firebaseDb.ref('config/appUsername').set(appUsername);
      window.firebaseDb.ref('config/appPassword').set(appPassword).then(() => {
        console.log('☁️ Usuário e Senha sincronizados no Realtime Database com sucesso!');
      }).catch(err => {
        console.warn('Aviso Realtime Database ao salvar credenciais:', err.message);
      });
    } catch (e) {
      console.warn('Erro ao salvar credenciais no Firebase:', e);
    }
  }
}

function unlockApp() {
  const lockScreen = document.getElementById('authLockScreen');
  if (lockScreen) {
    lockScreen.classList.add('unlocked');
  }
  sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
}

function lockApp() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);

  const lockScreen = document.getElementById('authLockScreen');
  if (lockScreen) {
    lockScreen.classList.remove('unlocked');
  }

  const loginCard = document.getElementById('authLoginCard');
  const changePwdCard = document.getElementById('authChangePwdCard');
  if (loginCard) loginCard.style.display = 'block';
  if (changePwdCard) changePwdCard.style.display = 'none';

  const userInput = document.getElementById('authUsernameInput');
  const pwdInput = document.getElementById('authPasswordInput');
  if (userInput) userInput.value = appUsername;
  if (pwdInput) {
    pwdInput.value = '';
    setTimeout(() => pwdInput.focus(), 150);
  }

  const errEl = document.getElementById('authLoginError');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('active');
  }
}

function initAuthSystem() {
  listenForAuthSync();

  const isLoggedSession = sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
  const lockScreen = document.getElementById('authLockScreen');

  if (isLoggedSession) {
    if (lockScreen) lockScreen.classList.add('unlocked');
  } else {
    if (lockScreen) lockScreen.classList.remove('unlocked');
    const userInput = document.getElementById('authUsernameInput');
    const pwdInput = document.getElementById('authPasswordInput');
    if (userInput) userInput.value = appUsername;
    if (pwdInput) setTimeout(() => pwdInput.focus(), 250);
  }

  // Alternar visibilidade da senha (olho)
  const btnToggle = document.getElementById('btnToggleAuthPwd');
  const pwdInput = document.getElementById('authPasswordInput');
  const iconEyeOpen = document.getElementById('iconEyeOpen');
  const iconEyeClosed = document.getElementById('iconEyeClosed');

  if (btnToggle && pwdInput) {
    btnToggle.addEventListener('click', () => {
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (iconEyeOpen) iconEyeOpen.style.display = 'none';
        if (iconEyeClosed) iconEyeClosed.style.display = 'block';
      } else {
        pwdInput.type = 'password';
        if (iconEyeOpen) iconEyeOpen.style.display = 'block';
        if (iconEyeClosed) iconEyeClosed.style.display = 'none';
      }
    });
  }

  // Formulário de Login na Tela de Bloqueio
  const formLogin = document.getElementById('formAuthLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const typedUser = (document.getElementById('authUsernameInput').value || '').trim();
      const typedPwd = pwdInput ? pwdInput.value : '';
      const errEl = document.getElementById('authLoginError');

      const isUserMatch = typedUser.toLowerCase() === appUsername.toLowerCase();
      const isPwdMatch = typedPwd === appPassword;

      if (isUserMatch && isPwdMatch) {
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('active');
        }
        unlockApp();
        showToast('Login efetuado com sucesso!', 'success');
      } else {
        if (errEl) {
          errEl.textContent = 'Usuário ou senha incorretos! Tente novamente.';
          errEl.classList.add('active');
        }
        if (pwdInput) {
          pwdInput.classList.add('shake-anim');
          setTimeout(() => pwdInput.classList.remove('shake-anim'), 400);
          pwdInput.select();
        }
      }
    });
  }

  // Alternar para Card de Alterar Senha na Tela de Bloqueio
  const btnSwitchToChange = document.getElementById('btnSwitchToChangePwd');
  const btnCancelChange = document.getElementById('btnCancelChangePwdScreen');
  const loginCard = document.getElementById('authLoginCard');
  const changePwdCard = document.getElementById('authChangePwdCard');

  if (btnSwitchToChange && loginCard && changePwdCard) {
    btnSwitchToChange.addEventListener('click', () => {
      loginCard.style.display = 'none';
      changePwdCard.style.display = 'block';
      const curUserEl = document.getElementById('screenNewUser');
      if (curUserEl) curUserEl.value = appUsername;
      const curInput = document.getElementById('screenCurrentPwd');
      if (curInput) setTimeout(() => curInput.focus(), 100);
    });
  }

  if (btnCancelChange && loginCard && changePwdCard) {
    btnCancelChange.addEventListener('click', () => {
      changePwdCard.style.display = 'none';
      loginCard.style.display = 'block';
      const errEl = document.getElementById('screenChangePwdError');
      if (errEl) errEl.classList.remove('active');
      if (pwdInput) setTimeout(() => pwdInput.focus(), 100);
    });
  }

  // Salvar alteração de login e senha pela tela de bloqueio
  const formChangeScreen = document.getElementById('formAuthChangePwdScreen');
  if (formChangeScreen) {
    formChangeScreen.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = document.getElementById('screenCurrentPwd').value;
      const nwUser = (document.getElementById('screenNewUser').value || '').trim();
      const nw = document.getElementById('screenNewPwd').value;
      const cf = document.getElementById('screenConfirmPwd').value;
      const errEl = document.getElementById('screenChangePwdError');

      if (cur !== appPassword) {
        if (errEl) {
          errEl.textContent = 'A senha atual digitada está incorreta.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nwUser.length < 2) {
        if (errEl) {
          errEl.textContent = 'O usuário deve ter pelo menos 2 caracteres.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nw.length < 3) {
        if (errEl) {
          errEl.textContent = 'A nova senha deve ter pelo menos 3 dígitos.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nw !== cf) {
        if (errEl) {
          errEl.textContent = 'A confirmação de senha não confere.';
          errEl.classList.add('active');
        }
        return;
      }

      setAppCredentials(nwUser, nw);
      if (errEl) errEl.classList.remove('active');
      formChangeScreen.reset();
      changePwdCard.style.display = 'none';
      loginCard.style.display = 'block';

      const userInput = document.getElementById('authUsernameInput');
      if (userInput) userInput.value = nwUser;
      if (pwdInput) {
        pwdInput.value = nw;
        pwdInput.focus();
      }
      showToast('Login e Senha atualizados com sucesso!', 'success');
    });
  }

  // Botão de Bloquear no Topo (Header)
  const btnHeaderLock = document.getElementById('btnHeaderLock');
  if (btnHeaderLock) {
    btnHeaderLock.addEventListener('click', () => {
      lockApp();
      showToast('Aplicativo bloqueado!', 'info');
    });
  }

  // Botão de Bloquear dentro da aba Mais
  const btnLockAppInside = document.getElementById('btnLockAppInside');
  if (btnLockAppInside) {
    btnLockAppInside.addEventListener('click', () => {
      lockApp();
      showToast('Aplicativo bloqueado!', 'info');
    });
  }

  // Função global para abrir modal de alterar senha dentro do app
  function openChangePasswordModal() {
    openModal('modalChangePassword');
    const errEl = document.getElementById('modalChangePwdError');
    if (errEl) {
      errEl.textContent = '';
      errEl.classList.remove('active');
    }
    const curInput = document.getElementById('modalCurrentPassword');
    const userEl = document.getElementById('modalNewUsername');
    if (userEl) userEl.value = appUsername;
    if (curInput) {
      curInput.value = '';
      setTimeout(() => curInput.focus(), 150);
    }
    const newPwdEl = document.getElementById('modalNewPassword');
    if (newPwdEl) newPwdEl.value = '';
    const confPwdEl = document.getElementById('modalConfirmPassword');
    if (confPwdEl) confPwdEl.value = '';
  }
  window.openChangePasswordModal = openChangePasswordModal;

  const btnOpenChangeModal = document.getElementById('btnOpenChangePasswordModal');
  if (btnOpenChangeModal) {
    btnOpenChangeModal.addEventListener('click', openChangePasswordModal);
  }

  // Salvar alteração de senha pelo modal interno
  const formModalChange = document.getElementById('formModalChangePassword');
  if (formModalChange) {
    formModalChange.addEventListener('submit', (e) => {
      e.preventDefault();
      const cur = document.getElementById('modalCurrentPassword').value;
      const nwUser = (document.getElementById('modalNewUsername').value || '').trim();
      const nw = document.getElementById('modalNewPassword').value;
      const cf = document.getElementById('modalConfirmPassword').value;
      const errEl = document.getElementById('modalChangePwdError');

      if (cur !== appPassword) {
        if (errEl) {
          errEl.textContent = 'A senha atual digitada está incorreta.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nwUser.length < 2) {
        if (errEl) {
          errEl.textContent = 'O usuário deve ter pelo menos 2 caracteres.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nw.length < 3) {
        if (errEl) {
          errEl.textContent = 'A nova senha deve ter pelo menos 3 dígitos.';
          errEl.classList.add('active');
        }
        return;
      }

      if (nw !== cf) {
        if (errEl) {
          errEl.textContent = 'A confirmação de senha não confere.';
          errEl.classList.add('active');
        }
        return;
      }

      setAppCredentials(nwUser, nw);
      if (errEl) errEl.classList.remove('active');
      closeModal('modalChangePassword');
      showToast('Login e Senha atualizados e sincronizados!', 'success');
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

function initDateInput() {
  const dateInput = document.getElementById('debtorStartDate');
  if (dateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.value = tomorrow.toISOString().split('T')[0];
  }
}

// ==============================================================================
// DADOS E PERSISTÊNCIA (COM CARREGAMENTO IMEDIATO DO FIREBASE REALTIME DATABASE)
// ==============================================================================

function normalizeDebtor(d) {
  if (!d || typeof d !== 'object') return d;
  if (d.installments && typeof d.installments === 'object' && !Array.isArray(d.installments)) {
    d.installments = Object.values(d.installments);
  }
  if (!Array.isArray(d.installments)) {
    d.installments = [];
  }
  if (d.interestPayments && typeof d.interestPayments === 'object' && !Array.isArray(d.interestPayments)) {
    d.interestPayments = Object.values(d.interestPayments);
  }
  if (!Array.isArray(d.interestPayments)) {
    d.interestPayments = [];
  }
  return d;
}

function extractYearMonth(dateVal) {
  if (!dateVal) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }
  const str = String(dateVal).split('T')[0].trim();
  if (str.includes('/')) {
    const p = str.split('/');
    if (p.length === 3) {
      if (p[2].length === 4) {
        return { year: parseInt(p[2], 10), month: parseInt(p[1], 10) };
      } else if (p[0].length === 4) {
        return { year: parseInt(p[0], 10), month: parseInt(p[1], 10) };
      }
    }
  }
  if (str.includes('-')) {
    const p = str.split('-');
    if (p.length >= 2) {
      if (p[0].length === 4) {
        return { year: parseInt(p[0], 10), month: parseInt(p[1], 10) };
      } else if (p[2] && p[2].length === 4) {
        return { year: parseInt(p[2], 10), month: parseInt(p[1], 10) };
      }
    }
  }
  const parsed = new Date(dateVal);
  if (!isNaN(parsed.getTime())) {
    return { year: parsed.getFullYear(), month: parsed.getMonth() + 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

let isFirebaseInitialLoadComplete = false;

function processIncomingFirebaseDebtors(cloudData) {
  isFirebaseInitialLoadComplete = true;
  if (!cloudData) {
    console.log('☁️ Firebase conectado: Nenhum registro no nó /debtors.');
    return;
  }
  let list = [];
  if (Array.isArray(cloudData)) {
    list = cloudData.filter(d => d && typeof d === 'object' && d.name);
  } else if (typeof cloudData === 'object') {
    list = Object.values(cloudData).filter(d => d && typeof d === 'object' && d.name);
  }
  if (list.length > 0) {
    debtors = list.map(normalizeDebtor);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(debtors));
    render();
    console.log('☁️ Clientes carregados do Firebase com sucesso! Total:', debtors.length);
  }
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        debtors = parsed.filter(d => d && typeof d === 'object' && d.name).map(normalizeDebtor);
      }
    } catch (e) {
      console.error('Erro ao ler dados salvos:', e);
      debtors = [];
    }
  }

  // 1. CARREGAMENTO IMEDIATO VIA REST NA ABERTURA DO SITE (SEM CACHE)
  fetch('https://gordinhos-finacneiro-default-rtdb.firebaseio.com/debtors.json', { cache: 'no-store' })
    .then(res => res.json())
    .then(cloudData => {
      if (cloudData) {
        processIncomingFirebaseDebtors(cloudData);
      } else {
        isFirebaseInitialLoadComplete = true;
      }
    })
    .catch(err => {
      console.info('Conexão Firebase REST aguardando SDK:', err.message);
    });

  // 2. CONEXÃO CONTÍNUA EM TEMPO REAL VIA SDK
  syncWithRealtimeDatabase();
}

function saveData() {
  // Filtra dados válidos antes de salvar
  debtors = debtors.filter(d => d && typeof d === 'object' && d.name);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debtors));

  // Proteção: não grava lista vazia se a carga do Firebase ainda não foi concluída
  if (!isFirebaseInitialLoadComplete && debtors.length === 0) {
    console.warn('⚠️ Carga inicial do Firebase em andamento. Gravação bloqueada para proteger o banco.');
    return;
  }

  // Salva no Firebase Realtime Database
  if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
    try {
      window.firebaseDb.ref('debtors').set(debtors).then(() => {
        console.log('☁️ Registros salvos no Realtime Database com sucesso! Total:', debtors.length);
      }).catch(err => {
        console.warn('Aviso Realtime Database:', err.message);
      });
    } catch (e) {
      console.warn('Erro ao salvar no Realtime Database:', e);
    }
  }
}

function syncWithRealtimeDatabase() {
  if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
    try {
      window.firebaseDb.ref('debtors').on('value', (snapshot) => {
        isFirebaseInitialLoadComplete = true;
        const cloudData = snapshot.val();
        if (cloudData) {
          processIncomingFirebaseDebtors(cloudData);
        }
      }, (error) => {
        console.info('Aviso conexão Realtime Database:', error.message);
      });
    } catch (e) {
      console.warn('Erro ao escutar Realtime Database:', e);
    }
  }
}

function loadSampleData() {
  const today = new Date();
  
  // Datas para simulação
  const overdueDate = new Date(today);
  overdueDate.setDate(today.getDate() - 5);

  const todayDate = new Date(today);

  const futureDate1 = new Date(today);
  futureDate1.setDate(today.getDate() + 3);

  const futureDate2 = new Date(today);
  futureDate2.setDate(today.getDate() + 10);

  const futureDate3 = new Date(today);
  futureDate3.setDate(today.getDate() + 18);

  debtors = [
    {
      id: 'deb-sample-1',
      name: 'Lulu',
      phone: '11988887777',
      principal: 1000,
      interestRate: 30,
      installmentsCount: 20,
      isDaily: true,
      startDate: futureDate1.toISOString().split('T')[0],
      notes: 'Banca comercial',
      createdAt: new Date().toISOString(),
      totalAmount: 1300, // 1000 + 30% = 1300
      installmentAmount: 65,
      installments: generateDailyInstallments(1000, 1300, 20, futureDate1.toISOString().split('T')[0])
    },
    {
      id: 'deb-sample-2',
      name: 'Ana Souza',
      phone: '21977776666',
      principal: 1500,
      interestRate: 30,
      installmentsCount: 30,
      isDaily: true,
      startDate: todayDate.toISOString().split('T')[0],
      notes: 'Diária comercial',
      createdAt: new Date().toISOString(),
      totalAmount: 1950, // 1500 + 30% = 1950
      installmentAmount: 65,
      installments: generateDailyInstallments(1500, 1950, 30, todayDate.toISOString().split('T')[0])
    },
    {
      id: 'deb-sample-3',
      name: 'Bruno Lima',
      phone: '31966665555',
      principal: 2000,
      interestRate: 30,
      installmentsCount: 3,
      isDaily: false,
      startDate: futureDate2.toISOString().split('T')[0],
      notes: 'Contrato mensal',
      createdAt: new Date().toISOString(),
      totalAmount: 3800,
      installmentAmount: 1266.67,
      installments: generateMonthlyInstallments(2000, 3800, 3, futureDate2.toISOString().split('T')[0])
    },
    {
      id: 'deb-sample-4',
      name: 'Carla Dias',
      phone: '41955554444',
      principal: 800,
      interestRate: 30,
      installmentsCount: 15,
      isDaily: true,
      startDate: futureDate3.toISOString().split('T')[0],
      notes: 'Diária autônoma',
      createdAt: new Date().toISOString(),
      totalAmount: 1040,
      installmentAmount: 69.33,
      installments: generateDailyInstallments(800, 1040, 15, futureDate3.toISOString().split('T')[0])
    },
    {
      id: 'deb-sample-5',
      name: 'Diego Rocha',
      phone: '51944443333',
      principal: 2500,
      interestRate: 30,
      installmentsCount: 4,
      isDaily: false,
      startDate: overdueDate.toISOString().split('T')[0],
      notes: 'Parcela em atraso há 5 dias',
      createdAt: new Date().toISOString(),
      totalAmount: 5500,
      installmentAmount: 1375,
      installments: [
        { number: 1, dueDate: overdueDate.toISOString().split('T')[0], amount: 1375, paid: false, paidAt: null },
        { number: 2, dueDate: addMonths(overdueDate, 1), amount: 1375, paid: false, paidAt: null },
        { number: 3, dueDate: addMonths(overdueDate, 2), amount: 1375, paid: false, paidAt: null },
        { number: 4, dueDate: addMonths(overdueDate, 3), amount: 1375, paid: false, paidAt: null }
      ]
    }
  ];

  // ATENÇÃO: NUNCA grava automaticamente no Firebase para proteger dados reais!
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debtors));
  render();
}

// ==============================================================================
// HELPERS DE CÁLCULO E DATAS
// ==============================================================================

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateBR(dateStr) {
  if (!dateStr) return '--';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatCurrency(val) {
  return Number(val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function addMonths(dateInput, months) {
  if (!dateInput) return getTodayString();
  let y, m, d;
  if (typeof dateInput === 'string') {
    const clean = dateInput.split('T')[0];
    const parts = clean.split('-').map(Number);
    if (parts.length === 3) {
      [y, m, d] = parts;
    } else {
      const dt = new Date(dateInput);
      y = dt.getFullYear();
      m = dt.getMonth() + 1;
      d = dt.getDate();
    }
  } else if (dateInput instanceof Date) {
    y = dateInput.getFullYear();
    m = dateInput.getMonth() + 1;
    d = dateInput.getDate();
  } else {
    return String(dateInput);
  }

  const dt = new Date(y, m - 1 + months, 1);
  const maxDaysInTargetMonth = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  const resD = Math.min(d, maxDaysInTargetMonth);
  dt.setDate(resD);

  const resY = dt.getFullYear();
  const resM = String(dt.getMonth() + 1).padStart(2, '0');
  const resDay = String(dt.getDate()).padStart(2, '0');
  return `${resY}-${resM}-${resDay}`;
}

function addDays(dateStr, days) {
  const [year, month, day] = String(dateStr).split('-').map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function getDaysDiff(dateStrA, dateStrB) {
  if (!dateStrA || !dateStrB) return 0;
  try {
    const cleanA = String(dateStrA).split('T')[0];
    const cleanB = String(dateStrB).split('T')[0];
    const [yA, mA, dA] = cleanA.split('-').map(Number);
    const [yB, mB, dB] = cleanB.split('-').map(Number);
    const d1 = new Date(yA, mA - 1, dA);
    const d2 = new Date(yB, mB - 1, dB);
    const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));
    return isNaN(diffDays) ? 0 : diffDays;
  } catch (e) {
    return 0;
  }
}

function generateDailyInstallments(principal, totalAmount, count, startDate) {
  const list = [];
  const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
  let remainingTotal = totalAmount;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? Math.round(remainingTotal * 100) / 100 : installmentAmount;
    remainingTotal -= amount;

    list.push({
      number: i + 1,
      dueDate: addDays(startDate, i),
      amount: amount,
      paid: false,
      paidAt: null
    });
  }
  return list;
}

function generateMonthlyInstallments(principal, totalAmount, count, startDate) {
  const list = [];
  const installmentAmount = Math.round((totalAmount / count) * 100) / 100;
  let remainingTotal = totalAmount;

  const [startYear, startMonth, startDay] = String(startDate).split('-').map(Number);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? Math.round(remainingTotal * 100) / 100 : installmentAmount;
    remainingTotal -= amount;

    const d = new Date(startYear, (startMonth - 1) + i, startDay);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');

    list.push({
      number: i + 1,
      dueDate: `${y}-${m}-${da}`,
      amount: amount,
      paid: false,
      paidAt: null
    });
  }
  return list;
}

function evaluateDebtorStatus(debtor) {
  if (!debtor || typeof debtor !== 'object') {
    return {
      status: 'none',
      label: '',
      pillClass: '',
      nextInstallment: null,
      daysOverdue: 0,
      paidCount: 0,
      totalCount: 0,
      remainingBalance: 0
    };
  }

  const todayStr = getTodayString();
  const installments = Array.isArray(debtor.installments) ? debtor.installments : [];
  const unpaidInstallments = installments.filter(i => !i.paid);
  const paidCount = installments.filter(i => i.paid).length;
  const totalCount = installments.length || 1;

  if (unpaidInstallments.length === 0) {
    return {
      status: 'completed',
      label: 'QUITADO',
      pillClass: 'status-quitado',
      nextInstallment: null,
      daysOverdue: 0,
      paidCount,
      totalCount,
      remainingBalance: 0
    };
  }

  const next = unpaidInstallments[0];
  const daysDiff = getDaysDiff(next.dueDate, todayStr);
  const remainingBalance = unpaidInstallments.reduce((acc, curr) => acc + curr.amount, 0);

  if (daysDiff < 0) {
    const daysOverdue = Math.abs(daysDiff);
    return {
      status: 'overdue',
      label: `VENCIDO (${daysOverdue}d)`,
      pillClass: 'status-vencido',
      nextInstallment: next,
      daysOverdue,
      paidCount,
      totalCount,
      remainingBalance
    };
  } else if (daysDiff === 0) {
    return {
      status: 'due_today',
      label: 'VENCE HOJE',
      pillClass: 'status-vence-hoje',
      nextInstallment: next,
      daysOverdue: 0,
      paidCount,
      totalCount,
      remainingBalance
    };
  } else {
    return {
      status: 'on_time',
      label: 'ATIVO',
      pillClass: 'status-ativo',
      nextInstallment: next,
      daysOverdue: 0,
      paidCount,
      totalCount,
      remainingBalance
    };
  }
}

// ==============================================================================
// SIMULAÇÃO INSTANTÂNEA NO FORMULÁRIO (COM REGRA DE DIÁRIA DE 30%)
// ==============================================================================

function updateLivePreview() {
  const principal = parseFloat(document.getElementById('debtorAmount').value) || 0;
  const interestRate = parseFloat(document.getElementById('debtorInterest').value) || 0;
  const isDaily = document.getElementById('debtorIsDaily').checked;

  const containerMonthly = document.getElementById('containerMonthlyInstallments');
  const containerDaily = document.getElementById('containerDailyDays');
  if (containerMonthly && containerDaily) {
    if (isDaily) {
      containerDaily.style.display = 'block';
      containerMonthly.style.display = 'none';
    } else {
      containerDaily.style.display = 'none';
      containerMonthly.style.display = 'block';
    }
  }

  if (principal <= 0) {
    document.getElementById('previewInterestVal').textContent = 'R$ 0,00';
    document.getElementById('previewTotalVal').textContent = 'R$ 0,00';
    document.getElementById('previewInstallmentVal').textContent = 'R$ 0,00';
    document.getElementById('previewDetailText').textContent = 'Preencha os dados acima para simular.';
    return;
  }

  let totalInterest = 0;
  let totalAmount = 0;
  let installmentVal = 0;

  if (isDaily) {
    // Regra da Diária: Total = Principal + (Principal * taxa / 100)
    // Ex: R$ 1.000 com 30% = R$ 1.300,00 total, dividido pela quantidade de dias escolhida!
    const days = parseInt(document.getElementById('debtorDailyDays').value, 10) || 1;
    totalInterest = principal * (interestRate / 100);
    totalAmount = principal + totalInterest;
    installmentVal = totalAmount / days;

    document.getElementById('previewDetailText').innerHTML = 
      `⚡ Diária: <strong>${formatCurrency(totalAmount)}</strong> em <strong>${days} dias</strong> (${formatCurrency(installmentVal)}/dia).`;
  } else {
    // Mensal: taxa mensal multiplicada pela quantidade de parcelas
    const installments = parseInt(document.getElementById('debtorInstallments').value, 10) || 1;
    totalInterest = principal * (interestRate / 100) * installments;
    totalAmount = principal + totalInterest;
    installmentVal = totalAmount / installments;

    document.getElementById('previewDetailText').innerHTML = 
      `🗓️ Mensal: ${installments}x de ${formatCurrency(installmentVal)} (${interestRate}% ao mês).`;
  }

  document.getElementById('previewInterestVal').textContent = formatCurrency(totalInterest);
  document.getElementById('previewTotalVal').textContent = formatCurrency(totalAmount);
  document.getElementById('previewInstallmentVal').textContent = formatCurrency(installmentVal);
}

// ==============================================================================
// RENDERIZAÇÃO DA INTERFACE (JUROSAPP)
// ==============================================================================

function render() {
  renderMetricsBar();
  renderClientsList();
  renderDashboardOverview();
  renderCobrancasFocus();
}

/**
 * Renderiza os 3 contadores do topo da tela Clientes (como na foto)
 */
function renderMetricsBar() {
  const validDebtors = debtors.filter(d => d && typeof d === 'object' && d.name);
  let totalClients = validDebtors.length;
  let activeClients = 0;
  let overdueClients = 0;

  validDebtors.forEach(debtor => {
    const info = evaluateDebtorStatus(debtor);
    if (info.status === 'overdue') {
      overdueClients++;
    } else {
      activeClients++;
    }
  });

  document.getElementById('metricTotalClients').textContent = totalClients;
  document.getElementById('metricActiveClients').textContent = activeClients;
  document.getElementById('metricOverdueClients').textContent = overdueClients;
}

let selectedProfitYear = 'all';
let selectedProfitMonth = 'all';

function getRealizedProfitEntries(filterYear, filterMonth) {
  const entries = [];
  const validDebtors = debtors.filter(d => d && typeof d === 'object' && d.name);

  validDebtors.forEach(d => {
    normalizeDebtor(d);
    const principal = parseFloat(d.principal) || 0;
    const totalAmount = parseFloat(d.totalAmount) || 0;
    const instList = Array.isArray(d.installments) ? d.installments : [];
    const count = parseInt(d.installmentsCount, 10) || (instList.length > 0 ? instList.length : 1) || 1;
    const interestRate = parseFloat(d.interestRate) || 0;

    // Cálculo do lucro proporcional por parcela
    let profitPerInstallment = 0;
    if (totalAmount > principal && count > 0) {
      profitPerInstallment = (totalAmount - principal) / count;
    } else if (principal > 0 && interestRate > 0) {
      profitPerInstallment = d.isDaily ? (principal * (interestRate / 100)) / count : (principal * (interestRate / 100));
    }
    profitPerInstallment = Math.round(profitPerInstallment * 100) / 100;

    // 1. Parcelas que receberam baixa (inst.paid === true)
    instList.forEach(inst => {
      if (inst && (inst.paid === true || inst.paid === 'true')) {
        let thisInstProfit = profitPerInstallment;
        if (thisInstProfit <= 0 && inst.amount && principal > 0 && count > 0) {
          const instAmt = parseFloat(inst.amount) || 0;
          thisInstProfit = Math.max(0, Math.round((instAmt - (principal / count)) * 100) / 100);
        }

        // A competência e mês de referência da parcela é o seu vencimento (inst.dueDate)
        // Exemplo: Parcela de Maio -> computada no mês de Maio ao filtrar por mês
        const dateStr = inst.dueDate || inst.paidAt || d.createdAt || getTodayString();
        const { year: y, month: m } = extractYearMonth(dateStr);

        const matchesYear = filterYear === 'all' || String(y) === String(filterYear);
        const matchesMonth = filterMonth === 'all' || String(m) === String(filterMonth);

        if (matchesYear && matchesMonth) {
          entries.push({
            debtorId: d.id,
            debtorName: d.name,
            type: 'installment',
            typeLabel: `Baixa Parcela #${inst.number}`,
            installmentNumber: inst.number,
            installmentAmount: inst.amount,
            profit: thisInstProfit,
            date: dateStr,
            dueDate: inst.dueDate,
            paidAt: inst.paidAt,
            year: y,
            month: m
          });
        }
      }
    });

    // 2. Renovações de Só Juros (d.interestPayments)
    const renewals = Array.isArray(d.interestPayments) ? d.interestPayments : [];
    renewals.forEach(ren => {
      if (ren && (ren.amount != null || ren.paidAt)) {
        const renAmount = parseFloat(ren.amount) || 0;
        const renAbatement = parseFloat(ren.abatementAmount) || 0;
        const dateStr = ren.previousDueDate || ren.paidAt || ren.newDueDate || getTodayString();
        const { year: y, month: m } = extractYearMonth(dateStr);

        const matchesYear = filterYear === 'all' || String(y) === String(filterYear);
        const matchesMonth = filterMonth === 'all' || String(m) === String(filterMonth);

        if (matchesYear && matchesMonth) {
          const typeLabel = renAbatement > 0
            ? `Só Juros + Abatimento (${formatCurrency(renAbatement)}) - Renovação #${ren.installmentNumber || '1'}`
            : `Só Juros (Renovação #${ren.installmentNumber || '1'})`;

          entries.push({
            debtorId: d.id,
            debtorName: d.name,
            type: 'interest_only',
            typeLabel: typeLabel,
            installmentNumber: ren.installmentNumber,
            installmentAmount: renAmount + renAbatement,
            profit: renAmount,
            abatementAmount: renAbatement,
            date: dateStr,
            dueDate: ren.previousDueDate || ren.newDueDate,
            paidAt: ren.paidAt,
            year: y,
            month: m
          });
        }
      }
    });
  });

  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  return entries;
}

/**
 * Renderiza o resumo financeiro na aba Início
 */
function renderDashboardOverview() {
  const validDebtors = debtors.filter(d => d && typeof d === 'object' && d.name);
  let totalPrincipal = 0;
  let totalReceivable = 0;
  let totalOverdue = 0;
  let totalUpcoming = 0;
  let countOverdue = 0;
  let countUpcoming = 0;

  // Popula o select de Anos dinamicamente
  const yearSelect = document.getElementById('profitFilterYear');
  if (yearSelect) {
    const allYears = new Set();
    const currentYear = new Date().getFullYear();
    allYears.add(currentYear);

    validDebtors.forEach(d => {
      normalizeDebtor(d);
      if (Array.isArray(d.installments)) {
        d.installments.forEach(i => {
          if (i && i.paid) {
            const dt = i.dueDate || i.paidAt || d.createdAt;
            if (dt) {
              const { year: y } = extractYearMonth(dt);
              if (!isNaN(y) && y > 2000) allYears.add(y);
            }
          }
        });
      }
      const renewals = Array.isArray(d.interestPayments) ? d.interestPayments : [];
      renewals.forEach(r => {
        if (r && (r.previousDueDate || r.paidAt)) {
          const { year: y } = extractYearMonth(r.previousDueDate || r.paidAt);
          if (!isNaN(y) && y > 2000) allYears.add(y);
        }
      });
      if (d.createdAt) {
        const { year: y } = extractYearMonth(d.createdAt);
        if (!isNaN(y) && y > 2000) allYears.add(y);
      }
    });

    const sortedYears = Array.from(allYears).sort((a, b) => b - a);
    let optionsHtml = `<option value="all" ${selectedProfitYear === 'all' ? 'selected' : ''}>Todos os Anos</option>`;
    sortedYears.forEach(y => {
      optionsHtml += `<option value="${y}" ${String(y) === String(selectedProfitYear) ? 'selected' : ''}>${y}</option>`;
    });

    if (yearSelect.innerHTML !== optionsHtml) {
      yearSelect.innerHTML = optionsHtml;
    }
    yearSelect.value = selectedProfitYear;
  }

  const monthSelect = document.getElementById('profitFilterMonth');
  if (monthSelect && monthSelect.value !== selectedProfitMonth) {
    monthSelect.value = selectedProfitMonth;
  }

  // Cálculos de Total Emprestado e Saldo a Receber do Painel Geral
  validDebtors.forEach(d => {
    const info = evaluateDebtorStatus(d);
    totalPrincipal += d.principal || 0;
    totalReceivable += info.remainingBalance;

    if (info.status === 'overdue') {
      totalOverdue += info.remainingBalance;
      countOverdue++;
    } else if (info.status === 'due_today') {
      totalUpcoming += info.remainingBalance;
      countUpcoming++;
    }
  });

  // Cálculo do Lucro Realizado (apenas parcelas baixadas e só juros, filtrado por ano e mês)
  const profitEntries = getRealizedProfitEntries(selectedProfitYear, selectedProfitMonth);
  let totalRealizedProfit = 0;
  let totalInstallmentProfit = 0;
  let totalRenewalsProfit = 0;
  let countInstallmentBaixas = 0;
  let countRenewals = 0;

  profitEntries.forEach(entry => {
    totalRealizedProfit += entry.profit;
    if (entry.type === 'installment') {
      totalInstallmentProfit += entry.profit;
      countInstallmentBaixas++;
    } else {
      totalRenewalsProfit += entry.profit;
      countRenewals++;
    }
  });

  const elProfitOnly = document.getElementById('dashTotalProfitOnly');
  if (elProfitOnly) {
    elProfitOnly.textContent = formatCurrency(totalRealizedProfit);
  }

  const elProfitSub = document.getElementById('dashProfitOnlySub');
  if (elProfitSub) {
    const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    let periodText = 'Apenas parcelas baixadas e juros recebidos';
    if (selectedProfitYear !== 'all' && selectedProfitMonth !== 'all') {
      periodText = `Lucro em ${monthNames[parseInt(selectedProfitMonth, 10)]} de ${selectedProfitYear}`;
    } else if (selectedProfitYear !== 'all') {
      periodText = `Lucro realizado no ano de ${selectedProfitYear}`;
    } else if (selectedProfitMonth !== 'all') {
      periodText = `Lucro em ${monthNames[parseInt(selectedProfitMonth, 10)]} (Todos os anos)`;
    } else {
      periodText = `Lucro realizado histórico (Todo o período)`;
    }
    elProfitSub.textContent = periodText;
  }

  const elBreakdownInst = document.getElementById('dashProfitBreakdownInstallments');
  if (elBreakdownInst) {
    elBreakdownInst.textContent = `Baixas: ${formatCurrency(totalInstallmentProfit)} (${countInstallmentBaixas}x)`;
  }
  const elBreakdownRen = document.getElementById('dashProfitBreakdownRenewals');
  if (elBreakdownRen) {
    elBreakdownRen.textContent = `Só Juros: ${formatCurrency(totalRenewalsProfit)} (${countRenewals}x)`;
  }

  document.getElementById('dashTotalPrincipal').textContent = formatCurrency(totalPrincipal);
  document.getElementById('dashTotalContracts').textContent = `${validDebtors.length} contratos ativos`;

  document.getElementById('dashTotalReceivable').textContent = formatCurrency(totalReceivable);
  document.getElementById('dashTotalProfit').textContent = `Retorno previsto`;

  document.getElementById('dashTotalOverdue').textContent = formatCurrency(totalOverdue);
  document.getElementById('dashCountOverdue').textContent = `${countOverdue} cliente(s) em atraso`;

  document.getElementById('dashTotalUpcoming').textContent = formatCurrency(totalUpcoming);
  document.getElementById('dashCountUpcoming').textContent = `${countUpcoming} cobrança(s) hoje`;
}

function openProfitStatementModal() {
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  let periodText = 'Todo o Período Histórico';
  if (selectedProfitYear !== 'all' && selectedProfitMonth !== 'all') {
    periodText = `${monthNames[parseInt(selectedProfitMonth, 10)]} de ${selectedProfitYear}`;
  } else if (selectedProfitYear !== 'all') {
    periodText = `Ano de ${selectedProfitYear}`;
  } else if (selectedProfitMonth !== 'all') {
    periodText = `Mês de ${monthNames[parseInt(selectedProfitMonth, 10)]} (Todos os anos)`;
  }

  const elTitle = document.getElementById('statementPeriodTitle');
  if (elTitle) elTitle.textContent = periodText;

  const modalMonthSelect = document.getElementById('modalProfitFilterMonth');
  if (modalMonthSelect) {
    modalMonthSelect.value = selectedProfitMonth;
  }

  const entries = getRealizedProfitEntries(selectedProfitYear, selectedProfitMonth);
  const totalProfit = entries.reduce((acc, curr) => acc + curr.profit, 0);

  const elTotal = document.getElementById('statementTotalProfit');
  if (elTotal) elTotal.textContent = formatCurrency(totalProfit);

  const elCount = document.getElementById('statementEntriesCount');
  if (elCount) elCount.textContent = entries.length;

  const container = document.getElementById('profitStatementList');
  if (!container) return;
  container.innerHTML = '';

  if (entries.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">📂</div>
        <p style="font-size: 0.95rem; font-weight: 700; color: #ffffff;">Nenhum lucro realizado para ${periodText}.</p>
        <p style="font-size: 0.76rem; margin-top: 4px; color: var(--text-secondary);">O lucro é exibido para o mês/ano de cada parcela baixada ou renovação de só juros.</p>
      </div>
    `;
  } else {
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.style.background = 'var(--bg-input)';
      item.style.border = '1px solid var(--border-subtle)';
      item.style.borderRadius = '8px';
      item.style.padding = '0.75rem 0.85rem';
      item.style.display = 'flex';
      item.style.justifyContent = 'space-between';
      item.style.alignItems = 'center';
      item.style.gap = '0.5rem';

      const isRenewal = entry.type === 'interest_only';
      const badgeBg = isRenewal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)';
      const badgeColor = isRenewal ? '#60a5fa' : 'var(--green-primary)';
      const badgeBorder = isRenewal ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)';

      const refDateFormatted = entry.dueDate ? formatDateBR(entry.dueDate) : formatDateBR(entry.date);
      const paidAtText = entry.paidAt ? ` • Baixa em: ${formatDateBR(entry.paidAt)}` : '';

      item.innerHTML = `
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="font-weight: 700; color: #ffffff; font-size: 0.88rem;">${escapeHTML(entry.debtorName)}</span>
            <span style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; border-radius: 4px; padding: 1px 6px; font-size: 0.68rem; font-weight: 700;">
              ${entry.typeLabel}
            </span>
          </div>
          <div style="font-size: 0.73rem; color: var(--text-muted); margin-top: 3px;">
            Parcela ref.: ${refDateFormatted}${paidAtText}
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div style="font-size: 0.95rem; font-weight: 800; color: #34d399;">
            + ${formatCurrency(entry.profit)}
          </div>
          <div style="font-size: 0.68rem; color: var(--text-muted);">
            LUCRO
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  openModal('modalProfitStatement');
}

// ==============================================================================
// RELATÓRIO EXECUTIVO ANUAL DE LUCRO REALIZADO
// ==============================================================================

let selectedAnnualReportYear = new Date().getFullYear();

function getAvailableProfitYears() {
  const validDebtors = debtors.filter(d => d && typeof d === 'object' && d.name);
  const allYears = new Set();
  const currentYear = new Date().getFullYear();
  allYears.add(currentYear);

  validDebtors.forEach(d => {
    normalizeDebtor(d);
    if (Array.isArray(d.installments)) {
      d.installments.forEach(i => {
        if (i && i.paid) {
          const dt = i.dueDate || i.paidAt || d.createdAt;
          if (dt) {
            const { year: y } = extractYearMonth(dt);
            if (!isNaN(y) && y > 2000) allYears.add(y);
          }
        }
      });
    }
    const renewals = Array.isArray(d.interestPayments) ? d.interestPayments : [];
    renewals.forEach(r => {
      if (r && (r.previousDueDate || r.paidAt)) {
        const { year: y } = extractYearMonth(r.previousDueDate || r.paidAt);
        if (!isNaN(y) && y > 2000) allYears.add(y);
      }
    });
    if (d.createdAt) {
      const { year: y } = extractYearMonth(d.createdAt);
      if (!isNaN(y) && y > 2000) allYears.add(y);
    }
  });

  return Array.from(allYears).sort((a, b) => b - a);
}

function openAnnualProfitReportModal(requestedYear) {
  console.log('[Relatório Anual] Clique em Exportar Relatório detectado. Abrindo modal para o ano:', requestedYear);
  try {
    const availableYears = getAvailableProfitYears();
    const parsedReq = parseInt(requestedYear, 10);
    const parsedDash = parseInt(selectedProfitYear, 10);

    if (!isNaN(parsedReq) && availableYears.includes(parsedReq)) {
      selectedAnnualReportYear = parsedReq;
    } else if (!isNaN(parsedDash) && availableYears.includes(parsedDash)) {
      selectedAnnualReportYear = parsedDash;
    } else {
      selectedAnnualReportYear = availableYears[0] || new Date().getFullYear();
    }

    const yearSelect = document.getElementById('annualReportSelectYear');
    if (yearSelect) {
      let optionsHtml = '';
      availableYears.forEach(y => {
        optionsHtml += `<option value="${y}" ${y === selectedAnnualReportYear ? 'selected' : ''}>Exercício ${y}</option>`;
      });
      yearSelect.innerHTML = optionsHtml;
      yearSelect.value = selectedAnnualReportYear;
    }

    renderAnnualProfitReport(selectedAnnualReportYear);
    openModal('modalAnnualProfitReport');
  } catch (err) {
    console.error('[Relatório Anual] Erro ao abrir modal de relatório:', err);
    alert('Erro ao abrir relatório: ' + err.message);
  }
}

function renderAnnualProfitReport(year) {
  selectedAnnualReportYear = parseInt(year, 10) || new Date().getFullYear();
  const container = document.getElementById('printableReportArea');
  if (!container) return;

  const monthNames = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthNamesShort = [
    '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const entries = getRealizedProfitEntries(selectedAnnualReportYear, 'all');

  let totalAnnualProfit = 0;
  let totalInstallmentProfit = 0;
  let totalRenewalsProfit = 0;
  let countInstallmentBaixas = 0;
  let countRenewals = 0;

  const monthsData = [];
  for (let m = 1; m <= 12; m++) {
    monthsData[m] = {
      monthNum: m,
      monthName: monthNames[m],
      monthShort: monthNamesShort[m],
      installmentProfit: 0,
      renewalsProfit: 0,
      totalProfit: 0,
      countInstallments: 0,
      countRenewals: 0,
      totalCount: 0,
      entries: []
    };
  }

  entries.forEach(entry => {
    const p = parseFloat(entry.profit) || 0;
    const m = parseInt(entry.month, 10);
    totalAnnualProfit += p;

    if (entry.type === 'installment') {
      totalInstallmentProfit += p;
      countInstallmentBaixas++;
    } else {
      totalRenewalsProfit += p;
      countRenewals++;
    }

    if (m >= 1 && m <= 12) {
      monthsData[m].entries.push(entry);
      monthsData[m].totalCount++;
      if (entry.type === 'installment') {
        monthsData[m].installmentProfit += p;
        monthsData[m].countInstallments++;
      } else {
        monthsData[m].renewalsProfit += p;
        monthsData[m].countRenewals++;
      }
      monthsData[m].totalProfit += p;
    }
  });

  const avgMonthlyProfit = totalAnnualProfit / 12;
  let bestMonth = null;
  let maxMonthProfit = 0;

  for (let m = 1; m <= 12; m++) {
    if (monthsData[m].totalProfit > maxMonthProfit) {
      maxMonthProfit = monthsData[m].totalProfit;
      bestMonth = monthsData[m];
    }
  }

  const debtorProfitMap = {};
  entries.forEach(e => {
    if (!debtorProfitMap[e.debtorId]) {
      debtorProfitMap[e.debtorId] = {
        name: e.debtorName,
        profit: 0,
        count: 0
      };
    }
    debtorProfitMap[e.debtorId].profit += e.profit;
    debtorProfitMap[e.debtorId].count++;
  });

  const topDebtors = Object.values(debtorProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const pctInst = totalAnnualProfit > 0 ? ((totalInstallmentProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';
  const pctRen = totalAnnualProfit > 0 ? ((totalRenewalsProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentYear = (selectedAnnualReportYear === currentYear);

  let html = `
    <!-- CABEÇALHO DO RELATÓRIO -->
    <div style="border-bottom: 2px solid rgba(52, 211, 153, 0.4); padding-bottom: 0.85rem; margin-bottom: 1.25rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.35rem;">💰</span>
            <span style="font-size: 1.15rem; font-weight: 900; color: #ffffff; letter-spacing: 0.5px;">GORDINHOS FINANCEIRO</span>
          </div>
          <div style="font-size: 0.82rem; color: #34d399; font-weight: 700; margin-top: 2px;">
            DEMONSTRATIVO ANUAL DE RESULTADOS • EXERCÍCIO ${selectedAnnualReportYear}
          </div>
        </div>
        <div style="text-align: right; font-size: 0.72rem; color: var(--text-muted);">
          <div>Emissão: <strong>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
          <div>Critério: <strong>Competência (Vencimento da Parcela)</strong></div>
        </div>
      </div>
    </div>

    <!-- CARDS DE INDICADORES EXECUTIVOS (KPIS) -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.65rem; margin-bottom: 1.25rem;">
      <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(52, 211, 153, 0.35); border-radius: 8px; padding: 0.75rem;">
        <div style="font-size: 0.68rem; color: #34d399; font-weight: 700; text-transform: uppercase;">Lucro Total do Ano</div>
        <div style="font-size: 1.2rem; font-weight: 900; color: #34d399; margin-top: 2px;">${formatCurrency(totalAnnualProfit)}</div>
        <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">${entries.length} operações no total</div>
      </div>

      <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.75rem;">
        <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Média Mensal</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #ffffff; margin-top: 2px;">${formatCurrency(avgMonthlyProfit)}</div>
        <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">por mês (12 meses)</div>
      </div>

      <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.75rem;">
        <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Melhor Mês</div>
        <div style="font-size: 1.1rem; font-weight: 800; color: #f59e0b; margin-top: 2px;">${bestMonth ? bestMonth.monthShort : '--'}</div>
        <div style="font-size: 0.68rem; color: var(--text-secondary); margin-top: 2px;">${bestMonth ? formatCurrency(bestMonth.totalProfit) : 'Sem registros'}</div>
      </div>

      <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.75rem;">
        <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Composição do Lucro</div>
        <div style="font-size: 0.72rem; color: var(--green-primary); font-weight: 700; margin-top: 4px;">
          Baixas: ${formatCurrency(totalInstallmentProfit)} (${pctInst}%)
        </div>
        <div style="font-size: 0.72rem; color: #60a5fa; font-weight: 700; margin-top: 2px;">
          Só Juros: ${formatCurrency(totalRenewalsProfit)} (${pctRen}%)
        </div>
      </div>
    </div>

    <!-- TABELA CONSOLIDADA DE JANEIRO A DEZEMBRO -->
    <div style="margin-bottom: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
        <div style="font-size: 0.82rem; font-weight: 800; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">
          📅 Demonstrativo Mês a Mês (${selectedAnnualReportYear})
        </div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">
          Valores referentes à competência de cada parcela
        </div>
      </div>

      <div style="overflow-x: auto; border: 1px solid var(--border-subtle); border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
          <thead>
            <tr style="background: #1e293b; color: #94a3b8; border-bottom: 1px solid var(--border-subtle);">
              <th style="padding: 0.6rem 0.75rem;">Mês</th>
              <th style="padding: 0.6rem 0.75rem; text-align: right;">Lucro Baixas</th>
              <th style="padding: 0.6rem 0.75rem; text-align: right;">Só Juros</th>
              <th style="padding: 0.6rem 0.75rem; text-align: right;">Lucro Total</th>
              <th style="padding: 0.6rem 0.75rem; text-align: center;">Baixas</th>
              <th style="padding: 0.6rem 0.75rem; text-align: right;">% Ano</th>
              <th style="padding: 0.6rem 0.75rem; text-align: center;">Destaque</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (let m = 1; m <= 12; m++) {
    const dataM = monthsData[m];
    const isCurrent = isCurrentYear && (m === currentMonth);
    const isBest = bestMonth && (bestMonth.monthNum === m) && (bestMonth.totalProfit > 0);
    const pct = totalAnnualProfit > 0 ? ((dataM.totalProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';

    let rowBg = 'transparent';
    if (isBest) rowBg = 'rgba(245, 158, 11, 0.08)';
    else if (isCurrent) rowBg = 'rgba(52, 211, 153, 0.06)';

    let badge = '';
    if (isBest) {
      badge = '<span style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">Melhor Mês ⭐</span>';
    } else if (isCurrent) {
      badge = '<span style="background: rgba(52, 211, 153, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700;">Mês Atual</span>';
    } else if (dataM.totalProfit > 0) {
      badge = '<span style="color: var(--text-muted); font-size: 0.68rem;">Realizado</span>';
    } else {
      badge = '<span style="color: rgba(148, 163, 184, 0.4); font-size: 0.68rem;">-</span>';
    }

    const profitColor = dataM.totalProfit > 0 ? '#34d399' : 'var(--text-muted)';
    const profitWeight = dataM.totalProfit > 0 ? '700' : '400';

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <td style="padding: 0.55rem 0.75rem; font-weight: 600; color: #ffffff;">
          ${String(m).padStart(2, '0')} - ${dataM.monthName}
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: right; color: var(--text-secondary);">
          ${formatCurrency(dataM.installmentProfit)}
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: right; color: #60a5fa;">
          ${formatCurrency(dataM.renewalsProfit)}
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: right; color: ${profitColor}; font-weight: ${profitWeight};">
          ${formatCurrency(dataM.totalProfit)}
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: center; color: var(--text-secondary);">
          ${dataM.totalCount}
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: right; color: var(--text-secondary);">
          ${pct}%
        </td>
        <td style="padding: 0.55rem 0.75rem; text-align: center;">
          ${badge}
        </td>
      </tr>
    `;
  }

  html += `
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; font-weight: 800; border-top: 2px solid rgba(52, 211, 153, 0.4);">
              <td style="padding: 0.65rem 0.75rem; color: #ffffff;">TOTAL ANUAL</td>
              <td style="padding: 0.65rem 0.75rem; text-align: right; color: var(--text-secondary);">${formatCurrency(totalInstallmentProfit)}</td>
              <td style="padding: 0.65rem 0.75rem; text-align: right; color: #60a5fa;">${formatCurrency(totalRenewalsProfit)}</td>
              <td style="padding: 0.65rem 0.75rem; text-align: right; color: #34d399; font-size: 0.88rem;">${formatCurrency(totalAnnualProfit)}</td>
              <td style="padding: 0.65rem 0.75rem; text-align: center; color: #ffffff;">${entries.length}</td>
              <td style="padding: 0.65rem 0.75rem; text-align: right; color: #34d399;">100.0%</td>
              <td style="padding: 0.65rem 0.75rem; text-align: center; color: #34d399;">✅ Consolidado</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- SEÇÃO TOP 5 CLIENTES MAIS LUCRATIVOS DO ANO -->
    ${topDebtors.length > 0 ? `
      <div style="margin-bottom: 1.5rem;">
        <div style="font-size: 0.82rem; font-weight: 800; color: #ffffff; text-transform: uppercase; margin-bottom: 0.5rem;">
          🏆 Top Clientes em Lucro Realizado (${selectedAnnualReportYear})
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
          ${topDebtors.map((td, idx) => {
            const pctCliente = totalAnnualProfit > 0 ? ((td.profit / totalAnnualProfit) * 100).toFixed(1) : '0.0';
            return `
              <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 0.65rem 0.8rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 700; color: #ffffff; font-size: 0.82rem;">${idx + 1}º ${escapeHTML(td.name)}</div>
                  <div style="font-size: 0.68rem; color: var(--text-muted);">${td.count} baixas (${pctCliente}% do lucro)</div>
                </div>
                <div style="font-weight: 800; color: #34d399; font-size: 0.85rem;">
                  + ${formatCurrency(td.profit)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}

    <!-- SEÇÃO EXTRATO DETALHADO DOS LANÇAMENTOS DO ANO -->
    <div>
      <div style="font-size: 0.82rem; font-weight: 800; color: #ffffff; text-transform: uppercase; margin-bottom: 0.5rem;">
        📜 Histórico Detalhado de Baixas no Ano (${entries.length} operações)
      </div>
      ${entries.length === 0 ? `
        <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); background: var(--bg-input); border-radius: 8px;">
          Nenhum lucro registrado para o ano de ${selectedAnnualReportYear}.
        </div>
      ` : `
        <div style="max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; padding-right: 4px;">
          ${entries.map(e => {
            const isRenewal = e.type === 'interest_only';
            const badgeBg = isRenewal ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)';
            const badgeColor = isRenewal ? '#60a5fa' : 'var(--green-primary)';
            const refDate = e.dueDate ? formatDateBR(e.dueDate) : formatDateBR(e.date);
            const paidText = e.paidAt ? ` • Baixa em: ${formatDateBR(e.paidAt)}` : '';
            return `
              <div style="background: var(--bg-input); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.5rem 0.75rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem;">
                <div>
                  <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <span style="font-weight: 700; color: #ffffff;">${escapeHTML(e.debtorName)}</span>
                    <span style="background: ${badgeBg}; color: ${badgeColor}; border-radius: 4px; padding: 1px 5px; font-size: 0.65rem; font-weight: 700;">
                      ${e.typeLabel}
                    </span>
                  </div>
                  <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 2px;">
                    Parcela ref.: ${refDate}${paidText}
                  </div>
                </div>
                <div style="font-weight: 800; color: #34d399; font-size: 0.85rem; text-align: right;">
                  + ${formatCurrency(e.profit)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- RODAPÉ FORMAL DO RELATÓRIO PARA IMPRESSÃO -->
    <div style="margin-top: 1.5rem; padding-top: 0.85rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; font-size: 0.68rem; color: var(--text-muted);">
      <div>Gordinhos Financeiro • Sistema de Gestão Financeira & Cobranças</div>
      <div>Documento de prestação de contas emitido eletronicamente</div>
    </div>
  `;

  container.innerHTML = html;
}

function downloadAnnualProfitReportCSV(year) {
  const selectedYear = parseInt(year, 10) || selectedAnnualReportYear || new Date().getFullYear();
  const entries = getRealizedProfitEntries(selectedYear, 'all');

  const monthNames = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let totalAnnualProfit = 0;
  let totalInstProfit = 0;
  let totalRenProfit = 0;

  const monthsData = [];
  for (let m = 1; m <= 12; m++) {
    monthsData[m] = { inst: 0, ren: 0, total: 0, count: 0 };
  }

  entries.forEach(e => {
    const p = parseFloat(e.profit) || 0;
    const m = parseInt(e.month, 10);
    totalAnnualProfit += p;
    if (e.type === 'installment') totalInstProfit += p;
    else totalRenProfit += p;

    if (m >= 1 && m <= 12) {
      if (e.type === 'installment') monthsData[m].inst += p;
      else monthsData[m].ren += p;
      monthsData[m].total += p;
      monthsData[m].count++;
    }
  });

  let csv = "\uFEFF"; // UTF-8 BOM
  csv += `RELATÓRIO ANUAL DE LUCRO REALIZADO - EXERCÍCIO ${selectedYear}\r\n`;
  csv += `Data de Emissão;${new Date().toLocaleString('pt-BR')}\r\n\r\n`;

  csv += `=== RESUMO ANUAL ===\r\n`;
  csv += `Lucro Total no Ano;R$ ${totalAnnualProfit.toFixed(2).replace('.', ',')}\r\n`;
  csv += `Lucro por Baixas de Parcelas;R$ ${totalInstProfit.toFixed(2).replace('.', ',')}\r\n`;
  csv += `Lucro por Recebimento Só Juros;R$ ${totalRenProfit.toFixed(2).replace('.', ',')}\r\n`;
  csv += `Média Mensal;R$ ${(totalAnnualProfit / 12).toFixed(2).replace('.', ',')}\r\n`;
  csv += `Total de Operações Baixadas;${entries.length}\r\n\r\n`;

  csv += `=== DEMONSTRATIVO MÊS A MÊS (${selectedYear}) ===\r\n`;
  csv += `Mês;Nome do Mês;Lucro Baixas (R$);Lucro Só Juros (R$);Lucro Total (R$);Qtd Operações;% do Ano\r\n`;

  for (let m = 1; m <= 12; m++) {
    const d = monthsData[m];
    const pct = totalAnnualProfit > 0 ? ((d.total / totalAnnualProfit) * 100).toFixed(2).replace('.', ',') : '0,00';
    csv += `${String(m).padStart(2, '0')};${monthNames[m]};${d.inst.toFixed(2).replace('.', ',')};${d.ren.toFixed(2).replace('.', ',')};${d.total.toFixed(2).replace('.', ',')};${d.count};${pct}%\r\n`;
  }
  csv += `TOTAL;TOTAL ANUAL;${totalInstProfit.toFixed(2).replace('.', ',')};${totalRenProfit.toFixed(2).replace('.', ',')};${totalAnnualProfit.toFixed(2).replace('.', ',')};${entries.length};100,00%\r\n\r\n`;

  csv += `=== EXTRATO DETALHADO DE BAIXAS ===\r\n`;
  csv += `Data Referência;Data Baixa;Cliente;Tipo Operação;Parcela Nº;Valor Parcela (R$);Lucro Realizado (R$)\r\n`;
  entries.forEach(e => {
    const ref = e.dueDate ? formatDateBR(e.dueDate) : formatDateBR(e.date);
    const paid = e.paidAt ? formatDateBR(e.paidAt) : '-';
    csv += `${ref};${paid};"${(e.debtorName || '').replace(/"/g, '""')}";"${e.typeLabel}";${e.installmentNumber || '-'};${(parseFloat(e.installmentAmount) || 0).toFixed(2).replace('.', ',')};${(parseFloat(e.profit) || 0).toFixed(2).replace('.', ',')}\r\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `Relatorio_Lucro_Anual_${selectedYear}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`Relatório do ano ${selectedYear} baixado com sucesso em CSV!`, 'success');
}

function copyAnnualProfitReportText(year) {
  const selectedYear = parseInt(year, 10) || selectedAnnualReportYear || new Date().getFullYear();
  const entries = getRealizedProfitEntries(selectedYear, 'all');

  const monthNames = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let totalAnnualProfit = 0;
  let totalInstProfit = 0;
  let totalRenProfit = 0;
  const monthsData = [];
  for (let m = 1; m <= 12; m++) monthsData[m] = 0;

  entries.forEach(e => {
    const p = parseFloat(e.profit) || 0;
    const m = parseInt(e.month, 10);
    totalAnnualProfit += p;
    if (e.type === 'installment') totalInstProfit += p;
    else totalRenProfit += p;
    if (m >= 1 && m <= 12) monthsData[m] += p;
  });

  let text = `📊 *GORDINHOS FINANCEIRO - RELATÓRIO ANUAL ${selectedYear}*\n`;
  text += `📅 Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `💰 *LUCRO TOTAL NO ANO:* ${formatCurrency(totalAnnualProfit)}\n`;
  text += `📈 *Média Mensal:* ${formatCurrency(totalAnnualProfit / 12)} / mês\n`;
  text += `📦 *Total de Baixas:* ${entries.length} operações\n`;
  text += `  • Baixas Parcelas: ${formatCurrency(totalInstProfit)}\n`;
  text += `  • Recebimento Só Juros: ${formatCurrency(totalRenProfit)}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `📅 *DESEMPENHO MÊS A MÊS:*\n`;

  for (let m = 1; m <= 12; m++) {
    const val = monthsData[m];
    const bullet = val > 0 ? '🟢' : '⚪';
    text += `${bullet} ${String(m).padStart(2, '0')} - ${monthNames[m]}: ${formatCurrency(val)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `✅ Gerado automaticamente pelo sistema`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Resumo anual copiado para o WhatsApp com sucesso!', 'success');
    }).catch(() => {
      fallbackCopyText(text);
    });
  } else {
    fallbackCopyText(text);
  }
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  showToast('Resumo anual copiado com sucesso!', 'success');
}

function getAnnualReportPdfTemplateHtml(year) {
  const selectedYear = parseInt(year, 10) || selectedAnnualReportYear || new Date().getFullYear();
  const entries = getRealizedProfitEntries(selectedYear, 'all');

  const monthNames = [
    '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthNamesShort = [
    '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  let totalAnnualProfit = 0;
  let totalInstallmentProfit = 0;
  let totalRenewalsProfit = 0;
  let countInstallmentBaixas = 0;
  let countRenewals = 0;

  const monthsData = [];
  for (let m = 1; m <= 12; m++) {
    monthsData[m] = {
      monthNum: m,
      monthName: monthNames[m],
      monthShort: monthNamesShort[m],
      installmentProfit: 0,
      renewalsProfit: 0,
      totalProfit: 0,
      countInstallments: 0,
      countRenewals: 0,
      totalCount: 0,
      entries: []
    };
  }

  entries.forEach(entry => {
    const p = parseFloat(entry.profit) || 0;
    const m = parseInt(entry.month, 10);
    totalAnnualProfit += p;

    if (entry.type === 'installment') {
      totalInstallmentProfit += p;
      countInstallmentBaixas++;
    } else {
      totalRenewalsProfit += p;
      countRenewals++;
    }

    if (m >= 1 && m <= 12) {
      monthsData[m].entries.push(entry);
      monthsData[m].totalCount++;
      if (entry.type === 'installment') {
        monthsData[m].installmentProfit += p;
        monthsData[m].countInstallments++;
      } else {
        monthsData[m].renewalsProfit += p;
        monthsData[m].countRenewals++;
      }
      monthsData[m].totalProfit += p;
    }
  });

  const avgMonthlyProfit = totalAnnualProfit / 12;
  let bestMonth = null;
  let maxMonthProfit = 0;

  for (let m = 1; m <= 12; m++) {
    if (monthsData[m].totalProfit > maxMonthProfit) {
      maxMonthProfit = monthsData[m].totalProfit;
      bestMonth = monthsData[m];
    }
  }

  const debtorProfitMap = {};
  entries.forEach(e => {
    if (!debtorProfitMap[e.debtorId]) {
      debtorProfitMap[e.debtorId] = {
        name: e.debtorName,
        profit: 0,
        count: 0
      };
    }
    debtorProfitMap[e.debtorId].profit += e.profit;
    debtorProfitMap[e.debtorId].count++;
  });

  const topDebtors = Object.values(debtorProfitMap)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const pctInst = totalAnnualProfit > 0 ? ((totalInstallmentProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';
  const pctRen = totalAnnualProfit > 0 ? ((totalRenewalsProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const isCurrentYear = (selectedYear === currentYear);

  let html = `
    <div style="font-family: Arial, sans-serif; color: #000; background: #fff; line-height: 1.4; width: 100%; box-sizing: border-box;">
      
      <!-- CABEÇALHO FORMAL -->
      <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 18px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">
              💰 GORDINHOS FINANCEIRO
            </div>
            <div style="font-size: 12px; font-weight: 700; color: #059669; margin-top: 2px; text-transform: uppercase;">
              Demonstrativo Anual de Lucro Realizado • Exercício ${selectedYear}
            </div>
          </div>
          <div style="text-align: right; font-size: 10px; color: #64748b;">
            <div>Emissão: <strong>${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
            <div>Critério: <strong>Competência (Vencimento da Parcela)</strong></div>
            <div>Status da Base: <strong>${entries.length} operações baixadas</strong></div>
          </div>
        </div>
      </div>

      <!-- CARDS DE INDICADORES (KPIS) -->
      <div style="display: flex; gap: 10px; margin-bottom: 18px;">
        <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; color: #059669; font-weight: 800; text-transform: uppercase;">Lucro Total no Ano</div>
          <div style="font-size: 16px; font-weight: 900; color: #065f46; margin-top: 3px;">${formatCurrency(totalAnnualProfit)}</div>
          <div style="font-size: 9px; color: #047857; margin-top: 2px;">${entries.length} operações no total</div>
        </div>

        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase;">Média Mensal</div>
          <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px;">${formatCurrency(avgMonthlyProfit)}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">por mês (12 meses)</div>
        </div>

        <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; color: #b45309; font-weight: 800; text-transform: uppercase;">Melhor Mês</div>
          <div style="font-size: 15px; font-weight: 800; color: #92400e; margin-top: 3px;">${bestMonth ? bestMonth.monthShort : '--'}</div>
          <div style="font-size: 9px; color: #b45309; margin-top: 2px;">${bestMonth ? formatCurrency(bestMonth.totalProfit) : 'Sem registros'}</div>
        </div>

        <div style="flex: 1.2; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px;">
          <div style="font-size: 9px; color: #64748b; font-weight: 800; text-transform: uppercase;">Origem do Lucro</div>
          <div style="font-size: 10px; color: #059669; font-weight: 700; margin-top: 4px;">
            Baixas: ${formatCurrency(totalInstallmentProfit)} (${pctInst}%)
          </div>
          <div style="font-size: 10px; color: #2563eb; font-weight: 700; margin-top: 2px;">
            Só Juros: ${formatCurrency(totalRenewalsProfit)} (${pctRen}%)
          </div>
        </div>
      </div>

      <!-- TABELA CONSOLIDADA 12 MESES -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
          📅 Demonstrativo Mês a Mês (${selectedYear})
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: left; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 6px 8px; font-weight: 800;">Mês</th>
              <th style="padding: 6px 8px; text-align: right; font-weight: 800;">Lucro Baixas</th>
              <th style="padding: 6px 8px; text-align: right; font-weight: 800;">Só Juros</th>
              <th style="padding: 6px 8px; text-align: right; font-weight: 800;">Lucro Total</th>
              <th style="padding: 6px 8px; text-align: center; font-weight: 800;">Qtd Baixas</th>
              <th style="padding: 6px 8px; text-align: right; font-weight: 800;">% Ano</th>
              <th style="padding: 6px 8px; text-align: center; font-weight: 800;">Destaque</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (let m = 1; m <= 12; m++) {
    const dataM = monthsData[m];
    const isCurrent = isCurrentYear && (m === currentMonth);
    const isBest = bestMonth && (bestMonth.monthNum === m) && (bestMonth.totalProfit > 0);
    const pct = totalAnnualProfit > 0 ? ((dataM.totalProfit / totalAnnualProfit) * 100).toFixed(1) : '0.0';

    let rowBg = (m % 2 === 0) ? '#f8fafc' : '#ffffff';
    if (isBest) rowBg = '#fef3c7';
    else if (isCurrent) rowBg = '#f0fdf4';

    let badge = '-';
    if (isBest) {
      badge = '<strong style="color: #b45309;">Melhor Mês ⭐</strong>';
    } else if (isCurrent) {
      badge = '<strong style="color: #059669;">Mês Atual</strong>';
    } else if (dataM.totalProfit > 0) {
      badge = '<span style="color: #64748b;">Realizado</span>';
    }

    const profitColor = dataM.totalProfit > 0 ? '#059669' : '#94a3b8';
    const profitWeight = dataM.totalProfit > 0 ? '700' : '400';

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 5px 8px; font-weight: 600; color: #0f172a;">
          ${String(m).padStart(2, '0')} - ${dataM.monthName}
        </td>
        <td style="padding: 5px 8px; text-align: right; color: #334155;">
          ${formatCurrency(dataM.installmentProfit)}
        </td>
        <td style="padding: 5px 8px; text-align: right; color: #2563eb;">
          ${formatCurrency(dataM.renewalsProfit)}
        </td>
        <td style="padding: 5px 8px; text-align: right; color: ${profitColor}; font-weight: ${profitWeight};">
          ${formatCurrency(dataM.totalProfit)}
        </td>
        <td style="padding: 5px 8px; text-align: center; color: #475569;">
          ${dataM.totalCount}
        </td>
        <td style="padding: 5px 8px; text-align: right; color: #475569;">
          ${pct}%
        </td>
        <td style="padding: 5px 8px; text-align: center; font-size: 9px;">
          ${badge}
        </td>
      </tr>
    `;
  }

  html += `
          </tbody>
          <tfoot>
            <tr style="background: #0f172a; color: #ffffff; font-weight: 800; border-top: 2px solid #059669;">
              <td style="padding: 7px 8px;">TOTAL ANUAL</td>
              <td style="padding: 7px 8px; text-align: right; color: #cbd5e1;">${formatCurrency(totalInstallmentProfit)}</td>
              <td style="padding: 7px 8px; text-align: right; color: #93c5fd;">${formatCurrency(totalRenewalsProfit)}</td>
              <td style="padding: 7px 8px; text-align: right; color: #34d399; font-size: 11px;">${formatCurrency(totalAnnualProfit)}</td>
              <td style="padding: 7px 8px; text-align: center; color: #ffffff;">${entries.length}</td>
              <td style="padding: 7px 8px; text-align: right; color: #34d399;">100.0%</td>
              <td style="padding: 7px 8px; text-align: center; color: #34d399;">Consolidado</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- TOP CLIENTES MAIS LUCRATIVOS -->
      ${topDebtors.length > 0 ? `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 6px;">
            🏆 Top Clientes em Lucro Realizado (${selectedYear})
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${topDebtors.map((td, idx) => {
              const pctCliente = totalAnnualProfit > 0 ? ((td.profit / totalAnnualProfit) * 100).toFixed(1) : '0.0';
              return `
                <div style="flex: 1; min-width: 130px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px;">
                  <div style="font-weight: 700; color: #0f172a; font-size: 10px;">${idx + 1}º ${escapeHTML(td.name)}</div>
                  <div style="font-size: 8px; color: #64748b; margin-top: 1px;">${td.count} baixas (${pctCliente}%)</div>
                  <div style="font-weight: 800; color: #059669; font-size: 11px; margin-top: 2px;">+ ${formatCurrency(td.profit)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- HISTÓRICO DETALHADO DE BAIXAS NO ANO -->
      <div style="margin-bottom: 16px;">
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin-bottom: 6px;">
          📜 Histórico Detalhado de Baixas no Ano (${entries.length} operações)
        </div>
        ${entries.length === 0 ? `
          <div style="text-align: center; padding: 16px; color: #64748b; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 10px;">
            Nenhum lucro registrado para o ano de ${selectedYear}.
          </div>
        ` : `
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; border: 1px solid #cbd5e1;">
            <thead>
              <tr style="background: #f1f5f9; color: #334155; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 6px; text-align: left;">Cliente</th>
                <th style="padding: 5px 6px; text-align: left;">Tipo</th>
                <th style="padding: 5px 6px; text-align: center;">Ref. / Vencimento</th>
                <th style="padding: 5px 6px; text-align: center;">Data da Baixa</th>
                <th style="padding: 5px 6px; text-align: right;">Valor Parcela</th>
                <th style="padding: 5px 6px; text-align: right;">Lucro Realizado</th>
              </tr>
            </thead>
            <tbody>
              ${entries.map((e, idx) => {
                const isRenewal = e.type === 'interest_only';
                const refDate = e.dueDate ? formatDateBR(e.dueDate) : formatDateBR(e.date);
                const paidText = e.paidAt ? formatDateBR(e.paidAt) : '-';
                const rowBg = (idx % 2 === 0) ? '#ffffff' : '#f8fafc';
                return `
                  <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
                    <td style="padding: 4px 6px; font-weight: 600; color: #0f172a;">${escapeHTML(e.debtorName)}</td>
                    <td style="padding: 4px 6px; color: ${isRenewal ? '#2563eb' : '#059669'}; font-weight: 700;">${e.typeLabel}</td>
                    <td style="padding: 4px 6px; text-align: center; color: #475569;">${refDate}</td>
                    <td style="padding: 4px 6px; text-align: center; color: #475569;">${paidText}</td>
                    <td style="padding: 4px 6px; text-align: right; color: #475569;">${formatCurrency(e.installmentAmount || 0)}</td>
                    <td style="padding: 4px 6px; text-align: right; font-weight: 800; color: #059669;">+ ${formatCurrency(e.profit)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>

      <!-- RODAPÉ FORMAL -->
      <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; margin-top: 16px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; page-break-inside: avoid;">
        <div>Gordinhos Financeiro • Sistema de Gestão Financeira & Cobranças</div>
        <div>Documento contábil emitido eletronicamente</div>
      </div>

    </div>
  `;

  return html;
}

function downloadAnnualProfitReportPDF(year) {
  console.log('[PDF Anual] Abrindo janela de impressão nativa formatada para A4...');
  const selectedYear = parseInt(year, 10) || selectedAnnualReportYear || new Date().getFullYear();

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('O navegador bloqueou a abertura da janela de impressão. Por favor, permita popups para este site.');
    return;
  }

  const contentHtml = getAnnualReportPdfTemplateHtml(selectedYear);
  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Anual de Lucro - ${selectedYear}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
    th { background: #f3f4f6; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  showToast(`Abrindo janela de impressão/PDF do ano ${selectedYear}...`, 'success');

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (err) {
      console.error('[PDF Anual] Erro ao disparar impressão:', err);
    }
  }, 350);
}

function printAnnualProfitReport() {
  downloadAnnualProfitReportPDF();
}

function formatPhoneForPdf(phone) {
  if (!phone) return '';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  } else if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  return phone;
}

function getGeneralReportPdfTemplateHtml() {
  const now = new Date();
  const dateEmissionStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR');

  const validDebtors = (debtors || []).filter(d => d && typeof d === 'object' && d.name);

  let totalPrincipal = 0;
  let totalReceivable = 0;
  let totalExpectedProfit = 0;
  let totalRealizedProfit = 0;
  let countOnTime = 0;
  let countDueToday = 0;
  let countOverdue = 0;
  let countCompleted = 0;

  const rowsHtml = validDebtors.map((d, index) => {
    normalizeDebtor(d);
    const info = evaluateDebtorStatus(d);

    const principal = parseFloat(d.principal) || 0;
    const totalAmount = parseFloat(d.totalAmount) || 0;
    const remaining = info.remainingBalance;
    const expectedProfit = Math.max(0, totalAmount - principal);

    totalPrincipal += principal;
    totalReceivable += remaining;
    totalExpectedProfit += expectedProfit;

    const instList = Array.isArray(d.installments) ? d.installments : [];
    const count = parseInt(d.installmentsCount, 10) || (instList.length > 0 ? instList.length : 1) || 1;
    const profitPerInst = count > 0 ? expectedProfit / count : 0;
    instList.forEach(i => {
      if (i && i.paid) totalRealizedProfit += profitPerInst;
    });
    if (Array.isArray(d.interestPayments)) {
      d.interestPayments.forEach(r => {
        totalRealizedProfit += parseFloat(r.amount) || 0;
      });
    }

    if (info.status === 'overdue') countOverdue++;
    else if (info.status === 'due_today') countDueToday++;
    else if (info.status === 'completed') countCompleted++;
    else countOnTime++;

    let nextDueStr = '-';
    if (info.nextInstallment && info.nextInstallment.dueDate) {
      nextDueStr = formatDateBR(info.nextInstallment.dueDate);
    } else if (instList.length > 0) {
      nextDueStr = formatDateBR(instList[instList.length - 1].dueDate);
    }

    const typeStr = d.isDaily ? 'Diária' : 'Mensal';
    const instProgress = `${info.paidCount}/${info.totalCount}`;

    let statusBadge = '';
    if (info.status === 'overdue') {
      statusBadge = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5;">VENCIDO (${info.daysOverdue}d)</span>`;
    } else if (info.status === 'due_today') {
      statusBadge = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; background: #fef3c7; color: #92400e; border: 1px solid #fcd34d;">VENCE HOJE</span>`;
    } else if (info.status === 'completed') {
      statusBadge = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">QUITADO</span>`;
    } else {
      statusBadge = `<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 800; background: #dcfce7; color: #166534; border: 1px solid #86efac;">EM DIA</span>`;
    }

    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    const phoneDisplay = formatPhoneForPdf(d.phone);

    return `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid;">
        <td style="padding: 6px 5px; text-align: center; color: #64748b; font-size: 8.5px;">${index + 1}</td>
        <td style="padding: 6px 6px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 9.5px;">${d.name}</div>
          ${phoneDisplay ? `<div style="font-size: 8px; color: #64748b; margin-top: 1px;">📞 ${phoneDisplay}</div>` : ''}
        </td>
        <td style="padding: 6px 5px; text-align: center; color: #334155; font-size: 8.5px;">
          <div>${typeStr}</div>
          <div style="font-size: 8px; color: #64748b;">${instProgress} parc.</div>
        </td>
        <td style="padding: 6px 6px; text-align: right; font-weight: 600; color: #334155; font-size: 9px;">${formatCurrency(principal)}</td>
        <td style="padding: 6px 6px; text-align: right; font-weight: 700; color: #065f46; font-size: 9px;">${formatCurrency(remaining)}</td>
        <td style="padding: 6px 6px; text-align: right; font-weight: 600; color: #047857; font-size: 9px;">${formatCurrency(expectedProfit)}</td>
        <td style="padding: 6px 5px; text-align: center; color: #334155; font-size: 8.5px;">${nextDueStr}</td>
        <td style="padding: 6px 5px; text-align: center;">${statusBadge}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #000; background: #fff; line-height: 1.35; width: 100%; box-sizing: border-box;">
      
      <!-- CABEÇALHO DO DOCUMENTO COM DATA/HORA DA EMISSÃO -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #059669; padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <div style="font-size: 20px; font-weight: 900; color: #065f46; letter-spacing: -0.5px;">
            🏦 GORDINHOS FINANCEIRO
          </div>
          <div style="font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">
            Relatório Geral de Empréstimos & Cobranças
          </div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
            Controle de Carteira • Resumo Financeiro Consolidado
          </div>
        </div>
        <div style="text-align: right; font-size: 9.5px; color: #64748b;">
          <div>Data/Hora da Emissão:</div>
          <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 1px;">${dateEmissionStr}</div>
          <div style="margin-top: 3px; font-size: 9px; color: #059669; font-weight: 700;">
            ${validDebtors.length} ${validDebtors.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </div>
        </div>
      </div>

      <!-- CARDS DE RESUMO GERAL (TOTAL EMPRESTADO, TOTAL A RECEBER, LUCRO ESPERADO) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 12px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 8.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">
            Total Emprestado (Principal)
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 3px;">
            ${formatCurrency(totalPrincipal)}
          </div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
            Capital ativo em circulação
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #059669; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 8.5px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
            Total a Receber (Saldo Pendente)
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #065f46; margin-top: 3px;">
            ${formatCurrency(totalReceivable)}
          </div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
            Retorno bruto a receber
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 8.5px; font-weight: 800; color: #10b981; text-transform: uppercase; letter-spacing: 0.5px;">
            Lucro Esperado (Previsto)
          </div>
          <div style="font-size: 16px; font-weight: 900; color: #047857; margin-top: 3px;">
            ${formatCurrency(totalExpectedProfit)}
          </div>
          <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">
            Projeção de retorno contratada
          </div>
        </div>
      </div>

      <!-- SITUAÇÃO DA CARTEIRA DE CLIENTES -->
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; margin-bottom: 14px; font-size: 9px; color: #334155;">
        <div><strong style="color: #0f172a;">Situação da Carteira:</strong></div>
        <div style="display: flex; gap: 14px;">
          <span style="color: #166534;">🟢 Em Dia: <strong>${countOnTime}</strong></span>
          <span style="color: #854d0e;">🟡 Vence Hoje: <strong>${countDueToday}</strong></span>
          <span style="color: #991b1b;">🔴 Em Atraso: <strong>${countOverdue}</strong></span>
          <span style="color: #475569;">⚪ Quitados: <strong>${countCompleted}</strong></span>
          <span style="color: #2563eb;">💰 Lucro Realizado: <strong>${formatCurrency(totalRealizedProfit)}</strong></span>
        </div>
      </div>

      <!-- TABELA FORMATADA COM A LISTA DE CLIENTES, PARCELAS, VENCIMENTOS E STATUS -->
      <div style="margin-bottom: 14px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #cbd5e1; page-break-inside: auto;">
          <thead>
            <tr style="background: #0f172a; color: #ffffff; border-bottom: 2px solid #0f172a;">
              <th style="padding: 7px 5px; text-align: center; width: 28px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">#</th>
              <th style="padding: 7px 6px; text-align: left; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Cliente / Contato</th>
              <th style="padding: 7px 5px; text-align: center; width: 75px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Modalidade</th>
              <th style="padding: 7px 6px; text-align: right; width: 85px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Emprestado</th>
              <th style="padding: 7px 6px; text-align: right; width: 90px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Saldo Devedor</th>
              <th style="padding: 7px 6px; text-align: right; width: 80px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Lucro Prev.</th>
              <th style="padding: 7px 5px; text-align: center; width: 80px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Vencimento</th>
              <th style="padding: 7px 5px; text-align: center; width: 85px; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="8" style="padding: 16px; text-align: center; color: #64748b;">Nenhum cliente cadastrado no sistema.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #e2e8f0; font-weight: 800; color: #0f172a; border-top: 2px solid #cbd5e1; page-break-inside: avoid;">
              <td colspan="3" style="padding: 7px 6px; text-align: right; font-size: 9px;">TOTAIS GERAIS (${validDebtors.length} clientes):</td>
              <td style="padding: 7px 6px; text-align: right; font-size: 9px;">${formatCurrency(totalPrincipal)}</td>
              <td style="padding: 7px 6px; text-align: right; color: #065f46; font-size: 9px;">${formatCurrency(totalReceivable)}</td>
              <td style="padding: 7px 6px; text-align: right; color: #047857; font-size: 9px;">${formatCurrency(totalExpectedProfit)}</td>
              <td colspan="2" style="padding: 7px 5px; text-align: center; font-size: 8.5px; color: #475569;">${countOverdue} em atraso</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- RODAPÉ DO DOCUMENTO FORMATO A4 -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 8.5px; color: #94a3b8;">
        <div>Gordinhos Financeiro • Sistema de Gestão Financeira e Cobranças</div>
        <div>Documento oficial gerado em ${dateEmissionStr} • Formato A4</div>
      </div>

    </div>
  `;
}

function downloadGeneralReportPdf() {
  console.log('[PDF Geral] Abrindo janela de impressão nativa formatada para A4...');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('O navegador bloqueou a abertura da janela de impressão. Por favor, permita popups para este site.');
    return;
  }

  const contentHtml = getGeneralReportPdfTemplateHtml();
  const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Geral de Empréstimos & Cobranças</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: Arial, sans-serif; color: #000; background: #fff; margin: 0; padding: 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
    th { background: #f3f4f6; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  showToast('Abrindo janela de impressão/salvar em PDF...', 'success');

  setTimeout(() => {
    try {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (err) {
      console.error('[PDF Geral] Erro ao disparar impressão:', err);
    }
  }, 350);
}

/**
 * Renderiza a lista de clientes idêntica à foto
 */
function renderClientsList() {
  const container = document.getElementById('clientsListContainer');
  if (!container) return;
  container.innerHTML = '';

  // Filtra clientes
  const filtered = debtors.filter(debtor => {
    if (!debtor || typeof debtor !== 'object' || !debtor.name) return false;
    const info = evaluateDebtorStatus(debtor);

    if (currentFilter !== 'all') {
      if (currentFilter === 'overdue' && info.status !== 'overdue') return false;
      if (currentFilter === 'due_today' && info.status !== 'due_today') return false;
      if (currentFilter === 'on_time' && info.status !== 'on_time') return false;
      if (currentFilter === 'completed' && info.status !== 'completed') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = debtor.name.toLowerCase().includes(q);
      const matchPhone = debtor.phone && debtor.phone.includes(q);
      if (!matchName && !matchPhone) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.6;">🔍</div>
        <p style="font-size: 0.9rem; font-weight: 600;">Nenhum cliente encontrado</p>
      </div>
    `;
    return;
  }

  filtered.forEach(debtor => {
    const info = evaluateDebtorStatus(debtor);
    const initial = (debtor.name.trim().charAt(0) || 'C').toUpperCase();
    const nextDueDate = info.nextInstallment ? formatDateBR(info.nextInstallment.dueDate) : 'Quitado';
    const nextAmount = info.nextInstallment ? formatCurrency(info.nextInstallment.amount) : 'R$ 0,00';
    const freqTag = debtor.isDaily ? 'Diária' : 'Mensal';

    const row = document.createElement('div');
    row.className = 'client-row-item';
    row.dataset.id = debtor.id;

    row.innerHTML = `
      <div class="client-left-wrap">
        <!-- AVATAR INICIAL DA FOTO -->
        <div class="client-avatar-box">${initial}</div>
        <div class="client-details-wrap">
          <span class="client-name-text">${escapeHTML(debtor.name)}</span>
          <span class="client-sub-info">
            ${freqTag} • ${nextAmount} • Venc: ${nextDueDate}
          </span>
        </div>
      </div>

      <div class="client-right-wrap">
        <!-- BADGE DE STATUS VERDE DA FOTO -->
        <span class="status-pill ${info.pillClass}">
          ${info.label}
        </span>
        <!-- BOTÃO 3 PONTINHOS -->
        <button type="button" class="btn-dots-menu" title="Opções" data-action-menu="${debtor.id}">
          ⋯
        </button>
      </div>
    `;

    container.appendChild(row);
  });
}

/**
 * Renderiza clientes prioritários na aba Cobranças
 */
function renderCobrancasFocus() {
  const container = document.getElementById('cobrancasFocusList');
  if (!container) return;
  container.innerHTML = '';

  const focusList = debtors.filter(d => {
    if (!d || typeof d !== 'object' || !d.name) return false;
    const info = evaluateDebtorStatus(d);
    return info.status === 'overdue' || info.status === 'due_today';
  });

  if (focusList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--green-primary);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
        <p style="font-size: 0.95rem; font-weight: 700;">Tudo em dia!</p>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">Nenhum cliente com pagamento vencido hoje.</p>
      </div>
    `;
    return;
  }

  focusList.forEach(debtor => {
    const info = evaluateDebtorStatus(debtor);
    const initial = (debtor.name.trim().charAt(0) || 'C').toUpperCase();
    const nextDueDate = info.nextInstallment ? formatDateBR(info.nextInstallment.dueDate) : '--';
    const nextAmount = info.nextInstallment ? formatCurrency(info.nextInstallment.amount) : 'R$ 0,00';
    const waUrl = buildWhatsAppLink(debtor, info);

    const row = document.createElement('div');
    row.className = 'client-row-item';
    row.innerHTML = `
      <div class="client-left-wrap">
        <div class="client-avatar-box" style="border-color: ${info.status === 'overdue' ? 'var(--red-alert)' : 'var(--yellow-warning)'};">
          ${initial}
        </div>
        <div class="client-details-wrap">
          <span class="client-name-text">${escapeHTML(debtor.name)}</span>
          <span class="client-sub-info" style="color: ${info.status === 'overdue' ? '#f87171' : '#fbbf24'}; font-weight: 600;">
            ${nextAmount} • Venc: ${nextDueDate}
          </span>
        </div>
      </div>

      <div class="client-right-wrap">
        <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="sheet-action-btn btn-zap-color" style="padding: 0.45rem 0.85rem; font-size: 0.8rem; border-radius: 6px;">
          💬 Zap
        </a>
      </div>
    `;
    container.appendChild(row);
  });
}

// ==============================================================================
// GERAÇÃO DA MENSAGEM DO WHATSAPP (INTUITIVA COM PARCELAS)
// ==============================================================================

function calculateDebtorMinInterest(debtor, nextInst) {
  if (!debtor) return 0;
  const principal = parseFloat(debtor.principal) || 0;
  const totalAmount = parseFloat(debtor.totalAmount) || 0;
  const count = parseInt(debtor.installmentsCount, 10) || (debtor.installments ? debtor.installments.length : 1) || 1;
  const interestRate = parseFloat(debtor.interestRate) || 0;

  let minInterestVal = 0;
  if (totalAmount > principal && count > 0) {
    minInterestVal = (totalAmount - principal) / count;
  } else if (principal > 0 && interestRate > 0) {
    if (debtor.isDaily) {
      minInterestVal = (principal * (interestRate / 100)) / count;
    } else {
      minInterestVal = principal * (interestRate / 100);
    }
  }

  if (minInterestVal <= 0 && nextInst && nextInst.amount) {
    minInterestVal = nextInst.amount;
  } else if (minInterestVal <= 0 && debtor.installments && debtor.installments.length > 0) {
    const unpaid = debtor.installments.find(i => !i.paid);
    if (unpaid && unpaid.amount) {
      minInterestVal = unpaid.amount;
    }
  }
  return Math.round(minInterestVal * 100) / 100;
}

function buildWhatsAppLink(debtor, info) {
  if (!debtor.phone) return '#';
  const cleanPhone = debtor.phone.replace(/\D/g, '');
  if (!cleanPhone) return '#';

  if (!info.nextInstallment) {
    const msgQuitado = 
`🏦 *GORDINHOS FINANCEIRO*
Olá, *${debtor.name}*! Tudo bem?

Passando para parabenizá-lo(a)! Seu empréstimo foi totalmente *QUITADO*! ✅
Agradecemos a sua pontualidade e parceria!`;
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msgQuitado)}`;
  }

  const nextDueDate = formatDateBR(info.nextInstallment.dueDate);
  const nextAmount = formatCurrency(info.nextInstallment.amount);
  const remainingBalance = formatCurrency(info.remainingBalance);
  const remainingCount = info.totalCount - info.paidCount;

  // Cálculo do valor mínimo (apenas juros da parcela)
  const minInterestVal = calculateDebtorMinInterest(debtor, info.nextInstallment);
  const minAmount = formatCurrency(minInterestVal);

  let headerStatus = '';
  if (info.status === 'overdue') {
    headerStatus = `🔴 *AVISO DE COBRANÇA - PARCELA EM ATRASO*\n⚠️ *Atrasada há:* ${info.daysOverdue} ${info.daysOverdue === 1 ? 'dia' : 'dias'}`;
  } else if (info.status === 'due_today') {
    headerStatus = `🟡 *LEMBRETE DE PAGAMENTO*\n⏰ *Sua parcela vence HOJE!*`;
  } else {
    headerStatus = `🗓️ *Aviso de Vencimento de Parcela*`;
  }

  const msgText = 
`🏦 *GORDINHOS FINANCEIRO*
Olá, *${debtor.name}*! Tudo bem?

${headerStatus}

📋 *DETALHES DA SUA COBRANÇA:*
━━━━━━━━━━━━━━━━━━━━━━
💰 *Valor da Parcela:* ${nextAmount}
🪙 *Valor Mínimo:* ${minAmount} (apenas juros)
📅 *Data de Vencimento:* ${nextDueDate}
📊 *Parcelas:* ${info.paidCount} pagas | *${remainingCount} restantes* (Total: ${info.totalCount})
💳 *Saldo Devedor Restante:* ${remainingBalance}
━━━━━━━━━━━━━━━━━━━━━━

Pedimos a gentileza de efetuar o pagamento e nos enviar o comprovante por aqui.
_Caso não consiga pagar a parcela integral, é possível pagar o *Valor Mínimo* para cobrir os juros._

_Caso o pagamento já tenha sido realizado, por favor desconsidere este aviso._
Muito obrigado! 👍`;

  return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msgText)}`;
}

// ==============================================================================
// MODAIS E ACTION SHEET (MENU DE 3 PONTINHOS)
// ==============================================================================

function openActionSheet(debtorId) {
  const debtor = debtors.find(d => d.id === debtorId);
  if (!debtor) return;

  activeDebtorForAction = debtor;
  const info = evaluateDebtorStatus(debtor);

  document.getElementById('actionSheetClientName').textContent = debtor.name;
  document.getElementById('actionSheetSubDetails').textContent = 
    `${debtor.isDaily ? 'Diária' : 'Mensal'} • Total: ${formatCurrency(debtor.totalAmount)} • Saldo: ${formatCurrency(info.remainingBalance)}`;

  // WhatsApp Link
  const zapBtn = document.getElementById('actionBtnWhatsApp');
  zapBtn.href = buildWhatsAppLink(debtor, info);

  // Botão Receber Próxima Parcela
  const payBtn = document.getElementById('actionBtnPayNext');
  const payInterestBtn = document.getElementById('actionBtnPayInterestOnly');
  const payInterestText = document.getElementById('actionBtnPayInterestText');

  if (info.nextInstallment) {
    payBtn.style.display = 'flex';
    payBtn.innerHTML = `<span style="font-size: 1.2rem;">💵</span> Receber Parcela #${info.nextInstallment.number} (${formatCurrency(info.nextInstallment.amount)})`;

    if (payInterestBtn) {
      const minInterest = calculateDebtorMinInterest(debtor, info.nextInstallment);
      payInterestBtn.style.display = 'flex';
      if (payInterestText) {
        payInterestText.textContent = `Receber Só Juros (${formatCurrency(minInterest)}) • Renovar`;
      }
    }
  } else {
    payBtn.style.display = 'none';
    if (payInterestBtn) {
      payInterestBtn.style.display = 'none';
    }
  }

  openModal('modalActionSheet');
}

function openInstallmentsModal(debtorId) {
  const debtor = debtors.find(d => d.id === debtorId);
  if (!debtor) return;

  activeDebtorForAction = debtor;
  const info = evaluateDebtorStatus(debtor);

  document.getElementById('instModalDebtorName').textContent = debtor.name;
  document.getElementById('instModalDebtorDetails').textContent = 
    `${debtor.isDaily ? 'Diária' : 'Mensal'} • Total: ${formatCurrency(debtor.totalAmount)} • ${info.paidCount}/${info.totalCount} pagas`;

  const container = document.getElementById('installmentsListCards');
  container.innerHTML = '';

  const todayStr = getTodayString();

  debtor.installments.forEach(inst => {
    const card = document.createElement('div');
    card.style.background = 'var(--bg-input)';
    card.style.border = '1px solid var(--border-subtle)';
    card.style.borderRadius = '8px';
    card.style.padding = '0.75rem 0.9rem';
    card.style.display = 'flex';
    card.style.justifyContent = 'space-between';
    card.style.alignItems = 'center';
    card.style.gap = '0.5rem';

    let statusText = '';
    let statusStyle = '';

    if (inst.paid) {
      statusText = '✅ Paga';
      statusStyle = 'color: var(--green-primary); font-weight: 700;';
    } else {
      const diff = getDaysDiff(inst.dueDate, todayStr);
      if (diff < 0) {
        statusText = `🔴 Vencida (${Math.abs(diff)}d)`;
        statusStyle = 'color: var(--red-alert); font-weight: 700;';
      } else if (diff === 0) {
        statusText = '🟡 Vence Hoje';
        statusStyle = 'color: var(--yellow-warning); font-weight: 700;';
      } else {
        statusText = '⏳ Pendente';
        statusStyle = 'color: var(--text-muted);';
      }
    }

    const minInterest = calculateDebtorMinInterest(debtor, inst);
    let renewalBadge = '';
    if (inst.interestPaidCount && inst.interestPaidCount > 0) {
      const abatementNote = (inst.lastAbatementAmount && inst.lastAbatementAmount > 0)
        ? ` • Abatido: ${formatCurrency(inst.lastAbatementAmount)}`
        : '';
      renewalBadge = `<div style="font-size: 0.72rem; color: #60a5fa; margin-top: 3px; font-weight: 600;">
           🔄 Juros pago ${inst.interestPaidCount}x (${formatCurrency(inst.lastInterestAmount || minInterest)})${abatementNote} • Vencimento adiado
         </div>`;
    }

    const payInterestBtnHtml = !inst.paid
      ? `<button type="button" data-pay-interest="${inst.number}" title="Receber apenas os juros e adiar vencimento para o próximo mês" style="margin-top: 0; padding: 0.38rem 0.6rem; font-size: 0.72rem; width: auto; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); color: #60a5fa; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600; white-space: nowrap;">
           Só Juros (${formatCurrency(minInterest)})
         </button>`
      : '';

    card.innerHTML = `
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">
          Parcela #${inst.number} - ${formatCurrency(inst.amount)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
          Vencimento: ${formatDateBR(inst.dueDate)}
        </div>
        ${renewalBadge}
      </div>
      <div style="display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0;">
        <span style="font-size: 0.75rem; ${statusStyle}">${statusText}</span>
        ${payInterestBtnHtml}
        <button type="button" class="btn-new-client" data-toggle-inst="${inst.number}" style="margin-top: 0; padding: 0.4rem 0.65rem; font-size: 0.75rem; width: auto; background: ${inst.paid ? 'transparent' : 'var(--green-primary)'}; border: 1px solid ${inst.paid ? 'var(--border-subtle)' : 'transparent'}; color: ${inst.paid ? 'var(--text-muted)' : 'white'}; white-space: nowrap;">
          ${inst.paid ? '↩️ Desfazer' : '✅ Baixar Total'}
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  openModal('modalInstallments');
}

function toggleInstallmentPayment(installmentNumber) {
  if (!activeDebtorForAction) return;
  normalizeDebtor(activeDebtorForAction);

  const debtor = debtors.find(d => d.id === activeDebtorForAction.id) || activeDebtorForAction;
  normalizeDebtor(debtor);

  const inst = debtor.installments.find(i => i.number === installmentNumber);
  if (!inst) return;

  if (inst.paid) {
    inst.paid = false;
    inst.paidAt = null;
    showToast(`Parcela #${inst.number} marcada como pendente.`, 'info');
  } else {
    inst.paid = true;
    inst.paidAt = new Date().toISOString();
    showToast(`Parcela #${inst.number} recebida com sucesso!`, 'success');
  }

  saveData();
  render();
  openInstallmentsModal(debtor.id);
  triggerGoogleSheetsAutoSync();
}

function quickPayNextInstallment() {
  if (!activeDebtorForAction) return;
  normalizeDebtor(activeDebtorForAction);

  const debtor = debtors.find(d => d.id === activeDebtorForAction.id) || activeDebtorForAction;
  normalizeDebtor(debtor);

  const nextUnpaid = debtor.installments.find(i => !i.paid);
  if (!nextUnpaid) {
    showToast('Todas as parcelas já foram pagas!', 'info');
    return;
  }

  nextUnpaid.paid = true;
  nextUnpaid.paidAt = new Date().toISOString();

  saveData();
  render();
  closeModal('modalActionSheet');
  showToast(`Recebimento da parcela #${nextUnpaid.number} confirmado!`, 'success');
  triggerGoogleSheetsAutoSync();
}

let activeInterestPaymentTarget = null;

function openPayInterestOnlyModal(debtor, inst) {
  if (!debtor || !inst) return;

  const minInterest = calculateDebtorMinInterest(debtor, inst);
  const oldDueDate = inst.dueDate;
  const newDueDate = debtor.isDaily ? addDays(oldDueDate, 1) : addMonths(oldDueDate, 1);

  activeInterestPaymentTarget = {
    debtor: debtor,
    inst: inst,
    debtorId: debtor.id,
    installmentNumber: inst.number,
    minInterest: minInterest,
    oldDueDate: oldDueDate,
    newDueDate: newDueDate,
    currentAmount: inst.amount
  };

  const subEl = document.getElementById('interestModalSubtitle');
  if (subEl) {
    subEl.textContent = `${debtor.name} • Parcela #${inst.number}`;
  }

  const oldDueEl = document.getElementById('interestModalOldDueDate');
  if (oldDueEl) oldDueEl.textContent = formatDateBR(oldDueDate);

  const newDueEl = document.getElementById('interestModalNewDueDate');
  if (newDueEl) newDueEl.textContent = formatDateBR(newDueDate);

  const curAmtEl = document.getElementById('interestModalCurrentAmount');
  if (curAmtEl) curAmtEl.textContent = formatCurrency(inst.amount);

  const intInput = document.getElementById('interestModalAmountInput');
  if (intInput) intInput.value = minInterest.toFixed(2);

  const abatInput = document.getElementById('interestModalAbatementInput');
  if (abatInput) abatInput.value = '0.00';

  updateInterestModalSummary();

  closeModal('modalActionSheet');
  openModal('modalPayInterestOnly');
}

function updateInterestModalSummary() {
  if (!activeInterestPaymentTarget) return;

  const intInput = document.getElementById('interestModalAmountInput');
  const abatInput = document.getElementById('interestModalAbatementInput');

  const interestVal = parseFloat(intInput ? intInput.value : 0) || 0;
  const abatementVal = parseFloat(abatInput ? abatInput.value : 0) || 0;

  const totalReceived = interestVal + abatementVal;
  const currentAmount = activeInterestPaymentTarget.currentAmount || 0;
  const newBalance = Math.max(0, currentAmount - abatementVal);

  const totalRecEl = document.getElementById('interestModalSummaryTotalReceived');
  if (totalRecEl) totalRecEl.textContent = formatCurrency(totalReceived);

  const newBalEl = document.getElementById('interestModalSummaryNewBalance');
  if (newBalEl) {
    if (abatementVal > 0) {
      newBalEl.innerHTML = `<span style="text-decoration: line-through; color: var(--text-muted); font-size: 0.75rem; margin-right: 4px;">${formatCurrency(currentAmount)}</span> <span>${formatCurrency(newBalance)}</span>`;
    } else {
      newBalEl.textContent = formatCurrency(currentAmount);
    }
  }

  const abatWarnEl = document.getElementById('interestModalAbatementWarning');
  if (abatWarnEl) {
    if (abatementVal > currentAmount) {
      abatWarnEl.style.display = 'block';
      abatWarnEl.textContent = `Atenção: o valor informado para abater (${formatCurrency(abatementVal)}) cobre todo o saldo da parcela (${formatCurrency(currentAmount)}). A parcela será totalmente quitada!`;
    } else {
      abatWarnEl.style.display = 'none';
    }
  }
}

function confirmInterestPaymentWithAbatement() {
  if (!activeInterestPaymentTarget) return;

  const debtor = (Array.isArray(debtors) ? debtors.find(d => d.id === activeInterestPaymentTarget.debtorId) : null)
    || activeInterestPaymentTarget.debtor
    || activeDebtorForAction;

  if (!debtor) {
    showToast('Cliente não encontrado!', 'error');
    closeModal('modalPayInterestOnly');
    return;
  }
  normalizeDebtor(debtor);

  const inst = (debtor.installments ? debtor.installments.find(i => i.number === activeInterestPaymentTarget.installmentNumber) : null)
    || activeInterestPaymentTarget.inst;

  if (!inst) {
    showToast('Parcela não encontrada!', 'error');
    closeModal('modalPayInterestOnly');
    return;
  }

  const intInput = document.getElementById('interestModalAmountInput');
  const abatInput = document.getElementById('interestModalAbatementInput');

  const interestVal = Math.round((parseFloat(intInput ? intInput.value : 0) || 0) * 100) / 100;
  const abatementVal = Math.round((parseFloat(abatInput ? abatInput.value : 0) || 0) * 100) / 100;

  if (interestVal < 0 || abatementVal < 0) {
    alert('Por favor, informe valores positivos válidos.');
    return;
  }

  if (interestVal === 0 && abatementVal === 0) {
    alert('Por favor, informe ao menos o valor dos juros ou um valor para abater da dívida.');
    return;
  }

  const oldDueDate = activeInterestPaymentTarget.oldDueDate;
  const newDueDate = activeInterestPaymentTarget.newDueDate;

  if (!Array.isArray(debtor.interestPayments)) {
    debtor.interestPayments = [];
  }

  debtor.interestPayments.push({
    id: 'int_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    installmentNumber: inst.number,
    amount: interestVal,
    abatementAmount: abatementVal,
    totalPaid: Math.round((interestVal + abatementVal) * 100) / 100,
    previousDueDate: oldDueDate,
    newDueDate: newDueDate,
    paidAt: new Date().toISOString()
  });

  if (abatementVal > 0) {
    inst.amount = Math.max(0, Math.round((inst.amount - abatementVal) * 100) / 100);
    inst.lastAbatementAmount = (inst.lastAbatementAmount || 0) + abatementVal;

    if (debtor.principal != null) {
      debtor.principal = Math.max(0, Math.round(((parseFloat(debtor.principal) || 0) - abatementVal) * 100) / 100);
    }
    debtor.totalAmount = Math.round(debtor.installments.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0) * 100) / 100;

    if (inst.amount <= 0) {
      inst.paid = true;
      inst.paidAt = new Date().toISOString();
      inst.dueDate = oldDueDate;
    } else {
      inst.dueDate = newDueDate;
      inst.interestPaidCount = (inst.interestPaidCount || 0) + 1;
      inst.lastInterestAmount = interestVal;
      inst.lastInterestDate = new Date().toISOString();
    }
  } else {
    inst.dueDate = newDueDate;
    inst.interestPaidCount = (inst.interestPaidCount || 0) + 1;
    inst.lastInterestAmount = interestVal;
    inst.lastInterestDate = new Date().toISOString();
  }

  saveData();
  render();
  closeModal('modalPayInterestOnly');

  const modalInstEl = document.getElementById('modalInstallments');
  if (modalInstEl && modalInstEl.classList.contains('active')) {
    openInstallmentsModal(debtor.id);
  }

  if (abatementVal > 0) {
    showToast(`Juros de ${formatCurrency(interestVal)} recebidos e ${formatCurrency(abatementVal)} abatidos da dívida! Saldo restante: ${formatCurrency(inst.amount)}.`, 'success');
  } else {
    showToast(`Juros de ${formatCurrency(interestVal)} recebidos! Vencimento adiado para ${formatDateBR(newDueDate)}.`, 'success');
  }

  triggerGoogleSheetsAutoSync();
}

function payInterestOnlyNextInstallment() {
  if (!activeDebtorForAction) return;
  normalizeDebtor(activeDebtorForAction);

  const debtor = debtors.find(d => d.id === activeDebtorForAction.id) || activeDebtorForAction;
  normalizeDebtor(debtor);

  const nextUnpaid = debtor.installments ? debtor.installments.find(i => !i.paid) : null;
  if (!nextUnpaid) {
    showToast('Todas as parcelas já foram quitadas!', 'info');
    return;
  }

  openPayInterestOnlyModal(debtor, nextUnpaid);
}

function payInterestOnlyForInstallment(installmentNumber) {
  if (!activeDebtorForAction) return;
  normalizeDebtor(activeDebtorForAction);

  const debtor = debtors.find(d => d.id === activeDebtorForAction.id) || activeDebtorForAction;
  normalizeDebtor(debtor);

  const inst = debtor.installments ? debtor.installments.find(i => i.number === installmentNumber) : null;
  if (!inst) return;
  if (inst.paid) {
    showToast('Esta parcela já está quitada!', 'info');
    return;
  }

  openPayInterestOnlyModal(debtor, inst);
}

function deleteActiveDebtor() {
  if (!activeDebtorForAction) return;

  if (!confirm(`Deseja realmente excluir o cadastro de ${activeDebtorForAction.name}?`)) {
    return;
  }

  debtors = debtors.filter(d => d.id !== activeDebtorForAction.id);
  saveData();
  render();
  closeModal('modalActionSheet');
  showToast('Cadastro excluído com sucesso.', 'info');
}

function handleNewClientSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('debtorName').value.trim();
  const phone = document.getElementById('debtorPhone').value.trim();
  const principal = parseFloat(document.getElementById('debtorAmount').value);
  const interestRate = parseFloat(document.getElementById('debtorInterest').value);
  const isDaily = document.getElementById('debtorIsDaily').checked;
  const startDate = document.getElementById('debtorStartDate').value;
  const notes = document.getElementById('debtorNotes').value.trim();

  if (!name || isNaN(principal) || principal <= 0 || isNaN(interestRate) || !startDate) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  let installmentsCount = 1;
  let totalAmount = 0;
  let installments = [];

  if (isDaily) {
    const days = parseInt(document.getElementById('debtorDailyDays').value, 10);
    if (isNaN(days) || days <= 0) {
      alert('Informe a quantidade de dias para a diária.');
      return;
    }
    installmentsCount = days;
    // Regra da diária: R$ 1.000 + 30% = R$ 1.300 total, dividido pelos dias
    const totalInterest = principal * (interestRate / 100);
    totalAmount = Math.round((principal + totalInterest) * 100) / 100;
    installments = generateDailyInstallments(principal, totalAmount, installmentsCount, startDate);
  } else {
    const months = parseInt(document.getElementById('debtorInstallments').value, 10);
    if (isNaN(months) || months <= 0) {
      alert('Informe a quantidade de parcelas.');
      return;
    }
    installmentsCount = months;
    const totalInterest = principal * (interestRate / 100) * installmentsCount;
    totalAmount = Math.round((principal + totalInterest) * 100) / 100;
    installments = generateMonthlyInstallments(principal, totalAmount, installmentsCount, startDate);
  }

  const installmentAmount = Math.round((totalAmount / installmentsCount) * 100) / 100;

  const newDebtor = {
    id: 'deb-' + Date.now(),
    name,
    phone,
    principal,
    interestRate,
    installmentsCount,
    isDaily,
    startDate,
    notes,
    createdAt: new Date().toISOString(),
    totalAmount,
    installmentAmount,
    installments
  };

  debtors.unshift(newDebtor);
  saveData();
  render();

  // Envia cópia de segurança em segundo plano para o Google Sheets (não-bloqueante)
  sendGoogleSheetsClientBackup(newDebtor);

  closeModal('modalNewClient');
  document.getElementById('formNewClient').reset();
  document.getElementById('debtorInterest').value = '30';
  document.getElementById('debtorInstallments').value = '1';
  document.getElementById('debtorDailyDays').value = '30';
  initDateInput();
  updateLivePreview();

  showToast(`Cliente ${name} cadastrado com sucesso!`, 'success');
}

// ==============================================================================
// MODAL CONTROLS & TOASTS
// ==============================================================================

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'danger' ? '⚠️' : 'ℹ️'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// ==============================================================================
// CONTROLE DE ABAS (BOTTOM NAVIGATION) & EVENTOS
// ==============================================================================

function switchTab(tabId) {
  if (tabId === 'novo-emprestimo') {
    openModal('modalNewClient');
    return;
  }

  // Atualiza abas visuais na barra inferior
  document.querySelectorAll('.nav-tab-item').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Alterna painéis visíveis
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active-panel');
  });

  if (tabId === 'inicio') {
    document.getElementById('viewInicio').classList.add('active-panel');
  } else if (tabId === 'clientes') {
    document.getElementById('viewClientes').classList.add('active-panel');
  } else if (tabId === 'cobrancas') {
    document.getElementById('viewCobrancas').classList.add('active-panel');
  } else if (tabId === 'mais') {
    document.getElementById('viewMais').classList.add('active-panel');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ====================================================================
// INTEGRAÇÃO COM PLANILHA NO GOOGLE DRIVE / GOOGLE SHEETS
// ====================================================================
const GOOGLE_SHEETS_URL_KEY = 'gordinhos_sheets_webhook_url';
const GOOGLE_SHEETS_AUTOSYNC_KEY = 'gordinhos_sheets_autosync';
const DEFAULT_GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbyIkTX-SQUi184zn1FimBmlyGWct9ARDpzcpVsXwQLOZh_xiFZGGWoN4mINaCzORrpRtA/exec';

function initGoogleSheetsSettings() {
  const inputUrl = document.getElementById('googleSheetWebhookUrl');
  const chkAuto = document.getElementById('chkAutoSyncGoogleSheets');
  const badge = document.getElementById('googleSheetsSyncStatusBadge');
  
  let savedUrl = localStorage.getItem(GOOGLE_SHEETS_URL_KEY);
  if (!savedUrl || !savedUrl.trim()) {
    savedUrl = DEFAULT_GOOGLE_SHEETS_URL;
    localStorage.setItem(GOOGLE_SHEETS_URL_KEY, savedUrl);
  }
  const savedAuto = localStorage.getItem(GOOGLE_SHEETS_AUTOSYNC_KEY) !== 'false';

  if (inputUrl) inputUrl.value = savedUrl;
  if (chkAuto) chkAuto.checked = savedAuto;

  if (badge) {
    if (savedUrl && savedUrl.startsWith('http')) {
      badge.textContent = '🟢 Conectado ao Google Sheets';
      badge.style.color = '#34d399';
    } else {
      badge.textContent = '⚪ Não conectado';
      badge.style.color = 'var(--text-muted)';
    }
  }
}

function saveGoogleSheetsUrl() {
  const inputUrl = document.getElementById('googleSheetWebhookUrl');
  if (!inputUrl) return;
  const url = inputUrl.value.trim();
  localStorage.setItem(GOOGLE_SHEETS_URL_KEY, url);

  const badge = document.getElementById('googleSheetsSyncStatusBadge');
  if (badge) {
    if (url && url.startsWith('http')) {
      badge.textContent = '🟢 Conectado ao Google Sheets';
      badge.style.color = '#34d399';
      showToast('URL do Google Sheets salva com sucesso!', 'success');
    } else {
      badge.textContent = '⚪ Não conectado';
      badge.style.color = 'var(--text-muted)';
      showToast('URL do Google Sheets removida.', 'info');
    }
  }
}

function getGoogleSheetsExportPayload() {
  const validDebtors = debtors.filter(d => d && typeof d === 'object' && d.name).map(normalizeDebtor);
  
  let totalPrincipal = 0;
  let totalReceivable = 0;
  let activeClientsCount = 0;
  let overdueClientsCount = 0;

  const serializedDebtors = [];
  const allInstallments = [];
  const allInterestPayments = [];

  validDebtors.forEach(d => {
    const statusInfo = evaluateDebtorStatus(d);
    totalPrincipal += d.principal || 0;
    totalReceivable += statusInfo.remainingBalance;
    if (statusInfo.status === 'overdue') overdueClientsCount++;
    else activeClientsCount++;

    const instList = Array.isArray(d.installments) ? d.installments : [];
    const count = parseInt(d.installmentsCount, 10) || (instList.length > 0 ? instList.length : 1) || 1;
    const paidCount = instList.filter(i => i && i.paid).length;

    let profitPerInst = 0;
    if (d.totalAmount > d.principal && count > 0) {
      profitPerInst = (d.totalAmount - d.principal) / count;
    } else if (d.principal > 0 && d.interestRate > 0) {
      profitPerInst = d.isDaily ? (d.principal * (d.interestRate / 100)) / count : (d.principal * (d.interestRate / 100));
    }
    profitPerInst = Math.round(profitPerInst * 100) / 100;

    let debtorRealizedProfit = 0;
    instList.forEach(inst => {
      if (inst && inst.paid) {
        debtorRealizedProfit += profitPerInst;
      }
      allInstallments.push({
        debtorId: d.id,
        debtorName: d.name,
        number: inst.number,
        amount: inst.amount,
        dueDate: inst.dueDate,
        paid: !!inst.paid,
        paidAt: inst.paidAt || '',
        profit: profitPerInst
      });
    });

    const renewals = Array.isArray(d.interestPayments) ? d.interestPayments : [];
    renewals.forEach(r => {
      const amt = parseFloat(r.amount) || 0;
      const abatement = parseFloat(r.abatementAmount) || 0;
      debtorRealizedProfit += amt;
      allInterestPayments.push({
        debtorId: d.id,
        debtorName: d.name,
        amount: amt,
        abatementAmount: abatement,
        totalPaid: amt + abatement,
        paidAt: r.paidAt || '',
        previousDueDate: r.previousDueDate || '',
        newDueDate: r.newDueDate || ''
      });
    });

    serializedDebtors.push({
      id: d.id,
      name: d.name,
      cpf: d.cpf || '',
      phone: d.phone || '',
      principal: d.principal || 0,
      interestRate: d.interestRate || 0,
      totalAmount: d.totalAmount || 0,
      remainingBalance: statusInfo.remainingBalance,
      expectedProfit: Math.max(0, (d.totalAmount || 0) - (d.principal || 0)),
      realizedProfit: debtorRealizedProfit,
      paidInstallmentsCount: paidCount,
      totalInstallmentsCount: count,
      statusLabel: statusInfo.statusLabel || '',
      createdAt: d.createdAt || '',
      notes: d.notes || ''
    });
  });

  const allProfitEntries = getRealizedProfitEntries('all', 'all');
  const totalRealizedProfit = allProfitEntries.reduce((acc, cur) => acc + (cur.profit || 0), 0);

  return {
    summary: {
      totalPrincipal,
      totalReceivable,
      totalRealizedProfit,
      activeClientsCount,
      overdueClientsCount,
      updatedAt: new Date().toISOString()
    },
    debtors: serializedDebtors,
    installments: allInstallments,
    interestPayments: allInterestPayments
  };
}

async function syncWithGoogleSheets(isSilent = false) {
  const webhookUrl = localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || DEFAULT_GOOGLE_SHEETS_URL;
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    if (!isSilent) {
      showToast('Configure a URL do Webhook do Google Apps Script antes de sincronizar!', 'warning');
      openModal('modalGoogleSheetsHelp');
    }
    return;
  }

  const btn = document.getElementById('btnSyncGoogleSheets');
  if (btn && !isSilent) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Sincronizando com Google Sheets...</span>';
  }

  try {
    const payload = getGoogleSheetsExportPayload();
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });

    const badge = document.getElementById('googleSheetsSyncStatusBadge');
    if (badge) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      badge.textContent = `🟢 Sincronizado hoje às ${timeStr}`;
      badge.style.color = '#34d399';
    }

    if (!isSilent) {
      showToast('Planilha no Google Drive sincronizada com sucesso!', 'success');
    }
  } catch (err) {
    console.error('Erro na sincronização Google Sheets:', err);
    if (!isSilent) {
      showToast('Erro ao sincronizar com Google Sheets: ' + err.message, 'error');
    }
  } finally {
    if (btn && !isSilent) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
        <span>Sincronizar com Google Sheets Agora</span>
      `;
    }
  }
}

function triggerGoogleSheetsAutoSync() {
  const isAuto = localStorage.getItem(GOOGLE_SHEETS_AUTOSYNC_KEY) !== 'false';
  const webhookUrl = localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || DEFAULT_GOOGLE_SHEETS_URL;
  if (isAuto && webhookUrl && webhookUrl.startsWith('http')) {
    syncWithGoogleSheets(true);
  }
}

/**
 * Envia uma cópia de segurança do cadastro recém-criado diretamente para o Google Apps Script.
 * Disparo 100% assíncrono ("fire-and-forget"), com mode: 'no-cors'.
 * Garante que o Firebase continue sendo o banco de dados principal e que a interface
 * nunca congele ou seja impactada por oscilações de rede.
 */
function sendGoogleSheetsClientBackup(debtor) {
  try {
    const webhookUrl = localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || DEFAULT_GOOGLE_SHEETS_URL;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return;
    }

    const principal = parseFloat(debtor.principal) || 0;
    const totalAmount = parseFloat(debtor.totalAmount) || 0;
    const expectedProfit = Math.max(0, Math.round((totalAmount - principal) * 100) / 100);
    const firstDueDate = (Array.isArray(debtor.installments) && debtor.installments[0])
      ? debtor.installments[0].dueDate
      : (debtor.startDate || '');

    const payload = {
      timestamp: new Date().toLocaleString('pt-BR'),
      id: debtor.id || '',
      name: debtor.name || '',
      phone: debtor.phone || '',
      principal: principal,
      interestRate: parseFloat(debtor.interestRate) || 0,
      type: debtor.isDaily ? 'Diária' : 'Mensal',
      installmentsCount: parseInt(debtor.installmentsCount, 10) || 1,
      installmentAmount: parseFloat(debtor.installmentAmount) || 0,
      totalAmount: totalAmount,
      expectedProfit: expectedProfit,
      startDate: debtor.startDate || '',
      firstDueDate: firstDueDate,
      status: 'Ativo',
      notes: debtor.notes || ''
    };

    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    }).then(() => {
      console.log('📊 Backup do cadastro enviado com sucesso para o Google Sheets!');
    }).catch(err => {
      console.warn('Aviso silencioso (backup Google Sheets):', err.message);
    });
  } catch (err) {
    console.warn('Erro ao disparar envio para Google Sheets:', err);
  }
}

function exportSpreadsheetCSV() {
  const payload = getGoogleSheetsExportPayload();
  const debtors = payload.debtors;
  const installments = payload.installments;

  let csvContent = "\uFEFF"; // UTF-8 BOM

  csvContent += "=== RESUMO FINANCEIRO GERAL ===\r\n";
  csvContent += `Total Emprestado (Principal);${(payload.summary.totalPrincipal).toFixed(2).replace('.', ',')}\r\n`;
  csvContent += `Total a Receber (Saldo Pendente);${(payload.summary.totalReceivable).toFixed(2).replace('.', ',')}\r\n`;
  csvContent += `Total Lucro Realizado;${(payload.summary.totalRealizedProfit).toFixed(2).replace('.', ',')}\r\n`;
  csvContent += `Clientes Ativos;${payload.summary.activeClientsCount}\r\n`;
  csvContent += `Clientes em Atraso;${payload.summary.overdueClientsCount}\r\n`;
  csvContent += `Data de Geração;${new Date().toLocaleString('pt-BR')}\r\n\r\n`;

  csvContent += "=== CLIENTES E EMPRÉSTIMOS ===\r\n";
  csvContent += "Nome;CPF;Telefone;Valor Emprestado;Taxa (%);Total a Pagar;Saldo Restante;Lucro Previsto;Lucro Realizado;Parcelas Pagas;Total Parcelas;Status;Data Cadastro;Observações\r\n";
  
  debtors.forEach(d => {
    const row = [
      `"${(d.name || '').replace(/"/g, '""')}"`,
      `"${(d.cpf || '').replace(/"/g, '""')}"`,
      `"${(d.phone || '').replace(/"/g, '""')}"`,
      `"${(d.principal || 0).toFixed(2).replace('.', ',')}"`,
      `"${(d.interestRate || 0).toFixed(2).replace('.', ',')}"`,
      `"${(d.totalAmount || 0).toFixed(2).replace('.', ',')}"`,
      `"${(d.remainingBalance || 0).toFixed(2).replace('.', ',')}"`,
      `"${(d.expectedProfit || 0).toFixed(2).replace('.', ',')}"`,
      `"${(d.realizedProfit || 0).toFixed(2).replace('.', ',')}"`,
      d.paidInstallmentsCount,
      d.totalInstallmentsCount,
      `"${d.statusLabel || ''}"`,
      `"${d.createdAt || ''}"`,
      `"${(d.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ];
    csvContent += row.join(';') + "\r\n";
  });

  csvContent += "\r\n=== PARCELAS E HISTÓRICO DE BAIXAS ===\r\n";
  csvContent += "Cliente;Parcela Nº;Valor Parcela;Vencimento;Status;Data da Baixa/Pagamento;Lucro da Parcela\r\n";

  installments.forEach(inst => {
    const row = [
      `"${(inst.debtorName || '').replace(/"/g, '""')}"`,
      inst.number,
      `"${(inst.amount || 0).toFixed(2).replace('.', ',')}"`,
      `"${inst.dueDate || ''}"`,
      inst.paid ? "PAGO" : "PENDENTE",
      `"${inst.paidAt || '-'}"`,
      `"${(inst.profit || 0).toFixed(2).replace('.', ',')}"`
    ];
    csvContent += row.join(';') + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const todayStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `Planilha_Financeira_GoogleDrive_${todayStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Planilha CSV baixada com sucesso! Pronta para Google Drive e Excel.', 'success');
}

const APPS_SCRIPT_SOURCE_CODE = `function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Nenhum dado recebido." })).setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. Resumo Financeiro
    var sheetResumo = ss.getSheetByName("Resumo Financeiro") || ss.insertSheet("Resumo Financeiro", 0);
    sheetResumo.clear();
    sheetResumo.getRange(1, 1, 1, 2).setValues([["MÉTRICA", "VALOR"]]).setBackground("#065F46").setFontColor("#FFFFFF").setFontWeight("bold");
    var resumoData = [
      ["Total Emprestado (Principal)", payload.summary ? payload.summary.totalPrincipal : 0],
      ["Total a Receber (Saldo Pendente)", payload.summary ? payload.summary.totalReceivable : 0],
      ["Total de Lucro Realizado", payload.summary ? payload.summary.totalRealizedProfit : 0],
      ["Clientes Ativos", payload.summary ? payload.summary.activeClientsCount : 0],
      ["Clientes em Atraso", payload.summary ? payload.summary.overdueClientsCount : 0],
      ["Última Atualização", new Date().toLocaleString("pt-BR")]
    ];
    sheetResumo.getRange(2, 1, resumoData.length, 2).setValues(resumoData);
    sheetResumo.getRange(2, 2, 3, 1).setNumberFormat("R$ #,##0.00");
    sheetResumo.autoResizeColumns(1, 2);

    // 2. Clientes e Empréstimos
    var sheetClientes = ss.getSheetByName("Clientes") || ss.insertSheet("Clientes", 1);
    sheetClientes.clear();
    var headersClientes = ["Nome", "CPF", "Telefone", "Valor Emprestado", "Taxa (%)", "Total a Pagar", "Saldo Restante", "Lucro Previsto", "Lucro Realizado", "Parcelas Pagas", "Total Parcelas", "Status", "Data de Início", "Observações"];
    sheetClientes.appendRow(headersClientes);
    sheetClientes.getRange(1, 1, 1, headersClientes.length).setBackground("#059669").setFontColor("#FFFFFF").setFontWeight("bold");

    if (payload.debtors && payload.debtors.length > 0) {
      var rowsClientes = [];
      payload.debtors.forEach(function(d) {
        rowsClientes.push([
          d.name || "", d.cpf || "", d.phone || "",
          parseFloat(d.principal) || 0, parseFloat(d.interestRate) || 0, parseFloat(d.totalAmount) || 0,
          parseFloat(d.remainingBalance) || 0, parseFloat(d.expectedProfit) || 0, parseFloat(d.realizedProfit) || 0,
          parseInt(d.paidInstallmentsCount, 10) || 0, parseInt(d.totalInstallmentsCount, 10) || 0,
          d.statusLabel || "", d.createdAt || "", d.notes || ""
        ]);
      });
      sheetClientes.getRange(2, 1, rowsClientes.length, headersClientes.length).setValues(rowsClientes);
      sheetClientes.getRange(2, 4, rowsClientes.length, 1).setNumberFormat("R$ #,##0.00");
      sheetClientes.getRange(2, 6, rowsClientes.length, 4).setNumberFormat("R$ #,##0.00");
    }
    sheetClientes.autoResizeColumns(1, headersClientes.length);

    // 3. Parcelas e Baixas
    var sheetParcelas = ss.getSheetByName("Parcelas") || ss.insertSheet("Parcelas", 2);
    sheetParcelas.clear();
    var headersParcelas = ["Cliente", "Parcela Nº", "Valor da Parcela", "Data de Vencimento", "Status da Parcela", "Data da Baixa / Pagamento", "Lucro da Parcela"];
    sheetParcelas.appendRow(headersParcelas);
    sheetParcelas.getRange(1, 1, 1, headersParcelas.length).setBackground("#10B981").setFontColor("#FFFFFF").setFontWeight("bold");

    if (payload.installments && payload.installments.length > 0) {
      var rowsParcelas = [];
      payload.installments.forEach(function(inst) {
        rowsParcelas.push([
          inst.debtorName || "", inst.number || 1, parseFloat(inst.amount) || 0,
          inst.dueDate || "", inst.paid ? "PAGO" : "PENDENTE", inst.paidAt || "-", parseFloat(inst.profit) || 0
        ]);
      });
      sheetParcelas.getRange(2, 1, rowsParcelas.length, headersParcelas.length).setValues(rowsParcelas);
      sheetParcelas.getRange(2, 3, rowsParcelas.length, 1).setNumberFormat("R$ #,##0.00");
      sheetParcelas.getRange(2, 7, rowsParcelas.length, 1).setNumberFormat("R$ #,##0.00");
    }
    sheetParcelas.autoResizeColumns(1, headersParcelas.length);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", timestamp: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Sincronizador Google Sheets Ativo. Conexão OK!").setMimeType(ContentService.MimeType.TEXT);
}`;

function copyGoogleAppsScriptCode() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(APPS_SCRIPT_SOURCE_CODE).then(() => {
      showToast('Código copiado com sucesso! Agora cole no Apps Script da sua Planilha.', 'success');
    }).catch(() => {
      fallbackCopyCode();
    });
  } else {
    fallbackCopyCode();
  }
}

function fallbackCopyCode() {
  const ta = document.createElement('textarea');
  ta.value = APPS_SCRIPT_SOURCE_CODE;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Código copiado para a área de transferência!', 'success');
  } catch (e) {
    prompt('Copie o código abaixo manualmente (Ctrl+C):', APPS_SCRIPT_SOURCE_CODE);
  }
  document.body.removeChild(ta);
}

function setupEventListeners() {
  // Botão Verde "+ Novo Cliente"
  document.getElementById('btnOpenNewClient').addEventListener('click', () => {
    openModal('modalNewClient');
  });

  // Fechamento de Modais
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-close');
      closeModal(target);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Bottom Navigation Bar
  document.querySelectorAll('.nav-tab-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Formulário de Novo Cliente
  const form = document.getElementById('formNewClient');
  form.addEventListener('submit', handleNewClientSubmit);

  // Inputs para simulação em tempo real
  const inputsToListen = ['debtorAmount', 'debtorInterest', 'debtorInstallments', 'debtorIsDaily', 'debtorDailyDays'];
  inputsToListen.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateLivePreview);
      el.addEventListener('change', updateLivePreview);
    }
  });

  // Campo de busca
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderClientsList();
  });

  // Filtros rápidos
  document.querySelectorAll('.chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderClientsList();
    });
  });

  // Delegação de cliques na lista de clientes
  document.getElementById('clientsListContainer').addEventListener('click', (e) => {
    const btnDots = e.target.closest('[data-action-menu]');
    if (btnDots) {
      e.stopPropagation();
      const id = btnDots.dataset.actionMenu;
      openActionSheet(id);
      return;
    }

    const row = e.target.closest('.client-row-item');
    if (row) {
      const id = row.dataset.id;
      openInstallmentsModal(id);
    }
  });

  document.querySelectorAll('.btn-download-general-report').forEach(btn => {
    btn.addEventListener('click', downloadGeneralReportPdf);
  });

  // Ações do Action Sheet
  document.getElementById('actionBtnPayNext').addEventListener('click', quickPayNextInstallment);
  const payInterestOnlyBtn = document.getElementById('actionBtnPayInterestOnly');
  if (payInterestOnlyBtn) {
    payInterestOnlyBtn.addEventListener('click', payInterestOnlyNextInstallment);
  }
  document.getElementById('actionBtnViewInstallments').addEventListener('click', () => {
    if (activeDebtorForAction) {
      closeModal('modalActionSheet');
      openInstallmentsModal(activeDebtorForAction.id);
    }
  });
  document.getElementById('actionBtnDelete').addEventListener('click', deleteActiveDebtor);

  const interestConfirmBtn = document.getElementById('interestModalConfirmBtn');
  if (interestConfirmBtn) {
    interestConfirmBtn.addEventListener('click', confirmInterestPaymentWithAbatement);
  }

  const interestAmountInp = document.getElementById('interestModalAmountInput');
  if (interestAmountInp) {
    interestAmountInp.addEventListener('input', updateInterestModalSummary);
  }

  const interestAbatementInp = document.getElementById('interestModalAbatementInput');
  if (interestAbatementInp) {
    interestAbatementInp.addEventListener('input', updateInterestModalSummary);
  }

  // Cliques dentro do modal de parcelas (Baixar / Desfazer / Só Juros)
  document.getElementById('installmentsListCards').addEventListener('click', (e) => {
    const payIntBtn = e.target.closest('[data-pay-interest]');
    if (payIntBtn) {
      const num = parseInt(payIntBtn.dataset.payInterest, 10);
      payInterestOnlyForInstallment(num);
      return;
    }

    const btn = e.target.closest('[data-toggle-inst]');
    if (btn) {
      const num = parseInt(btn.dataset.toggleInst, 10);
      toggleInstallmentPayment(num);
    }
  });

  // Filtros de Ano e Mês do Lucro Realizado
  const profitYearSelect = document.getElementById('profitFilterYear');
  if (profitYearSelect) {
    profitYearSelect.addEventListener('change', (e) => {
      selectedProfitYear = e.target.value;
      renderDashboardOverview();
    });
  }

  const profitMonthSelect = document.getElementById('profitFilterMonth');
  if (profitMonthSelect) {
    profitMonthSelect.addEventListener('change', (e) => {
      selectedProfitMonth = e.target.value;
      renderDashboardOverview();
    });
  }

  const modalProfitMonthSelect = document.getElementById('modalProfitFilterMonth');
  if (modalProfitMonthSelect) {
    modalProfitMonthSelect.addEventListener('change', (e) => {
      selectedProfitMonth = e.target.value;
      const mainMonthSelect = document.getElementById('profitFilterMonth');
      if (mainMonthSelect) mainMonthSelect.value = selectedProfitMonth;
      renderDashboardOverview();
      openProfitStatementModal();
    });
  }

  const btnOpenStatement = document.getElementById('btnOpenProfitStatement');
  if (btnOpenStatement) {
    btnOpenStatement.addEventListener('click', openProfitStatementModal);
  }

  // Relatório Executivo Anual de Lucro Realizado
  const btnOpenProfitReport = document.getElementById('btnOpenProfitReport');
  if (btnOpenProfitReport) {
    btnOpenProfitReport.addEventListener('click', () => {
      const yearToOpen = (selectedProfitYear && selectedProfitYear !== 'all') ? selectedProfitYear : new Date().getFullYear().toString();
      openAnnualProfitReportModal(yearToOpen);
    });
  }

  const btnExtratoToReport = document.getElementById('btnExtratoToReport');
  if (btnExtratoToReport) {
    btnExtratoToReport.addEventListener('click', () => {
      closeModal('modalProfitStatement');
      const yearToOpen = (selectedProfitYear && selectedProfitYear !== 'all') ? selectedProfitYear : new Date().getFullYear().toString();
      openAnnualProfitReportModal(yearToOpen);
    });
  }

  const annualReportSelectYear = document.getElementById('annualReportSelectYear');
  if (annualReportSelectYear) {
    annualReportSelectYear.addEventListener('change', (e) => {
      renderAnnualProfitReport(e.target.value);
    });
  }

  const btnDownloadAnnualReportPdf = document.getElementById('btnDownloadAnnualReportPdf');
  if (btnDownloadAnnualReportPdf) {
    btnDownloadAnnualReportPdf.addEventListener('click', () => {
      downloadAnnualProfitReportPDF(selectedAnnualReportYear);
    });
  }

  const btnModalFooterPdf = document.getElementById('btnModalFooterDownloadPdf');
  if (btnModalFooterPdf) {
    btnModalFooterPdf.addEventListener('click', () => {
      downloadAnnualProfitReportPDF(selectedAnnualReportYear);
    });
  }

  const btnDownloadAnnualReportCsv = document.getElementById('btnDownloadAnnualReportCsv');
  if (btnDownloadAnnualReportCsv) {
    btnDownloadAnnualReportCsv.addEventListener('click', () => {
      downloadAnnualProfitReportCSV(selectedAnnualReportYear);
    });
  }

  const btnPrintAnnualReport = document.getElementById('btnPrintAnnualReport');
  if (btnPrintAnnualReport) {
    btnPrintAnnualReport.addEventListener('click', () => {
      printAnnualProfitReport();
    });
  }

  const btnCopyAnnualReportText = document.getElementById('btnCopyAnnualReportText');
  if (btnCopyAnnualReportText) {
    btnCopyAnnualReportText.addEventListener('click', () => {
      copyAnnualProfitReportText(selectedAnnualReportYear);
    });
  }

  // Backup e Restauração
  document.getElementById('btnExportData').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(debtors, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `gordinhos_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
    showToast('Backup exportado com sucesso!', 'success');
  });

  document.getElementById('fileImportData').addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            debtors = imported;
            saveData();
            render();
            showToast('Dados restaurados com sucesso!', 'success');
          } else {
            alert('Arquivo inválido.');
          }
        } catch (err) {
          alert('Erro ao ler arquivo: ' + err.message);
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  });

  const btnSyncNow = document.getElementById('btnSyncFirebaseNow');
  if (btnSyncNow) {
    btnSyncNow.addEventListener('click', () => {
      showToast('Atualizando dados do Firebase Realtime Database...', 'info');
      loadData();
    });
  }

  // Integração com Planilha Google Drive / Sheets
  initGoogleSheetsSettings();

  const btnSaveSheetsUrl = document.getElementById('btnSaveGoogleSheetUrl');
  if (btnSaveSheetsUrl) {
    btnSaveSheetsUrl.addEventListener('click', saveGoogleSheetsUrl);
  }

  const chkAutoSheets = document.getElementById('chkAutoSyncGoogleSheets');
  if (chkAutoSheets) {
    chkAutoSheets.addEventListener('change', (e) => {
      localStorage.setItem(GOOGLE_SHEETS_AUTOSYNC_KEY, e.target.checked);
      if (e.target.checked) {
        showToast('Sincronização automática com Google Sheets ativada!', 'success');
        triggerGoogleSheetsAutoSync();
      } else {
        showToast('Sincronização automática desativada.', 'info');
      }
    });
  }

  const btnSyncSheets = document.getElementById('btnSyncGoogleSheets');
  if (btnSyncSheets) {
    btnSyncSheets.addEventListener('click', () => syncWithGoogleSheets(false));
  }

  const btnExportCsv = document.getElementById('btnExportCSV');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', exportSpreadsheetCSV);
  }

  const btnHelpSheets = document.getElementById('btnHelpGoogleSheets');
  if (btnHelpSheets) {
    btnHelpSheets.addEventListener('click', () => openModal('modalGoogleSheetsHelp'));
  }

  const btnCopyScript = document.getElementById('btnCopyAppsScriptCode');
  if (btnCopyScript) {
    btnCopyScript.addEventListener('click', copyGoogleAppsScriptCode);
  }
}
