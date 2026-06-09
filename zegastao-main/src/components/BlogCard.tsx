import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';
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

interface Props {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured }: Props) {
  const colorCls = CATEGORY_COLORS[post.category] || 'bg-secondary text-secondary-foreground';

  return (
    <Link
      to={`/blog/${post.slug}`}
      className={cn(
        'group flex flex-col rounded-2xl border bg-card hover:shadow-md transition-all duration-200 overflow-hidden',
        featured ? 'md:flex-row' : ''
      )}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', colorCls)}>
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {post.readMinutes} min
          </span>
        </div>

        <h2 className={cn(
          'font-bold text-foreground leading-snug group-hover:text-primary transition-colors',
          featured ? 'text-xl' : 'text-base'
        )}>
          {post.title}
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {post.description}
        </p>

        <div className="mt-auto pt-2 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          Ler artigo <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </Link>
  );
}
