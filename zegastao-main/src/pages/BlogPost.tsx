import { useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, ChevronRight, ArrowLeft, Share2 } from 'lucide-react';
import { getPostBySlug, getRelatedPosts } from '@/lib/blog';
import { BlogCard } from '@/components/BlogCard';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  'Dívidas': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'Orçamento': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Renda Extra': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Poupança': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  'Direitos': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Psicologia Financeira': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Ferramentas': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  'Especiais': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;

  useEffect(() => {
    if (!post) return;
    document.title = `${post.title} — Zé Gastão`;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', post.description);
    setMeta('og:title', `${post.title} — Zé Gastão`, true);
    setMeta('og:description', post.description, true);
    setMeta('og:url', `https://zegastao.com.br/blog/${post.slug}`, true);
    setMeta('og:type', 'article', true);
  }, [post]);

  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post);
  const colorCls = CATEGORY_COLORS[post.category] || 'bg-secondary text-secondary-foreground';

  function share() {
    const url = `https://zegastao.com.br/blog/${post!.slug}`;
    if (navigator.share) {
      navigator.share({ title: post!.title, url });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[160px]">{post.category}</span>
          </div>
          <button onClick={share} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="space-y-4 mb-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', colorCls)}>
              {post.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {post.readMinutes} min de leitura
            </span>
            <span className="text-xs text-muted-foreground">{formatDate(post.publishedAt)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-snug">{post.title}</h1>
          <p className="text-muted-foreground text-base leading-relaxed border-l-4 border-primary/30 pl-4">
            {post.description}
          </p>
        </header>

        {/* Conteúdo */}
        <div
          className="prose prose-sm sm:prose max-w-none dark:prose-invert
            prose-headings:font-bold prose-headings:text-foreground
            prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:mb-4
            prose-li:text-foreground/90 prose-li:mb-1
            prose-ul:my-3 prose-ol:my-3
            prose-strong:text-foreground prose-strong:font-semibold
            prose-em:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 rounded-2xl border bg-primary/5 border-primary/20 p-6 space-y-3">
          <p className="font-bold">Quer colocar isso em prática?</p>
          <p className="text-sm text-muted-foreground">O Zé Gastão calcula seu diagnóstico financeiro, mostra em quanto tempo você sai das dívidas, e te dá um plano de ação. É gratuito pra começar.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>

        {/* Artigos relacionados */}
        {related.length > 0 && (
          <section className="mt-12 space-y-4">
            <h2 className="text-lg font-bold">Leia também</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* Voltar */}
        <div className="mt-10">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao blog
          </Link>
        </div>
      </article>
    </div>
  );
}
