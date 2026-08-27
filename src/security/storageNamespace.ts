const SAFE_NAMESPACE = /[^a-z0-9_-]/g

export function storageNamespace(): string {
  if (typeof window === 'undefined') return 'standalone'
  const match = window.location.pathname.match(/^\/sandbox\/([^/]+)\/design(?:\/|$)/i)
  if (!match) return window.location.pathname.startsWith('/admin/design') ? 'admin' : 'standalone'
  return `sandbox-${decodeURIComponent(match[1]).toLowerCase().replace(SAFE_NAMESPACE, '-')}`
}

export function namespacedStorageKey(base: string): string {
  return `${base}:${storageNamespace()}`
}

export function belongsToCurrentNamespace(key: string): boolean {
  return key.endsWith(`:${storageNamespace()}`)
}
