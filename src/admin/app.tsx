import type { StrapiApp } from '@strapi/strapi/admin';
import heData from './translations/he.json';
import './admin-rtl.css';

export default {
  config: {
    // השארת אנגלית כשפה הרשמית כדי לעקוף את חסימת השפות של Strapi 5
    locales: ['en'],
    translations: {
      // הזרקת אובייקט העברית המלא ישירות לתוך השפה האנגלית בזיכרון
      en: heData,
    },
  },

  bootstrap(_app: StrapiApp) {
    // כפיית כיווניות מימין לשמאל (RTL) על הדפדפן
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';
    document.body.dir = 'rtl';
    document.body.classList.add('rb-strapi-admin-rtl');
  },
};
