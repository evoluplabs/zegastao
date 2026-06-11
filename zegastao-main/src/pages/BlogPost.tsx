import { useEffect, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Clock, ChevronRight, ArrowLeft, Share2 } from 'lucide-react';
import { getRelatedPosts } from '@/lib/blog';
import { getCoverConfig } from '@/lib/blogCoverImage';
import { usePostBySlug } from '@/hooks/useBlogPosts';
import { BlogCard } from '@/components/BlogCard';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Contextual CTA per category — drives users into the relevant app feature
const CATEGORY_CTA: Record<string, { text: string; sub: string; btnLabel: string }> = {
  'Dívidas': {
    text: 'Calcule seu plano de quitação',
    sub: 'O Zé Gastão mostra em quanto tempo você quita cada dívida e quanto de juros economiza.',
    btnLabel: 'Ver meu plano gratuito',
  },
  'Orçamento': {
    text: 'Importe seu extrato e veja para onde vai cada real',
    sub: 'A IA categoriza seus gastos automaticamente. Você vê onde cortar em menos de 2 minutos.',
    btnLabel: 'Importar meu extrato',
  },
  'Renda Extra': {
    text: 'Descubra quais bicos combinam com você',
    sub: 'Com base nas suas habilidades, o Zé Gastão sugere renda extra personalizada.',
    btnLabel: 'Descobrir meus bicos',
  },
  'Poupança': {
    text: 'Monte sua reserva de emergência',
    sub: 'Defina uma meta, configure um aporte mensal e acompanhe seu progresso.',
    btnLabel: 'Criar minha meta',
  },
};

const DEFAULT_CTA = {
  text: 'Quer colocar isso em prática?',
  sub: 'O Zé Gastão calcula seu diagnóstico financeiro, mostra em quanto tempo você sai das dívidas, e te dá um plano de ação.',
  btnLabel: 'Criar conta grátis',
};

function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    function update() {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docH > 0 ? Math.min(100, (window.scrollY / docH) * 100) : 0);
    }
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-primary/10">
      <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${progress}%` }} />
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { post, loading } = usePostBySlug(slug ?? '');

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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-1 w-32 bg-primary/30 rounded animate-pulse" /></div>;
  if (!post) return <Navigate to="/blog" replace />;

  const related = getRelatedPosts(post);
  const cover = getCoverConfig(post.category);
  const cta = CATEGORY_CTA[post.category] || DEFAULT_CTA;

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
      <ReadingProgress />

      {/* Breadcrumb */}
      <div className="border-b bg-card/80 backdrop-blur-sm sticky top-0.5 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium truncate max-w-[140px]">{post.category}</span>
          </div>
          <button onClick={share} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </button>
        </div>
      </div>

      {/* Hero cover */}
      <div className={cn('w-full flex flex-col items-center justify-center py-12 px-4 gap-3', cover.gradient)}>
        <span className="text-6xl drop-shadow-sm">{cover.iconEmoji}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-white/80">{post.category}</span>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <header className="space-y-4 mb-10">
          <div className="flex items-center gap-3 flex-wrap">
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

        {/* Contextual mid-content CTA */}
        <div className="my-10 rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-3">
          <p className="font-bold text-base">{cta.text} 👆</p>
          <p className="text-sm text-muted-foreground">{cta.sub}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {cta.btnLabel}
          </Link>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        )}

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

        {/* Bottom CTA */}
        <div className="mt-10 rounded-2xl border bg-card p-6 text-center space-y-3">
          <p className="font-bold text-lg">Pronto para agir? 🚀</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{cta.sub}</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {cta.btnLabel}
          </Link>
        </div>

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
