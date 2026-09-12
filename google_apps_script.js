/**
 * ==============================================================================
 * GORDINHOS FINANCEIRO - BACKUP AUTOMÁTICO EM PLANILHA DO GOOGLE DRIVE
 * ARQUIVO: Code.gs (Google Apps Script)
 * ==============================================================================
 * 
 * INSTRUÇÕES RÁPIDAS:
 * 1. Cole este código no Apps Script da sua planilha.
 * 2. Para importar todos os cadastros já existentes do Firebase de uma vez só:
 *    - Na barra superior do Apps Script, selecione a função "importarTodosDoFirebase".
 *    - Clique em "Executar". Pronto! Todos os 21 clientes serão adicionados na planilha.
 * 
 * 3. Para o backup automático contínuo funcionar pelo site:
 *    - Clique em "Implantar" > "Gerenciar implantações" > ícone do lápis (Editar).
 *    - Em "Quem pode acessar", selecione "Qualquer pessoa" (Anyone).
 *    - Salve a implantação.
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
 * IMPORTAÇÃO DIRETA DO FIREBASE:
 * Puxa todos os cadastros existentes diretamente do banco de dados do Firebase
 * e grava na planilha em segundos, sem depender de permissões de webhook.
 */
function importarTodosDoFirebase() {
  var firebaseUrl = "https://gordinhos-finacneiro-default-rtdb.firebaseio.com/debtors.json";
  Logger.log("Buscando registros no Firebase...");
  
  var response = UrlFetchApp.fetch(firebaseUrl);
  var rawList = JSON.parse(response.getContentText());

  if (!rawList) {
    Logger.log("Nenhum dado encontrado no Firebase.");
    return "Nenhum dado encontrado no Firebase.";
  }

  // Converte para array se vier como objeto
  var debtors = Array.isArray(rawList) ? rawList : Object.values(rawList);
  var validDebtors = debtors.filter(function(d) {
    return d && typeof d === 'object' && d.name;
  });

  Logger.log("Total de cadastros válidos encontrados: " + validDebtors.length);

  var mockEvent = {
    postData: {
      contents: JSON.stringify({ debtors: validDebtors })
    }
  };

  var res = doPost(mockEvent);
  Logger.log("Resultado da gravação: " + res.getContent());
  return "Sucesso! " + validDebtors.length + " cadastros importados para a planilha.";
}

/**
 * Ponto de entrada POST que recebe os dados enviados pelo Front-end
 */
function doPost(e) {
  try {
    // 1. Validação de segurança dos dados recebidos
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Nenhum dado recebido no payload."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Parse seguro do JSON
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Obtém ou define a aba de backup
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
        .setBackground("#0f172a") // Azul ardósia profissional
        .setFontColor("#ffffff")
        .setFontWeight("bold")
        .setFontSize(10)
        .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }

    // 4. Suporte flexível para registro individual ou em lote
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

    // 5. Mapeamento coluna por coluna com proteção total contra nulos / vazios
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

    // 6. Gravação na planilha via appendRow (nunca desalinha as colunas)
    rowsToAppend.forEach(function(r) {
      sheet.appendRow(r);
    });

    // 7. Formatação automática de Moeda (R$) e Porcentagem (%)
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

    sheet.autoResizeColumns(1, HEADERS.length);

    // 8. Resposta de confirmação
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Registro(s) gravado(s) com sucesso na planilha!",
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
 * Teste de conectividade acessando a URL no navegador
 */
function doGet(e) {
  return ContentService.createTextOutput("✅ Webhook Google Apps Script ativo e pronto para receber backups do Gordinhos Financeiro!")
    .setMimeType(ContentService.MimeType.TEXT);
}
