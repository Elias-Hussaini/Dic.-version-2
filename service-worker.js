// اضافه کردن cache برای فایل‌های بیومتریک
const BIOMETRIC_CACHE = 'biometric-v1';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(BIOMETRIC_CACHE).then(cache => {
            return cache.addAll([
                './biometric/biometric.css',
                './biometric/biometric-login.css',
                './biometric/biometric.js',
                './biometric/biometric-auth.js'
            ]);
        })
    );
});