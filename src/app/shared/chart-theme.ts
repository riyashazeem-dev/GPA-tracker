import { Theme } from '../core/theme/theme.service';

/** Palette + axis colours that adapt to the active theme for Chart.js. */
export function chartTheme(theme: Theme) {
  const dark = theme === 'dark';
  return {
    grid: dark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.15)',
    ticks: dark ? '#94a3b8' : '#64748b',
    brand: '#327cff',
    accent: dark ? '#8ec2ff' : '#1c5cf5',
    series: dark
      ? ['#327cff', '#8ec2ff', '#59a1ff', '#bcd9ff', '#1c378f']
      : ['#1c5cf5', '#327cff', '#59a1ff', '#8ec2ff', '#1748e1'],
  };
}