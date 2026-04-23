# Paltuu Design System
### React Native + NativeWind — Social App

---

## 1. Tokens

### Colors
| Token | Class | Hex | Usage |
|---|---|---|---|
| Primary | `bg-primary / text-primary` | `#A03048` | CTAs, active states, paw icon, links |
| Primary light | `bg-primary/10` | `#A0304818` | Icon backgrounds, pill backgrounds |
| Primary mid | `bg-primary/20` | `#A0304833` | Pressed states |
| Background | `bg-bg` | `#F2F2F2` | Screen background (behind cards) |
| Surface | `bg-surface` | `#FFFFFF` | Cards, posts, bottom nav, header |
| Text primary | `text-dark` | `#111111` | All main text |
| Text secondary | `text-gray-500` | `#6B7280` | Subtitles, captions, timestamps |
| Text tertiary | `text-gray-400` | `#9CA3AF` | Placeholders, disabled text |
| Border | `border-gray-100` | `#F3F4F6` | Card borders, dividers |
| Danger | `text-red-500` / `bg-red-50` | `#EF4444` | Logout, delete, errors |
| Warning | `bg-amber-50 / text-amber-700` | — | Lost & found cards |

> **Rule:** Never use a raw hex in className. If a color isn't in the table above, add it as a token first.

---

### Typography
| Role | Class | Size | Weight | Usage |
|---|---|---|---|---|
| Screen title | `font-heading text-2xl` | 24px | Bold | Top of screen, profile name |
| Section heading | `font-heading text-xl` | 20px | Bold | Section headers inside screen |
| Card title | `font-headingSemi text-base` | 16px | SemiBold | Post username, card heading |
| Body | `font-body text-sm` | 14px | Regular | Post captions, descriptions |
| Caption | `font-body text-xs` | 12px | Regular | Timestamps, pet tags, metadata |
| Button label | `font-headingSemi text-base` | 16px | SemiBold | All button text |

> **Rule:** Never use `text-lg` (18px) — it sits awkwardly between body and heading. Skip straight from `text-base` (16) to `text-xl` (20).

---

### Spacing
| Token | Value | Usage |
|---|---|---|
| `px-5` | 20px | Screen horizontal padding — every screen wrapper |
| `gap-2` | 8px | Within components (icon → label) |
| `gap-3` | 12px | Between related elements (avatar → name block) |
| `gap-4` | 16px | Between cards in a list |
| `gap-6` | 24px | Between sections |
| `p-4` | 16px | Card internal padding |
| `mb-2` | 8px | Tight stacks |
| `mb-4` | 16px | Standard vertical gap |
| `mb-6` | 24px | Section separation |

> **Rule:** All spacing must be multiples of 4. Never write `mt-[14px]` or `pb-[18px]`.

---

### Border Radius
| Token | Class | Value | Usage |
|---|---|---|---|
| Card | `rounded-2xl` | 16px | Posts, cards, bottom sheets |
| Button | `rounded-xl` | 12px | All buttons |
| Input | `rounded-xl` | 12px | Text inputs, search bars |
| Pill | `rounded-full` | 9999px | Tags, badges, pet chips, avatars |
| Icon container | `rounded-xl` | 12px | Icon background squares |

---

## 2. Components

### Avatar
```
Size sm  — w-8 h-8   (32px)  — used in comment rows
Size md  — w-10 h-10 (40px)  — used in feed post headers
Size lg  — w-16 h-16 (64px)  — used on profile screen
Size xl  — w-24 h-24 (96px)  — used on profile screen hero
```
- Always `rounded-full`
- If no image: show initials, background is `bg-primary/10`, text is `text-primary font-headingSemi`
- Image avatars use `border border-gray-100`

---

