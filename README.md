# Gordinhos Financeiro - Sistema de Gestão de Empréstimos & Cobrança

Sistema web moderno desenvolvido para o gerenciamento de clientes, empréstimos, controle de cobrança e acompanhamento de parcelas com ranking de prioridade de recebimento.

---

## 🚀 Como Executar

O sistema é 100% autônomo e não necessita de servidores complexos ou banco de dados externo:
1. Basta abrir o arquivo `index.html` em qualquer navegador web (Google Chrome, Microsoft Edge, Firefox, etc.) com dois cliques.
2. Ou sirva via servidor estático (ex: Live Server do VS Code, Python `python -m http.server 8000`, etc.).

---

## ✨ Principais Funcionalidades

### 1. 🏆 Ranking de Prioridade de Cobrança com Código de Cores
- 🔴 **Vermelho (Vencido / Inadimplente)**: Devedores com parcelas atrasadas recebem alerta prioritário no topo do ranking, com contagem exata de dias de atraso e pulso visual.
- 🟡 **Amarelo (Vence Hoje / Vence em até 3 dias)**: Alerta preventivo para realizar cobrança antes do atraso.
- 🟢 **Verde (Em Dia)**: Contratos com parcelas futuras dentro do prazo regulamentar.
- ⚪ **Cinza (Quitado)**: Contratos 100% pagos com histórico preservado.

### 2. 📝 Cadastro Ágil de Empréstimo
- **Nome do Devedor** e **WhatsApp**.
- **Valor do Empréstimo (R$)**.
- **Taxa de Juros ao Mês (%)**: Padrão pré-configurado em **30% ao mês**, permitindo edição livre para qualquer porcentagem.
- **Quantidade de Parcelas / Vezes**.
- **Caixa de Seleção "Pagamento na Diária"**: Permite alternar facilmente entre cobranças diárias (diárias consecutivas) e parcelas mensais.
- **Simulador Instantâneo**: Exibe antes de salvar o valor calculado dos juros, o montante total e o valor exato de cada parcela.

### 3. 💵 Gestão e Baixa de Parcelas
- **Recebimento Rápido com 1 Clique**: Botão direto no card para baixar a próxima parcela vencida/pendente.
- **Detalhamento Completo**: Modal com tabela de todas as parcelas (Nº, Vencimento, Valor, Status, Data do Pagamento) com opção de marcar/desmarcar pagamentos.
- **Cobrança no WhatsApp**: Botão que abre diretamente uma conversa no WhatsApp com mensagem de cobrança personalizada.

### 4. 📊 Indicadores Financeiros (KPIs)
- Total Emprestado (Capital em giro)
- Total a Receber (Retorno previsto com juros)
- Total em Atraso (Alerta crítico de inadimplência)
- Clientes com vencimento iminente

### 5. 💾 Persistência & Backup
- Os dados ficam salvos de forma segura no `localStorage` do navegador.
- Botão para **Exportar Backup (JSON)** e **Restaurar Backup**.

### 6. 🔥 Integração com Firebase
- Módulo oficial configurado em `firebase-config.js` (e `firebase.js`).
- Inicialização do Firebase App e Analytics com credenciais do projeto `gordinhos-finacneiro`.
- Disponível para módulos ES (`import { app } from './firebase-config.js'`) e também via `window.firebaseApp` para uso global.

