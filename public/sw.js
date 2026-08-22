const CACHE = 'gymos-offline-v3'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/check-in']).catch(() => {}))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

function networkFirst(request, fallbackUrl) {
  return fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => {
          cache.put(request, copy.clone()).catch(() => {})
          if (fallbackUrl) cache.put(fallbackUrl, copy).catch(() => {})
        }).catch(() => {})
      }
      return response
    })
    .catch(async () => {
      const exact = await caches.match(request)
      if (exact) return exact
      if (fallbackUrl) {
        const fallback = await caches.match(fallbackUrl)
        if (fallback) return fallback
      }
      return Promise.reject(request)
    })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/dashboard')) return
  if (url.search.includes('nocache')) return
  if (request.headers.get('RSC') === '1') return
  if (request.headers.has('Next-Router-Prefetch')) return

  if (url.pathname === '/check-in' || url.pathname.startsWith('/check-in/')) {
    event.respondWith(networkFirst(request, '/check-in'))
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.startsWith('/_next/')) return

  event.respondWith(networkFirst(request))
})
