import type { ClientProcess, CommissionStatus, CreditType } from '../src/types';
import { BANK_CONFIGS, STAGE_CONFIGS } from '../src/utils/constants';
import { parseMonthYearString } from '../src/utils/formatters';
import { parseCSVLine, parseProcessesFromCSV, resolveColumnIndices } from '../src/utils/storage';

export const COLLECTION = 'tenants/morada-credito/processes';
type Issue = { line: number; reason: string };
export interface PreparedImport {
  records: { line: number; process: ClientProcess }[];
  enumErrors: Issue[];
  validationErrors: Issue[];
  warnings: Issue[];
}
const creditTypes: Record<CreditType, true> = {
  AQUISICAO_RESIDENCIAL: true, AQUISICAO_COMERCIAL: true, HOME_EQUITY: true,
  CONSTRUCAO: true, PORTABILIDADE: true,
};
const commissionStatuses: Record<CommissionStatus, true> = {
  PREVISTA: true, AGUARDANDO_REGISTRO: true, DISPONIVEL_FATURAMENTO: true,
  PAGA: true, CANCELADA: true,
};
const stageAliases: Record<string, string> = {
  PROPERTY_APPRAISAL: 'PROPERTY_VALUATION', LEGAL_ANALYSIS: 'LEGAL_COMPLIANCE',
  CONTRACT_SIGNATUR: 'CONTRACT_SIGNATURE',
};
const own = (obj: object, key: string): boolean => Object.hasOwn(obj, key);

// Percent encoding is reversible: unlike replacing characters with '_', it cannot
// collapse distinct proposals into the same Firestore document ID.
export function proposalDocumentId(proposal: string): string {
  if (!proposal.trim()) throw new Error('Número da proposta ausente.');
  const id = `import_${encodeURIComponent(proposal.trim())}`;
  if (Buffer.byteLength(id, 'utf8') > 1500) throw new Error('Número da proposta excede o limite do ID.');
  return id;
}

export function prepareImport(csv: string): PreparedImport {
  const result: PreparedImport = { records: [], enumErrors: [], validationErrors: [], warnings: [] };
  const lines = csv.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const header = lines[0];
  const headers = parseCSVLine(header, ';');
  const { map, hasHeaders } = resolveColumnIndices(headers);
  const required = Object.keys(map).filter(key => !['registryOfficeName', 'rgiProtocolNumber'].includes(key)) as (keyof typeof map)[];
  if (!hasHeaders || required.some(key => map[key] < 0) || new Set(required.map(key => map[key])).size !== required.length) {
    result.validationErrors.push({ line: 1, reason: 'Cabeçalho ausente, ambíguo ou incompleto.' });
    return result;
  }
  for (let index = 1; index < lines.length; index++) {
    if (!lines[index].trim()) continue;
    const line = index + 1;
    const cells = parseCSVLine(lines[index], ';');
    if (cells.length !== headers.length) {
      result.validationErrors.push({ line, reason: 'Quantidade de colunas diferente do cabeçalho; quebras de linha dentro de células não são suportadas.' });
      continue;
    }
    const cell = (key: keyof typeof map): string => cells[map[key]] ?? '';
    const credit = cell('creditType').toUpperCase();
    const stage = cell('stage').toUpperCase();
    const checks: [string, boolean][] = [
      ['Tipo de Crédito', own(creditTypes, credit === 'CONSTRUCAO_REFORMA' ? 'CONSTRUCAO' : credit)],
      ['Fase do Processo', own(STAGE_CONFIGS, own(stageAliases, stage) ? stageAliases[stage] : stage)],
      ['Status Comissão', own(commissionStatuses, cell('commissionStatus').toUpperCase())],
      ['Sistema de amortização', ['SAC', 'PRICE'].includes(cell('amortizationSystem').toUpperCase())],
      ['Banco', own(BANK_CONFIGS, cell('bank'))],
    ];
    const invalid = checks.filter(([, valid]) => !valid).map(([field]) => field);
    if (invalid.length) {
      // Do not echo arbitrary input: even a malformed enum cell could contain PII.
      result.enumErrors.push({ line, reason: `Enum não reconhecido ou vazio: ${invalid.join(', ')}.` });
      continue;
    }
    if (!cell('clientName') || !parseMonthYearString(cell('estimatedIssuanceMonth'))) {
      result.validationErrors.push({ line, reason: 'Nome ausente ou mês de fechamento inválido.' });
      continue;
    }
    let id: string;
    try { id = proposalDocumentId(cell('proposalNumber')); }
    catch { result.validationErrors.push({ line, reason: 'Número da proposta ausente ou ID inválido.' }); continue; }
    const numericFields = ['propertyValue', 'financingValue', 'downPaymentValue', 'interestRateAnnual', 'termMonths', 'commissionPercentage', 'commissionAmount'] as const;
    const invalidNumbers = numericFields.filter(key => {
      const value = cell(key);
      if (!value) return !['commissionAmount', 'downPaymentValue'].includes(key);
      return !/^\d+(?:[.,]\d+)?$/.test(value) || !Number.isFinite(Number(value.replace(',', '.')));
    });
    if (invalidNumbers.length) {
      result.validationErrors.push({ line, reason: `Número ausente ou inválido: ${invalidNumbers.join(', ')}.` });
      continue;
    }
    // Reuse the app parser, including commission calculation and date handling,
    // only after every enum has passed validation (no silent fallback).
    const parsed = parseProcessesFromCSV(`${header}\n${lines[index]}`);
    const process = parsed.processes[0];
    if (!process || parsed.errors.length) {
      result.validationErrors.push({ line, reason: 'Falha na conversão do registro.' });
      continue;
    }
    process.id = id;
    process.partnerRealtorName = cell('partnerRealtorName');
    process.notes.forEach((note, i) => { note.id = `note_${id}_${i + 1}`; });
    process.stageHistory.forEach((entry, i) => { entry.id = `sh_${id}_${i + 1}`; });
    delete process.ownerUid;
    if (process.financingValue > process.propertyValue) {
      result.warnings.push({ line, reason: 'Valor financiado maior que o valor do imóvel; confirmar com a fonte. Não bloqueia a importação.' });
    }
    result.records.push({ line, process });
  }
  return result;
}

export interface ImportStore {
  exists(id: string): Promise<boolean>;
  create(id: string, process: ClientProcess): Promise<void>;
}
export async function executeImport(prepared: PreparedImport, store: ImportStore) {
  const report = {
    imported: 0, skippedExisting: 0, enumErrorCount: prepared.enumErrors.length,
    enumErrors: prepared.enumErrors, validationErrors: prepared.validationErrors,
    warnings: prepared.warnings, skippedLines: [] as number[], writeErrors: [] as Issue[],
  };
  for (const { line, process } of prepared.records) {
    try {
      if (await store.exists(process.id)) {
        report.skippedExisting++; report.skippedLines.push(line); continue;
      }
      await store.create(process.id, process);
      report.imported++;
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      if (code === 6 || code === 'already-exists') {
        report.skippedExisting++; report.skippedLines.push(line);
      } else {
        report.writeErrors.push({ line, reason: 'Falha na leitura/gravação no Firestore; detalhes omitidos para proteger dados pessoais.' });
      }
    }
  }
  return report;
}
