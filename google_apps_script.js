/**
 * ==============================================================================
 * SISTEMA FINANCEIRO - SINCRONIZAÇÃO COM PLANILHA NO GOOGLE DRIVE
 * ==============================================================================
 * 
 * COMO USAR (Menos de 1 minuto):
 * 1. Abra o seu Google Drive e crie uma nova planilha (ex: "Controle Financeiro").
 * 2. No menu superior da planilha, clique em: Extensões > Apps Script.
 * 3. Apague qualquer código existente no editor e cole todo este arquivo.
 * 4. No canto superior direito, clique no botão azul "Implantar" > "Nova implantação".
 * 5. Clique no ícone de engrenagem ao lado de "Selecionar tipo" e escolha "App da Web".
 * 6. Preencha as opções:
 *    - Descrição: Sincronizador Financeiro
 *    - Executar como: Eu (seu email)
 *    - Quem pode acessar: Qualquer pessoa (Anyone)
 * 7. Clique em "Implantar", conceda as permissões solicitadas pela sua conta Google.
 * 8. Copie a "URL do app da web" (termina com /exec) e cole no seu sistema na aba "Mais"!
 * 
 * Pronto! Todas as vezes que você clicar em "Sincronizar" ou registrar baixas, 
 * sua planilha no Google Drive será atualizada automaticamente com abas formatadas.
 * ==============================================================================
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nenhum dado recebido no payload."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // --------------------------------------------------------------------------
    // 1. ABA: RESUMO GERAL
    // --------------------------------------------------------------------------
    var sheetResumo = ss.getSheetByName("Resumo Financeiro") || ss.insertSheet("Resumo Financeiro", 0);
    sheetResumo.clear();
    
    var resumoHeader = [["MÉTRICA", "VALOR"]];
    sheetResumo.getRange(1, 1, 1, 2).setValues(resumoHeader)
      .setBackground("#065F46").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(11);

    var resumoData = [
      ["Total Emprestado (Principal)", payload.summary ? payload.summary.totalPrincipal : 0],
      ["Total a Receber (Saldo Pendente)", payload.summary ? payload.summary.totalReceivable : 0],
      ["Total de Lucro Realizado (Baixas + Juros)", payload.summary ? payload.summary.totalRealizedProfit : 0],
      ["Clientes Ativos", payload.summary ? payload.summary.activeClientsCount : 0],
      ["Clientes em Atraso", payload.summary ? payload.summary.overdueClientsCount : 0],
      ["Última Atualização", new Date().toLocaleString("pt-BR")]
    ];

    sheetResumo.getRange(2, 1, resumoData.length, 2).setValues(resumoData);
    sheetResumo.getRange(2, 2, 3, 1).setNumberFormat("R$ #,##0.00");
    sheetResumo.autoResizeColumns(1, 2);

    // --------------------------------------------------------------------------
    // 2. ABA: CLIENTES E EMPRÉSTIMOS
    // --------------------------------------------------------------------------
    var sheetClientes = ss.getSheetByName("Clientes") || ss.insertSheet("Clientes", 1);
    sheetClientes.clear();

    var headersClientes = [
      "Nome", "CPF", "Telefone", "Valor Emprestado", "Taxa (%)", "Total a Pagar", 
      "Saldo Restante", "Lucro Previsto", "Lucro Realizado", "Parcelas Pagas", 
      "Total Parcelas", "Status", "Data de Início", "Observações"
    ];
    sheetClientes.appendRow(headersClientes);
    sheetClientes.getRange(1, 1, 1, headersClientes.length)
      .setBackground("#059669").setFontColor("#FFFFFF").setFontWeight("bold");

    if (payload.debtors && payload.debtors.length > 0) {
      var rowsClientes = [];
      payload.debtors.forEach(function(d) {
        rowsClientes.push([
          d.name || "",
          d.cpf || "",
          d.phone || "",
          parseFloat(d.principal) || 0,
          parseFloat(d.interestRate) || 0,
          parseFloat(d.totalAmount) || 0,
          parseFloat(d.remainingBalance) || 0,
          parseFloat(d.expectedProfit) || 0,
          parseFloat(d.realizedProfit) || 0,
          parseInt(d.paidInstallmentsCount, 10) || 0,
          parseInt(d.totalInstallmentsCount, 10) || 0,
          d.statusLabel || "",
          d.createdAt || "",
          d.notes || ""
        ]);
      });
      sheetClientes.getRange(2, 1, rowsClientes.length, headersClientes.length).setValues(rowsClientes);
      sheetClientes.getRange(2, 4, rowsClientes.length, 1).setNumberFormat("R$ #,##0.00");
      sheetClientes.getRange(2, 6, rowsClientes.length, 4).setNumberFormat("R$ #,##0.00");
    }
    sheetClientes.autoResizeColumns(1, headersClientes.length);

    // --------------------------------------------------------------------------
    // 3. ABA: PARCELAS E BAIXAS
    // --------------------------------------------------------------------------
    var sheetParcelas = ss.getSheetByName("Parcelas") || ss.insertSheet("Parcelas", 2);
    sheetParcelas.clear();

    var headersParcelas = [
      "Cliente", "Parcela Nº", "Valor da Parcela", "Data de Vencimento", 
      "Status da Parcela", "Data da Baixa / Pagamento", "Lucro da Parcela"
    ];
    sheetParcelas.appendRow(headersParcelas);
    sheetParcelas.getRange(1, 1, 1, headersParcelas.length)
      .setBackground("#10B981").setFontColor("#FFFFFF").setFontWeight("bold");

    if (payload.installments && payload.installments.length > 0) {
      var rowsParcelas = [];
      payload.installments.forEach(function(inst) {
        rowsParcelas.push([
          inst.debtorName || "",
          inst.number || 1,
          parseFloat(inst.amount) || 0,
          inst.dueDate || "",
          inst.paid ? "PAGO" : "PENDENTE",
          inst.paidAt || "-",
          parseFloat(inst.profit) || 0
        ]);
      });
      sheetParcelas.getRange(2, 1, rowsParcelas.length, headersParcelas.length).setValues(rowsParcelas);
      sheetParcelas.getRange(2, 3, rowsParcelas.length, 1).setNumberFormat("R$ #,##0.00");
      sheetParcelas.getRange(2, 7, rowsParcelas.length, 1).setNumberFormat("R$ #,##0.00");
    }
    sheetParcelas.autoResizeColumns(1, headersParcelas.length);

    // --------------------------------------------------------------------------
    // 4. ABA: HISTÓRICO DE SÓ JUROS
    // --------------------------------------------------------------------------
    var sheetJuros = ss.getSheetByName("Historico_Juros") || ss.insertSheet("Historico_Juros", 3);
    sheetJuros.clear();

    var headersJuros = [
      "Cliente", "Valor Juros Recebido (Lucro)", "Data do Pagamento", "Vencimento Anterior", "Novo Vencimento"
    ];
    sheetJuros.appendRow(headersJuros);
    sheetJuros.getRange(1, 1, 1, headersJuros.length)
      .setBackground("#047857").setFontColor("#FFFFFF").setFontWeight("bold");

    if (payload.interestPayments && payload.interestPayments.length > 0) {
      var rowsJuros = [];
      payload.interestPayments.forEach(function(j) {
        rowsJuros.push([
          j.debtorName || "",
          parseFloat(j.amount) || 0,
          j.paidAt || "",
          j.previousDueDate || "",
          j.newDueDate || ""
        ]);
      });
      sheetJuros.getRange(2, 1, rowsJuros.length, headersJuros.length).setValues(rowsJuros);
      sheetJuros.getRange(2, 2, rowsJuros.length, 1).setNumberFormat("R$ #,##0.00");
    }
    sheetJuros.autoResizeColumns(1, headersJuros.length);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Planilha do Google Sheets sincronizada com sucesso!",
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Sincronizador Google Sheets Ativo. Conexão realizada com sucesso!")
    .setMimeType(ContentService.MimeType.TEXT);
}
