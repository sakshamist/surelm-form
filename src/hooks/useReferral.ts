import { useMemo } from 'react';
import type { Referral } from '@/types/form';

const VALID_REFERRALS: Record<string, Referral> = {
  soham: { slug: 'soham', name: 'Soham Suryavanshi' },
  saksham: { slug: 'saksham', name: 'Saksham Tripathi' },
  harsh: { slug: 'harsh', name: 'Harsh Srivastava' },
  harshit: { slug: 'harshit', name: 'Harshit Rana' },
};

const IGNORED_PATH_SEGMENTS = ['assets', 'index.html', 'favicon.svg', 'icons.svg', 'fonts.css'];

export function useReferral() {
  const referrer: Referral | null = useMemo(() => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    if (segments.length === 0) return null;
    
    const slug = segments[0].toLowerCase();
    
    if (IGNORED_PATH_SEGMENTS.includes(slug)) return null;
    
    return VALID_REFERRALS[slug] ?? null;
  }, []);

  return {
    referrer,
    isReferred: referrer !== null,
    referrerName: referrer?.name ?? null,
    referrerSlug: referrer?.slug ?? null,
  };
}