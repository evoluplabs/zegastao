/**
 * Script one-time: define custom claim admin: true para o usuário administrador.
 * Uso: ts-node scripts/set-admin.ts <email-do-admin>
 * Após rodar, pode remover a condição de email do firestore.rules.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as path from 'path';

const [, , adminEmail] = process.argv;

if (!adminEmail) {
  console.error('Uso: ts-node scripts/set-admin.ts <email-do-admin>');
  process.exit(1);
}

// Carrega service account do mesmo diretório (não commitar!)
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'));

initializeApp({ credential: cert(serviceAccount) });

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(adminEmail);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✅ Custom claim admin:true definido para ${adminEmail} (uid: ${user.uid})`);
  console.log('   O usuário precisa fazer logout e login novamente para o token ser atualizado.');
  console.log('   Após confirmar que funciona, remova a condição de email no firestore.rules.');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
