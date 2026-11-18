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

export interface JarCircle {
  cx: number;
  cy: number;
  r: number;
  tone: 'light' | 'dark';
  opacity: number;
}

export interface Jar {
  id: string;
  name: string;
  color: JarColorKey;
  balance: number;
  goal?: number;
  circles?: JarCircle[];
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
  username: string;
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
  originRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export const JAR_COLOR_STYLES: Record<
  JarColorKey,
  {
    bg: string;
    lid: string;
    waveLight: string;
    waveMid: string;
    waveDark: string;
    circleLight: string;
    circleDark: string;
    text: string;
    subtext: string;
    btnBg: string;
    btnText: string;
    glow: string;
    dropGlow: string;
    label: string;
  }
> = {
  yellow: {
    bg: '#F7D41E',
    lid: '#D9B20D',
    waveLight: '#FFF078',
    waveMid: '#FFE226',
    waveDark: '#E5AE08',
    circleLight: '#FFF7AE',
    circleDark: '#D19704',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.74)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(255, 226, 38, 0.34)',
    dropGlow: 'drop-shadow(0 0 14px rgba(255, 226, 38, 0.36))',
    label: 'Yellow',
  },
  green: {
    bg: '#4ADE8A',
    lid: '#22B567',
    waveLight: '#9FF7C4',
    waveMid: '#6EEFA2',
    waveDark: '#1EBA68',
    circleLight: '#C4FCE0',
    circleDark: '#129A52',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.74)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(110, 239, 162, 0.34)',
    dropGlow: 'drop-shadow(0 0 14px rgba(110, 239, 162, 0.36))',
    label: 'Green',
  },
  blue: {
    bg: '#3D9DF6',
    lid: '#2379D4',
    waveLight: '#82C7FF',
    waveMid: '#4DABFF',
    waveDark: '#2375DB',
    circleLight: '#B4DCFF',
    circleDark: '#1B5BB6',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.88)',
    btnBg: 'rgba(15, 23, 42, 0.24)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(77, 171, 255, 0.38)',
    dropGlow: 'drop-shadow(0 0 14px rgba(77, 171, 255, 0.40))',
    label: 'Blue',
  },
  pink: {
    bg: '#EC5AA3',
    lid: '#C73880',
    waveLight: '#F9A2CE',
    waveMid: '#F472B6',
    waveDark: '#D13B87',
    circleLight: '#FBC8E3',
    circleDark: '#A82668',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.88)',
    btnBg: 'rgba(15, 23, 42, 0.24)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(244, 114, 182, 0.38)',
    dropGlow: 'drop-shadow(0 0 14px rgba(244, 114, 182, 0.40))',
    label: 'Pink',
  },
  purple: {
    bg: '#9575F7',
    lid: '#7350DE',
    waveLight: '#C7B8FF',
    waveMid: '#A78BFA',
    waveDark: '#744CE2',
    circleLight: '#DDD3FF',
    circleDark: '#5933C2',
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.88)',
    btnBg: 'rgba(15, 23, 42, 0.24)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(167, 139, 250, 0.38)',
    dropGlow: 'drop-shadow(0 0 14px rgba(167, 139, 250, 0.40))',
    label: 'Purple',
  },
  orange: {
    bg: '#F9842C',
    lid: '#D56414',
    waveLight: '#FFB980',
    waveMid: '#FB923C',
    waveDark: '#DF6410',
    circleLight: '#FFD5B0',
    circleDark: '#B84D06',
    text: '#111827',
    subtext: 'rgba(17, 24, 39, 0.74)',
    btnBg: 'rgba(17, 24, 39, 0.16)',
    btnText: '#FFFFFF',
    glow: '0 0 20px rgba(251, 146, 60, 0.36)',
    dropGlow: 'drop-shadow(0 0 14px rgba(251, 146, 60, 0.38))',
    label: 'Orange',
  },
};
