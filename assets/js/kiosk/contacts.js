const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM = /^[A-Za-z0-9_]{5,32}$/;

function httpsUrl(value = '') {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

// Content contacts as ready-to-click links; anything malformed is dropped.
export function contactLinks(contacts = {}) {
  const links = [];
  const telegram = String(contacts.telegram || '').replace(/^@/, '');
  if (TELEGRAM.test(telegram)) {
    links.push({ kind: 'telegram', label: 'Telegram', value: `@${telegram}`, href: `https://t.me/${telegram}` });
  }
  if (EMAIL.test(contacts.email || '')) {
    links.push({ kind: 'email', label: 'Почта', value: contacts.email, href: `mailto:${contacts.email}` });
  }
  const behance = httpsUrl(contacts.behance);
  if (behance) {
    links.push({ kind: 'behance', label: 'Behance', value: behance.replace(/^https:\/\//, '').replace(/\/$/, ''), href: behance });
  }
  return links;
}
