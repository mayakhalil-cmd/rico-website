# RICO Website: Setup Guide

## How the website works

- The site is fully static: HTML, CSS, JavaScript, images and fonts. There is no server and no database.
- It is hosted on **GitHub Pages** at https://mayakhalil-cmd.github.io/rico-website/
- Every push to `main` runs the GitHub Action in `.github/workflows/deploy.yml`, which builds the site and publishes it in about one minute.
- All visuals and audio analysis run in the visitor's browser. No audio or personal data leaves their computer.
- Videos stream from YouTube. Photos are stored in `public/media/`.

## Run it locally

```
git clone https://github.com/mayakhalil-cmd/rico-website.git
cd rico-website
npm install
npm run dev
```

Then open http://localhost:5173/

To check the production build, run `npm run build`. It should end with `✓ built`.

### Fonts

Titles use **Teletactile** (`public/fonts/Teletactile.ttf`). If the file is missing, titles fall back to VT323. Body text uses Courier Prime.

## Publishing changes

1. Edit the files.
2. Commit and push to `main`.
3. The site updates automatically after the GitHub Action finishes (see the **Actions** tab).

## Editing content

Most content is in **`src/data/site.ts`**:

| What | Where in `site.ts` |
|---|---|
| Text for features, steps, About and Phantom Performer | `features`, `steps`, `about`, `phantom` |
| Version and installer name | `release` |
| Video clips (YouTube ID with start and end time) | `media` |
| Photo file names (`2-1.jpg`, `6.jpg`) | `media.phantomPhoto`, `media.phantomSpheres` |
| Logo hover effect | `logoHover`: `decode`, `hex`, `binary`, `scan`, `rgb` |
| Default cursor | `cursorStyle`: `trail`, `pixel`, `osc`, `led`, `gcode`, `piano`, `wave` |
| Default hero background | `heroBackground`: `field`, `bands`, `prisms`, `warp`, `sdf` |
| After Effects plugin link | `links.aePlugin` (the button appears when this is filled in) |

Visitors can change the background, colours, cursor and sound settings from the menus in the hero. Their choices are saved in their own browser.

Signal Lab presets are in `src/lab/model.ts` under `PRESETS`.

## Project structure

| Path | Purpose |
|---|---|
| `src/components/Hero.tsx` | Logo, intro, and the visuals, cursor and sound menus |
| `src/components/HeroGL.tsx` | WebGL shaders: Prisms, Warp and SDF |
| `src/components/AsciiField.tsx`, `HeroCanvas.tsx` | Field and Bands backgrounds |
| `src/components/SignalMap.tsx`, `RoutingDiagram.tsx`, `LiveWire.tsx` | 01 routing map |
| `src/components/Features.tsx` | 02 features |
| `src/components/SignalLab.tsx`, `src/lab/*` | 03 Signal Lab and audio engine |
| `src/components/HowItWorks.tsx` | 04 how it works |
| `src/components/About.tsx` | 05 about and user test video |
| `src/components/Work.tsx`, `PhantomFlow.tsx` | 06 work and Phantom Performer |
| `src/components/Download.tsx` | 07 download and install steps |
| `src/components/Cursor.tsx` | Custom cursors |
| `src/favicon.ts` | Animated favicon |
| `src/App.css`, `src/index.css` | Styles and colours |
