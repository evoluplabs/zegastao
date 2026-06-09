import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight } from 'lucide-react';
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
  const featured = allPosts.filter((p) => p.featured).slice(0, 3);
  const all = category ? allPosts.filter((p) => p.category === category) : allPosts;
  const filtered = search.trim()
    ? all.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.description.toLowerCase().includes(search.toLowerCase())
      )
    : all;

  return (
    <div className="min-h-screen bg-background">
      {loading && <div className="h-0.5 w-full bg-primary/30 animate-pulse" />}
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Início</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">Blog</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Hero */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">Educação Financeira para o Povo</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Sem enrolação, sem papo de coach. Dicas reais pra quem ganha pouco, deve muito, e quer mudar isso.
          </p>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar artigo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Destaques (só sem filtro ativo) */}
        {!category && !search && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold">Em destaque</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* Filtro por categoria */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategory(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              !category ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
            )}
          >
            Todos
          </button>
          {BLOG_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                category === cat ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Lista de posts */}
        <section className="space-y-4">
          {(category || search) && (
            <p className="text-sm text-muted-foreground">{filtered.length} artigo{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
          )}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum artigo encontrado.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="rounded-2xl border bg-primary/5 border-primary/20 p-6 text-center space-y-3">
          <p className="font-bold text-lg">Aproveita enquanto lê</p>
          <p className="text-muted-foreground text-sm">Cria sua conta gratuita no Zé Gastão e veja o diagnóstico real da sua situação financeira.</p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Começar grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
