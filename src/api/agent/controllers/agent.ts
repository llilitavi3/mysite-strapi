const USER_UID = 'plugin::users-permissions.user';
const ROLE_UID = 'plugin::users-permissions.role';
const roundMoney = (value: unknown) => Number((Number(value || 0)).toFixed(2));
const getUserTable = () => strapi.db.metadata.get(USER_UID)?.tableName || 'up_users';
const AGENT_ROLE_MARKERS = ['agent', 'admin', 'master', 'super', 'manager', 'authenticated'];

const makeInviteCode = () =>
  `AG${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}`;

const normalizeRoleValue = (value: unknown) => String(value || '').trim().toLowerCase();

const getRoleMarker = (user: any) => {
  const candidates = [
    user?.role?.type,
    user?.role?.name,
    user?.role?.code,
    user?.role,
    user?.user_type,
    user?.type,
  ];
  const normalized = candidates.map(normalizeRoleValue);
  return normalized.find((role) => AGENT_ROLE_MARKERS.some((marker) => role.includes(marker)))
    || normalized.find(Boolean)
    || '';
};

const roleLooksAgent = (role: string) => AGENT_ROLE_MARKERS.some((marker) => role.includes(marker));

const isAgentLikeUser = (user: any) => {
  const role = getRoleMarker(user);
  const players = Array.isArray(user?.players) ? user.players : [];
  return roleLooksAgent(role) || Boolean(user?.invite_code) || players.length > 0;
};

const serializeAgentProfile = (user: any) => {
  const playersCount = Array.isArray(user?.players) ? user.players.length : 0;
  const roleType = user?.role?.type || null;
  const roleName = user?.role?.name || null;
  const roleCode = user?.role?.code || null;
  const isAgent = isAgentLikeUser(user);

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    invite_code: user.invite_code || null,
    balance: user.balance || 0,
    role: isAgent ? 'agent' : (roleType || roleName || roleCode || null),
    role_type: roleType,
    role_name: roleName,
    role_code: roleCode,
    is_agent: isAgent,
    players_count: playersCount,
  };
};

