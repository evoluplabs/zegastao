import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Star } from 'lucide-react';
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
  const avgReadMinutes = total > 0 ? Math.round(allPosts.reduce((s, p) => s + (p.readMinutes || 5), 0) / total) : 5;

  // Hero featured post (first featured) + secondary featured posts
  const featuredAll = allPosts.filter((p) => p.featured);
  const heroPost = featuredAll[0] ?? null;
  const secondaryFeatured = featuredAll.slice(1, 4);

  // "Mais completos" — top 3 by readMinutes as a proxy for depth
  const topByDepth = [...allPosts].sort((a, b) => (b.readMinutes || 0) - (a.readMinutes || 0)).slice(0, 3);

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

      {/* Breadcrumb */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Blog</span>
        </div>
      </div>

      {/* Gradient hero */}
      <div className="bg-gradient-to-br from-primary/5 via-background to-success/5 border-b py-12">
        <div className="max-w-5xl mx-auto px-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
            📚 Blog Zé Gastão
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-3">
            Educação Financeira{' '}
            <span className="text-primary">sem enrolação</span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-lg mb-5">
            Para quem deve muito, ganha pouco, e quer mudar isso agora.
          </p>
          <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            {total > 0 && <span>✍ {total} artigos</span>}
            <span>⏱ ~{avgReadMinutes} min de leitura média</span>
            <span>📅 Atualizado semanalmente</span>
          </div>
        </div>
      </div>

      {/* Sticky category nav */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-3 no-scrollbar">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                !category ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
              )}
            >
              Todos {total > 0 && `(${total})`}
            </button>
            {BLOG_CATEGORIES.map((cat) => {
              const count = allPosts.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    category === cat ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

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

        {/* Destaque section — top featured posts */}
        {!isFiltered && topByDepth.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
              Mais completos
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {topByDepth.map((p) => (
                <div key={p.slug} className="relative">
                  <span className="absolute -top-2 -right-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5">
                    ⭐ Destaque
                  </span>
                  <BlogCard post={p} />
                </div>
              ))}
            </div>
          </section>
        )}

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
              {(isFiltered ? filtered : filtered.filter((p) => !featuredAll.includes(p))).map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </section>

        {/* CTA after content (not before) */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-success/5 px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-base">Veja seu plano personalizado →</p>
            <p className="text-sm text-muted-foreground mt-1">
              Diagnóstico gratuito em 2 minutos. Descubra sua fase financeira e receba ações concretas para esta semana.
            </p>
          </div>
          <Link
            to="/login"
            className="shrink-0 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            Começar grátis →
          </Link>
        </div>
      </div>
    </div>
  );
}
