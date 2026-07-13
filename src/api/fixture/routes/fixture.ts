export default {
  routes: [
    {
      method: 'GET',
      path: '/fixtures/sync',
      handler: 'api::fixture.fixture.sync',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/fixtures/sync-second',
      handler: 'api::fixture.fixture.syncSecond',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/fixtures/sync-all',
      handler: 'api::fixture.fixture.syncAll',
      config: {
        auth: false,
      },
    },
   {
      method: 'GET',
      path: '/fixtures', // <-- שינוי מדויק לכאן!
      handler: 'api::fixture.fixture.publicList',
      config: {
        auth: false,
      },
    },
  ],
};
