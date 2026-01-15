export function formatPrice(price?: number, currency: string = 'NGN'): string {
  if (!price) return 'Price on request';
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : 'C$';
  return `${symbol}${price.toLocaleString()}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

