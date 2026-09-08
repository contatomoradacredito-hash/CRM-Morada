import { ClientProcess, ProcessStage } from '../types';
import { INITIAL_PROCESSES } from '../data/defaultData';
import { getFullDefaultChecklist } from './constants';
import { formatCurrency, parseMonthYearString } from './formatters';

const STORAGE_KEY = 'morada_credito_processes_v2';
const HAS_INITIALIZED_KEY = 'morada_credito_initialized_v2';
const DELETED_IDS_KEY = 'morada_credito_deleted_ids_v2';

export function getDeletedProcessIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set<string>();
  }
}

export function markProcessAsDeletedLocally(id: string): void {
  try {
    const set = getDeletedProcessIds();
    set.add(id);
    // Keep max 1000 deleted IDs to prevent unbounded growth
    const arr = Array.from(set);
    if (arr.length > 1000) {
      arr.splice(0, arr.length - 1000);
    }
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('Erro ao registrar ID deletado:', e);
  }
}

export function clearDeletedProcessIds(): void {
  try {
    localStorage.removeItem(DELETED_IDS_KEY);
  } catch {}
}

/**
 * Repairs a single process if it has inverted/shifted columns from a previous CSV import.
 * Specifically handles the case where partnerRealtorName was put in estimatedIssuanceMonth,
 * propertyCity was put in partnerRealtorName, and propertyState was put in propertyCity.
 */
export function repairProcessFields(p: ClientProcess): ClientProcess {
  if (!p) return p;

  const validMonth = parseMonthYearString(p.estimatedIssuanceMonth);

  // If estimatedIssuanceMonth is NOT a valid month (e.g., contains a Realtor name like "Carlos Corretor" or "Imobiliária Alpha")
  if (!validMonth) {
    const rawRealtorNameCandidate = p.estimatedIssuanceMonth?.trim() || '';
    const rawCityCandidate = p.partnerRealtorName?.trim() || '';
    const rawStateCandidate = p.propertyCity?.trim() || '';

    // The realtor name is the text that was misplaced in estimatedIssuanceMonth
    const realRealtor = rawRealtorNameCandidate || 'Direto';

    // The city is the text that was misplaced in partnerRealtorName
    const realCity =
      rawCityCandidate && rawCityCandidate !== 'Direto'
        ? rawCityCandidate
        : rawStateCandidate && rawStateCandidate.length > 2
        ? rawStateCandidate
        : 'São Paulo';

    // The state is the 2-letter UF or default to 'SP'
    const realState =
      rawStateCandidate && rawStateCandidate.length === 2
        ? rawStateCandidate.toUpperCase()
        : p.propertyState && p.propertyState.length === 2
        ? p.propertyState.toUpperCase()
        : 'SP';

    // Attempt to recover the actual month from createdAt, stageUpdatedAt, or default to recent
    let recoveredMonth = '2026-08';
    if (p.createdAt) {
      const match = p.createdAt.match(/(\d{4})-(\d{2})/);
      if (match) {
        recoveredMonth = `${match[1]}-${match[2]}`;
      }
    }

    return {
      ...p,
      estimatedIssuanceMonth: recoveredMonth,
      partnerRealtorName: realRealtor,
      propertyCity: realCity,
      propertyState: realState,
    };
  }

  // Also check if partnerRealtorName is a date and estimatedIssuanceMonth is a name
  const realtorIsMonth = parseMonthYearString(p.partnerRealtorName);
  if (realtorIsMonth && !validMonth) {
    return {
      ...p,
      estimatedIssuanceMonth: realtorIsMonth,
      partnerRealtorName: p.estimatedIssuanceMonth,
    };
  }

  return p;
}

/**
 * Repairs an array of processes and reports how many were corrected
 */
export function repairProcessesList(processes: ClientProcess[]): { repaired: ClientProcess[]; count: number } {
  let count = 0;
  const repaired = processes.map((p) => {
    const isCorrupted = !parseMonthYearString(p.estimatedIssuanceMonth);
    if (isCorrupted) {
      count++;
      return repairProcessFields(p);
    }
    return p;
  });
  return { repaired, count };
}

