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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function mdToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(\n<li>)/g, '$1$2')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    .split(/\n{2,}/)
    .map((block) => {
      if (/^<[h|u|o|l|h|p]/.test(block.trim())) return block.trim();
      const trimmed = block.trim();
      if (!trimmed) return '';
      return `<p>${trimmed.replace(/\n/g, ' ')}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}
