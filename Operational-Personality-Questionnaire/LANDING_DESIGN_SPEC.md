# מפרט עיצוב דף נחיתה , Conversion-First, פרימיום מודרני

דף נחיתה לשיחת אפיון ב־350₪ | RTL | Heebo | CTA יחיד: "לתיאום שיחת אפיון , 350₪"

---

## חל"ק 1 , אבחון: מה חסר בדף הנוכחי

### 1) Above-the-fold חלש
**הבעיה:** `min-h-[70vh] md:min-h-[85vh]` עם תוכן מרוכז במרכז , נוצר שטח ריק גדול. H1 `text-3xl md:text-4xl` קטן יחסית. PersonalGreeting לוקח מקום לפני Hero. CTA משתמש ב־`#3A5A6B` , צבע מושתק, לא "צועק" ללחיצה.  
**למה פוגע בהמרה:** המשתמש לא תופס את המסר ב־3 שניות. אין נקודת פוקוס ברורה.  
**איך מתקנים:** צמצום גובה Hero ל־`min-h-[60vh] md:min-h-[70vh]`, H1 גדול יותר (`text-4xl md:text-5xl lg:text-6xl`), העברת PersonalGreeting מתחת ל־CTA או מיזוגו ל־Hero, CTA עם צבע contrast גבוה (אקסנט חם/בהיר).

---

### 2) היררכיה טיפוגרפית לא מקצועית
**הבעיה:** H1/H2/H3 דומים מדי (2xl–4xl), אין type scale עקבי. `max-w-[65ch]` יוצר שורות ארוכות (65 תווים) שפחות נוחות לסריקה. רווח שורה (`leading-relaxed`) לא מאוזן בין כותרות לגוף.  
**למה פוגע בהמרה:** עיניים סורקות, לא קוראות , בלי היררכיה ברורה קשה לזהות "מה חשוב".  
**איך מתקנים:** Type scale מדורג (למשל 1.25–1.333), max-width לטקסט גוף ~55ch, כותרות עם `leading-tight`, גוף עם `leading-relaxed` או 1.6.

---

### 3) קונטרסט וצבעים
**הבעיה:** Hero עם גרדיאנט אפור־כחלחל (`#334155`→`#64748b`) , אחיד. אין נקודת אור (accent) שמכוונת לעין ל־CTA. טקסט `text-white/90` ו־`text-white/80` , ירידה בקריאות. CTA `#3A5A6B` על רקע כהה , contrast נמוך.  
**למה פוגע בהמרה:** עין לא נמשכת לכפתור. תחושת "שטוח" ולא פרימיום.  
**איך מתקנים:** CTA בצבע חם/בהיר (כתום־זהב/טורקיז בהיר) או לבן עם מסגרת. טקסט לבן 95%+ אופקיות. נקודת אור אחת מעל הקפל (פס/אלמנט עדין).

---

### 4) ריווח (Spacing) וחוסר "ריתמוס"
**הבעיה:** `py-16 md:py-20` ו־`px-6 md:px-10` , לא תמיד עקבי. אין מערכת 8px. `max-w-[960px]` לכל הדף אבל חלק מהסקשנים `max-w-[65ch]` , אין grid אחיד. רקעים: חלק full-width, חלק בתוך container.  
**למה פוגע בהמרה:** תחושת "מרופט". עין לא יודעת לאן לנוע.  
**איך מתקנים:** 8px spacing scale (8,16,24,32,40,48,64,80), max-content 1120px, sections עם רקע full-width + תוכן מרוכז, מרווחים עקביים (למשל 64px בין סקשנים).

---

### 5) רכיבים נראים "תבנית"
**הבעיה:** Cards עם `shadow-sm` ו־`border` , שטוחים. אין `hover` ל־Steps, אין `focus:ring` עקבי, `rounded-xl`/`rounded-2xl` מעורבב. רדיוסים לא מאוחדים.  
**למה פוגע בהמרה:** מרגיש "נוּרִי", לא מותאם אישית. פוגע באמון.  
**איך מתקנים:** shadow scale (sm/md/lg), hover עם `shadow-md` + translateY(-2px), focus ברור, radii עקביים (sm/md/lg/xl).