### Post Card
Structure (top to bottom):
```
[Header]     Avatar | Name + Pet tag | Timestamp | More (•••)
[Media]      Full width, aspect-[4/3] for landscape, aspect-square for square
[Caption]    px-4 pt-3 pb-1 — font-body text-sm text-dark
[Actions]    px-4 pb-3 — Paw | Comment | Share | — | Bookmark
[Divider]    h-[0.5px] bg-gray-100 — only between posts, not inside
```

**Pet tag** (below username):
```
bg-primary/10 rounded-full px-2 py-0.5
🐾 icon (10px) + pet name (text-xs text-primary font-headingSemi)
```

**Action row spacing:** `gap-4` between action buttons. Bookmark pushed to right with `ml-auto`.

**Text-only posts:** No media block. Caption gets `pt-4 text-base` (slightly larger than image captions).

**Milestone pill** (inside post, above actions):
```
bg-primary/10 rounded-xl mx-4 mb-2 px-3 py-2
Star icon + text-xs text-primary font-headingSemi
```

---

### Lost & Found Card
```
border-l-4 border-amber-400 bg-surface
Header: "Lost pet nearby" pill (bg-amber-50 text-amber-700) + location + time
Body: 60x60 rounded-xl pet photo/illustration + name, breed, last seen location
```
Sits inline in the feed. No action row — just a "Contact owner →" link in text-primary.

---

### Buttons
| Variant | Classes |
|---|---|
| Primary | `bg-primary h-[52px] rounded-xl px-6` + white SemiBold label |
| Secondary | `border border-primary h-[52px] rounded-xl px-6` + primary-colored label |
| Ghost | No border, no background — text-primary label only |
| Danger | `bg-red-50 h-[52px] rounded-xl px-6` + `text-red-500` label |
| Icon button | `w-10 h-10 rounded-full` — no border, bg transparent |

States:
- **Loading:** Replace label with `PawLoader` animation, disable touch
- **Disabled:** `opacity-40`, no touch feedback

---

### Input / Search Bar
```
bg-surface rounded-xl px-4 h-[48px]
border border-gray-100
font-body text-sm text-dark
placeholder: text-gray-400
```
Search bar gets a search icon on the left (`text-gray-400`) and optionally a submit arrow button on the right (`bg-primary rounded-lg p-2`).

Focus state: `border-primary`

---

### Bottom Navigation
```
bg-surface border-t border-gray-100
h-[60px] + safe area bottom inset
5 tabs: Home | Explore | Create | Alerts | Profile
```
- Active tab icon: filled, `text-primary`
- Active tab label: `text-primary font-headingSemi text-[10px]`
- Active tab dot: 4px circle `bg-primary` below label
- Inactive: outline icon, `text-gray-400` label
- **Create button:** `w-[46px] h-[46px] rounded-full bg-primary` elevated `-mt-4` above nav bar, white `+` icon

---

### Top Header
```
bg-surface border-b border-gray-100
px-4 h-[52px]
Left: logo ("paltuu" in text-primary font-heading text-2xl)
Right: icon buttons (search, bell with dot, messages)
```
Bell notification dot: 7px `bg-primary rounded-full border-2 border-surface` positioned absolute top-right of icon.

---

### Pet Chip (Profile screen, post header)
```
bg-surface border border-gray-100 rounded-full
px-3 py-1.5
Pet emoji/avatar (22px) + pet name (text-xs font-headingSemi text-dark)
```
Active/selected chip: `border-primary bg-primary/10` with `text-primary` name.

---

### Section Header Row
```
flex-row justify-between items-center mb-4
Left: icon (22px text-primary) + title (font-heading text-xl text-dark) gap-2
Right: "View All" (text-primary font-headingSemi text-sm)
```

---

