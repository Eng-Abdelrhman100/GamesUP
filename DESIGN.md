---
name: GamesUp Platform
description: A premium, immersive digital goods platform for high-engagement gamers.
colors:
  primary: "#ff1574"
  accent-blue: "#00d1ff"
  obsidian-deep: "#000000"
  neutral-bg: "#ffffff"
  text-primary: "#111827"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.05em"
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.6
rounded:
  bento: "64px"
  xl: "32px"
  md: "12px"
spacing:
  bento: "2.5rem"
  gap-sm: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "16px 48px"
  card-bento:
    backgroundColor: "{colors.obsidian-deep}"
    rounded: "{rounded.bento}"
    padding: "40px"
---

# Design System: GamesUp Platform

## 1. Overview

**Creative North Star: "The Immersive Arena"**

The GamesUp visual system is built for high-octane immersion. It rejects the flat, sterile patterns of corporate e-commerce in favor of cinematic depth, atmospheric textures, and bold structural hierarchy. The interface should feel like a high-budget game's HUD—powerful, tactical, and trusted.

**Key Characteristics:**
- **Atmospheric Depth**: Use of full-bleed game assets with dark gradient overlays to create an immersive "world" within each card.
- **Glassmorphism Logic**: Structural panels use `backdrop-blur-sm` and `bg-black/40` to maintain legibility without breaking the visual environment.
- **Extreme Radii**: Signature `64px` curves define the Bento containers, creating a unique, premium silhouette.

## 2. Colors

The palette is anchored in deep Obsidian blacks, providing a high-contrast stage for the "Glitch Magenta" accent.

### Primary
- **Glitch Magenta** (#ff1574): The primary brand signal. Used for status, CTAs, and active progress. It is a "loud" color that earns its impact through sparse use.

### Secondary
- **Accent Blue** (#00d1ff): A secondary tactical color used for "Plus" or high-tier categories to provide visual variety without diluting the primary magenta.

### Neutral
- **Obsidian Deep** (#000000): The core background color for the dark theme.
- **Stark White** (#ffffff): Primary text color in dark mode, ensuring surgical readability.

### Named Rules
**The Rarity Rule.** Glitch Magenta should occupy ≤10% of any given surface. Its rarity is what signals its importance and premium feel.

## 3. Typography

**Display Font:** Inter (Extra Bold / Black)
**Body Font:** Inter (Regular / Medium)

### Hierarchy
- **Display** (900, 48px-72px, 1): Used for main hero titles and card headings. Characterized by tight tracking and high-impact "Glitch" animations.
- **Headline** (800, 24px-32px, 1.2): Used for section headers and sub-brand titles.
- **Body** (500, 16px, 1.6): Standard reading text. Max line length 70ch.
- **Label** (900, 10px, 0.2em, Uppercase): Tactical metadata. Used for "EXPLORE" tags and small category markers.

## 4. Elevation

GamesUp avoids traditional drop-shadows for structural elements. Depth is conveyed through **Atmospheric Layering**.

### Layering Strategy
- **Base**: Full-bleed background image with a `from-black/90` gradient.
- **Surface**: Glassmorphism text containers with `backdrop-blur-sm` and `border-white/10`.
- **Floating**: High-resolution PNG assets positioned at the bottom-right with a `drop-shadow-2xl` to "pop" out of the bento grid.

## 5. Components

### Bento Cards
- **Shape:** Extreme rounded corners (64px)
- **Background:** Always black or high-density dark gradients.
- **Transition:** Slow `2.5s` image scales on hover to maintain a "cinematic" feel.

### Tactical Buttons
- **Primary:** Magenta background with white text.
- **Hover:** Slight scale and brightness increase. No heavy shadows.

### Floating Assets
- Positioned strictly at the bottom-right of Bento containers.
- Use `motion` for subtle entry animations and hover-driven "pops".

## 6. Do's and Don'ts

### Do:
- **Do** use full-bleed atmospheric images behind dark overlays.
- **Do** keep text panels centered or bottom-aligned within bento units.
- **Do** use `tracking-tighter` on all Black/ExtraBold headings.

### Don't:
- **Don't** use generic white cards or flat gray backgrounds.
- **Don't** use thin, lightweight fonts for headings; they look "cheap" in this context.
- **Don't** allow PNG assets to overlap the main heading text; keep them bottom-right.