---

### 6) אמון והוכחות
**הבעיה:** WhyMe חזק בתוכן אבל חסרים trust cues: "מה מקבלים בסוף השיחה", microcopy מתחת ל־CTA, אין הבהרה ליד המחיר. FAQ טוב אבל חסר טקסט מנחה לפניו ("שאלות שנשאלו הרבה").  
**למה פוגע בהמרה:** התנגדויות נשארות באוויר.  
**איך מתקנים:** microcopy מתחת ל־CTA, "350₪ , שיחה אחת, תוצר ברור", intro לפני FAQ, "מה יוצאים איתו" בולט יותר.

---

### 7) מובייל
**הבעיה:** StickyMobileCTA קיים ו־min-h-48 ✓, אבל חסר `focus-visible`, חסר `active:scale-[0.98]`. יתד תחתון `h-20` , אולי לא מספיק. Touch targets בפריטי FAQ , `p-4` סביר אבל לחצן כללי עשוי להיות קטן.  
**למה פוגע בהמרה:** חוויית מובייל פחות מקצועית, נגישות חלשה.  
**איך מתקנים:** Sticky עם states מלאים, padding תחתון מספיק, touch targets מינימום 44px.

---

## חל"ק 2 , מה זה "עיצוב מודרני" בהקשר הזה

**הגדרה:** עיצוב מודרני = **בהירות + היררכיה + מרווחים מדויקים + קונסיסטנטיות (design system) + מיקרו-אינטראקציות + נגישות + פוקוס על CTA.**

### כללים אופרטיביים (8–12)

1. **max-width לתוכן:** 1120px (או 1200px) , תוכן מרוכז, רקע sections full-width.
2. **Type scale:** יחס ~1.25–1.333 (H1>H2>H3>body>small), line-height: כותרות 1.1–1.2, גוף 1.6.
3. **8px spacing grid:** 8,16,24,32,40,48,64,80,96 , אין ערכים אקראיים.
4. **Primary CTA אחד:** צבע יחיד, contrast גבוה, בולט. שאר אלמנטים לא מתחרים.
5. **3 נקודות זיהוי מעל הקפל:** (1) כותרת, (2) תת-כותרת/הבטחה, (3) CTA.
6. **Primary button:** גובה מינימום 48px, padding 16–24px אופקית, touch target 44×44px מינימום.
7. **Button states:** hover (בהירות/צל), focus (ring ברור), active (scale 0.98).
8. **Shadow hierarchy:** 2–3 רמות , sm (קל), md (cards), lg (modals/floating).
9. **Radii עקביים:** sm 6–8px, md 12px, lg 16px, xl 24px.
10. **אחד accent לCTA:** צבע שמנגד לרקע , אם רקע כהה → CTA בהיר/חם.
11. **Section rhythm:** מרווח זהה בין sections (למשל 64px או 80px).
12. **Accessibility:** focus-visible, contrast 4.5:1 טקסט, labels בשדות.

---

## חל"ק 3 , שינויי עיצוב לביצוע (TODO checklist)

### A) Hero , 9 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| A1 | צמצם גובה Hero | min-h-[55vh] md:min-h-[65vh] | מספיק לכותרת+תת+bullets+CTA |
| A2 | הגדל H1 | text-4xl md:text-5xl lg:text-6xl font-bold | ברור מעל הקפל |
| A3 | הוסף subheadline כותרת משנה | text-xl md:text-2xl, text-white/95 | היררכיה ברורה |
| A4 | צמצם micro-diagnosis בראש | "אם 2 מתוך 3" , שורה אחת או 2 bullets | לא להעמיס |
| A5 | CTA בולט , צבע contrast | bg-amber-500 / teal-400 או לבן + border | ניגוד לרקע כהה |
| A6 | CTA גדול יותר | min-h-[56px] px-10 py-4 text-lg font-bold | Baymard: כפתור ראשי בולט |
| A7 | microcopy מתחת CTA | text-sm text-white/90, max-w-md | הורדת התנגדות |
| A8 | נקודת אור (אופציונלי) | קו דק/גרדיאנט עדין מתחת ל־headline | כיוון לעין |
| A9 | PersonalGreeting | מיזוג ל־Hero או הזזה מתחת ל־CTA | לא "גונב" פוקוס |

