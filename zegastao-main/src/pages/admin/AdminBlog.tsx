import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Clock, Tag } from 'lucide-react';
import { getPosts, BLOG_CATEGORIES } from '@/lib/blog';
import { cn } from '@/lib/utils';

const CATEGORY_COLORS: Record<string, string> = {
  'Dívidas': 'text-red-600', 'Orçamento': 'text-blue-600', 'Renda Extra': 'text-green-600',
  'Poupança': 'text-violet-600', 'Direitos': 'text-amber-600',
  'Psicologia Financeira': 'text-pink-600', 'Ferramentas': 'text-cyan-600', 'Especiais': 'text-orange-600',
};

export function AdminBlog() {
  const [category, setCategory] = useState<string | null>(null);
  const posts = getPosts(category ?? undefined);

  const countByCategory = BLOG_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = getPosts(cat).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{getPosts().length} posts publicados</p>
        </div>
        <Link
          to="/blog"
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          Ver blog <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Categorias resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BLOG_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat === category ? null : cat)}
            className={cn(
              'rounded-xl border bg-card px-4 py-3 text-left hover:border-primary/40 transition-colors',
              category === cat && 'border-primary bg-primary/5'
            )}
          >
            <p className={cn('text-lg font-bold', CATEGORY_COLORS[cat])}>{countByCategory[cat]}</p>
            <p className="text-xs text-muted-foreground">{cat}</p>
          </button>
        ))}
      </div>

      {/* Lista de posts */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">{category ? `Posts em "${category}"` : 'Todos os posts'}</p>
          {category && (
            <button onClick={() => setCategory(null)} className="text-xs text-muted-foreground hover:text-foreground">
              Limpar filtro
            </button>
          )}
        </div>
        <div className="divide-y max-h-[60vh] overflow-y-auto">
          {posts.map((post) => (
            <div key={post.slug} className="px-5 py-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{post.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={cn('text-xs font-medium', CATEGORY_COLORS[post.category])}>{post.category}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {post.readMinutes}min
                  </span>
                  <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {post.featured && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">★ Destaque</span>
                )}
                <Link
                  to={`/blog/${post.slug}`}
                  target="_blank"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-card/50 p-5 text-center space-y-2">
        <Tag className="h-6 w-6 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">Adicionar novo post</p>
        <p className="text-xs text-muted-foreground">
          Posts são gerenciados em <code className="bg-secondary px-1 rounded text-[11px]">src/data/blogPosts_part*.ts</code> via Claude Code.
        </p>
      </div>
    </div>
  );
}
