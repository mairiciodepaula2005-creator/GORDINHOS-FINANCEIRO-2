/**
 * ==============================================================================
 * GORDINHOS FINANCEIRO - BACKUP AUTOMÁTICO EM PLANILHA DO GOOGLE DRIVE
 * ARQUIVO: Code.gs (Google Apps Script)
 * ==============================================================================
 * 
 * ATUALIZAÇÕES:
 * 1. Ordem por novos clientes no topo: Cada novo cliente é inserido na Linha 2 (acima dos anteriores).
 * 2. Correção da porcentagem: 30% agora é exibido corretamente como 30,00% (corrigido o 3000%).
 * 3. Função "importarTodosDoFirebase": Recarrega todos os clientes em ordem cronológica (mais recentes no topo).
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
 * IMPORTAÇÃO E CORREÇÃO DIRETA DO FIREBASE:
 * Limpa a planilha antiga e reinsere todos os clientes do Firebase:
 * - Mais recentes no topo (abaixo do cabeçalho)
 * - Porcentagem corrigida para 30,00%
 */
function importarTodosDoFirebase() {
  var firebaseUrl = "https://gordinhos-finacneiro-default-rtdb.firebaseio.com/debtors.json";
  Logger.log("Buscando registros no Firebase...");
  
  var response = UrlFetchApp.fetch(firebaseUrl);
  var rawList = JSON.parse(response.getContentText());

  if (!rawList) {
    Logger.log("Nenhum dado encontrado no Firebase.");
    return;
  }

  var debtors = Array.isArray(rawList) ? rawList : Object.values(rawList);
  var validDebtors = debtors.filter(function(d) {
    return d && typeof d === 'object' && d.name;
  });

  // Ordena os clientes do mais recente para o mais antigo (novos no topo)
  validDebtors.sort(function(a, b) {
    var timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    var timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (!timeA && a.id) timeA = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
    if (!timeB && b.id) timeB = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    return timeB - timeA; // Decrescente: mais recentes primeiro
  });

  var mockEvent = {
    postData: {
      contents: JSON.stringify({ 
        debtors: validDebtors,
        clearExisting: true 
      })
    }
  };

  var res = doPost(mockEvent);
  Logger.log("Resultado: " + res.getContent());
}

/**
 * Ponto de entrada POST chamado pelo site para novos cadastros
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Vazio" })).setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var sheet = ss.getSheetByName("Cadastros_Backup");
    if (!sheet) {
      sheet = ss.getActiveSheet();
      sheet.setName("Cadastros_Backup");
    }

    // Se solicitado limpeza ou se a planilha estiver vazia, recria o cabeçalho
    if (data.clearExisting === true || sheet.getLastRow() === 0) {
      sheet.clear();
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

    var rowsToAdd = [];

    clientsToProcess.forEach(function(client) {
      if (!client) return;

      var principal = client.principal != null ? Number(client.principal) : 0;
      var totalAmount = client.totalAmount != null ? Number(client.totalAmount) : 0;
      var expectedProfit = client.expectedProfit != null 
        ? Number(client.expectedProfit) 
        : Math.max(0, totalAmount - principal);

      // Correção da taxa de juros: Se o valor for 30, no Excel/Sheets 100% = 1, então 30% = 0.30
      var rawInterest = client.interestRate != null ? Number(client.interestRate) : 0;
      var rateDecimal = rawInterest > 1 ? (rawInterest / 100) : rawInterest;

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
        
        // Coluna F (6): Taxa de Juros (%) -> 0.30 para exibir 30,00%
        rateDecimal,
        
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

      rowsToAdd.push(row);
    });

    if (rowsToAdd.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", rowsAdded: 0 })).setMimeType(ContentService.MimeType.JSON);
    }

    // REGRA DE ORDEM: Inserir novos clientes no TOPO (Linha 2, logo abaixo do cabeçalho)
    if (data.clearExisting === true) {
      // Se foi recarga total, insere a partir da linha 2
      sheet.getRange(2, 1, rowsToAdd.length, HEADERS.length).setValues(rowsToAdd);
      formatRows(sheet, 2, rowsToAdd.length);
    } else {
      // Se for novo cadastro pelo site, insere novas linhas no topo
      sheet.insertRowsBefore(2, rowsToAdd.length);
      sheet.getRange(2, 1, rowsToAdd.length, HEADERS.length).setValues(rowsToAdd);
      formatRows(sheet, 2, rowsToAdd.length);
    }

    sheet.autoResizeColumns(1, HEADERS.length);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      rowsAdded: rowsToAdd.length,
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Função auxiliar para formatar moedas (R$) e porcentagens (%)
 */
function formatRows(sheet, startRow, rowCount) {
  // Formata colunas de valores monetários (E, I, J, K -> 5, 9, 10, 11)
  [5, 9, 10, 11].forEach(function(col) {
    sheet.getRange(startRow, col, rowCount, 1).setNumberFormat("R$ #,##0.00");
  });

  // Formata coluna de taxa (F -> 6) como porcentagem correta (ex: 30,00%)
  sheet.getRange(startRow, 6, rowCount, 1).setNumberFormat("0.00%");
}

function doGet(e) {
  return ContentService.createTextOutput("✅ Webhook Google Apps Script ativo!").setMimeType(ContentService.MimeType.TEXT);
}