---

### B) Pain/Cost , 5 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| B1 | Section padding עקבי | py-16 md:py-20, section rhythm | 64px בין sections |
| B2 | H2 scale | text-2xl md:text-3xl font-semibold | היררכיה |
| B3 | Bullets עם אייקון/סמן | לא רק "–" , אייקון warning/dash | ויזואל ברור |
| B4 | max-width | max-w-3xl (או 65ch) , אחיד | grid |
| B5 | רקע section | bg-white או bg-surface | ניגוד ל־Hero |

---

### C) Steps , 6 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| C1 | Cards עם shadow md | shadow-md hover:shadow-lg | עומק |
| C2 | Hover state | hover:-translate-y-1 hover:shadow-lg transition | מיקרו-אינטראקציה |
| C3 | מספר שלב בולט | רקע accent, גופן גדול | ויזואל |
| C4 | רדיוס עקבי | rounded-2xl (lg) | radii |
| C5 | ריווח בין cards | gap-6 md:gap-8 | 24–32px |
| C6 | Grid מובייל | stack אנכי, שווה גובה | responsive |

---

### D) Deliverables , 5 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| D1 | Check icon ברור | צבע success, גודל 20px | ויזואל |
| D2 | microcopy אחרי | "את/ה יוצא/ת עם תוצר כתוב , לא רק שיחה." | הורדת התנגדות |
| D3 | רקע עדין (אופציונלי) | bg-success/5 או surface | הפרדה ויזואלית |
| D4 | ריווח בין פריטים | space-y-4 | 16px |
| D5 | CTA חוזר (אופציונלי) | כפתור קטן "לתיאום" אחרי הרשימה | הזדמנות שנייה |

---

### E) Why Me , 5 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| E1 | תמונה עם shadow | shadow-md, מסגרת עדינה | עומק |
| E2 | Proofs עם אייקונים | check/bulb , לא רק bullet | ויזואל |
| E3 | רקע section | bg-accent-soft / surface עם border-top | הפרדה |
| E4 | Typography | intro body, proofs medium | היררכיה |
| E5 | Trust line | "עובדת עם X עסקים…" (אם רלוונטי) | social proof |

---

### F) FAQ , 5 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| F1 | Intro לפני FAQ | "שאלות שנשאלו הרבה , מענה ישיר." | טקסט מנחה |
| F2 | פריט עם hover/focus | hover:bg-accent-soft, focus-visible:ring-2 | states |
| F3 | Chevron animation | transition-transform 200ms | מיקרו |
| F4 | Container | max-w-3xl, shadow-md | עקביות |
| F5 | ריווח בין פריטים | space-y-2 | 8px |

---

### G) CTA חוזר + Sticky Mobile , 6 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| G1 | Final CTA , כותרת | "מוכנים להתחיל?" / "תאמו עכשיו" | דחיפה עדינה |
| G2 | Button states | hover, focus-visible, active:scale-[0.98] | מלא |
| G3 | Sticky , padding | p-4, safe-area bottom | 16px |
| G4 | Sticky , button | min-h-52 (52px) או 56px | touch target |
| G5 | Sticky , focus | focus-visible:ring-2 ring-offset-2 | נגישות |
| G6 | CTA 3 פעמים | Hero, אחרי Deliverables או WhyMe, Final + Sticky | 3+ לחיצות |

---

### H) Footer , 2 משימות

| # | מה לשנות | איך צריך להיראות | מדד |
|---|----------|-------------------|-----|
| H1 | Footer מינימלי | טקסט קטן, לינק ל־CTA אם יש | לא להסיח |
| H2 | Spacer תחתון | min-h-24 מתחת Sticky | מניעת חסימה |

---

## חל"ק 4 , מפרט עיצוב לקוד (Design Tokens + קומפוננטות)

### Design Tokens (CSS vars / Tailwind config)

