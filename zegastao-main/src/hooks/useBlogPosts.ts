import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { BlogPost } from '@/lib/blog';
import { ALL_POSTS } from '@/data/blogPosts';

export function useBlogPosts() {
  const [dynamic, setDynamic] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'blog_posts'), where('status', '==', 'published')))
      .then((snap) => setDynamic(snap.docs.map((d) => d.data() as BlogPost)))
      .catch(() => setDynamic([]))
      .finally(() => setLoading(false));
  }, []);

  const posts = [...dynamic, ...ALL_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return { posts, loading };
}

export function usePostBySlug(slug: string) {
  const staticPost = ALL_POSTS.find((p) => p.slug === slug);
  const [dynamic, setDynamic] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(!staticPost);

  useEffect(() => {
    if (staticPost) return;
    getDoc(doc(db, 'blog_posts', slug))
      .then((d) => { if (d.exists()) setDynamic(d.data() as BlogPost); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug, staticPost]);

  return { post: staticPost ?? dynamic ?? undefined, loading };
}

export async function publishBlogPost(post: BlogPost): Promise<void> {
  await setDoc(doc(db, 'blog_posts', post.slug), { ...post, status: 'published' });
}

export async function unpublishBlogPost(slug: string): Promise<void> {
  await deleteDoc(doc(db, 'blog_posts', slug));
}

export function useAdminDynamicPosts() {
  const [posts, setPosts] = useState<(BlogPost & { status: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    getDocs(collection(db, 'blog_posts'))
      .then((snap) => setPosts(snap.docs.map((d) => d.data() as BlogPost & { status: string })))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);
  return { posts, loading, reload };
}
