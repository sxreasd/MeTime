export type TransactionType = 'spend' | 'add' | 'jar_deposit' | 'jar_withdraw';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: string;
  note?: string;
  jarId?: string;
  jarName?: string;
  closedJar?: Jar;
  amount: number;
  createdAt: string; // ISO string
}

export type JarColorKey = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export interface Jar {
  id: string;
  name: string;
  color: JarColorKey;
  balance: number;
  goal?: number;
  createdAt: string;
}

export interface CategoryConfig {
  id: string;
  name: string;
  color: string;
  kind: 'spend' | 'add';
  isOthers?: boolean;
}

export interface Settings {
  name: string;
  currency: string;
  startingBalance: number;
  hapticsEnabled: boolean;
}

export type AppScreen =
  | 'home'
  | 'todo'
  | 'card_soon'
  | 'piggy'
  | 'analytics'
  | 'settings';

export type AnalyticsPeriod = 'today' | 'week' | 'month';

export interface ConfirmationData {
  amount: number;
  type: TransactionType;
  category: string;
  note?: string;
  subtitle: string;
}

export const JAR_COLOR_STYLES: Record<
  JarColorKey,
  {
    bg: string;
    circleA: string;
    circleB: string;
    text: string;
    subtext: string;
    btnBg: string;
    btnText: string;
    glow: string;
    label: string;
  }
> = {
  yellow: {
    bg: '#FFE226',
    circleA: 'rgba(255, 255, 255, 0.24)',
    circleB: 'rgba(234, 179, 8, 0.35)',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.72)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Yellow',
  },
  green: {
    bg: '#6EEFA2',
    circleA: 'rgba(255, 255, 255, 0.22)',
    circleB: 'rgba(16, 185, 129, 0.22)',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.72)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Green',
  },
  blue: {
    bg: '#4DABFF',
    circleA: 'rgba(255, 255, 255, 0.20)',
    circleB: 'rgba(37, 99, 235, 0.25)',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.85)',
    btnBg: 'rgba(15, 23, 42, 0.22)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Blue',
  },
  pink: {
    bg: '#F472B6',
    circleA: 'rgba(255, 255, 255, 0.22)',
    circleB: 'rgba(219, 39, 119, 0.24)',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.85)',
    btnBg: 'rgba(15, 23, 42, 0.22)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Pink',
  },
  purple: {
    bg: '#A78BFA',
    circleA: 'rgba(255, 255, 255, 0.22)',
    circleB: 'rgba(109, 40, 217, 0.24)',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.85)',
    btnBg: 'rgba(15, 23, 42, 0.22)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Purple',
  },
  orange: {
    bg: '#FB923C',
    circleA: 'rgba(255, 255, 255, 0.22)',
    circleB: 'rgba(234, 88, 12, 0.25)',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.72)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 4px 12px rgba(0, 0, 0, 0.22)',
    label: 'Orange',
  },
};
