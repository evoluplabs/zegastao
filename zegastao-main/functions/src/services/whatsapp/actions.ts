// Ações do Zé Gastão no WhatsApp — lê/escreve no Firestore, calcula contexto RPG.
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import type { ParsedIntent } from './intent';

// Fórmula de XP → nível (espelha src/lib/xp.ts)
function levelFromXP(xp: number): number {
  return Math.floor((1 + Math.sqrt(1 + 8 * xp / 100)) / 2);
}

function xpForLevel(n: number): number {
  return Math.round(100 * n * (n - 1) / 2);
}

export interface DebtSummary {
  creditor: string;
  totalBalance: number;
  interestRateMonthly: number;
  hpPercent: number;  // % do HP original restante
}

export interface UserContext {
  uid: string;
  profile: { xp: number; dailyStreak: number; level: number; companionName?: string };
  topDebt?: DebtSummary;
  monthlyBalance?: number;
  registered?: { amount: number; description: string; category: string; type: string };
  xpEarned?: number;
  documentPath?: string;
}

const CATEGORY_XP: Record<string, number> = { easy: 10, medium: 25, hard: 50 };

// Retorna uid vinculado ao número de WhatsApp (ou undefined se não vinculado).
export async function findUserByPhone(phone: string): Promise<string | undefined> {
  const db = getFirestore();
  const normalized = phone.replace(/\D/g, '');
  const snap = await db.collection('whatsapp_links').doc(normalized).get();
  return snap.exists ? (snap.data()?.uid as string) : undefined;
}

// Vincula número ao uid após verificação do PIN.
export async function linkPhone(phone: string, uid: string): Promise<void> {
  const db = getFirestore();
  const normalized = phone.replace(/\D/g, '');
  await db.collection('whatsapp_links').doc(normalized).set({
    uid,
    phone: normalized,
    linkedAt: new Date().toISOString(),
  });
  // Persiste no perfil do usuário também
  await db.collection('users').doc(uid).collection('profile').doc('main').set(
    { whatsappPhone: normalized, whatsappVerified: true },
    { merge: true },
  );
}

// Lê o perfil do usuário e o contexto de dívidas — em paralelo.
async function loadUserContext(uid: string): Promise<UserContext> {
  const db = getFirestore();
  const [profileSnap, debtsSnap] = await Promise.all([
    db.collection('users').doc(uid).collection('profile').doc('main').get(),
    db.collection('users').doc(uid).collection('debts').where('status', '==', 'active').get(),
  ]);

  const p = profileSnap.data() ?? {};
  const xp = (p.xp as number) ?? 0;
  const level = levelFromXP(xp);
  const profile = {
    xp,
    level,
    dailyStreak: (p.dailyStreak as number) ?? 0,
    companionName: p.companionName as string | undefined,
  };

  let topDebt: DebtSummary | undefined;
  if (!debtsSnap.empty) {
    const debts = debtsSnap.docs.map((d) => d.data());
    const sorted = [...debts].sort(
      (a, b) => (b.interestRateMonthly as number) - (a.interestRateMonthly as number),
    );
    const d = sorted[0];
    const originalBalance = (d.originalAmount as number) ?? (d.totalBalance as number);
    topDebt = {
      creditor: d.creditor as string,
      totalBalance: d.totalBalance as number,
      interestRateMonthly: d.interestRateMonthly as number,
      hpPercent: originalBalance > 0
        ? Math.round(((d.totalBalance as number) / originalBalance) * 100)
        : 100,
    };
  }

  return { uid, profile, topDebt };
}

// Calcula saldo aproximado do mês corrente.
async function getMonthlyBalance(uid: string): Promise<number> {
  const db = getFirestore();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const snap = await db
    .collection('users').doc(uid).collection('transactions')
    .where('date', '>=', startOfMonth.toISOString())
    .get();

  let balance = 0;
  for (const doc of snap.docs) {
    const t = doc.data();
    const amount = (t.amount as number) ?? 0;
    if (t.type === 'income') balance += amount;
    else balance -= amount;
  }
  return balance;
}

// Registra transação e concede XP.
export async function registerTransaction(
  uid: string,
  intent: ParsedIntent,
): Promise<UserContext> {
  const db = getFirestore();
  const ctx = await loadUserContext(uid);

  const type =
    intent.type === 'register_income' ? 'income'
    : intent.type === 'register_debt_payment' ? 'expense'
    : 'expense';

  const amount = intent.amount ?? 0;
  const description = intent.description ?? 'Gasto registrado';
  const category = intent.category ?? 'Outros';

  await db.collection('users').doc(uid).collection('transactions').add({
    amount,
    description,
    category,
    type,
    date: new Date().toISOString(),
    createdAt: new Date(),
    source: 'whatsapp',
    ...(intent.creditorHint ? { creditorHint: intent.creditorHint } : {}),
  });

  // XP: pagamento de dívida = hard (50 XP), receita = medium (25 XP), gasto = easy (10 XP)
  const xpEarned =
    intent.type === 'register_debt_payment' ? CATEGORY_XP.hard
    : intent.type === 'register_income' ? CATEGORY_XP.medium
    : CATEGORY_XP.easy;

  await db.collection('users').doc(uid).collection('profile').doc('main').update({
    xp: FieldValue.increment(xpEarned),
    'professionXP.quitador': intent.type === 'register_debt_payment'
      ? FieldValue.increment(xpEarned)
      : FieldValue.increment(0),
  });

  return {
    ...ctx,
    profile: { ...ctx.profile, xp: ctx.profile.xp + xpEarned },
    registered: { amount, description, category, type },
    xpEarned,
  };
}

// Consulta saldo mensal.
export async function queryBalance(uid: string): Promise<UserContext> {
  const [ctx, monthlyBalance] = await Promise.all([
    loadUserContext(uid),
    getMonthlyBalance(uid),
  ]);
  return { ...ctx, monthlyBalance };
}

// Consulta boss (maior dívida).
export async function queryBoss(uid: string): Promise<UserContext> {
  return loadUserContext(uid);
}

// Consulta resumo completo.
export async function querySummary(uid: string): Promise<UserContext> {
  const [ctx, monthlyBalance] = await Promise.all([
    loadUserContext(uid),
    getMonthlyBalance(uid),
  ]);
  return { ...ctx, monthlyBalance };
}

// Verifica e vincula PIN de conexão WhatsApp.
export async function verifyPin(phone: string, pin: string): Promise<string | null> {
  const db = getFirestore();
  const snap = await db.collection('whatsapp_pins').doc(pin).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (new Date(data.expiresAt as string) < new Date()) return null;
  const uid = data.uid as string;
  await linkPhone(phone, uid);
  await snap.ref.delete();
  return uid;
}

// Armazena documento no Firebase Storage e registra metadados.
export async function storeDocument(
  uid: string,
  fileBuffer: Buffer,
  contentType: string,
  originalName: string,
): Promise<string> {
  const db = getFirestore();
  const storage = getStorage();
  const timestamp = Date.now();
  const ext = contentType.split('/')[1]?.split(';')[0] ?? 'bin';
  const storagePath = `docs/${uid}/${timestamp}.${ext}`;

  const bucket = storage.bucket();
  const file = bucket.file(storagePath);
  await file.save(fileBuffer, { contentType, metadata: { originalName } });

  const docRef = await db.collection('users').doc(uid).collection('documents').add({
    storagePath,
    contentType,
    originalName,
    savedAt: new Date().toISOString(),
    source: 'whatsapp',
    sizeBytes: fileBuffer.byteLength,
  });

  return docRef.id;
}
