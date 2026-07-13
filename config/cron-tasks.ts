export default {
  // משימה 1: סנכרון מלא של משחקים עתידיים (Upcoming/Full Sync)
  // פועל לפי המשתנה ODDS_SYNC_CRON_RULE, ואם הוא ריק - ברירת המחדל הבטוחה היא פעם בשעה עגולה
  [process.env.ODDS_SYNC_CRON_RULE || '0 * * * *']: async ({ strapi }) => {
    if (String(process.env.ODDS_SYNC_CRON_ENABLED || 'false').toLowerCase() === 'false') {
      strapi.log.info('[cron-tasks] Odds sync cron is disabled by ODDS_SYNC_CRON_ENABLED=false.');
      return;
    }

    try {
      strapi.log.info('[cron-tasks] Starting full odds sync across all configured providers and sports...');
      const result = await strapi.service('api::fixture.fixture').syncAllProviders();
      strapi.log.info(
        `[cron-tasks] Full odds sync finished. fetched=${result?.fetched || 0}, created=${result?.created || 0}, updated=${result?.updated || 0}`
      );
    } catch (error: any) {
      strapi.log.error(`[cron-tasks] Full odds sync failed: ${error.message}`);
    }
  },

  // משימה 2: ריענון יחסי הימורים ותוצאות חיים (Live Odds Refresh)
  // פועל לפי המשתנה ODDS_LIVE_SYNC_CRON_RULE, ואם הוא ריק - ברירת המחדל הבטוחה היא פעם בשעה עגולה
  [process.env.ODDS_LIVE_SYNC_CRON_RULE || '0 * * * *']: async ({ strapi }) => {
    if (String(process.env.ODDS_LIVE_SYNC_CRON_ENABLED || 'false').toLowerCase() === 'false') {
      strapi.log.info('[cron-tasks] Live odds sync cron is disabled by ODDS_LIVE_SYNC_CRON_ENABLED=false.');
      return;
    }

    try {
      strapi.log.info('[cron-tasks] Starting live odds refresh...');
      const previousMode = process.env.ODDS_API_SYNC_MODE;
      const previousSportsList = process.env.ODDS_API_SPORTS_LIST;
      let result;
      
      try {
        process.env.ODDS_API_SYNC_MODE = process.env.ODDS_LIVE_SYNC_MODE || 'sports';
        
        // החלפת רשימת הליגות העצומה במילת המפתח 'live' שמתואמת עם ה- .env והקוד החדש ב-fixture
        process.env.ODDS_API_SPORTS_LIST = process.env.ODDS_LIVE_SYNC_SPORTS_LIST || 'live';
        
        result = await strapi.service('api::fixture.fixture').syncFromTheOddsApi();
      } finally {
        if (previousMode === undefined) delete process.env.ODDS_API_SYNC_MODE;
        else process.env.ODDS_API_SYNC_MODE = previousMode;
        if (previousSportsList === undefined) delete process.env.ODDS_API_SPORTS_LIST;
        else process.env.ODDS_API_SPORTS_LIST = previousSportsList;
      }
      
      strapi.log.info(
        `[cron-tasks] Live odds refresh finished. fetched=${result?.fetched || 0}, created=${result?.created || 0}, updated=${result?.updated || 0}`
      );
    } catch (error: any) {
      strapi.log.error(`[cron-tasks] Live odds refresh failed: ${error.message}`);
    }
  },
};

