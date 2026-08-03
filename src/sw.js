import { precacheAndRoute } from 'workbox-precaching';

// Precaches all the assets injected during the Vite build process.
precacheAndRoute(self.__WB_MANIFEST);

// Skip waiting and claim clients so the update can be applied immediately
// when the user clicks "Jetzt neu laden" in our custom toast.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Here you can later add your push event listeners
// self.addEventListener('push', (event) => {
//   ...
// });
