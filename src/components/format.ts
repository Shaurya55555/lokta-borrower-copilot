export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const inrShort = (n: number) => {
  if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (n >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.?0+$/, '') + ' L';
  return inr(n);
};

export const pct = (n: number) => n.toFixed(1) + '%';

export const months = (m: number) => (m % 12 === 0 ? `${m / 12} yr` : `${m} mo`);
