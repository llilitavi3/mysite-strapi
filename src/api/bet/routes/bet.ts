export default {
  routes: [
    {
      method: 'POST',
      path: '/bets/place',
      handler: 'bet.place',
      config: {},
    },
    {
      method: 'POST',
      path: '/bets/place-live',
      handler: 'bet.place',
      config: {},
    },
    {
      method: 'GET',
      path: '/bets/my',
      handler: 'bet.mine',
      config: {},
    },
  ],
};
