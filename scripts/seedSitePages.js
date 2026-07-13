'use strict';

const DEFAULT_PAGES = [
  { slug: 'home', title: 'דף הבית', description: 'עמוד הבית הראשי של RoyalBet88.' },
  { slug: 'sports', title: 'ספורט', description: 'עמוד ספורט עם משחקים ושווקים חיים.' },
  { slug: 'livecasino', title: 'קזינו לייב', description: 'עמוד קזינו לייב עם שולחנות פעילים.' },
  { slug: 'casino', title: 'סלוטים', description: 'עמוד סלוטים ומשחקי קזינו.' },
  { slug: 'promotions', title: 'מבצעים', description: 'עמוד מבצעים, בונוסים והטבות.' },
  { slug: 'vip', title: 'מועדון VIP', description: 'עמוד מועדון VIP והטבות פרימיום.' },
  { slug: 'wallet', title: 'ארנק', description: 'עמוד ארנק, הפקדות, משיכות והיסטוריה.' },
  { slug: 'bet-slip', title: 'טופס הימור', description: 'עמוד טופס הימור ובחירות פעילות.' },
  { slug: 'live-results', title: 'תוצאות לייב', description: 'עמוד תוצאות חיות ולוח זוכים.' },
  { slug: 'profile', title: 'פרופיל', description: 'עמוד פרופיל משתמש והעדפות.' },
  { slug: 'messages', title: 'הודעות', description: 'עמוד הודעות מערכת ותמיכה.' },
  { slug: 'agents', title: 'סוכנים', description: 'עמוד ניהול סוכנים ומבנה הפניות.' },
  { slug: 'settings', title: 'הגדרות', description: 'עמוד הגדרות מערכת ושפה.' },
  { slug: 'support', title: 'תמיכה', description: 'עמוד יצירת קשר ותמיכת לקוחות.' },
  { slug: 'statistics', title: 'סטטיסטיקות', description: 'עמוד סטטיסטיקות ונתוני לייב.' },
  { slug: 'tournaments', title: 'טורנירים', description: 'עמוד טורנירים ואתגרים שבועיים.' },
  { slug: 'admin', title: 'ניהול', description: 'עמוד ניהול פנימי של המערכת.' },
  { slug: 'privacy', title: 'מדיניות פרטיות', description: 'עמוד מדיניות פרטיות והגנת מידע.' },
  { slug: 'terms', title: 'תנאים והגבלות', description: 'עמוד תנאי שימוש וכללי פלטפורמה.' },
  { slug: 'responsible-gaming', title: 'משחק אחראי', description: 'עמוד כללי משחק אחראי ו-18+.' },
];

async function ensurePublicReadPermission(strapi) {
  const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
    where: { type: 'public' },
  });
  if (!publicRole) return;

  const requiredActions = ['find', 'findOne'].map(
    (action) => `api::site-page.site-page.${action}`,
  );

  for (const action of requiredActions) {
    const existing = await strapi.query('plugin::users-permissions.permission').findOne({
      where: { action, role: publicRole.id },
    });
    if (!existing) {
      await strapi.query('plugin::users-permissions.permission').create({
        data: { action, role: publicRole.id },
      });
    }
  }
}

async function seedSitePages(strapi) {
  const uid = 'api::site-page.site-page';
  let created = 0;
  let skipped = 0;

  for (const page of DEFAULT_PAGES) {
    const existing = await strapi.documents(uid).findMany({
      filters: { slug: { $eq: page.slug } },
      fields: ['id', 'slug'],
      limit: 1,
    });

    if (Array.isArray(existing) && existing.length > 0) {
      skipped += 1;
      continue;
    }

    await strapi.documents(uid).create({
      data: {
        slug: page.slug,
        title: page.title,
        description: page.description,
        sections: [],
        promotion_items: [],
      },
      status: 'published',
    });

    created += 1;
  }

  await ensurePublicReadPermission(strapi);
  return { created, skipped, total: DEFAULT_PAGES.length };
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();

  try {
    const result = await seedSitePages(app);
    console.log(
      `[seed-site-pages] created=${result.created} skipped=${result.skipped} total=${result.total}`,
    );
  } finally {
    await app.destroy();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
