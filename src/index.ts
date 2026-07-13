import type { Core } from '@strapi/strapi';

const ROLE_UID = 'plugin::users-permissions.role';
const USER_UID = 'plugin::users-permissions.user';
const PERMISSION_UID = 'plugin::users-permissions.permission';

const ensureRole = async (
  strapi: Core.Strapi,
  role: { type: string; name: string; description: string }
) => {
  const existing = await strapi.db.query(ROLE_UID).findOne({ where: { type: role.type } });
  if (existing) return existing;
  return strapi.db.query(ROLE_UID).create({ data: role });
};

const grantPermission = async (strapi: Core.Strapi, roleId: number, action: string) => {
  const exists = await strapi.db.query(PERMISSION_UID).findOne({
    where: {
      role: roleId,
      action,
    },
  });

  if (!exists) {
    await strapi.db.query(PERMISSION_UID).create({
      data: {
        role: roleId,
        action,
      },
    });
  }
};

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    if (strapi.contentTypes && !strapi.contentTypes['api::bet.bet']) {
      strapi.log.info('ROYALBET88 CORE: Initializing Bet module');
    }
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const [agentRole, playerRole, authenticatedRole] = await Promise.all([
      ensureRole(strapi, {
        type: 'agent',
        name: 'Agent',
        description: 'Agent user who invites players',
      }),
      ensureRole(strapi, {
        type: 'player',
        name: 'Player',
        description: 'Player invited by an agent',
      }),
      strapi.db.query(ROLE_UID).findOne({ where: { type: 'authenticated' } }),
    ]);

    const pluginStore = await strapi.store({
      type: 'plugin',
      name: 'users-permissions',
      key: 'advanced',
    });

    const advanced = ((await pluginStore.get({ key: 'advanced' })) || {}) as Record<string, any>;
    if (advanced.default_role !== 'player' || advanced.allow_register !== true) {
      await pluginStore.set({
        key: 'advanced',
        value: {
          ...advanced,
          default_role: 'player',
          allow_register: true,
        },
      });
    }

    await Promise.all([
      grantPermission(strapi, Number(playerRole.id), 'api::bet.bet.create'),
      grantPermission(strapi, Number(playerRole.id), 'api::bet.bet.find'),
      grantPermission(strapi, Number(playerRole.id), 'api::bet.bet.findOne'),
      grantPermission(strapi, Number(playerRole.id), 'api::bet.bet.place'),
      grantPermission(strapi, Number(playerRole.id), 'api::bet.bet.mine'),
      grantPermission(strapi, Number(playerRole.id), 'api::public-auth.public-auth.me'),
      grantPermission(strapi, Number(playerRole.id), 'api::agent.agent.me'),
      grantPermission(strapi, Number(agentRole.id), 'api::bet.bet.find'),
      grantPermission(strapi, Number(agentRole.id), 'api::bet.bet.findOne'),
      grantPermission(strapi, Number(agentRole.id), 'api::bet.bet.place'),
      grantPermission(strapi, Number(agentRole.id), 'api::bet.bet.mine'),
      grantPermission(strapi, Number(agentRole.id), 'api::public-auth.public-auth.me'),
      grantPermission(strapi, Number(agentRole.id), 'api::agent.agent.me'),
      grantPermission(strapi, Number(agentRole.id), 'api::agent.agent.generateInviteCode'),
      grantPermission(strapi, Number(agentRole.id), 'api::agent.agent.myPlayers'),
      grantPermission(strapi, Number(agentRole.id), 'api::agent.agent.transferBalance'),
      ...(authenticatedRole ? [
        grantPermission(strapi, Number(authenticatedRole.id), 'api::bet.bet.find'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::bet.bet.findOne'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::bet.bet.place'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::bet.bet.mine'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::public-auth.public-auth.me'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::agent.agent.me'),
        grantPermission(strapi, Number(authenticatedRole.id), 'api::agent.agent.myPlayers'),
      ] : []),
    ]);

    const authenticatedUsers = await strapi.db.query(USER_UID).count({
      where: {
        role: { type: 'authenticated' },
      },
    });

    if (authenticatedUsers > 0) {
      strapi.log.info(`ROYALBET88 CORE: ${authenticatedUsers} authenticated users are ready.`);
    }

    const liveSimulationEnabled = String(process.env.ENABLE_LIVE_MATCH_SIMULATION || '').toLowerCase() === 'true';
    if (liveSimulationEnabled) {
      strapi.log.warn('ROYALBET88 CORE: ENABLE_LIVE_MATCH_SIMULATION=true was ignored. Realtime-only mode is enforced.');
    }
    strapi.log.info('ROYALBET88 CORE: live match simulation is disabled (realtime-only mode).');
  },
};
