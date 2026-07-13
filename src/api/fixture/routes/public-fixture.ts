export default {
  routes: [
    {
      method: 'GET',
      path: '/public-fixtures',
      handler: 'fixture.publicList',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/public-live-line',
      handler: 'fixture.publicLiveLine',
      config: {
        auth: false,
      },
    },
  ],
};
