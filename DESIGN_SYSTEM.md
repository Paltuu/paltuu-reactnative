# 🐾 Paltuu Design System & UI Rules

This document outlines the rules for the Paltuu React Native application. **Every PR must be checked against these rules.**

---

## ⚡ Tailwind CSS (NativeWind)
We use **Tailwind CSS** for styling via NativeWind. All design tokens are available as utility classes.

### Custom Classes
| Type | Example Classes |
| :--- | :--- |
| **Colors** | `bg-primary`, `text-primary`, `border-primary`, `bg-bg`, `bg-surface` |
| **Fonts** | `font-heading` (Montserrat Bold), `font-body` (DM Sans Regular) |
| **Radius** | `rounded-card` (16px), `rounded-button` (12px) |
| **Spacing** | `p-4`, `m-2` (Multiples of 4; use `px-5` for screen padding/20px) |

---

## 🎨 Global Colors (Tailwind Reference)
| Token | Tailwind Class | Hex | Usage |
| :--- | :--- | :--- | :--- |
| Primary | `primary` | `#A03048` | Main brand color. |
| Background | `bg` | `#F5F5F7` | Outermost screen background. |
| Surface | `surface` | `#FFFFFF` | Cards and foreground containers. |

---

## 🧱 Component Standards

### 1. Buttons
*   **Dimensions:** Always `h-[52px]` and `rounded-button`.
*   **States:** Every button **must** have:
    *   **Loading State:** Show the `PawLoader` SVG animation.
    *   **Disabled State:** Opacity 40% (`opacity-40`).

### 2. Spacing & Grid
*   **Screen Padding:** Use `px-5` (20px) on all screen wrappers.
*   **Grid:** All margins and paddings should be multiples of 4 (Tailwind units: `1` = 4px).
