export default {
  routes: [
    {
      method: 'GET',
      path: '/agents/me',
      handler: 'agent.me',
      config: {},
    },
    {
      method: 'POST',
      path: '/agents/generate-invite-code',
      handler: 'agent.generateInviteCode',
      config: {},
    },
    {
      method: 'POST',
      path: '/agents/register-player',
      handler: 'agent.registerPlayer',
      config: {},
    },
    {
      method: 'POST',
      path: '/agents/transfer-balance',
      handler: 'agent.transferBalance',
      config: {},
    },
    {
      method: 'GET',
      path: '/agents/my-players',
      handler: 'agent.myPlayers',
      config: {},
    },
  ],
};
