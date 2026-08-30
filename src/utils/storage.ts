import { ClientProcess, ProcessStage } from '../types';
import { INITIAL_PROCESSES } from '../data/defaultData';
import { getFullDefaultChecklist } from './constants';
import { formatCurrency } from './formatters';

const STORAGE_KEY = 'morada_credito_processes_v1';
const HAS_INITIALIZED_KEY = 'morada_credito_initialized_v1';

export function loadProcesses(): ClientProcess[] {
  try {
    const initialized = localStorage.getItem(HAS_INITIALIZED_KEY);
    const saved = localStorage.getItem(STORAGE_KEY);

    // If first time opening the applet, initialize with default data
    if (!initialized) {
      localStorage.setItem(HAS_INITIALIZED_KEY, 'true');
      saveProcesses(INITIAL_PROCESSES);
      return INITIAL_PROCESSES;
    }

    // If already initialized and saved exists (even if empty array []), respect it!
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => {
          if (!p.creditAnalysisStatus) {
            const isAdvancedStage =
              p.stage !== 'SIMULATION_COLLECTION' && p.stage !== 'CREDIT_ANALYSIS' && p.stage !== 'DECLINED_CANCELLED';
            return {
              ...p,
              creditAnalysisStatus: isAdvancedStage ? 'APROVADO' : 'EM_ANALISE',
            };
          }
          return p;
        });
      }
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar dados do armazenamento:', error);
    return INITIAL_PROCESSES;
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
    'Tipo de Credito (AQUISICAO_RESIDENCIAL / AQUISICAO_COMERCIAL / HOME_EQUITY / CONSTRUCAO_REFORMA / PORTABILIDADE)',
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
    'Fase do Processo (COMMISSION_PAID / DISBURSEMENT_COMPLETED / PROPERTY_REGISTRY / CONTRACT_SIGNATURE / CONTRACT_ISSUANCE / LEGAL_ANALYSIS / PROPERTY_APPRAISAL / CREDIT_ANALYSIS / SIMULATION_COLLECTION)',
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

export function parseProcessesFromCSV(csvText: string): { success: boolean; processes: ClientProcess[]; errors: string[] } {
  try {
    const lines = csvText.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { success: false, processes: [], errors: ['O arquivo CSV está vazio ou contém apenas o cabeçalho.'] };
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const cleanCell = (cell: string) => {
      let val = cell ? cell.trim() : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val.trim();
    };

    const parseNumber = (cell: string, defaultVal: number = 0): number => {
      if (!cell) return defaultVal;
      let clean = cleanCell(cell).replace('R$', '').replace(/\s/g, '');
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

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle split by separator while preserving quoted content
      const regex = new RegExp(`(?:"[^"]*"|[^"${separator}])+`, 'g');
      const cells = line.match(regex)?.map((c) => cleanCell(c)) || line.split(separator).map(cleanCell);

      if (cells.length < 5) {
        errors.push(`Linha ${i + 1}: Quantidade insuficiente de colunas.`);
        continue;
      }

      const clientName = cells[0] || `Cliente Linha ${i + 1}`;
      const clientCpf = cells[1] || '';
      const clientPhone = cells[2] || '';
      const clientEmail = cells[3] || '';
      
      const rawCreditType = (cells[4] || 'AQUISICAO_RESIDENCIAL').toUpperCase();
      const creditType: any = ['AQUISICAO_RESIDENCIAL', 'AQUISICAO_COMERCIAL', 'HOME_EQUITY', 'CONSTRUCAO_REFORMA', 'PORTABILIDADE'].includes(rawCreditType)
        ? rawCreditType
        : 'AQUISICAO_RESIDENCIAL';

      const propertyValue = parseNumber(cells[5], 0);
      const financingValue = parseNumber(cells[6], propertyValue * 0.8);
      const downPaymentValue = parseNumber(cells[7], Math.max(0, propertyValue - financingValue));
      
      const rawBank = cells[8] || 'Itaú Unibanco';
      const bank: any = rawBank;
      const proposalNumber = cells[9] || '';
      const interestRateAnnual = parseNumber(cells[10], 10.49);
      const termMonths = parseNumber(cells[11], 360);
      const amortizationSystem: any = (cells[12] || 'SAC').toUpperCase().includes('PRICE') ? 'PRICE' : 'SAC';
      
      const commissionPercentage = parseNumber(cells[13], 1.25);
      const commissionAmount = cells[14] ? parseNumber(cells[14], (financingValue * commissionPercentage) / 100) : (financingValue * commissionPercentage) / 100;

      const rawCommissionStatus = (cells[15] || 'PAGA').toUpperCase();
      const commissionStatus: any = ['PAGA', 'DISPONIVEL_FATURAMENTO', 'PREVISTA', 'CANCELADA'].includes(rawCommissionStatus)
        ? rawCommissionStatus
        : 'PAGA';

      const rawStage = (cells[16] || 'COMMISSION_PAID').toUpperCase();
      const stage: any = [
        'SIMULATION_COLLECTION',
        'CREDIT_ANALYSIS',
        'PROPERTY_APPRAISAL',
        'LEGAL_ANALYSIS',
        'CONTRACT_ISSUANCE',
        'CONTRACT_SIGNATURE',
        'PROPERTY_REGISTRY',
        'DISBURSEMENT_COMPLETED',
        'COMMISSION_PAID',
        'DECLINED_CANCELLED',
      ].includes(rawStage)
        ? rawStage
        : 'COMMISSION_PAID';

      // Year-Month format: YYYY-MM
      let estimatedIssuanceMonth = cells[17] || '2026-08';
      if (estimatedIssuanceMonth.includes('/')) {
        // e.g. 08/2025 -> 2025-08
        const parts = estimatedIssuanceMonth.split('/');
        if (parts.length === 2) {
          estimatedIssuanceMonth = `${parts[1]}-${parts[0].padStart(2, '0')}`;
        }
      }

      const partnerRealtorName = cells[18] || '';
      const propertyCity = cells[19] || 'São Paulo';
      const propertyState = cells[20] || 'SP';

      const id = `proc_import_${Date.now()}_${i}`;
      const createdAt = `${estimatedIssuanceMonth}-15T10:00:00Z`;

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
        estimatedIssuanceMonth,
        propertyCity,
        propertyState,
        stage,
        partnerRealtorName,
        stageUpdatedAt: createdAt,
        createdAt,
        priority: 'NORMAL',
        notes: [
          {
            id: `note_${id}_1`,
            text: `Registro importado da planilha de histórico (${estimatedIssuanceMonth}).`,
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
      monthsSet.add(p.estimatedIssuanceMonth);
    }
  });
  // Add current and next 2 months
  const today = new Date();
  for (let i = -1; i <= 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    monthsSet.add(`${yyyy}-${mm}`);
  }
  return Array.from(monthsSet).sort();
}
