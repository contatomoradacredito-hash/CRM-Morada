import assert from 'node:assert/strict';
import test from 'node:test';
import { parseNumber } from '../src/utils/storage';
import { executeImport, prepareImport, proposalDocumentId } from './history-import';
import type { ClientProcess } from '../src/types';

const headers = ['Nome do Cliente', 'CPF', 'Telefone', 'Email', 'Tipo de Credito', 'Valor do Imovel', 'Valor Financiado', 'Valor da Entrada', 'Banco', 'Numero da Proposta Bancaria', 'Taxa de Juros Anual', 'Prazo (Meses)', 'Sistema (SAC ou PRICE)', 'Percentual Comissao', 'Valor da Comissao', 'Status Comissao', 'Fase do Processo', 'Mes e Ano de Fechamento', 'Nome do Corretor Parceiro', 'Cidade do Imovel', 'UF'];
const row = ['Cliente fictício', '', '', '', 'AQUISICAO_RESIDENCIAL', '500000', '368904,97', '131095,03', 'Itaú Unibanco', 'TEST-001', '10.35', '360', 'SAC', '1.2', '', 'PREVISTA', 'CONTRACT_SIGNATUR', '2026-01', 'Corretor livre', 'São Paulo', 'SP'];
const csv = (...rows: string[][]): string => '\uFEFF' + [headers, ...rows].map(cells => cells.map(v => `"${v.replaceAll('"', '""')}"`).join(';')).join('\r\n');
const changed = (index: number, value: string): string[] => row.map((cell, i) => i === index ? value : cell);

test('parseNumber cobre os formatos reais sem alterar sua lógica', () => {
  for (const [input, expected] of [['157250', 157250], ['368904,97', 368904.97], ['10.35', 10.35], ['1.2', 1.2]] as const) {
    assert.equal(parseNumber(input), expected);
  }
});
test('BOM, CRLF, datas, corretor livre, cálculo reutilizado e ausência de owner', () => {
  const parsed = prepareImport(csv(row));
  assert.equal(parsed.records.length, 1);
  const p = parsed.records[0].process;
  assert.equal(p.clientName, 'Cliente fictício');
  assert.equal(p.stage, 'CONTRACT_SIGNATURE');
  assert.equal(p.commissionAmount, 368904.97 * 1.2 / 100);
  assert.equal(p.estimatedIssuanceMonth, '2026-01');
  assert.equal(p.partnerRealtorName, 'Corretor livre');
  assert.equal(Object.hasOwn(p, 'ownerUid'), false);
  assert.equal(p.id, 'import_TEST-001');
});
test('comissão manual, inclusive zero, é preservada', () => {
  for (const amount of ['0', '123,45']) {
    assert.equal(prepareImport(csv(changed(14, amount))).records[0].process.commissionAmount, Number(amount.replace(',', '.')));
  }
});
test('aliases explícitos e todos os status atuais', () => {
  for (const [input, expected] of [['PROPERTY_APPRAISAL', 'PROPERTY_VALUATION'], ['LEGAL_ANALYSIS', 'LEGAL_COMPLIANCE'], ['CONTRACT_SIGNATUR', 'CONTRACT_SIGNATURE']]) {
    assert.equal(prepareImport(csv(changed(16, input))).records[0].process.stage, expected);
  }
  assert.equal(prepareImport(csv(changed(4, 'CONSTRUCAO_REFORMA'))).records[0].process.creditType, 'CONSTRUCAO');
  assert.equal(prepareImport(csv(changed(15, 'AGUARDANDO_REGISTRO'))).records[0].process.commissionStatus, 'AGUARDANDO_REGISTRO');
});
test('enums desconhecidos ou vazios não chegam ao fallback e não vazam conteúdo', () => {
  for (const index of [4, 8, 12, 15, 16]) {
    for (const bad of ['valor-invalido-privado', '']) {
      const parsed = prepareImport(csv(changed(index, bad), row));
      assert.equal(parsed.records.length, 1);
      assert.equal(parsed.enumErrors.length, 1);
      assert.equal(parsed.enumErrors[0].line, 2);
      assert.ok(!JSON.stringify(parsed.enumErrors).includes('valor-invalido-privado'));
    }
  }
});
test('ID sanitizado preserva distinção; proposta vazia é rejeitada', () => {
  assert.equal(proposalDocumentId('A/B'), 'import_A%2FB');
  assert.notEqual(proposalDocumentId('A/B'), proposalDocumentId('A%2FB'));
  assert.throws(() => proposalDocumentId(''));
  assert.throws(() => proposalDocumentId('a'.repeat(1500)));
  assert.equal(prepareImport(csv(changed(9, ''))).validationErrors.length, 1);
});
test('anomalia financeira reporta a linha e mantém registro importável', () => {
  const abnormal = changed(6, '1192000'); abnormal[5] = '1000000';
  const parsed = prepareImport(csv(row, abnormal));
  assert.equal(parsed.records.length, 2);
  assert.equal(parsed.warnings[0].line, 3);
});
test('cabeçalhos incompletos, números inválidos e datas inválidas são rejeitados', () => {
  assert.equal(prepareImport('Nome do Cliente;CPF\nPessoa;').validationErrors.length, 1);
  for (const [index, value] of [[6, '123abc'], [17, 'invalido']] as const) {
    assert.equal(prepareImport(csv(changed(index, value))).records.length, 0);
  }
});
test('segunda execução e propostas repetidas pulam documentos sem sobrescrever', async () => {
  const docs = new Map<string, ClientProcess>();
  const store = { exists: async (id: string) => docs.has(id), create: async (id: string, p: ClientProcess) => { docs.set(id, p); } };
  const input = prepareImport(csv(row, row));
  const first = await executeImport(input, store);
  const saved = docs.get('import_TEST-001');
  assert.equal(first.imported, 1); assert.equal(first.skippedExisting, 1);
  const second = await executeImport(input, store);
  assert.equal(second.imported, 0); assert.equal(second.skippedExisting, 2);
  assert.equal(docs.get('import_TEST-001'), saved);
});
test('concorrência é duplicata; falhas de escrita não vazam PII e não interrompem relatório', async () => {
  const prepared = prepareImport(csv(row));
  const duplicate = await executeImport(prepared, { exists: async () => false, create: async () => { throw { code: 6 }; } });
  assert.equal(duplicate.skippedExisting, 1);
  const failed = await executeImport(prepared, { exists: async () => { throw new Error('CONTEUDO_PRIVADO'); }, create: async () => {} });
  assert.equal(failed.writeErrors.length, 1);
  assert.ok(!JSON.stringify(failed).includes('CONTEUDO_PRIVADO'));
});
