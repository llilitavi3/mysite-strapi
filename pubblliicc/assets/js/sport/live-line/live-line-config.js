(function () {
  'use strict';

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const isLiveLineRoute = path === '/sport/live-line' || path === '/live-line';
  if (!isLiveLineRoute) return;

  const sports = [
    { slug: 'football', label: 'כדורגל', image: 'footbal.jpeg' },
    { slug: 'basketball', label: 'כדורסל', image: 'basketball.jpeg' },
    { slug: 'tennis', label: 'טניס', image: 'tennis.jpeg' },
    { slug: 'volleyball', label: 'כדורעף', image: 'volleyball.jpeg' },
    { slug: 'baseball', label: 'בייסבול', image: 'baseball.jpeg' },
    { slug: 'ice-hockey', label: 'הוקי קרח', image: 'ice-hocky.jpeg' },
    { slug: 'handball', label: 'כדוריד', image: 'handball.jpeg' },
    { slug: 'table-tennis', label: 'טניס שולחן', image: 'table-tennis.jpeg' },
    { slug: 'boxing', label: 'אגרוף', image: 'boxing.jpeg' },
    { slug: 'mma', label: 'MMA', image: 'mma.jpeg' },
    { slug: 'cricket', label: 'קריקט', image: 'cricket.jpeg' },
    { slug: 'rugby', label: 'ראגבי', image: 'rugby.jpeg' },
    { slug: 'golf', label: 'גולף', image: 'golf.jpeg' },
    { slug: 'darts', label: 'חיצים', image: 'darts.jpeg' },
    { slug: 'motorsport', label: 'מוטורספורט', image: 'motorsport.jpeg' },
    { slug: 'cycling', label: 'אופניים', image: 'cycling.jpeg' },
    { slug: 'swimming', label: 'שחייה', image: 'swimming.jpeg' },
    { slug: 'athletics', label: 'אתלטיקה', image: 'athletics.jpeg' },
    { slug: 'badminton', label: 'בדמינטון', image: 'badminton.jpeg' },
    { slug: 'field-hockey', label: 'הוקי שדה', image: 'field-hockey.jpeg' },
    { slug: 'judo', label: 'ג׳ודו', image: 'judo.jpeg' },
    { slug: 'karate', label: 'קראטה', image: 'karate.jpeg' },
    { slug: 'taekwondo', label: 'טאקוונדו', image: 'teakwondo.jpeg' },
    { slug: 'wrestling', label: 'היאבקות', image: 'wresling.jpeg' },
    { slug: 'weightlifting', label: 'הרמת משקולות', image: 'weightlifting.jpeg' },
    { slug: 'rowing', label: 'חתירה', image: 'rowing.jpeg' },
    { slug: 'sailing', label: 'שייט', image: 'saling.jpeg' },
    { slug: 'surfing', label: 'גלישה', image: 'surfing.jpeg' },
    { slug: 'skiing', label: 'סקי', image: 'skiing.jpeg' },
    { slug: 'snowboarding', label: 'סנובורד', image: 'snowboarding.jpeg' },
    { slug: 'skateboarding', label: 'סקייטבורד', image: 'skatboarding.jpeg' },
    { slug: 'softball', label: 'סופטבול', image: 'softball.jpeg' },
    { slug: 'bowling', label: 'באולינג', image: 'bowling.jpeg' },
    { slug: 'fencing', label: 'סיף', image: 'fencing.jpeg' },
    { slug: 'equestrian', label: 'רכיבה', image: 'equesrian.jpeg' },
    { slug: 'triathlon', label: 'טריאתלון', image: 'triathlon.jpeg' },
    { slug: 'basketball3x3', label: '3x3 כדורסל', image: 'basketball3x3.jpeg' },
    { slug: 'beach-volleyball', label: 'כדורעף חופים', image: 'beach voleyball.jpeg' },
    { slug: 'water-polo', label: 'כדורמים', image: 'water-pold.jpeg' },
    { slug: 'american-football', label: 'פוטבול', image: 'am-football.jpeg' }
  ];

  const toImageUrl = (image) => {
    if (!image) return '';
    return image.startsWith('/') ? image : '/assets/images/footer-menu/' + image;
  };

  const sportsBySlug = new Map(sports.map((item) => [item.slug, item]));

  window.RBLiveLineConfig = Object.freeze({
    route: path,
    sports,
    sportsBySlug,
    toImageUrl
  });
})();
