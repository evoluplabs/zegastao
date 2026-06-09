#!/usr/bin/env node
/**
 * Gera public/sitemap.xml com todas as URLs do blog + páginas estáticas.
 * Execute: node scripts/generate-sitemap.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Importa posts via compilação TS seria complexo — usa regex simples pra extrair slugs
const part1 = readFileSync(resolve(ROOT, 'src/data/blogPosts_part1.ts'), 'utf-8');
const part2 = readFileSync(resolve(ROOT, 'src/data/blogPosts_part2.ts'), 'utf-8');

const slugRegex = /slug:\s*['"`]([^'"`]+)['"`]/g;
const slugs = [];
let m;
for (const src of [part1, part2]) {
  while ((m = slugRegex.exec(src)) !== null) slugs.push(m[1]);
}

const BASE = 'https://zegastao.com.br';
const TODAY = new Date().toISOString().split('T')[0];

const STATIC_PAGES = [
  { url: '/', priority: '1.0', changefreq: 'weekly' },
  { url: '/blog', priority: '0.9', changefreq: 'daily' },
  { url: '/pricing', priority: '0.8', changefreq: 'monthly' },
  { url: '/empresas', priority: '0.7', changefreq: 'monthly' },
  { url: '/ajuda', priority: '0.6', changefreq: 'monthly' },
];

const entries = [
  ...STATIC_PAGES.map(
    (p) => `  <url>\n    <loc>${BASE}${p.url}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  ),
  ...slugs.map(
    (slug) => `  <url>\n    <loc>${BASE}/blog/${slug}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`
  ),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

writeFileSync(resolve(ROOT, 'public/sitemap.xml'), xml, 'utf-8');
console.log(`✓ sitemap.xml gerado com ${entries.length} URLs (${slugs.length} posts de blog)`);