```css
/* Typography */
--font-heebo: 'Heebo', sans-serif;

/* Type scale (mobile → desktop) */
--text-h1: clamp(2rem, 5vw, 3.5rem);        /* 32px → 56px */
--text-h2: clamp(1.5rem, 3vw, 2.25rem);    /* 24px → 36px */
--text-h3: clamp(1.25rem, 2vw, 1.5rem);    /* 20px → 24px */
--text-body: 1rem;                          /* 16px */
--text-body-lg: 1.125rem;                   /* 18px */
--text-small: 0.875rem;                     /* 14px */
--text-xs: 0.75rem;                        /* 12px */

--leading-tight: 1.15;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;

/* Spacing , 8px grid */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */

/* Radii */
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;

/* Shadows */
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04);
--shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);

/* Colors , Landing */
--color-bg: #F5F6F8;
--color-surface: #FFFFFF;
--color-text: #1A1A1A;
--color-text-secondary: #4B5563;
--color-muted: #9CA3AF;
--color-border: #E5E7EB;
--color-primary: #0D9488;           /* Teal , CTA */
--color-primary-hover: #0F766E;
--color-primary-light: rgba(13, 148, 136, 0.08);
--color-success: #0d9488;
--color-risk: #be123c;
--color-accent-soft: rgba(13, 148, 136, 0.06);

/* Layout */
--max-content: 1120px;
--breakpoint-sm: 640px;
--breakpoint-md: 768px;
--breakpoint-lg: 1024px;
--breakpoint-xl: 1280px;
```

---

### קומפוננטות , מפרט

#### `<HeroSection />`

**Props:** `copy: LandingCopy`, `userName?: string | null`

**מבנה:**
- `section` , רקע גרדיאנט, `min-h-[55vh] md:min-h-[65vh]`, `flex flex-col justify-center`
- Container: `max-w-[var(--max-content)] mx-auto px-6 md:px-8`
- H1: `text-[length:var(--text-h1)] font-bold leading-tight text-white`
- Subheadline: `text-[length:var(--text-h2)] text-white/95`
- Bullets: `space-y-3`, max 3
- CTA: `<PrimaryCTA />`
- Microcopy: `text-sm text-white/90`

**States CTA:** hover (brightness/scale), focus-visible (ring-2), active (scale-98)

---

#### `<PatternSymptoms />` (מיקרו-אבחון , "אם 2 מתוך 3…")

**Props:** `headline: string`, `bullets: string[]`

**מבנה:**
- `p` headline: `text-lg font-medium text-white/95`
- `ul` `space-y-2`
- `li` , bullet + טקסט, `flex gap-3 items-start`

---

#### `<ValueProps />` / `<Deliverables />`

**Props:** `headline: string`, `items: string[]`, `variant?: 'check' | 'bullet'`

**מבנה:**
- `h2` , scale H2
- `ul` , `space-y-4`
- `li` , CheckIcon או bullet, `flex gap-3`
- אופציונלי: microcopy אחרי

---

#### `<Steps />`

**Props:** `headline: string`, `steps: string[]`

**מבנה:**
- Grid: `grid-cols-1 md:grid-cols-3 gap-6 md:gap-8`
- Card: `rounded-2xl shadow-md border border-border bg-surface p-6`
- Hover: `hover:shadow-lg hover:-translate-y-1 transition`
- מספר: `rounded-full bg-primary-light text-primary font-bold w-12 h-12`
- טקסט: body size

**States:** hover, focus (במקרה של קישור)

---

#### `<WhyMe />`

**Props:** `copy`, `photoSrc?: string`

**מבנה:**
- `section` , `bg-primary-light` או `bg-surface`
- Layout: `flex flex-col md:flex-row gap-8 md:gap-12`
- תמונה: `rounded-full object-cover w-40 h-40 md:w-48 md:h-48 shadow-md`
- Intro + proofs + close

---

#### `<FAQAccordion />`

**Props:** `items: FaqItem[]`, `defaultOpen?: number[]`

