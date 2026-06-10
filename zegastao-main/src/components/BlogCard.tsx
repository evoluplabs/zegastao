import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { BlogPost } from '@/lib/blog';
import { getCoverConfig } from '@/lib/blogCoverImage';
import { cn } from '@/lib/utils';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

interface Props {
  post: BlogPost;
  featured?: boolean;
}

export function BlogCard({ post, featured }: Props) {
  const cover = getCoverConfig(post.category);

  if (featured) {
    // Featured: horizontal layout with large cover on left
    return (
      <Link
        to={`/blog/${post.slug}`}
        className="group flex flex-col sm:flex-row rounded-2xl overflow-hidden border bg-card hover:shadow-lg transition-all duration-200"
      >
        <div className={cn('relative sm:w-2/5 flex items-center justify-center p-8 min-h-[140px]', cover.gradient)}>
          <span className="text-5xl">{cover.iconEmoji}</span>
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
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden border bg-card hover:shadow-lg transition-all duration-200"
    >
      {/* Cover */}
      <div className={cn('relative flex items-center justify-center py-6', cover.gradient)}>
        <span className="text-4xl">{cover.iconEmoji}</span>
        <div className="absolute bottom-2 left-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/80 bg-black/20 px-2 py-0.5 rounded-full">
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h2 className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {post.description}
        </p>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {post.readMinutes} min</span>
          <span>{formatDate(post.publishedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
