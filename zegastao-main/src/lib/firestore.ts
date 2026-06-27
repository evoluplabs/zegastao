// Helpers de CRUD no Firestore para o usuário atual.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, auth } from '@/firebase';

function uid(): string {
  const u = auth.currentUser;
  if (!u) throw new Error('Não autenticado');
  return u.uid;
}

export function userCol(name: string) {
  return collection(db, 'users', uid(), name);
}

export function addUserDoc(name: string, data: Record<string, unknown>) {
  return addDoc(userCol(name), { ...data, createdAt: new Date() });
}

export function updateUserDoc(name: string, id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, 'users', uid(), name, id), data);
}

export function deleteUserDoc(name: string, id: string) {
  return deleteDoc(doc(db, 'users', uid(), name, id));
}

export function setUserDoc(name: string, id: string, data: Record<string, unknown>) {
  return setDoc(doc(db, 'users', uid(), name, id), data, { merge: true });
}

export function setProfile(data: Record<string, unknown>) {
  return setDoc(doc(db, 'users', uid(), 'profile', 'main'), data, { merge: true });
}

export function addPublicDoc(name: string, data: Record<string, unknown>) {
  return addDoc(collection(db, name), data);
}

export function updatePublicDoc(name: string, id: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, name, id), data);
}

export function deletePublicDoc(name: string, id: string) {
  return deleteDoc(doc(db, name, id));
}