**מבנה:**
- Container: `rounded-2xl shadow-md border p-6 md:p-8`
- פריט: `border border-border rounded-xl overflow-hidden`
- `button`: `w-full flex justify-between p-4 text-right`
  - **Hover:** `hover:bg-primary-light`
  - **Focus:** `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
  - **aria-expanded, aria-controls**
- Content: `max-h-0` / `max-h-96` transition

---

#### `<PrimaryCTA />`

**Props:** `href: string`, `text: string`, `subtext?: string`, `microcopy?: string`, `size?: 'md' | 'lg'`

**מבנה:**
- `a` / `button`: `inline-flex items-center justify-center font-semibold rounded-xl`
- size md: `min-h-[48px] px-8 py-3 text-base`
- size lg: `min-h-[56px] px-10 py-4 text-lg`
- **States:**
  - default: `bg-primary text-white`
  - hover: `hover:bg-primary-hover` או `hover:brightness-110`
  - focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`
  - active: `active:scale-[0.98]`
  - disabled: `disabled:opacity-50 disabled:cursor-not-allowed`

---

#### `<StickyMobileCTA />`

**Props:** `copy: LandingCopy`

**מבנה:**
- `div`: `md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-sm border-t border-border shadow-[0_-4px 12px rgba(0,0,0,0.06)] p-4`
- `a`: `flex items-center justify-center min-h-[52px] w-full` , כפתור full-width
- States: כמו PrimaryCTA
- Spacer: `h-20` או `pb-safe` למכשירים עם notch

---

## חל"ק 5 , טקסטים קצרים חובה (Microcopy)

1. **מתחת ל־CTA (Hero):**  
   *"45–60 דק׳ | תוצר כתוב | בלי התחייבות להמשך"*

2. **ליד המחיר (אם מוצג בנפרד):**  
   *"350₪ , שיחה אחת, תוצר ברור. לא ייעוץ כללי."*

3. **לפני FAQ:**  
   *"שאלות שנשאלו הרבה , תשובות ישירות."*

4. **אחרי Deliverables:**  
   *"את/ה יוצא/ת עם מסמך , לא רק זיכרון מהשיחה."*

5. **מתחת ל־Final CTA:**  
   *"ביטול עד 24 שעות לפני , החזר מלא."*

6. **בתוך WhyMe (אם רלוונטי):**  
   *"עובדת עם תהליכים ומערכות ביום־יום , לא רק מצגות."*

7. **אם יש חשש מהתחייבות:**  
   *"נקודת כניסה , לא חוזה. אם נמשיך , נגדיר. אם לא , לא תהיה התחייבות."*

8. **Urgency (עדין):**  
   *"מספר שיחות מוגבל בשבוע , מומלץ להזמין מראש."*

---

## חל"ק 6 , מה ייראה שונה: לפני / אחרי

| # | לפני | אחרי |
|---|------|------|
| 1 | Hero גבוה, שטח ריק | Hero מדוד, תוכן צפוף יותר, H1 בולט |
| 2 | CTA מושתק (#3A5A6B) | CTA חם/בהיר (teal/amber), contrast גבוה |
| 3 | כותרות דומות בגודל | Type scale ברור: H1≫H2≫body |
| 4 | Cards שטוחים, shadow-sm | Cards עם shadow-md, hover מעלה |
| 5 | ריווח לא עקבי | 8px grid, 64px בין sections |
| 6 | רקעים מעורבבים | Sections full-width, תוכן max 1120px |
| 7 | כפתור בלי states | Hover, focus-visible, active scale |
| 8 | מיעוט microcopy | 6–8 שורות הורדת התנגדות ממוקמות אסטרטגית |

---

## סיכום , עקרונות ליישום

- **CTA 3 פעמים:** Hero, אחרי Deliverables או WhyMe, Final + Sticky (מובייל)
- **Primary button:** contrast גבוה, 48–56px גובה, states מלאים
- **טופס (אם יוסף):** label מעל שדה, לא placeholder בלבד
- **Button states:** hover / focus / active , חובה
- **Design system:** tokens בקובץ אחד, שימוש עקבי בכל הרכיבים

---

*מסמך זה נוצר כבסיס ליישום , ניתן לעדכן לפי פידבק ולבצע איטרציות.*
