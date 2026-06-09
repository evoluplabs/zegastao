export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  readMinutes: number;
  publishedAt: string;
  content: string;
  featured?: boolean;
}

export const BLOG_CATEGORIES = [
  'Dívidas',
  'Orçamento',
  'Renda Extra',
  'Poupança',
  'Direitos',
  'Psicologia Financeira',
  'Ferramentas',
  'Especiais',
] as const;

import { ALL_POSTS } from '@/data/blogPosts';

export function getPosts(category?: string): BlogPost[] {
  const sorted = [...ALL_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  if (!category) return sorted;
  return sorted.filter((p) => p.category === category);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return ALL_POSTS.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return ALL_POSTS.filter((p) => p.featured).slice(0, 3);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  return ALL_POSTS.filter(
    (p) => p.slug !== post.slug && (p.category === post.category || p.tags.some((t) => post.tags.includes(t)))
  ).slice(0, limit);
}
