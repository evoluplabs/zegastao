import { orderBy } from 'firebase/firestore';
import { useUserCollection } from './useCollection';
import type { Upload } from '@/types';

export function useUploads() {
  return useUserCollection<Upload>('uploads', [orderBy('uploadedAt', 'desc')]);
}
