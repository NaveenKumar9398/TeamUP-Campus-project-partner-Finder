import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const initials = (name?: string | null) => (name || 'Student').split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()).join('');
export const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)) : 'Flexible';
export const list = (value: unknown): string[] => Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string') : [];
