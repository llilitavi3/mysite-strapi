export default [
  'strapi::errors',
  'strapi::security',
  'global::auth-rate-limit',
  'global::auth-cookie-bridge',
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'Accept'],
      credentials: true,
      origin: [
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:1337',
        'http://127.0.0.1:1337',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
        'https://royalbet88.live',
        'https://www.royalbet88.live',
      ],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
