# art-foss-bdd

A database of software tools for art and design. 
The sorting principle is based on usage. Sorting is done by the presence of certain tags that can be combined.

[https://lan.ensad.fr/art-foss-bdd/](https://lan.ensad.fr/art-foss-bdd/)

***

The usage-based classification decouples tools from hegemonic companies in specific fields, making it easier to discover alternatives.

## Structure

```
index.html            Table view (filterable list of software)
cartographie.html     Network cartography (D3.js graph visualization)
app.js                Table page logic
cartographie.js       Graph engine (affinity, bipartite, clusters, co-occurrence)
data-utils.js         Shared utilities (data loading, theme toggle, licence detection)
styles.css            Shared styles + light/dark theme variables
cartographie.css      Graph page styles
bdd_soft.json         Software database
```

## Features

- **Table view** - filter software by licence, platform, and usage tags
- **Network cartography** - 4 visualization modes:
  - *Affinity* - software linked by shared usages (adjustable threshold)
  - *Bipartite* - software-to-tag connections
  - *Clusters* - grouped by primary category
  - *Co-occurrence* - tag-to-tag relationships
- **Light/dark theme** - persisted via localStorage
- **Search** with auto-zoom to results
- **PNG export**

## Contributing

The database lives in `bdd_soft.json`. Feel free to contribute by adding software or correcting entries.

***

<a href="https://github.com/lan-ensad/art-foss-bdd">art-foss-bdd</a> © 2026 by <a href="https://github.com/lan-ensad">Olivier Bienz</a> is licensed under <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/sa.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
