# Harish Ops Colony (3D)

RTS-style **3D** ops board for Harish’s Grok Bot fleet — Three.js hex world, elegant robot figures per agent, neon desk rings, companion mini-bots, glassy overlays for routines & live activity.

## Live site

**https://hello-harishkumartn.github.io/harish-ops-colony/**

## Controls

- **Drag** orbit · **scroll / pinch** zoom · **hover / tap** a robot for tooltip
- **Themes:** Desert / Ocean / Forest / Sky / City
- **Mobile:** floating **Routines** / **Activity** chips show or hide side panels (hidden by default so the 3D view stays full-screen)

## Live updates

Polls `status.json` every 30s. Active/watching agents pulse neon rings; companion bots patrol their pad. Harish PA eye pulses continuously.

## Local

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# open http://127.0.0.1:8765/
```

## Files

- `index.html` — UI chrome + mobile panel toggles
- `colony.js` — Three.js scene, robots, themes, poll
- `status.json` — live fleet snapshot (refresh every 30s from ops)
