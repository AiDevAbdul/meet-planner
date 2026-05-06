const CACHE_NAME = 'meetplanner-v1'
const OFFLINE_URL = '/offline'

const PRECACHE_URLS = [
  '/dashboard',
  '/tasks',
  '/messaging',
  '/offline',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {})
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches.match(event.request).then(cached =>
          cached || (event.request.mode === 'navigate'
            ? caches.match(OFFLINE_URL)
            : new Response('', { status: 503 }))
        )
      )
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: 'MeetPlanner', body: event.data.text() } }

  const options = {
    body:    payload.body ?? '',
    icon:    '/icons/icon.svg',
    badge:   '/icons/icon.svg',
    data:    payload.data ?? {},
    actions: payload.actions ?? [],
    tag:     payload.tag ?? 'meetplanner',
    renotify: true,
  }

  event.waitUntil(self.registration.showNotification(payload.title ?? 'MeetPlanner', options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
