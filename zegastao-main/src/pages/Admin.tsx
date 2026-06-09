import { useState } from 'react';
import { LayoutDashboard, BookOpen, Building2, BarChart3, Shield } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminBlog } from './admin/AdminBlog';
import { AdminB2B } from './admin/AdminB2B';
import { AdminMetrics } from './admin/AdminMetrics';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'blog', label: 'Blog', icon: BookOpen },
  { id: 'b2b', label: 'Leads B2B', icon: Building2 },
  { id: 'metrics', label: 'Investidor', icon: BarChart3 },
] as const;

type TabId = typeof TABS[number]['id'];

export function Admin() {
  const user = useStore((s) => s.user);
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm">Admin · Zé Gastão</span>
        </div>
        <span className="text-xs text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'blog' && <AdminBlog />}
        {tab === 'b2b' && <AdminB2B />}
        {tab === 'metrics' && <AdminMetrics />}
      </div>
    </div>
  );
}
