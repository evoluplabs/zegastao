import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Star, BookOpen, ArrowRight } from 'lucide-react';
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

const LEARNING_PATH = [
  {
    phase: '🔴',
    label: 'Estou endividado',
    desc: 'Entenda como sair das dívidas com o método certo',
    category: 'Dívidas',
    color: 'border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800/30',
    badge: 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400',
  },
  {
    phase: '🟡',
    label: 'Organizando as finanças',
    desc: 'Monte seu orçamento e corte gastos que pesam',
    category: 'Orçamento',
    color: 'border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/30',
    badge: 'text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
  },
  {
    phase: '🟢',
    label: 'Pronto para crescer',
    desc: 'Aprenda a guardar dinheiro e fazer seu capital render',
    category: 'Poupança',
    color: 'border-green-200 bg-green-50/60 dark:bg-green-950/20 dark:border-green-800/30',
    badge: 'text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400',
  },
];

// Slugs curados manualmente como "por onde começar"
const STARTER_SLUGS = [
  'sair-do-vermelho-salario-minimo',
  'orcamento-50-30-20-na-pratica',
  'como-guardar-dinheiro-ganhando-pouco',
];

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

  const featuredAll = allPosts.filter((p) => p.featured);
  const heroPost = featuredAll[0] ?? null;
  const secondaryFeatured = featuredAll.slice(1, 4);
  const topByDepth = [...allPosts].sort((a, b) => (b.readMinutes || 0) - (a.readMinutes || 0)).slice(0, 3);

  // "Por onde começar" — curated starters or fallback to first 3 posts
  const starters = STARTER_SLUGS.map((slug) => allPosts.find((p) => p.slug === slug)).filter(Boolean) as typeof allPosts;
  const starterPosts = starters.length >= 2 ? starters : allPosts.slice(0, 3);

  // Category read-time totals
  const categoryStats = Object.fromEntries(
    BLOG_CATEGORIES.map((cat) => {
      const catPosts = allPosts.filter((p) => p.category === cat);
      return [cat, { count: catPosts.length, minutes: catPosts.reduce((s, p) => s + (p.readMinutes || 5), 0) }];
    })
  );

  const filtered = (() => {
    let list = category ? allPosts.filter((p) => p.category === category) : allPosts;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return list;
  })();

  const isFiltered = !!category || !!search.trim();

  // Latest 3 posts (for "Últimos publicados" section)
  const latestPosts = [...allPosts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);

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
            <BookOpen className="h-3 w-3" /> Blog Zé Gastão
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
              const stats = categoryStats[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                    category === cat ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  )}
                >
                  {cat}{stats && stats.count > 0 ? ` (${stats.count})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">

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

        {/* Trilha de Aprendizado — only when not filtering */}
        {!isFiltered && (
          <section className="space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              🗺️ Trilha de aprendizado
              <span className="text-xs font-normal text-muted-foreground">Escolha sua situação atual</span>
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {LEARNING_PATH.map((path) => (
                <button
                  key={path.category}
                  onClick={() => setCategory(path.category)}
                  className={cn(
                    'text-left rounded-2xl border p-4 hover:shadow-md transition-all',
                    path.color
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{path.phase}</span>
                    <span className={cn('text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5', path.badge)}>
                      {path.category}
                    </span>
                  </div>
                  <p className="text-sm font-semibold leading-snug mb-1">{path.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{path.desc}</p>
                  <p className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
                    Ver artigos <ArrowRight className="h-3 w-3" />
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Por onde começar — only when not filtering */}
        {!isFiltered && starterPosts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-base flex items-center gap-2">
              👋 Por onde começar?
              <span className="text-xs font-normal text-muted-foreground">Leituras essenciais</span>
            </h2>
            <div className="space-y-2">
              {starterPosts.map((post, i) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="flex items-center gap-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all p-4"
                >
                  <span className="text-2xl font-black text-muted-foreground/30 tabular-nums w-8 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-snug line-clamp-1">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{post.readMinutes} min · {post.category}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Últimos publicados */}
        {!isFiltered && latestPosts.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-bold text-base">🆕 Últimos publicados</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {latestPosts.map((p) => <BlogCard key={p.slug} post={p} />)}
            </div>
          </section>
        )}

        {/* Destaque section */}
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
            {secondaryFeatured.map((p) => <BlogCard key={p.slug} post={p} />)}
          </div>
        )}

        {/* All posts grid */}
        <section className="space-y-4">
          {isFiltered ? (
            <>
              <p className="text-sm text-muted-foreground">
                {filtered.length} artigo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                {category && (
                  <> em <strong>{category}</strong>
                    {categoryStats[category] && ` · ${categoryStats[category].minutes} min total de leitura`}
                  </>
                )}
              </p>
              {filtered.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Nenhum artigo encontrado.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((p) => <BlogCard key={p.slug} post={p} />)}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="font-bold text-base">📚 Todos os artigos</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allPosts
                  .filter((p) => !topByDepth.includes(p) && !latestPosts.includes(p) && !featuredAll.includes(p))
                  .map((p) => <BlogCard key={p.slug} post={p} />)
                }
              </div>
            </>
          )}
        </section>

        {/* CTA after content */}
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