### Dividers
- Between feed posts: `h-2 bg-bg` (uses background color, like Instagram's gray gap)
- Inside a card: `h-[0.5px] bg-gray-100 mx-4`
- Never use a full-width colored bar as a section divider

---

## 3. Screen-Level Rules

### Every screen must have:
- `flex-1 bg-bg` on the root View
- `px-5` on scroll content wrapper
- `contentContainerStyle={{ paddingBottom: 100 }}` on ScrollView (clears tab bar)
- `scrollEventThrottle={16}` if header hide/show is wired up

### Screens with white background (no card separation needed):
Profile hero, onboarding, auth screens — use `bg-surface` as root.

### Screens with card-based content (feed, explore, lists):
Use `bg-bg` as root so white cards lift off the gray background.

---

## 4. Iconography

Use **Ionicons** for all UI icons. Fallback to **MaterialCommunityIcons** only when Ionicons doesn't have the specific icon (e.g. `paw-outline`, `dog`, `cat`).

| Element | Icon | Size |
|---|---|---|
| Home (active) | `home` filled | 24 |
| Home (inactive) | `home-outline` | 24 |
| Search | `search-outline` | 22 |
| Notifications | `notifications-outline` | 22 |
| Profile | `person-outline` | 22 |
| Comment | `chatbubble-outline` | 20 |
| Share | `arrow-redo-outline` | 20 |
| Bookmark | `bookmark-outline` | 20 |
| Paw / React | custom SVG paw | 22 |
| More options | `ellipsis-horizontal` | 20 |
| Back | `chevron-back` | 24 |
| Close | `close` | 22 |
| Add | `add` | 22 |

Icon color rules:
- Active/brand context: `#A03048`
- Neutral UI: `#111111`
- Muted/inactive: `#9CA3AF`
- On primary background: `#FFFFFF`

---

## 5. Paw Reaction Icon

The paw is Paltuu's core interaction icon. It replaces the heart/like.

```
Reacted state:    filled paw SVG, color #A03048
Unreacted state:  outline paw SVG, color #9CA3AF
Size:             22x22
```

On long press → show reaction picker sheet with 3 options:
- 🐾 Cute (filled paw, primary)
- ❤️ Love (heart, red)
- 😄 Funny (laugh, amber)

Reaction picker is a bottom sheet, not a tooltip/popover.

---

## 6. Feed Post Types — Visual Hierarchy

| Post type | Visual signal |
|---|---|
| Photo/video post | Full-width media block |
| Text-only post | No media, caption at `text-base` (slightly larger) |
| Milestone post | Normal post + crimson pill at bottom with star icon |
| Lost & found | Amber left border, warning badge, compact layout |
| Adoption journey | Normal post + "Adoption Journey" badge in header row |

All post types share the same header (avatar, name, pet tag, time) and action row (paw, comment, share, bookmark).

---

## 7. Do / Don't

| Do | Don't |
|---|---|
| Use `gap-3` between avatar and name | Use `marginLeft: 12` inline |
| Use `rounded-2xl` for all cards | Mix `rounded-3xl` and `rounded-2xl` randomly |
| Push bookmark to right with `ml-auto` | Use `flex-1` spacers everywhere |
| `text-gray-500` for timestamps | Use `text-gray-600` or `text-gray-400` for timestamps |
| `bg-primary/10` for icon backgrounds | Use hardcoded `#fdf0f2` |
| `h-[0.5px]` for dividers | Use `h-px` (renders as 1px, too heavy) |
| `font-headingSemi` for usernames | Use `font-bold` (not in type scale) |
| Screen wrapper `px-5` always | Add horizontal padding per-component |

---

## 8. Checklist Before Every PR

- [ ] No raw hex values in className (use tokens)
- [ ] No spacing values outside multiples of 4
- [ ] No `text-lg` usage
- [ ] Every button has loading + disabled state
- [ ] Screen root has `bg-bg` or `bg-surface` (never bare white `#fff`)
- [ ] ScrollView has `paddingBottom: 100`
- [ ] Avatar fallback (initials) implemented
- [ ] Active/inactive states on all nav/tab elements
- [ ] Paw icon used — never a heart — for reactions