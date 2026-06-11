import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Clock, Plus, X, Eye, EyeOff, Loader2, Trash2, CheckCircle } from 'lucide-react';
import { getPosts, BLOG_CATEGORIES, slugify, estimateReadMinutes, mdToHtml } from '@/lib/blog';
import { publishBlogPost, unpublishBlogPost, useAdminDynamicPosts } from '@/hooks/useBlogPosts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { BlogPost } from '@/lib/blog';

const CATEGORY_COLORS: Record<string, string> = {
  'Dívidas': 'text-red-600', 'Orçamento': 'text-blue-600', 'Renda Extra': 'text-green-600',
  'Poupança': 'text-violet-600', 'Direitos': 'text-amber-600',
  'Psicologia Financeira': 'text-pink-600', 'Ferramentas': 'text-cyan-600', 'Especiais': 'text-orange-600',
};

const EMPTY_FORM = {
  title: '',
  slug: '',
  description: '',
  category: 'Dívidas' as string,
  tags: '',
  content: '',
  publishedAt: new Date().toISOString().split('T')[0],
  featured: false,
};

type FormState = typeof EMPTY_FORM;

function PostForm({ onPublished }: { onPublished: () => void }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && typeof value === 'string') {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  async function handlePublish() {
    if (!form.title || !form.slug || !form.description || !form.content) {
      setError('Preencha título, slug, descrição e conteúdo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const htmlContent = mdToHtml(form.content);
      const post: BlogPost = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        content: htmlContent,
        readMinutes: estimateReadMinutes(form.content),
        publishedAt: form.publishedAt,
        featured: form.featured,
      };
      await publishBlogPost(post);
      setSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => { setSuccess(false); onPublished(); }, 2000);
    } catch {
      setError('Erro ao publicar. Verifique sua conexão e permissões.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Novo Post
        </p>
        <button
          onClick={() => setPreview(!preview)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {preview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {preview ? 'Editar' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div className="p-5">
          <p className="text-xs text-muted-foreground mb-3">Preview do conteúdo:</p>
          <div className="rounded-xl border bg-background p-4 max-h-[50vh] overflow-y-auto">
            <h1 className="text-xl font-bold mb-2">{form.title || 'Título do post'}</h1>
            <p className="text-sm text-muted-foreground mb-4">{form.description}</p>
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: mdToHtml(form.content) || '<p class="text-muted-foreground">Escreva o conteúdo ao lado...</p>' }}
            />
          </div>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          {/* Título + Slug */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Título *</label>
              <Input
                placeholder="Ex: Como sair do vermelho em 6 meses"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Slug (URL) *</label>
              <Input
                placeholder="como-sair-do-vermelho"
                value={form.slug}
                onChange={(e) => set('slug', slugify(e.target.value))}
                className="text-sm font-mono"
              />
              {form.slug && (
                <p className="text-[10px] text-muted-foreground">/blog/{form.slug}</p>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Descrição SEO * <span className="text-[10px]">({form.description.length}/160 chars)</span>
            </label>
            <Input
              placeholder="Frase curta e direta que aparece no Google e no card do post"
              value={form.description}
              onChange={(e) => set('description', e.target.value.slice(0, 160))}
              className="text-sm"
            />
          </div>

          {/* Categoria + Data + Destaque */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoria *</label>
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {BLOG_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Data de publicação</label>
              <Input
                type="date"
                value={form.publishedAt}
                onChange={(e) => set('publishedAt', e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Destaque</label>
              <button
                onClick={() => set('featured', !form.featured)}
                className={cn(
                  'w-full rounded-xl border px-3 py-2 text-sm text-left transition-colors',
                  form.featured ? 'bg-amber-50 border-amber-300 text-amber-700' : 'hover:bg-accent'
                )}
              >
                {form.featured ? '★ Post em destaque' : '☆ Post normal'}
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags (separadas por vírgula)</label>
            <Input
              placeholder="dívidas, cartão de crédito, juros"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Conteúdo */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Conteúdo em Markdown *
              <span className="ml-2 text-[10px] font-normal">
                Use ## para título, **negrito**, - para lista, parágrafo em branco entre blocos
              </span>
            </label>
            <textarea
              placeholder={`## Por que isso importa\n\nEscreva aqui de forma natural, como se fosse explicar pra um amigo...\n\n## Como funciona na prática\n\nUse listas, exemplos com valores reais, linguagem direta.`}
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              rows={16}
              className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
            />
            {form.content && (
              <p className="text-[10px] text-muted-foreground">
                ~{estimateReadMinutes(form.content)} min de leitura · {form.content.trim().split(/\s+/).length} palavras
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={handlePublish} disabled={saving || success} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : success ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Publicando...' : success ? 'Publicado!' : 'Publicar post'}
            </Button>
            {(form.title || form.content) && (
              <button onClick={() => setForm(EMPTY_FORM)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminBlog() {
  const staticPosts = getPosts();
  const { posts: dynamicPosts, loading, reload } = useAdminDynamicPosts();
  const [showForm, setShowForm] = useState(false);

  const countByCategory = BLOG_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = staticPosts.filter((p) => p.category === cat).length +
               dynamicPosts.filter((p) => p.category === cat).length;
    return acc;
  }, {} as Record<string, number>);

  async function handleDelete(slug: string) {
    if (!confirm(`Remover post "${slug}"?`)) return;
    await unpublishBlogPost(slug);
    reload();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {staticPosts.length} posts estáticos + {dynamicPosts.length} publicados via admin
        </p>
        <div className="flex items-center gap-3">
          <Link to="/blog" target="_blank" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            Ver blog <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button size="sm" onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'} className="gap-1.5">
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Fechar' : 'Novo post'}
          </Button>
        </div>
      </div>

      {/* Formulário de publicação */}
      {showForm && (
        <PostForm onPublished={() => { reload(); setShowForm(false); }} />
      )}

      {/* Posts criados pelo Admin (Firestore) */}
      {dynamicPosts.length > 0 && (
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b">
            <p className="text-sm font-semibold">Publicados via Admin ({dynamicPosts.length})</p>
          </div>
          <div className="divide-y">
            {dynamicPosts.map((post) => (
              <div key={post.slug} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{post.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={cn('text-xs font-medium', CATEGORY_COLORS[post.category])}>{post.category}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {post.readMinutes}min
                    </span>
                    <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                    {post.featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">★ Destaque</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/blog/${post.slug}`} target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button onClick={() => handleDelete(post.slug)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resumo por categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {BLOG_CATEGORIES.map((cat) => (
          <div key={cat} className="rounded-xl border bg-card px-4 py-3">
            <p className={cn('text-lg font-bold', CATEGORY_COLORS[cat])}>{countByCategory[cat]}</p>
            <p className="text-xs text-muted-foreground">{cat}</p>
          </div>
        ))}
      </div>

      {/* Posts estáticos */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b">
          <p className="text-sm font-semibold">Posts estáticos ({staticPosts.length})</p>
          <p className="text-xs text-muted-foreground mt-0.5">Gerenciados via Claude Code em src/data/blogPosts_part*.ts</p>
        </div>
        <div className="divide-y max-h-[40vh] overflow-y-auto">
          {staticPosts.map((post) => (
            <div key={post.slug} className="px-5 py-2.5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug truncate">{post.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn('text-xs font-medium', CATEGORY_COLORS[post.category])}>{post.category}</span>
                  <span className="text-xs text-muted-foreground">{post.publishedAt}</span>
                </div>
              </div>
              <Link to={`/blog/${post.slug}`} target="_blank" className="text-muted-foreground hover:text-primary shrink-0 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
