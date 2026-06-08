import { useEffect } from 'react';

export function useScrollReveal(options?: { threshold?: number; rootMargin?: string }): void {
  useEffect(() => {
    const { threshold = 0.1, rootMargin = '0px 0px -60px 0px' } = options ?? {};

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.getAttribute('data-delay');
            const apply = () => entry.target.classList.add('visible');
            if (delay) {
              setTimeout(apply, parseInt(delay, 10));
            } else {
              apply();
            }
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    const selectors = '.reveal, .reveal-left, .reveal-right, .reveal-scale';
    document.querySelectorAll(selectors).forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);
}
