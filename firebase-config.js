/**
 * ==============================================================================
 * GORDINHOS FINANCEIRO - CONFIGURAÇÃO E INICIALIZAÇÃO DO REALTIME DATABASE
 * ==============================================================================
 */

// Importa as funções oficiais do Firebase App e Realtime Database (Modular SDK v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";

// Configuração oficial do Firebase com a URL do Realtime Database
export const firebaseConfig = {
  apiKey: "AIzaSyBi8A9orqz-tA-FLHwxT6fMqTnzKpBeZMc",
  authDomain: "gordinhos-finacneiro.firebaseapp.com",
  databaseURL: "https://gordinhos-finacneiro-default-rtdb.firebaseio.com",
  projectId: "gordinhos-finacneiro",
  storageBucket: "gordinhos-finacneiro.firebasestorage.app",
  messagingSenderId: "241516221852",
  appId: "1:241516221852:web:944989260e1d6809fd6459",
  measurementId: "G-6EVNR14FD1"
};

// Inicializa o Firebase App
export const app = initializeApp(firebaseConfig);

// Inicializa o Realtime Database usando getDatabase(app)
export const database = getDatabase(app);
export const db = database;

// Exporta as operações do Realtime Database (ref, set, push, onValue)
export { ref, set, push, onValue };

// Inicializa Analytics (se suportado no ambiente)
export let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics é opcional
}

/**
 * Função para salvar registros no nó /debtors do Realtime Database usando ref e set
 * Trata o erro no catch e exibe no console conforme solicitado
 */
export function saveDebtorsToDatabase(data) {
  const debtorsRef = ref(database, 'debtors');
  console.log("☁️ [Realtime Database] Enviando registros para o nó /debtors...", data);

  return set(debtorsRef, data)
    .then(() => {
      console.log("✅ DADOS SALVOS COM SUCESSO NO REALTIME DATABASE!");
      return true;
    })
    .catch((error) => {
      console.error("❌ ERRO AO SALVAR NO REALTIME DATABASE:", error);
      if (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toLowerCase().includes('permission_denied'))) {
        console.error("⚠️ REGRA DE SEGURANÇA BLOQUEANDO GRAVAÇÃO! Acesse o console do Firebase > Realtime Database > Regras e altere .write para true.");
      }
      throw error;
    });
}

// Disponibiliza no escopo global para o navegador e console de depuração
if (typeof window !== "undefined") {
  window.firebaseApp = app;
  window.firebaseConfig = firebaseConfig;
  window.firebaseDb = database;
  window.database = database;
  window.db = db;
  window.ref = ref;
  window.set = set;
  window.push = push;
  window.onValue = onValue;
  window.saveDebtorsToDatabase = saveDebtorsToDatabase;
  console.log("🔥 Realtime Database pronto via getDatabase(app) em:", firebaseConfig.databaseURL);
}

export default app;
