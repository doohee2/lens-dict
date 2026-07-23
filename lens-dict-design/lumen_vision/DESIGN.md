---
name: Lumen Vision
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#baccb0'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#85967c'
  outline-variant: '#3c4b35'
  surface-tint: '#2ae500'
  primary: '#efffe3'
  on-primary: '#053900'
  primary-container: '#39ff14'
  on-primary-container: '#107100'
  inverse-primary: '#106e00'
  secondary: '#ffe2ab'
  on-secondary: '#402d00'
  secondary-container: '#ffbf00'
  on-secondary-container: '#6d5000'
  tertiary: '#f1fcff'
  on-tertiary: '#00363f'
  tertiary-container: '#91ebff'
  on-tertiary-container: '#006b7b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#79ff5b'
  primary-fixed-dim: '#2ae500'
  on-primary-fixed: '#022100'
  on-primary-fixed-variant: '#095300'
  secondary-fixed: '#ffdfa0'
  secondary-fixed-dim: '#fbbc00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#a5eeff'
  tertiary-fixed-dim: '#00daf8'
  on-tertiary-fixed: '#001f25'
  on-tertiary-fixed-variant: '#004e5a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-xl:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-min: 48px
  gutter: 16px
  margin-edge: 24px
  container-gap: 12px
  stack-sm: 8px
  stack-md: 20px
---

## Brand & Style

The design system is centered on high-utility accessibility, designed for users who require immediate visual clarity and tactile feedback. The brand personality is "Technological Clarity"—positioning the app as a powerful optical tool rather than a standard utility. 

The aesthetic combines **Minimalism** with **Tactile/Skeuomorphic** accents. While the interface is clean and structured, interactive elements use subtle physical metaphors—like "squishy" button states and raised surfaces—to ensure users feel a sense of direct manipulation. High-visibility overlays and high-contrast color pairings ensure the UI remains legible even in challenging lighting conditions or for users with visual impairments. The emotional response is one of confidence, precision, and empowerment.

## Colors

The design system defaults to **Dark Mode** to minimize glare and allow the camera viewport to remain the focal point. 

- **Primary (Neon Green):** Reserved for "Active Scanner" states, capture actions, and success feedback. Its high luminance ensures it "pops" against dark backgrounds.
- **Secondary (Amber):** Used for highlighting identified text, warning states, or secondary toggles that require attention without being as aggressive as the primary color.
- **Tertiary (Electric Blue):** Used for dictionary definitions and information-dense labels to separate content from navigation.
- **Neutral (Charcoal/Black):** The canvas is built on `#121212` with varying opacities to create depth without sacrificing the true-black aesthetics required for high-contrast accessibility.

In **Light Mode**, the backgrounds shift to a crisp white, but the Primary and Secondary colors maintain their high saturation to ensure the "scanner" metaphor remains intact.

## Typography

This design system prioritizes legibility above all else. **Inter** is utilized for its exceptional x-height and clear character differentiation, which is critical for an OCR-focused application. 

The type scale is intentionally oversized. Standard body text starts at 16px, with 20px used for primary content blocks (dictionary definitions). Headlines are bold and tight to create a clear hierarchy against the camera background. For mobile, display sizes are capped at 36px to prevent awkward text wrapping while maintaining impact. All labels use increased font weight (600+) to ensure they remain readable when overlaid on translucent backgrounds.

## Layout & Spacing

The layout follows a **Fluid Grid** model with high-margin "safe zones" to prevent interference with physical hardware (like notches or home indicators). 

- **Touch Targets:** Every interactive element must adhere to a minimum of 48px height/width.
- **Safe Areas:** A 24px outer margin is enforced on all screens to ensure thumbs do not obscure content while holding the device as a magnifier.
- **Camera Viewport:** Centered, expansive, and always the bottom layer. UI elements float on top using a 12-column fluid grid.
- **Adaptive Reflow:** On tablets, the dictionary panel slides in from the right as a persistent sidebar (33% width), while on mobile, it expands from the bottom as a draggable sheet.

## Elevation & Depth

Visual hierarchy is established using **Glassmorphism** and **Tonal Layers**. 

1. **The Base Layer:** The live camera feed.
2. **The Scrim Layer:** A 40% black overlay applied to the camera feed when menus are active to ensure text contrast.
3. **The Glass Layer:** Floating panels and cards use a backdrop blur (20px) with a semi-transparent background (RGBA 255, 255, 255, 0.1 for dark mode).
4. **The Action Layer:** High-priority buttons use a subtle "inner-glow" rather than a drop shadow, making them appear as if they are illuminated from within (referencing a light-box or scanner bed).

Shadows are avoided in favor of 1px high-contrast borders (Primary or Neutral-Light) to define edges clearly for visually impaired users.

## Shapes

The design system uses **Rounded (0.5rem)** corners as the standard for all functional containers. This creates a friendly, approachable tool-like feel.

- **Standard Buttons & Inputs:** 0.5rem (8px).
- **Cards & Sheets:** 1rem (16px) for the top-facing corners to create a "nested" look.
- **Action Triggers:** Floating Action Buttons (FABs) and toggle switches use a **Pill-shape** (full radius) to distinguish them from informational panels.

## Components

- **Floating Action Buttons (FAB):** The primary capture button is a large, pill-shaped element centered at the bottom. It features a Neon Green background with a 2px inset border to give it a physical, pressable appearance. 
- **OCR Highlight Chips:** When text is detected, it is wrapped in an Amber semi-transparent box with a 1px solid Amber border. These act as triggers for the dictionary lookup.
- **Dictionary Sheets:** Use a "Grabber" handle at the top. Backgrounds must use 80% opacity with a heavy backdrop-blur to maintain the context of what is being magnified behind the sheet.
- **Controls & Toggles:** Use Lucide icons (24px size). Toggles for "Flashlight" or "Zoom" should have a distinct active state where the icon and its container glow with the Primary color.
- **Input Fields:** Large text inputs for manual dictionary search with 16px internal padding and a high-contrast focus ring (Neon Green).
- **Lists:** Dictionary results are presented in cards with 20px vertical spacing. Each list item has a distinct separator or border to prevent "text bleeding" for users with low vision.