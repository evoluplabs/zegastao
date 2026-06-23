import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';
import { getCoverConfig } from '@/lib/blogCoverImage';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 30 * 24 * 60 * 60 * 1000;
}

function DifficultyDots({ minutes }: { minutes: number }) {
  const level = minutes <= 5 ? 1 : minutes <= 10 ? 2 : 3;
  return (
    <span className="flex items-center gap-0.5" title={level === 1 ? 'Básico' : level === 2 ? 'Intermediário' : 'Completo'}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn('h-1.5 w-1.5 rounded-full', i <= level ? 'bg-primary' : 'bg-muted-foreground/30')}
        />
      ))}
    </span>
  );
}

interface Props {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured }: Props) {
  const cover = getCoverConfig(post.category);
  const _isNew = isNew(post.publishedAt);

  if (featured) {
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border bg-card hover:shadow-lg transition-all duration-200"
      >
        <div className={cn('relative sm:w-2/5 flex items-center justify-center p-8 min-h-[140px]', cover.gradient)}>
          <span className="text-5xl">{cover.iconEmoji}</span>
          {_isNew && (
            <span className="absolute top-3 right-3 rounded-full bg-white/90 text-primary text-[10px] font-bold px-2 py-0.5">
              Novo
            </span>
          )}
          <div className="absolute bottom-3 left-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded-full">
              {post.category}
            </span>
          </div>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2.5">
          <h2 className="font-bold text-lg leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
            {post.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} min</span>
            <DifficultyDots minutes={post.readMinutes} />
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group relative flex flex-col rounded-2xl overflow-hidden border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200"
    >
      {/* Lateral color bar */}
      <div className={cn('h-1 w-full', cover.gradient)} />

      {/* New badge */}
      {_isNew && (
        <span className="absolute top-3 right-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 z-10">
          Novo
        </span>
      )}

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-lg">{cover.iconEmoji}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{post.category}</span>
        </div>
        <h2 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {post.description}
        </p>
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} min</span>
          <DifficultyDots minutes={post.readMinutes} />
          <span className="ml-auto">{formatDate(post.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