export function loadProcesses(): ClientProcess[] {
  try {
    const initialized = localStorage.getItem(HAS_INITIALIZED_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    // Initial state is a clean empty base so user can test and create new processes
    if (!initialized) {
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
      saveProcesses([]);
      return [];
    }

    // If saved exists (including empty array []), respect it!
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => {
          const repaired = repairProcessFields(p);
          if (!repaired.creditAnalysisStatus) {
            const isAdvancedStage =
              repaired.stage !== 'SIMULATION_COLLECTION' &&
              repaired.stage !== 'CREDIT_ANALYSIS' &&
              repaired.stage !== 'DECLINED_CANCELLED';
            return {
              ...repaired,
              creditAnalysisStatus: isAdvancedStage ? 'APROVADO' : 'EM_ANALISE',
            };
          }
          return repaired;
        });
      }
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar dados do armazenamento:', error);
    return [];
  }
}

export function saveProcesses(processes: ClientProcess[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(processes));
    localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

export function clearAllProcesses(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
  } catch (error) {
    console.error('Erro ao zerar dados:', error);
  }
}

export function reloadDefaultProcesses(): ClientProcess[] {
  try {
    clearDeletedProcessIds();
    saveProcesses(INITIAL_PROCESSES);
    return INITIAL_PROCESSES;
  } catch (error) {
    console.error('Erro ao recarregar dados padrão:', error);
    return INITIAL_PROCESSES;
  }
}

