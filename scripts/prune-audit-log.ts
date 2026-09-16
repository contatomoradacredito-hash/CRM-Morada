import { parseArgs } from 'node:util';
import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { auditRetentionCutoff } from './audit-retention';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      project: { type: 'string' },
      database: { type: 'string', default: '(default)' },
      write: { type: 'boolean', default: false },
    },
    strict: true,
  });
  if (!values.project) throw new Error('Informe --project.');

  const cutoff = auditRetentionCutoff(new Date());
  const app = initializeApp({ credential: applicationDefault(), projectId: values.project });
  try {
    const db = getFirestore(app, values.database);
    const expired = db.collection('auditLog').where('timestamp', '<', Timestamp.fromDate(cutoff));
    if (!values.write) {
      const count = (await expired.count().get()).data().count;
      console.log(JSON.stringify({ mode: 'dry-run', project: values.project,
        database: values.database, cutoff: cutoff.toISOString(), expired: count }));
      return;
    }

    let deleted = 0;
    while (true) {
      const snapshot = await expired.limit(200).get();
      if (snapshot.empty) break;
      const batch = db.batch();
      for (const document of snapshot.docs) batch.delete(document.ref);
      await batch.commit();
      deleted += snapshot.size;
    }
    console.log(JSON.stringify({ mode: 'write', project: values.project,
      database: values.database, cutoff: cutoff.toISOString(), deleted }));
  } finally {
    await deleteApp(app);
  }
}

main().catch(() => {
  console.error('Limpeza de auditLog interrompida. Verifique projeto, banco, credenciais e permissões.');
  process.exitCode = 1;
});
