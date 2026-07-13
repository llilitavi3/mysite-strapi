export default {
  routes: [
    {
      method: 'POST',
      path: '/public-auth/login',
      handler: 'public-auth.login',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/public-auth/register',
      handler: 'public-auth.register',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/public-auth/logout',
      handler: 'public-auth.logout',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/public-auth/me',
      handler: 'public-auth.me',
      config: {},
    },
  ],
};
