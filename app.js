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

  // Abrir modal de alterar senha dentro do app
  const btnOpenChangeModal = document.getElementById('btnOpenChangePasswordModal');
  if (btnOpenChangeModal) {
    btnOpenChangeModal.addEventListener('click', () => {
      openModal('modalChangePassword');
      const errEl = document.getElementById('modalChangePwdError');
      if (errEl) errEl.classList.remove('active');
      const curInput = document.getElementById('modalCurrentPassword');
      const userEl = document.getElementById('modalNewUsername');
      if (userEl) userEl.value = appUsername;
      if (curInput) {
        curInput.value = '';
        setTimeout(() => curInput.focus(), 150);
      }
      document.getElementById('modalNewPassword').value = '';
      document.getElementById('modalConfirmPassword').value = '';
    });
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
// DADOS E PERSISTÊNCIA (COM CLIENTES IDÊNTICOS À FOTO)
// ==============================================================================

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      debtors = JSON.parse(saved);
    } catch (e) {
      console.error('Erro ao ler dados salvos:', e);
      debtors = [];
    }
  }

  // Preenche com os clientes da imagem se a base estiver vazia
  if (!debtors || debtors.length === 0) {
    loadSampleData();
  }

  // Conecta ao Realtime Database para sincronizar dados em tempo real
  syncWithRealtimeDatabase();
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(debtors));

  // Salva no Firebase Realtime Database
  if (window.firebaseDb && typeof window.firebaseDb.ref === 'function') {
    try {
      window.firebaseDb.ref('debtors').set(debtors).then(() => {
        console.log('☁️ Registros salvos no Realtime Database com sucesso!');
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
        const cloudData = snapshot.val();
        if (cloudData && Array.isArray(cloudData) && cloudData.length > 0) {
          debtors = cloudData;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(debtors));
          render();
          console.log('☁️ Dados atualizados do Realtime Database em tempo real!');
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

  saveData();
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

function addMonths(dateObj, months) {
  const d = new Date(dateObj);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
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
  const todayStr = getTodayString();
  if (!debtor || !debtor.installments || !Array.isArray(debtor.installments)) {
    debtor.installments = [];
  }
  const unpaidInstallments = debtor.installments.filter(i => !i.paid);
  const paidCount = debtor.installments.filter(i => i.paid).length;
  const totalCount = debtor.installments.length || 1;

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
  let totalClients = debtors.length;
  let activeClients = 0;
  let overdueClients = 0;

  debtors.forEach(debtor => {
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

/**
 * Renderiza o resumo financeiro na aba Início
 */
function renderDashboardOverview() {
  let totalPrincipal = 0;
  let totalReceivable = 0;
  let totalOverdue = 0;
  let totalUpcoming = 0;
  let countOverdue = 0;
  let countUpcoming = 0;

  debtors.forEach(d => {
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

  document.getElementById('dashTotalPrincipal').textContent = formatCurrency(totalPrincipal);
  document.getElementById('dashTotalContracts').textContent = `${debtors.length} contratos ativos`;

  document.getElementById('dashTotalReceivable').textContent = formatCurrency(totalReceivable);
  document.getElementById('dashTotalProfit').textContent = `Retorno previsto`;

  document.getElementById('dashTotalOverdue').textContent = formatCurrency(totalOverdue);
  document.getElementById('dashCountOverdue').textContent = `${countOverdue} cliente(s) em atraso`;

  document.getElementById('dashTotalUpcoming').textContent = formatCurrency(totalUpcoming);
  document.getElementById('dashCountUpcoming').textContent = `${countUpcoming} cobrança(s) hoje`;
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
📅 *Data de Vencimento:* ${nextDueDate}
📊 *Parcelas:* ${info.paidCount} pagas | *${remainingCount} restantes* (Total: ${info.totalCount})
💳 *Saldo Devedor Restante:* ${remainingBalance}
━━━━━━━━━━━━━━━━━━━━━━

Pedimos a gentileza de efetuar o pagamento e nos enviar o comprovante por aqui.

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
  if (info.nextInstallment) {
    payBtn.style.display = 'flex';
    payBtn.innerHTML = `<span style="font-size: 1.2rem;">💵</span> Receber Parcela #${info.nextInstallment.number} (${formatCurrency(info.nextInstallment.amount)})`;
  } else {
    payBtn.style.display = 'none';
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

    card.innerHTML = `
      <div>
        <div style="font-size: 0.9rem; font-weight: 700; color: #ffffff;">
          Parcela #${inst.number} - ${formatCurrency(inst.amount)}
        </div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">
          Vencimento: ${formatDateBR(inst.dueDate)}
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.6rem;">
        <span style="font-size: 0.75rem; ${statusStyle}">${statusText}</span>
        <button type="button" class="btn-new-client" data-toggle-inst="${inst.number}" style="margin-top: 0; padding: 0.4rem 0.7rem; font-size: 0.75rem; width: auto; background: ${inst.paid ? 'transparent' : 'var(--green-primary)'}; border: 1px solid ${inst.paid ? 'var(--border-subtle)' : 'transparent'}; color: ${inst.paid ? 'var(--text-muted)' : 'white'};">
          ${inst.paid ? '↩️ Desfazer' : '✅ Baixar'}
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  openModal('modalInstallments');
}

function toggleInstallmentPayment(installmentNumber) {
  if (!activeDebtorForAction) return;

  const inst = activeDebtorForAction.installments.find(i => i.number === installmentNumber);
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
  openInstallmentsModal(activeDebtorForAction.id);
}

function quickPayNextInstallment() {
  if (!activeDebtorForAction) return;

  const nextUnpaid = activeDebtorForAction.installments.find(i => !i.paid);
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
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
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

  // Ações do Action Sheet
  document.getElementById('actionBtnPayNext').addEventListener('click', quickPayNextInstallment);
  document.getElementById('actionBtnViewInstallments').addEventListener('click', () => {
    if (activeDebtorForAction) {
      closeModal('modalActionSheet');
      openInstallmentsModal(activeDebtorForAction.id);
    }
  });
  document.getElementById('actionBtnDelete').addEventListener('click', deleteActiveDebtor);

  // Cliques dentro do modal de parcelas (Baixar / Desfazer)
  document.getElementById('installmentsListCards').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-inst]');
    if (btn) {
      const num = parseInt(btn.dataset.toggleInst, 10);
      toggleInstallmentPayment(num);
    }
  });

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

  document.getElementById('btnResetSampleData').addEventListener('click', () => {
    if (confirm('Recarregar lista demonstrativa do JurosApp (Lulu, Ana Souza, Bruno Lima...)?')) {
      loadSampleData();
      render();
      showToast('Dados demonstrativos restaurados!', 'success');
    }
  });
}
