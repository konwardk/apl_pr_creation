import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function getCurrencySymbol(currency?: string): string {
    switch (currency?.toUpperCase()) {
        case 'INR':
            return '₹';
        case 'USD':
            return '$';
        case 'EUR':
            return '€';
        case 'GBP':
            return '£';
        case 'JPY':
            return '¥';
        case 'AED':
            return 'AED';
        case 'SGD':
            return 'S$';
        case 'CHF':
            return 'CHF';
        default:
            return '';
    }
}

export function formatCurrencyAmount(amount: number | string | null | undefined): string {
    const num = Number(amount) || 0;
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function formatCurrency(amount: number | string | null | undefined, currency: string = 'INR'): string {
    const formatted = formatCurrencyAmount(amount);
    const symbol = getCurrencySymbol(currency);
    return symbol ? `${symbol} ${formatted}` : `${formatted} ${currency}`;
}

