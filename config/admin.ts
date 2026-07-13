module.exports = ({ env }) => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: env('API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT'),
    },
  },
  // שורת הקסם שמנטרלת את חסימת עריכת הטבלאות בשרת פרודקשן
  autoReload: {
    enabled: env.bool('ADMIN_AUTO_RELOAD', false)
  },
  flags: {
    nps: env.bool('STRAPI_NPS_AVAILABLE', true),
    promoteEE: env.bool('STRAPI_PROMOTE_EE', true),
  },
});
