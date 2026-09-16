import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTION, executeImport, prepareImport } from './history-import';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    file: { type: 'string' }, project: { type: 'string' },
    database: { type: 'string', default: '(default)' }, write: { type: 'boolean', default: false },
  }, strict: true });
  if (!values.file || (values.write && !values.project)) {
    throw new Error('Argumentos obrigatórios ausentes.');
  }
  const prepared = prepareImport(await readFile(values.file, 'utf8'));
  if (!values.write) {
    console.log(JSON.stringify({ mode: 'dry-run', collection: COLLECTION, imported: 0,
      skippedExisting: 0, duplicatesChecked: false, validRecords: prepared.records.length,
      enumErrorCount: prepared.enumErrors.length, enumErrors: prepared.enumErrors,
      validationErrors: prepared.validationErrors, warnings: prepared.warnings }, null, 2));
    if (prepared.enumErrors.length || prepared.validationErrors.length) process.exitCode = 1;
    return;
  }
  const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
  try {
    const db = getFirestore(app, values.database);
    const collection = db.collection(COLLECTION);
    const report = await executeImport(prepared, {
      exists: async id => (await collection.doc(id).get()).exists,
      create: async (id, record) => { await collection.doc(id).create(record); },
    });
    console.log(JSON.stringify({ mode: 'write', project: values.project, database: values.database,
      collection: COLLECTION, ...report }, null, 2));
    if (report.enumErrorCount || report.validationErrors.length || report.writeErrors.length) process.exitCode = 1;
  } finally { await deleteApp(app); }
}
main().catch(() => {
  console.error('Importação interrompida. Verifique argumentos (--file, --project, --database, --write), arquivo e credenciais ADC. Detalhes omitidos para proteger dados pessoais.');
  process.exitCode = 1;
});
