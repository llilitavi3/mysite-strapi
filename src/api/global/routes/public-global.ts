export default {
  routes: [
    {
      method: 'GET',
      path: '/public-glossary',
      handler: 'global.publicGlossary',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/public-team-logo',
      handler: 'global.publicTeamLogo',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/public-team-logos-sync',
      handler: 'global.publicTeamLogosSync',
      config: {
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/public-team-logos-sync',
      handler: 'global.publicTeamLogosSync',
      config: {
        auth: false,
      },
    },
  ],
};
