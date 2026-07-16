/**
 * iGaming Marquee Continuous Loop Controller
 * מנגנון לנעילת רוחב הדף, מניעת גלילה אופקית וחישוב מרחקים מדויק
 */
(function() {
  function blockHorizontalScrollAndCalc() {
    // 1. אבטחה קשוחה של העמוד - מניעת פסי גלילה אופקיים בדפדפן
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    
    // 2. איתור אלמנט הרצועה הראשי של הסליידר
    const track = document.getElementById('master-marquee-track');
    if (!track) return;
    
    // 3. 🧮 מתמטיקת פיקסלים קשיחה:
    // כל כרטיסייה מוגדרת על רוחב של 200px + מרווחים של 15px מכל צד (30px רווח כולל) = 230px.
    // יש לנו 4 כרטיסיות ייחודיות בקבוצה הראשונה.
    const cardWidthWithMargin = 230; 
    const totalUniqueCards = 4;
    const distanceToMove = cardWidthWithMargin * totalUniqueCards; // 920px
    
    // 4. הזרקת המרחק המדויק לתוך משתנה ה-CSS למניעת סטיות, חורים או תבניות ריקות
    document.documentElement.style.setProperty('--marquee-move-distance', `-${distanceToMove}px`);
  }

  // הפעלה מיידית ברגע שה-DOM מוכן
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    blockHorizontalScrollAndCalc();
  } else {
    document.addEventListener('DOMContentLoaded', blockHorizontalScrollAndCalc);
  }

  // חישוב מחדש במידה והמשתמש משנה את גודל המסך (Resize או סיבוב טאבלט/מובייל)
  window.addEventListener('resize', blockHorizontalScrollAndCalc);
})();
