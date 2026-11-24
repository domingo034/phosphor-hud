# phosphor-hud

A small gauge for Claude Code, drawn into the corner of the theme's backdrop in the manner of a vector display: green phosphor strokes with a glow, no fonts.

It shows how much is used of four things, each as a line the scene's amber beam is drawn along, out to where use has come:

- **CTX**: the context window
- **5H**: the five-hour rate-limit window
- **7D**: the seven-day rate-limit window
- **F7D**: the Fable model's own seven-day limit. Claude Code 2.1.331 gives a mod the five-hour and seven-day windows alone, so this row reads `--` until a later version reports it

A row's figure turns amber from 80% used, and reads `--` while there is no reading. It updates after each turn and when a rate-limit window moves a whole point; the line is drawn out again at each update, and a bright head runs it every few seconds.

## What it needs

The gauge is laid over the scene a theme draws, so it shows only where a backdrop is drawn (the desktop and mobile apps) and only while a theme with a scene is on, such as Vector Range from the `theme-examples` plugin. Its colors are made for that theme.

## Install

At the prompt of a terminal session:

```
/plugin install phosphor-hud --marketplace domingo034/phosphor-hud
```

Answer `y` to add the marketplace, then choose a scope (the user scope loads it in every session).

From a shell:

```
claude plugin install phosphor-hud --marketplace domingo034/phosphor-hud
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `domingo034/phosphor-hud`, then Add plugin.

## Use

- `/hud` prints the figures and where the gauge is.
- `/hud tr`, `/hud tl`, `/hud br`, `/hud bl` move it to a corner; `/hud off` hides it.
- `/hud tl 400` also sets how far the left corners sit from the window's left edge, in pixels (340 by default, clear of an open sidebar).

The corner and the distance are kept for the session.
