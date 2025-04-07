const CACHE_NAME = 'notas-seguras-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './storage.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        // Tenta cachear cada URL individualmente
        return Promise.all(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.log('Erro ao cachear ' + url + ': ' + error);
              // Continua mesmo se houver erro
              return Promise.resolve();
            });
          })
        );
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna a resposta do cache
        if (response) {
          return response;
        }
        
        // Clone da requisição
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(
          response => {
            // Verifica se a resposta é válida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone da resposta
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          }
        );
      })
    );
});