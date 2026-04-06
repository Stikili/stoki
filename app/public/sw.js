const CACHE = 'stoki-v1'
const STATIC = [
  '/',
  '/dashboard',
  '/inventory',
  '/sales',
  '/credit',
  '/alerts',
  '/manifest.json',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  // Don't intercept non-GET, cross-origin, or API/supabase requests
  if (
    request.method !== 'GET' ||
    url.origin !== location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/') ||
    url.hostname.includes('supabase')
  ) {
    return
  }

  // Network-first for navigation; fall back to cache
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((c) => c.put(request, clone))
        }
        return res
      })
      .catch(() => caches.match(request).then((cached) => cached ?? new Response('Offline', { status: 503 })))
  )
})

// Push notifications
self.addEventListener('push', (e) => {
  if (!e.data) return
  let data
  try { data = e.data.json() } catch { data = { title: 'stoki', body: e.data.text() } }
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'stoki', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/dashboard'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const w = wins.find((w) => w.url.includes(url))
      if (w) return w.focus()
      return clients.openWindow(url)
    })
  )
})
