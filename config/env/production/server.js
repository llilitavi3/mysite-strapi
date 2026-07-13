export default ({ env }) => ({
  url: env('PUBLIC_URL', ''),
  proxy: env.bool('IS_PROXIED', true),
  app: {
    keys: env.array('APP_KEYS'),
  },
});
