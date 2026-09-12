/**
 * ==============================================================================
 * GORDINHOS FINANCEIRO - BACKUP AUTOMÁTICO EM PLANILHA DO GOOGLE DRIVE
 * ARQUIVO: Code.gs (Google Apps Script)
 * ==============================================================================
 * 
 * INSTRUÇÕES RÁPIDAS DE INSTALAÇÃO:
 * 1. Abra o Google Drive (https://drive.google.com) e crie uma nova Planilha Google.
 * 2. Dê um nome à planilha (ex: "Backup Gordinhos Financeiro").
 * 3. No menu superior da planilha, clique em: Extensões > Apps Script.
 * 4. Apague todo o conteúdo que estiver no editor e cole todo este código abaixo.
 * 5. No canto superior direito, clique em "Implantar" (Deploy) > "Nova implantação".
 * 6. Clique na engrenagem ao lado de "Selecionar tipo" e escolha "App da Web" (Web app).
 * 7. Configure as opções:
 *    - Descrição: Backup Automático Financeiro
 *    - Executar como: Eu (seu e-mail)
 *    - Quem pode acessar: Qualquer pessoa (Anyone)  <--- IMPORTANTE!
 * 8. Clique em "Implantar" e autorize as permissões da sua conta Google.
 * 9. Copie a "URL do app da web" gerada (termina com /exec).
 * 10. No seu sistema (site), vá na aba "Mais", cole a URL no campo de Webhook e salve!
 * ==============================================================================
 */

// Lista exata de cabeçalhos das colunas (Linha 1 da planilha)
var HEADERS = [
  "Data/Hora",
  "ID do Cliente",
  "Nome do Cliente",
  "Telefone",
  "Valor Emprestado (R$)",
  "Taxa de Juros (%)",
  "Tipo de Cobrança",
  "Qtd Parcelas / Dias",
  "Valor da Parcela (R$)",
  "Total a Pagar (R$)",
  "Lucro Estimado (R$)",
  "Data de Início",
  "Primeiro Vencimento",
  "Status",
  "Observações"
];

/**
 * Ponto de entrada POST que recebe os dados enviados pelo Front-end
 */
function doPost(e) {
  try {
    // 1. Validação de dados recebidos
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nenhum dado recebido no payload."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Parse seguro do JSON
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Obtém ou cria a aba "Cadastros_Backup"
    var sheet = ss.getSheetByName("Cadastros_Backup");
    if (!sheet) {
      sheet = ss.getActiveSheet();
      sheet.setName("Cadastros_Backup");
    }

    // 3. Se a linha 1 estiver vazia, cria e estiliza os cabeçalhos automaticamente
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange
        .setBackground("#0f172a") // Azul ardósia escuro profissional
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setFontSize(10)
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 4. Suporte tanto para registro individual quanto lote/array
    var clientsToProcess = [];
    if (data.debtors && Array.isArray(data.debtors)) {
      clientsToProcess = data.debtors;
    } else if (data.data && typeof data.data === 'object') {
      clientsToProcess = [data.data];
    } else if (data.name) {
      clientsToProcess = [data];
    } else {
      clientsToProcess = [data];
    }

    var rowsToAppend = [];

    // 5. Mapeamento de cada coluna com tratamento rigoroso contra nulos/vazios
    clientsToProcess.forEach(function(client) {
      if (!client) return;

      var principal = client.principal != null ? Number(client.principal) : 0;
      var totalAmount = client.totalAmount != null ? Number(client.totalAmount) : 0;
      var expectedProfit = client.expectedProfit != null 
        ? Number(client.expectedProfit) 
        : Math.max(0, totalAmount - principal);

      var firstDueDate = client.firstDueDate || "";
      if (!firstDueDate && client.installments && client.installments.length > 0 && client.installments[0].dueDate) {
        firstDueDate = client.installments[0].dueDate;
      } else if (!firstDueDate && client.startDate) {
        firstDueDate = client.startDate;
      }

      var row = [
        // Coluna A (1): Data/Hora
        client.timestamp || (client.createdAt ? new Date(client.createdAt).toLocaleString("pt-BR") : new Date().toLocaleString("pt-BR")),
        
        // Coluna B (2): ID do Cliente
        client.id || "",
        
        // Coluna C (3): Nome do Cliente
        client.name ? String(client.name).trim() : "Sem Nome",
        
        // Coluna D (4): Telefone
        client.phone ? String(client.phone).trim() : "",
        
        // Coluna E (5): Valor Emprestado (R$)
        principal,
        
        // Coluna F (6): Taxa de Juros (%)
        client.interestRate != null ? Number(client.interestRate) : 0,
        
        // Coluna G (7): Tipo de Cobrança (Diária / Mensal)
        client.type || (client.isDaily ? "Diária" : "Mensal"),
        
        // Coluna H (8): Qtd Parcelas / Dias
        client.installmentsCount != null ? Number(client.installmentsCount) : 1,
        
        // Coluna I (9): Valor da Parcela (R$)
        client.installmentAmount != null ? Number(client.installmentAmount) : 0,
        
        // Coluna J (10): Total a Pagar (R$)
        totalAmount,
        
        // Coluna K (11): Lucro Estimado (R$)
        expectedProfit,
        
        // Coluna L (12): Data de Início
        client.startDate ? String(client.startDate) : "",
        
        // Coluna M (13): Primeiro Vencimento
        firstDueDate ? String(firstDueDate) : "",
        
        // Coluna N (14): Status
        client.statusLabel || client.status || "Ativo",
        
        // Coluna O (15): Observações
        client.notes ? String(client.notes).trim() : ""
      ];

      rowsToAppend.push(row);
    });

    // 6. Gravação na planilha via appendRow
    rowsToAppend.forEach(function(r) {
      sheet.appendRow(r);
    });

    // 7. Aplicação de formatos numéricos e moeda brasileira
    var lastRow = sheet.getLastRow();
    if (lastRow > 1 && rowsToAppend.length > 0) {
      var startRow = lastRow - rowsToAppend.length + 1;
      
      // Formata colunas de valores monetários (E, I, J, K -> 5, 9, 10, 11)
      [5, 9, 10, 11].forEach(function(col) {
        sheet.getRange(startRow, col, rowsToAppend.length, 1).setNumberFormat("R$ #,##0.00");
      });

      // Formata coluna de taxa (F -> 6)
      sheet.getRange(startRow, 6, rowsToAppend.length, 1).setNumberFormat("0.00'%'");
    }

    // Autoajuste da largura das colunas
    sheet.autoResizeColumns(1, HEADERS.length);

    // 8. Resposta de sucesso em JSON
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Registro(s) salvo(s) com sucesso na planilha!",
      rowsAdded: rowsToAppend.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Ponto de entrada GET para teste de conectividade no navegador
 */
function doGet(e) {
  return ContentService.createTextOutput("✅ Webhook Google Apps Script ativo e pronto para receber backups do Gordinhos Financeiro!")
    .setMimeType(ContentService.MimeType.TEXT);
}