export function exportProcessesToCSV(processes: ClientProcess[]): void {
  const headers = [
    'ID',
    'Cliente',
    'CPF',
    'Telefone',
    'Email',
    'Tipo de Credito',
    'Valor Imovel (R$)',
    'Valor Financiado (R$)',
    'Entrada (R$)',
    'Banco',
    'Numero Proposta',
    'Taxa Anual (%)',
    'Prazo (Meses)',
    'Sistema Amortizacao',
    'Comissao (%)',
    'Comissao (R$)',
    'Status Comissao',
    'Fase Atual',
    'Mes Previsao Emissao (AAAA-MM)',
    'Data Criacao',
    'Corretor Parceiro',
    'Cidade',
    'UF',
    'Cartorio RGI',
    'Protocolo RGI',
  ];

  const rows = processes.map((p) => [
    `"${p.id}"`,
    `"${p.clientName}"`,
    `"${p.clientCpf}"`,
    `"${p.clientPhone}"`,
    `"${p.clientEmail || ''}"`,
    `"${p.creditType}"`,
    p.propertyValue,
    p.financingValue,
    p.downPaymentValue || 0,
    `"${p.bank}"`,
    `"${p.proposalNumber || ''}"`,
    p.interestRateAnnual || 10.49,
    p.termMonths || 360,
    `"${p.amortizationSystem || 'SAC'}"`,
    p.commissionPercentage,
    p.commissionAmount,
    `"${p.commissionStatus}"`,
    `"${p.stage}"`,
    `"${p.estimatedIssuanceMonth}"`,
    `"${p.createdAt}"`,
    `"${p.partnerRealtorName || ''}"`,
    `"${p.propertyCity}"`,
    `"${p.propertyState}"`,
    `"${p.registryOfficeName || ''}"`,
    `"${p.rgiProtocolNumber || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `morada_credito_processos_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadHistorySpreadsheetTemplate(): void {
  const headers = [
    'Nome do Cliente',
    'CPF',
    'Telefone',
    'Email',
    'Tipo de Credito (AQUISICAO_RESIDENCIAL / AQUISICAO_COMERCIAL / HOME_EQUITY / CONSTRUCAO / PORTABILIDADE)',
    'Valor do Imovel (R$)',
    'Valor Financiado (R$)',
    'Valor da Entrada (R$)',
    'Banco (Itau Unibanco / Caixa Economica Federal / Bradesco / Santander / Banco Inter / Banco Bari (Home Equity))',
    'Numero da Proposta Bancaria',
    'Taxa de Juros Anual (%)',
    'Prazo (Meses)',
    'Sistema (SAC ou PRICE)',
    'Percentual Comissao (%)',
    'Valor da Comissao (R$ - opcional)',
    'Status Comissao (PAGA / DISPONIVEL_FATURAMENTO / PREVISTA)',
    'Fase do Processo (COMMISSION_PAID / DISBURSEMENT_COMPLETED / PROPERTY_REGISTRY / CONTRACT_SIGNATURE / CONTRACT_ISSUANCE / VALUE_CONFIRMATION / LEGAL_COMPLIANCE / PROPERTY_VALUATION / CREDIT_ANALYSIS / SIMULATION_COLLECTION)',
    'Mes e Ano de Fechamento (AAAA-MM, ex: 2025-09, 2026-01, 2026-08)',
    'Nome do Corretor Parceiro',
    'Cidade do Imovel',
    'UF (ex: SP)',
  ];

  // Example template rows representing the last 12 months
  const exampleRows = [
    [
      '"Marcos Silveira"',
      '"123.456.789-00"',
      '"(11) 98765-4321"',
      '"marcos.silveira@email.com"',
      '"AQUISICAO_RESIDENCIAL"',
      '650000',
      '520000',
      '130000',
      '"Itaú Unibanco"',
      '"ITAU-88741"',
      '10.49',
      '360',
      '"SAC"',
      '1.25',
      '6500',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2025-09"',
      '"Imobiliária Alpha"',
      '"São Paulo"',
      '"SP"',
    ],
    [
      '"Luciana Mendonça"',
      '"234.567.890-11"',
      '"(11) 97654-3210"',
      '"luciana.m@email.com"',
      '"AQUISICAO_RESIDENCIAL"',
      '800000',
      '640000',
      '160000',
      '"Caixa Econômica Federal"',
      '"CEF-99321"',
      '9.99',
      '360',
      '"SAC"',
      '1.0',
      '6400',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2025-10"',
      '"Carlos Corretor"',
      '"Campinas"',
      '"SP"',
    ],
    [
      '"Roberto Camargo"',
      '"345.678.901-22"',
      '"(11) 96543-2109"',
      '"roberto.camargo@email.com"',
      '"HOME_EQUITY"',
      '1200000',
      '450000',
      '750000',
      '"Banco Bari (Home Equity)"',
      '"BARI-55210"',
      '14.5',
      '180',
      '"PRICE"',
      '2.2',
      '9900',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2025-11"',
      '""',
      '"São Paulo"',
      '"SP"',
    ],
    [
      '"Patricia Albuquerque"',
      '"456.789.012-33"',
      '"(11) 95432-1098"',
      '"patricia.a@email.com"',
      '"AQUISICAO_RESIDENCIAL"',
      '550000',
      '440000',
      '110000',
      '"Bradesco"',
      '"BRAD-11029"',
      '10.35',
      '360',
      '"SAC"',
      '1.2',
      '5280',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2025-12"',
      '"Imóveis Prime"',
      '"São Paulo"',
      '"SP"',
    ],
    [
      '"Eduardo Fagundes"',
      '"567.890.123-44"',
      '"(11) 94321-0987"',
      '"eduardo.fagundes@email.com"',
      '"AQUISICAO_RESIDENCIAL"',
      '920000',
      '736000',
      '184000',
      '"Santander"',
      '"SANT-44102"',
      '10.2',
      '360',
      '"SAC"',
      '1.3',
      '9568',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2026-01"',
      '"Corretora Fernanda"',
      '"Santo André"',
      '"SP"',
    ],
    [
      '"Juliana Prado"',
      '"678.901.234-55"',
      '"(11) 93210-9876"',
      '"juliana.prado@email.com"',
      '"AQUISICAO_RESIDENCIAL"',
      '700000',
      '560000',
      '140000',
      '"Banco Inter"',
      '"INT-77291"',
      '10.15',
      '360',
      '"SAC"',
      '1.4',
      '7840',
      '"PAGA"',
      '"COMMISSION_PAID"',
      '"2026-02"',
      '""',
      '"São Paulo"',
      '"SP"',
    ],
  ];

  const csvContent = '\uFEFF' + [headers.join(';'), ...exampleRows.map((r) => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `planilha_modelo_historico_morada_credito.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Splits a CSV line into cells while respecting quotes and preserving empty fields (;; or ,,)
 */
export function parseCSVLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());

  return cells.map((cell) => {
    let v = cell.trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.substring(1, v.length - 1);
    }
    return v.trim();
  });
}

function normalizeHeaderKey(raw: string): string {
  if (!raw) return '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ColumnMap {
  clientName: number;
  clientCpf: number;
  clientPhone: number;
  clientEmail: number;
  creditType: number;
  propertyValue: number;
  financingValue: number;
  downPaymentValue: number;
  bank: number;
  proposalNumber: number;
  interestRateAnnual: number;
  termMonths: number;
  amortizationSystem: number;
  commissionPercentage: number;
  commissionAmount: number;
  commissionStatus: number;
  stage: number;
  estimatedIssuanceMonth: number;
  partnerRealtorName: number;
  propertyCity: number;
  propertyState: number;
  registryOfficeName: number;
  rgiProtocolNumber: number;
}

/**
 * Dynamically resolves column indices based on header names (case/accent-insensitive).
 * Supports standard template headers, export headers, and custom user spreadsheets.
 */
function resolveColumnIndices(headers: string[]): { map: ColumnMap; hasHeaders: boolean } {
  const map: ColumnMap = {
    clientName: -1,
    clientCpf: -1,
    clientPhone: -1,
    clientEmail: -1,
    creditType: -1,
    propertyValue: -1,
    financingValue: -1,
    downPaymentValue: -1,
    bank: -1,
    proposalNumber: -1,
    interestRateAnnual: -1,
    termMonths: -1,
    amortizationSystem: -1,
    commissionPercentage: -1,
    commissionAmount: -1,
    commissionStatus: -1,
    stage: -1,
    estimatedIssuanceMonth: -1,
    partnerRealtorName: -1,
    propertyCity: -1,
    propertyState: -1,
    registryOfficeName: -1,
    rgiProtocolNumber: -1,
  };

  let recognizedHeadersCount = 0;

  headers.forEach((raw, idx) => {
    const n = normalizeHeaderKey(raw);
    if (!n) return;

    // Realtor / Corretor Parceiro
    if (
      (n.includes('corretor') ||
        n.includes('imobiliaria') ||
        n.includes('origem') ||
        n.includes('indicador') ||
        (n.includes('parceiro') && !n.includes('banco'))) &&
      !n.includes('comissao')
    ) {
      map.partnerRealtorName = idx;
      recognizedHeadersCount++;
      return;
    }

    // Mês e Ano de Fechamento / Previsão de Emissão
    if (
      n.includes('fechamento') ||
      n.includes('previsao') ||
      n.includes('emissao') ||
      n.includes('mes e ano') ||
      n.includes('mes ano') ||
      n.includes('mes/ano') ||
      n === 'mes' ||
      n.includes('periodo')
    ) {
      map.estimatedIssuanceMonth = idx;
      recognizedHeadersCount++;
      return;
    }

    // Cidade do Imóvel
    if (n.includes('cidade') || n.includes('municipio') || n.includes('localidade')) {
      map.propertyCity = idx;
      recognizedHeadersCount++;
      return;
    }

    // UF / Estado
    if (n === 'uf' || n.includes('uf') || (n.includes('estado') && !n.includes('civil'))) {
      map.propertyState = idx;
      recognizedHeadersCount++;
      return;
    }

    // Nome do Cliente
    if (
      n.includes('cliente') ||
      n.includes('proponente') ||
      n.includes('comprador') ||
      (n.includes('nome') && !n.includes('corretor'))
    ) {
      if (map.clientName === -1) {
        map.clientName = idx;
        recognizedHeadersCount++;
        return;
      }
    }

    // CPF
    if (n.includes('cpf') || n.includes('documento') || n.includes('cnpj')) {
      map.clientCpf = idx;
      recognizedHeadersCount++;
      return;
    }

    // Telefone
    if (
      n.includes('telefone') ||
      n.includes('celular') ||
      n.includes('whatsapp') ||
      n.includes('contato') ||
      n === 'fone' ||
      n === 'tel'
    ) {
      map.clientPhone = idx;
      recognizedHeadersCount++;
      return;
    }

    // Email
    if (n.includes('email') || n.includes('e mail')) {
      map.clientEmail = idx;
      recognizedHeadersCount++;
      return;
    }

    // Tipo de Crédito
    if (
      n.includes('tipo de credito') ||
      n.includes('tipo credito') ||
      n.includes('modalidade') ||
      n.includes('produto') ||
      (n.includes('tipo') && !n.includes('imovel'))
    ) {
      map.creditType = idx;
      recognizedHeadersCount++;
      return;
    }

    // Valor do Imóvel
    if (
      n.includes('valor do imovel') ||
      n.includes('valor imovel') ||
      n.includes('avaliacao') ||
      n.includes('valor bem') ||
      (n.includes('imovel') && n.includes('valor'))
    ) {
      map.propertyValue = idx;
      recognizedHeadersCount++;
      return;
    }

    // Valor Financiado
    if (
      n.includes('financiado') ||
      n.includes('financiamento') ||
      n.includes('vgv') ||
      (n.includes('credito') && n.includes('valor'))
    ) {
      map.financingValue = idx;
      recognizedHeadersCount++;
      return;
    }

    // Entrada
    if (n.includes('entrada') || n.includes('recurso proprio') || n.includes('recursos proprios')) {
      map.downPaymentValue = idx;
      recognizedHeadersCount++;
      return;
    }

    // Banco
    if (n.includes('banco') || n.includes('instituicao')) {
      map.bank = idx;
      recognizedHeadersCount++;
      return;
    }

    // Número da Proposta
    if (n.includes('proposta')) {
      map.proposalNumber = idx;
      recognizedHeadersCount++;
      return;
    }

    // Taxa de Juros
    if (n.includes('taxa') || n.includes('juros')) {
      map.interestRateAnnual = idx;
      recognizedHeadersCount++;
      return;
    }

    // Prazo
    if (n.includes('prazo') || n.includes('meses') || n.includes('parcelas')) {
      map.termMonths = idx;
      recognizedHeadersCount++;
      return;
    }

    // Sistema Amortização
    if (n.includes('amortizacao') || n.includes('sistema') || n.includes('price') || n.includes('sac')) {
      map.amortizationSystem = idx;
      recognizedHeadersCount++;
      return;
    }

    // Percentual de Comissão
    if (
      n.includes('%') ||
      (n.includes('comissao') && (n.includes('percentual') || n.includes('porcentagem') || n.includes('taxa')))
    ) {
      map.commissionPercentage = idx;
      recognizedHeadersCount++;
      return;
    }

    // Valor da Comissão
    if (
      n.includes('r$') ||
      (n.includes('comissao') && (n.includes('valor') || n.includes('opcional') || n.includes('morada')))
    ) {
      map.commissionAmount = idx;
      recognizedHeadersCount++;
      return;
    }

    // Status da Comissão
    if (n.includes('status') && n.includes('comissao')) {
      map.commissionStatus = idx;
      recognizedHeadersCount++;
      return;
    }

    // Fase do Processo
    if (n.includes('fase') || n.includes('etapa') || (n.includes('status') && !n.includes('comissao'))) {
      map.stage = idx;
      recognizedHeadersCount++;
      return;
    }

    // Cartório RGI
    if (n.includes('cartorio') || (n.includes('rgi') && !n.includes('protocolo'))) {
      map.registryOfficeName = idx;
      recognizedHeadersCount++;
      return;
    }

    // Protocolo RGI
    if (n.includes('protocolo')) {
      map.rgiProtocolNumber = idx;
      recognizedHeadersCount++;
      return;
    }
  });

  const hasHeaders = recognizedHeadersCount >= 3;

  // If positional template fallback is needed (no headers found):
  if (!hasHeaders) {
    map.clientName = 0;
    map.clientCpf = 1;
    map.clientPhone = 2;
    map.clientEmail = 3;
    map.creditType = 4;
    map.propertyValue = 5;
    map.financingValue = 6;
    map.downPaymentValue = 7;
    map.bank = 8;
    map.proposalNumber = 9;
    map.interestRateAnnual = 10;
    map.termMonths = 11;
    map.amortizationSystem = 12;
    map.commissionPercentage = 13;
    map.commissionAmount = 14;
    map.commissionStatus = 15;
    map.stage = 16;
    map.estimatedIssuanceMonth = 17;
    map.partnerRealtorName = 18;
    map.propertyCity = 19;
    map.propertyState = 20;
  }

  return { map, hasHeaders };
}

export function parseProcessesFromCSV(csvText: string): { success: boolean; processes: ClientProcess[]; errors: string[] } {
  try {
    const rawLines = csvText.split(/\r\n|\n|\r/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (rawLines.length < 2) {
      return { success: false, processes: [], errors: ['O arquivo CSV está vazio ou contém apenas o cabeçalho.'] };
    }

    // Detect delimiter from first line (; or , or \t)
    const headerLine = rawLines[0];
    const countSemi = (headerLine.match(/;/g) || []).length;
    const countComma = (headerLine.match(/,/g) || []).length;
    const countTab = (headerLine.match(/\t/g) || []).length;

    let separator = ';';
    if (countTab > countSemi && countTab > countComma) separator = '\t';
    else if (countComma > countSemi) separator = ',';

    const headerCells = parseCSVLine(headerLine, separator);
    const { map, hasHeaders } = resolveColumnIndices(headerCells);

    const parseNumber = (cell: string | undefined, defaultVal: number = 0): number => {
      if (!cell) return defaultVal;
      let clean = cell.replace('R$', '').replace(/\s/g, '');
      // Format 500.000,00 -> 500000.00
      if (clean.includes('.') && clean.includes(',')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      }
      const num = parseFloat(clean);
      return isNaN(num) ? defaultVal : num;
    };

    const processes: ClientProcess[] = [];
    const errors: string[] = [];

    // Start from row 1 if row 0 was headers, else row 0
    const startIdx = hasHeaders ? 1 : 0;

    for (let i = startIdx; i < rawLines.length; i++) {
      const line = rawLines[i];
      if (!line.trim()) continue;

      const cells = parseCSVLine(line, separator);

      if (cells.length < 3) {
        errors.push(`Linha ${i + 1}: Linha ignorada por não conter colunas suficientes.`);
        continue;
      }

      const getCell = (idx: number, fallback = ''): string => {
        if (idx >= 0 && idx < cells.length && cells[idx] !== undefined) {
          return cells[idx].trim();
        }
        return fallback;
      };

      const clientName = getCell(map.clientName, `Cliente Linha ${i + 1}`);
      const clientCpf = getCell(map.clientCpf, '');
      const clientPhone = getCell(map.clientPhone, '');
      const clientEmail = getCell(map.clientEmail, '');

      const rawCreditType = getCell(map.creditType, 'AQUISICAO_RESIDENCIAL').toUpperCase();
      // Normaliza alias legado (CONSTRUCAO_REFORMA) para o valor atual do enum (CONSTRUCAO)
      const normalizedCreditType = rawCreditType.includes('CONSTRUCAO') ? 'CONSTRUCAO' : rawCreditType;
      const creditType: any = [
        'AQUISICAO_RESIDENCIAL',
        'AQUISICAO_COMERCIAL',
        'HOME_EQUITY',
        'CONSTRUCAO',
        'PORTABILIDADE',
      ].includes(normalizedCreditType)
        ? normalizedCreditType
        : 'AQUISICAO_RESIDENCIAL';

      const propertyValue = parseNumber(getCell(map.propertyValue), 0);
      const financingValue = parseNumber(getCell(map.financingValue), propertyValue > 0 ? propertyValue * 0.8 : 0);
      const downPaymentValue = parseNumber(
        getCell(map.downPaymentValue),
        Math.max(0, propertyValue - financingValue)
      );

      const rawBank = getCell(map.bank, 'Itaú Unibanco');
      const bank: any = rawBank || 'Itaú Unibanco';
      const proposalNumber = getCell(map.proposalNumber, '');
      const interestRateAnnual = parseNumber(getCell(map.interestRateAnnual), 10.49);
      const termMonths = parseNumber(getCell(map.termMonths), 360);
      const amortizationSystem: any = getCell(map.amortizationSystem, 'SAC').toUpperCase().includes('PRICE')
        ? 'PRICE'
        : 'SAC';

      const commissionPercentage = parseNumber(getCell(map.commissionPercentage), 1.25);
      const commissionAmount = getCell(map.commissionAmount)
        ? parseNumber(getCell(map.commissionAmount), (financingValue * commissionPercentage) / 100)
        : (financingValue * commissionPercentage) / 100;

      const rawCommissionStatus = getCell(map.commissionStatus, 'PAGA').toUpperCase();
      const commissionStatus: any = ['PAGA', 'DISPONIVEL_FATURAMENTO', 'PREVISTA', 'CANCELADA'].includes(
        rawCommissionStatus
      )
        ? rawCommissionStatus
        : 'PAGA';

      const rawStage = getCell(map.stage, 'COMMISSION_PAID').toUpperCase();
      // Normaliza aliases legados para os valores atuais do enum ProcessStage
      const STAGE_ALIASES: Record<string, ProcessStage> = {
        PROPERTY_APPRAISAL: 'PROPERTY_VALUATION',
        LEGAL_ANALYSIS: 'LEGAL_COMPLIANCE',
      };
      const normalizedStage = STAGE_ALIASES[rawStage] || rawStage;
      const stage: any = [
        'SIMULATION_COLLECTION',
        'CREDIT_ANALYSIS',
        'PROPERTY_VALUATION',
        'LEGAL_COMPLIANCE',
        'VALUE_CONFIRMATION',
        'CONTRACT_ISSUANCE',
        'CONTRACT_SIGNATURE',
        'PROPERTY_REGISTRY',
        'DISBURSEMENT_COMPLETED',
        'COMMISSION_PAID',
        'DECLINED_CANCELLED',
      ].includes(normalizedStage)
        ? normalizedStage
        : 'COMMISSION_PAID';

      // =========================================================================
      // SMART RESOLUTION & DISAMBIGUATION:
      // Mês e Ano de Fechamento / Corretor Parceiro / Cidade / UF
      // =========================================================================
      let rawMonthCandidate = getCell(map.estimatedIssuanceMonth);
      let rawRealtorCandidate = getCell(map.partnerRealtorName);
      let rawCityCandidate = getCell(map.propertyCity);
      let rawStateCandidate = getCell(map.propertyState);

      // 1. Detect if rawMonthCandidate is an actual month/date
      let resolvedMonth = parseMonthYearString(rawMonthCandidate);

      // 2. If rawMonthCandidate is NOT a date, could it be swapped with Realtor?
      if (!resolvedMonth) {
        const realtorAsMonth = parseMonthYearString(rawRealtorCandidate);
        if (realtorAsMonth) {
          // They were swapped! Realtor cell had the month, Month cell had the Realtor!
          resolvedMonth = realtorAsMonth;
          rawRealtorCandidate = rawMonthCandidate;
        } else {
          // Search other cells in this line for any valid month pattern (e.g. 2025-09 or 09/2025)
          for (let cIdx = 0; cIdx < cells.length; cIdx++) {
            const possibleMonth = parseMonthYearString(cells[cIdx]);
            if (possibleMonth) {
              resolvedMonth = possibleMonth;
              break;
            }
          }
        }
      }

      // 3. If rawMonthCandidate had a Realtor name (e.g. "Carlos Corretor"), and rawRealtorCandidate was empty or had city:
      if (!parseMonthYearString(rawMonthCandidate) && rawMonthCandidate && !rawRealtorCandidate) {
        rawRealtorCandidate = rawMonthCandidate;
      }

      // 4. Default month if still not resolved
      if (!resolvedMonth) {
        resolvedMonth = '2026-08';
      }

      // 5. Clean Realtor Name
      let partnerRealtorName = rawRealtorCandidate || '';
      if (parseMonthYearString(partnerRealtorName)) {
        // If partnerRealtorName was set to a month, clear it or set to 'Direto'
        partnerRealtorName = '';
      }

      // 6. Clean City and State
      let propertyCity = rawCityCandidate || 'São Paulo';
      let propertyState = rawStateCandidate || 'SP';

      // If state was put in city (e.g. City is 'SP' and State is empty)
      if (propertyCity.length === 2 && propertyCity.toUpperCase() === propertyCity && !rawStateCandidate) {
        propertyState = propertyCity;
        propertyCity = 'São Paulo';
      }

      const id = `proc_import_${Date.now()}_${i}`;
      const createdAt = `${resolvedMonth}-15T10:00:00Z`;

      processes.push({
        id,
        clientName,
        clientCpf,
        clientPhone,
        clientEmail,
        creditType,
        propertyValue,
        financingValue,
        downPaymentValue,
        amortizationSystem,
        interestRateAnnual,
        termMonths,
        bank,
        proposalNumber,
        commissionPercentage,
        commissionAmount,
        commissionStatus,
        estimatedIssuanceMonth: resolvedMonth,
        propertyCity,
        propertyState,
        stage,
        partnerRealtorName: partnerRealtorName || undefined,
        stageUpdatedAt: createdAt,
        createdAt,
        priority: 'NORMAL',
        creditAnalysisStatus: ['DISBURSEMENT_COMPLETED', 'COMMISSION_PAID'].includes(stage)
          ? 'APROVADO'
          : 'EM_ANALISE',
        notes: [
          {
            id: `note_${id}_1`,
            text: `Registro importado da planilha de histórico (${resolvedMonth}).`,
            createdAt,
            author: 'Importação de Histórico',
            category: 'GERAL',
          },
        ],
        checklist: getFullDefaultChecklist().map((item) => ({
          ...item,
          completed: ['DISBURSEMENT_COMPLETED', 'COMMISSION_PAID'].includes(stage) || item.stage === stage,
        })),
        stageHistory: [
          {
            id: `sh_${id}_1`,
            toStage: stage,
            changedAt: createdAt,
          },
        ],
      });
    }

    return {
      success: processes.length > 0,
      processes,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      processes: [],
      errors: [`Erro ao processar o arquivo CSV: ${error?.message || 'Formato incompatível'}`],
    };
  }
}

export function exportProcessesToJSON(processes: ClientProcess[]): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(processes, null, 2));
  const link = document.createElement('a');
  link.setAttribute('href', dataStr);
  link.setAttribute('download', `backup_morada_credito_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getAvailableMonths(processes: ClientProcess[]): string[] {
  const monthsSet = new Set<string>();
  processes.forEach((p) => {
    if (p.estimatedIssuanceMonth) {
      const parsed = parseMonthYearString(p.estimatedIssuanceMonth);
      if (parsed) {
        monthsSet.add(parsed);
      }
    }
  });

  // Add current and surrounding 3 months
  const today = new Date();
  for (let i = -1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    monthsSet.add(`${yyyy}-${mm}`);
  }

  return Array.from(monthsSet).sort();
}
