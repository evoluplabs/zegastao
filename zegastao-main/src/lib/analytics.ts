// Analytics wrapper — Mixpanel via CDN ou stub.
// Para ativar: npm install mixpanel-browser @types/mixpanel-browser
// e definir VITE_MIXPANEL_TOKEN no .env.local

type EventProps = Record<string, string | number | boolean | null | undefined>;

function getMixpanel() {
  // Lazy import para não bloquear o bundle se não estiver instalado
  return (window as unknown as { mixpanel?: { track: (e: string, p?: EventProps) => void; identify: (id: string) => void; people?: { set: (p: EventProps) => void } } }).mixpanel;
}

export function track(event: string, props?: EventProps) {
  try {
    getMixpanel()?.track(event, { ...props, app: 'copiloto-financeiro' });
  } catch {
    // silenciar em dev se mixpanel não estiver carregado
  }
}

export function identify(userId: string, userProps?: EventProps) {
  try {
    const mp = getMixpanel();
    mp?.identify(userId);
    if (userProps) mp?.people?.set(userProps);
  } catch { /* */ }
}

// Eventos pré-definidos do funil
export const Events = {
  USER_SIGNED_UP: 'user_signed_up',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_UPLOAD: 'first_upload',
  UPLOAD_COMPLETED: 'upload_completed',
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_LIMIT_REACHED: 'chat_limit_reached',
  MILESTONE_ACHIEVED: 'milestone_achieved',
  MILESTONE_SHARED: 'milestone_shared',
  WIN_SHARED: 'win_shared',
  UPGRADE_MODAL_SHOWN: 'upgrade_modal_shown',
  UPGRADE_CLICKED: 'upgrade_clicked',
  UPGRADE_COMPLETED: 'upgrade_completed',
  REFERRAL_SHARED: 'referral_shared',
  REFERRAL_CONVERTED: 'referral_converted',
} as const;
