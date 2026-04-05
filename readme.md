# art-foss-bdd

A database of software tools for art and design. 
The usage-based classification decouples tools from hegemonic companies in specific fields, making it easier to discover alternatives.

[https://lan.ensad.fr/art-foss-bdd/](https://lan.ensad.fr/art-foss-bdd/)

***

## Structure

```
index.html            Table view (filterable list)
cartographie.html     Network cartography (D3.js)
pipeline.html         Pipeline / workflow builder
app.js                Table page logic
cartographie.js       Graph engine (4 modes)
pipeline.js           Pipeline engine + compatibility score
data-utils.js         Shared utilities
styles.css            Shared styles + light/dark theme
cartographie.css      Graph styles
pipeline.css          Pipeline styles
data/
  soft.json           Software database (108 entries)
  tags.json           Taxonomy (domaines + etapes)
  pipelines.json      Workflow templates (8 pipelines)
```

## Data model

Each software entry has:
- **Domaines** — the field/medium (2D, 3D, Audio, Video, etc.)
- **Etapes** — the production step (Modélisation, Animation, Compositing, etc.)
- **Formats** — `import`, `export` (interchange), `build` (final outputs), `natif`
- **Collaboration** — type + protocols (OSC, MIDI, NDI, Spout, etc.)

Tags are organized in `tags.json` with two axes: `domaines` (11 categories) and `etapes` (6 phases).

## Features

- **Table view** — filter by licence, platform, domaines, and etapes
- **Network cartography** — 4 visualization modes (affinity, bipartite, clusters, co-occurrence)
- **Pipeline builder** — select a workflow, pick tools at each stage, see compatibility scores between them
  - Compatibility = formats (50%) + platforms (30%) + protocols (20%)
- **Light/dark theme**
- **Search** with auto-zoom
- **PNG export**

## Contributing

The database lives in `data/soft.json`. Taxonomy in `data/tags.json`. Workflows in `data/pipelines.json`.

***

<a href="https://github.com/lan-ensad/art-foss-bdd">art-foss-bdd</a> © 2026 by <a href="https://github.com/lan-ensad">Olivier Bienz</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
