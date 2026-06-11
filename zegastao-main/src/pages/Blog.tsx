import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, BookOpen } from 'lucide-react';
import { BLOG_CATEGORIES } from '@/lib/blog';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { BlogCard } from '@/components/BlogCard';
import { cn } from '@/lib/utils';

function useSeoMeta(title: string, description: string, url: string) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? 'property' : 'name';
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    setMeta('description', description);
    setMeta('og:title', title, true);
    setMeta('og:description', description, true);
    setMeta('og:url', url, true);
    setMeta('og:type', 'website', true);
  }, [title, description, url]);
}

export function Blog() {
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useSeoMeta(
    'Blog Zé Gastão — Educação Financeira para o Povo Brasileiro',
    'Dicas reais de finanças pessoais, renda extra, como sair das dívidas e guardar dinheiro. Sem enrolação, pra quem precisa de resposta prática.',
    'https://zegastao.com.br/blog'
  );

  const { posts: allPosts, loading } = useBlogPosts();
  const total = allPosts.length;

  // Hero featured post (first featured) + secondary featured posts
  const featuredAll = allPosts.filter((p) => p.featured);
  const heroPost = featuredAll[0] ?? null;
  const secondaryFeatured = featuredAll.slice(1, 4);

  const filtered = (() => {
    let list = category ? allPosts.filter((p) => p.category === category) : allPosts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  })();

  const isFiltered = !!category || !!search.trim();

  return (
    <div className="min-h-screen bg-background">
      {loading && <div className="h-0.5 w-full bg-primary/30 animate-pulse" />}

      {/* Header breadcrumb */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Blog</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

        {/* Hero header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-primary font-semibold">{total} artigos</span>
            <span>sobre finanças pessoais</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight">Educação Financeira<br />para o Povo</h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg">
            Sem enrolação, sem papo de coach. Dicas reais pra quem ganha pouco, deve muito, e quer mudar isso de vez.
          </p>
        </div>

        {/* CTA banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-semibold text-sm">Diagnóstico financeiro gratuito em 2 minutos</p>
            <p className="text-xs text-muted-foreground mt-0.5">Descubra sua fase financeira e receba um plano de ação personalizado.</p>
          </div>
          <Link
            to="/login"
            className="shrink-0 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Começar grátis →
          </Link>
        </div>

        {/* Hero featured post */}
        {!isFiltered && heroPost && (
          <section className="space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wide text-muted-foreground">Em destaque</h2>
            <BlogCard post={heroPost} featured />
          </section>
        )}

        {/* Secondary featured grid */}
        {!isFiltered && secondaryFeatured.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {secondaryFeatured.map((p) => (
              <BlogCard key={p.slug} post={p} />
            ))}
          </div>
        )}

        {/* Category filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              !category ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            )}
          >
            Todos ({total})
          </button>
          {BLOG_CATEGORIES.map((cat) => {
            const count = allPosts.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  category === cat ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                )}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar artigo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* All posts grid */}
        <section className="space-y-4">
          {isFiltered && (
            <p className="text-sm text-muted-foreground">
              {filtered.length} artigo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum artigo encontrado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <div className="rounded-2xl border bg-card p-6 text-center space-y-3">
          <p className="font-bold text-lg">Aproveita enquanto lê 💡</p>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">Crie sua conta gratuita e veja o diagnóstico real da sua situação financeira — sem planilha, sem enrolação.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