export default {
  async myPlayers(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const authUser = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: {
        role: true,
        players: {
          select: ['id', 'username', 'email', 'balance', 'invite_code'],
          populate: {
            role: {
              select: ['id', 'type', 'name'],
            },
          },
        },
      },
    })) as any;

    if (!authUser) return ctx.unauthorized('User not found');

    const roleType = normalizeRoleValue(authUser.role?.type);
    const roleMarker = getRoleMarker(authUser);
    const relationPlayers = Array.isArray(authUser.players) ? authUser.players : [];
    const isAgentLike = isAgentLikeUser(authUser);
    const canListAgents = ['admin', 'master'].some((marker) => roleMarker.includes(marker));

    if (!isAgentLike && !canListAgents && roleType !== 'authenticated') {
      return ctx.forbidden('Role is not allowed to list players');
    }

    let users;
    if (isAgentLike) {
      users = relationPlayers
        .filter((user: any) => !user.role?.type || user.role.type === 'player')
        .sort((a: any, b: any) => Number(b.id) - Number(a.id));

      if (!users.length) {
        users = await strapi.db.query(USER_UID).findMany({
          where: { role: { type: 'player' }, agent: { id: authUser.id } },
          select: ['id', 'username', 'email', 'balance', 'invite_code'],
          populate: {
            agent: {
              select: ['id', 'username', 'email'],
            },
          },
          orderBy: { id: 'desc' },
        });
      }
    } else if (canListAgents) {
      users = await strapi.db.query(USER_UID).findMany({
        where: { role: { type: 'agent' } },
        select: ['id', 'username', 'email', 'balance', 'invite_code'],
        populate: {
          role: {
            select: ['id', 'type', 'name'],
          },
        },
        orderBy: { id: 'desc' },
      });
    } else {
      return ctx.forbidden('Role is not allowed to list players');
    }

    ctx.body = { data: users };
  },

  async transferBalance(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const { target_user_id, amount } = (ctx.request.body || {}) as any;
    const transferAmount = Number(amount);

    if (!target_user_id || !Number.isFinite(transferAmount) || transferAmount <= 0) {
      return ctx.badRequest('target_user_id and positive amount are required');
    }

    const authUser = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: ['role'],
    })) as any;

    if (!authUser) return ctx.unauthorized('User not found');

    const targetUser = (await strapi.db.query(USER_UID).findOne({
      where: { id: target_user_id },
      populate: ['role', 'agent'],
    })) as any;

    if (!targetUser) return ctx.notFound('Target user not found');

    const senderRole = getRoleMarker(authUser);
    const targetRole = targetUser.role?.type;

    const isMasterSender = ['authenticated', 'master', 'admin'].some((marker) => senderRole.includes(marker));
    const isAgentSender = roleLooksAgent(senderRole) || Boolean(authUser.invite_code);

    const isMasterToAgent = isMasterSender && targetRole === 'agent';
    const isAgentToOwnPlayer =
      isAgentSender && targetRole === 'player' && Number(targetUser.agent?.id) === Number(authUser.id);

    if (!isMasterToAgent && !isAgentToOwnPlayer) {
      return ctx.forbidden('Transfer rule violated. Allowed: master->agent or agent->own-player');
    }

    const senderBalanceBefore = roundMoney(authUser.balance);
    const targetBalanceBefore = roundMoney(targetUser.balance);
    let senderNewBalance = senderBalanceBefore;
    let targetNewBalance = targetBalanceBefore;

    try {
      const userTable = getUserTable();
      await strapi.db.connection.transaction(async (trx: any) => {
        const debited = await trx(userTable)
          .where({ id: authUser.id })
          .andWhere('balance', '>=', transferAmount)
          .update({
            balance: trx.raw('ROUND(COALESCE(balance, 0) - ?, 2)', [transferAmount]),
          });

        if (!debited) {
          const error: any = new Error('Insufficient sender balance');
          error.status = 400;
          throw error;
        }

        const credited = await trx(userTable)
          .where({ id: targetUser.id })
          .update({
            balance: trx.raw('ROUND(COALESCE(balance, 0) + ?, 2)', [transferAmount]),
          });

        if (!credited) {
          const error: any = new Error('Target user not found');
          error.status = 404;
          throw error;
        }

        const [senderAfterRow] = await trx(userTable).where({ id: authUser.id }).select(['balance']).limit(1);
        const [targetAfterRow] = await trx(userTable).where({ id: targetUser.id }).select(['balance']).limit(1);
        senderNewBalance = roundMoney(senderAfterRow?.balance);
        targetNewBalance = roundMoney(targetAfterRow?.balance);
      });
    } catch (error: any) {
      if (error?.status === 400) return ctx.badRequest(error.message || 'Insufficient sender balance');
      if (error?.status === 404) return ctx.notFound(error.message || 'Target user not found');
      strapi.log.error('transferBalance failed', error);
      return ctx.internalServerError('Transfer failed');
    }

    ctx.body = {
      data: {
        from: {
          id: authUser.id,
          role: senderRole,
          balance_before: senderBalanceBefore,
          balance_after: senderNewBalance,
        },
        to: {
          id: targetUser.id,
          role: targetRole,
          balance_before: targetBalanceBefore,
          balance_after: targetNewBalance,
        },
        amount: transferAmount,
      },
    };
  },

  async me(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const agent = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: ['role', 'players'],
    })) as any;

    if (!agent) return ctx.unauthorized('User not found');

    const profile = serializeAgentProfile(agent);
    if (!profile.is_agent) return ctx.forbidden('Account is not an agent');

    ctx.body = { data: profile };
  },

  async generateInviteCode(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const user = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: ['role', 'players'],
    })) as any;

    if (!user) return ctx.unauthorized('User not found');

    const isInviteCodeAllowed = isAgentLikeUser(user) || ['admin', 'master'].some((marker) => getRoleMarker(user).includes(marker));
    if (!isInviteCodeAllowed) {
      return ctx.forbidden('Only agents can create invite codes');
    }

    if (user.invite_code) {
      ctx.body = { data: { invite_code: user.invite_code } };
      return;
    }

    let invite_code = makeInviteCode();
    for (let i = 0; i < 5; i += 1) {
      const exists = await strapi.db.query(USER_UID).count({ where: { invite_code } });
      if (!exists) break;
      invite_code = makeInviteCode();
    }

    await strapi.db.query(USER_UID).update({
      where: { id: user.id },
      data: { invite_code },
    });

    ctx.body = { data: { invite_code } };
  },

  async registerPlayer(ctx) {
    const authUserId = ctx.state?.user?.id;
    if (!authUserId) return ctx.unauthorized('Login is required');

    const { username, email, password } = (ctx.request.body || {}) as any;
    if (!username || !email || !password) {
      return ctx.badRequest('username, email and password are required');
    }

    const agent = (await strapi.db.query(USER_UID).findOne({
      where: { id: authUserId },
      populate: ['role', 'players'],
    })) as any;

    if (!agent) return ctx.unauthorized('User not found');
    const canCreatePlayer = isAgentLikeUser(agent) || ['admin', 'master'].some((marker) => getRoleMarker(agent).includes(marker));
    if (!canCreatePlayer) {
      return ctx.forbidden('Only agent-level users can create players');
    }
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');
    if (normalizedUsername.length < 3 || normalizedUsername.length > 48) {
      return ctx.badRequest('username length must be between 3 and 48 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return ctx.badRequest('email is invalid');
    }
    if (rawPassword.length < 8) {
      return ctx.badRequest('password must be at least 8 characters');
    }

    const rolePlayer = await strapi.db.query(ROLE_UID).findOne({ where: { type: 'player' } });
    if (!rolePlayer) return ctx.internalServerError('Player role is missing');

    const existing = await strapi.db.query(USER_UID).count({
      where: {
        $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
      },
    });

    if (existing > 0) {
      return ctx.badRequest('Email or username already exists');
    }

    const userService = strapi.plugin('users-permissions').service('user');
    const jwtService = strapi.plugin('users-permissions').service('jwt');

    const createdUser = await userService.add({
      username: normalizedUsername,
      email: normalizedEmail,
      password: rawPassword,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: rolePlayer.id,
      agent: agent.id,
      balance: 0,
    });

    const jwt = jwtService.issue({ id: createdUser.id });

    ctx.body = {
      jwt,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        role: 'player',
        agent: Number(agent.id),
      },
    };
  },
};
