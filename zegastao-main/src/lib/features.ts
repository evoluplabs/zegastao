// Feature flags do Zé Gastão.
// Permite ativar/desativar features inteiras com uma única mudança.
//
// Para ativar o Zé Apostador: mude ZE_APOSTADOR para true (ou defina
// VITE_FEATURE_ZE_APOSTADOR=true no ambiente).

function envFlag(key: string, fallback: boolean): boolean {
  const val = import.meta.env[key];
  if (val === undefined) return fallback;
  return val === 'true' || val === '1';
}

export const FEATURES = {
  ZE_APOSTADOR: envFlag('VITE_FEATURE_ZE_APOSTADOR', false),
} as const;

// URL de checkout no Hotmart — configure via VITE_HOTMART_URL no .env
export const HOTMART_URL: string =
  import.meta.env.VITE_HOTMART_URL || 'https://hotmart.com/product/ze-gastao';

export type FeatureName = keyof typeof FEATURES;

export function isFeatureEnabled(feature: FeatureName): boolean {
  return FEATURES[feature];
}
