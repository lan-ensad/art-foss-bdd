// ============================================================
// Network cartography - D3.js engine
// ============================================================

var database = { tags: {}, logiciels: [] };
var simulation = null;
var svg, gContainer, gLinks, gNodes, gLabels;
var currentNodes = [];
var currentLinks = [];
var currentMode = 'affinity';
var cartoFilters = { licence: 'tout', platforms: [] };
var zoomBehavior;

var COLORS = {
    'Image 2D':            '#e05252',
    'Audio':               '#d4c94e',
    'Vidéo':               '#6bbf59',
    '3D':                  '#45b8a0',
    'Jeux':                '#4a9edb',
    'Interactif':          '#7b6ed6',
    'Programmation':       '#b05cc0',
    'Texte & Publication': '#db5a8c',
    'Design UI/UX':        '#49c3c3',
    'Organisation':        '#c2925a',
    'IA':                  '#8a9bae',
    'Autre':               '#777777'
};

var FORCE_PARAMS = {
    affinity:     { charge: -250, linkDistance: 100, linkStrength: 0.2,  collisionPad: 3  },
    bipartite:    { charge: -150, linkDistance: 60,  linkStrength: 0.2,  collisionPad: 3  },
    clusters:     { charge: -250, linkDistance: 100, linkStrength: 0.05, collisionPad: 10 },
    cooccurrence: { charge: -300, linkDistance: 120, linkStrength: 0.15, collisionPad: 3  }
};

// ============================================================
// Helpers
// ============================================================

function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function linkId(endpoint) {
    return typeof endpoint === 'object' ? endpoint.id : endpoint;
}

function buildTagToCategory(tags) {
    var map = {};
    var sections = ['domaines', 'etapes'];
    sections.forEach(function(section) {
        for (var cat in (tags[section] || {})) {
            tags[section][cat].forEach(function(t) { map[t] = cat; });
        }
    });
    return map;
}

function makeSoftwareNode(log, tags) {
    var allTags = getAllTags(log);
    return {
        id: 'soft_' + log.Nom,
        label: log.Nom,
        type: 'software',
        licence: isFreeLicence(log["Prix licence"]) ? 'libre' : 'privateur',
        platforms: log.Plateforme || [],
        category: determinePrimaryCategory(log, tags),
        usageCount: allTags.length,
        domaines: log.Domaines || [],
        etapes: log.Etapes || [],
        allTags: allTags,
        url: log.url || '',
        description: log.Description || ''
    };
}

function buildSharedTagLinks(softwareList, minShared) {
    var links = [];
    for (var i = 0; i < softwareList.length; i++) {
        for (var j = i + 1; j < softwareList.length; j++) {
            var setA = new Set(getAllTags(softwareList[i]));
            var setB = new Set(getAllTags(softwareList[j]));
            var shared = [];
            setA.forEach(function(u) { if (setB.has(u)) shared.push(u); });
            if (shared.length >= minShared) {
                links.push({
                    source: 'soft_' + softwareList[i].Nom,
                    target: 'soft_' + softwareList[j].Nom,
                    weight: shared.length,
                    sharedTags: shared
                });
            }
        }
    }
    return links;
}

function licenceStroke(d) {
    return d.licence === 'libre' ? '#27ae60' : cssVar('--graph-stroke-privateur');
}

// ============================================================
// Graph mode builders
// ============================================================

var graphBuilders = {
    affinity: function(data, threshold) {
        var nodes = data.logiciels.map(function(log) { return makeSoftwareNode(log, data.tags); });
        return { nodes: nodes, links: buildSharedTagLinks(data.logiciels, threshold) };
    },

    bipartite: function(data) {
        var nodes = [];
        var links = [];
        var tagSet = new Set();
        var tagToCategory = buildTagToCategory(data.tags);

        data.logiciels.forEach(function(log) {
            nodes.push(makeSoftwareNode(log, data.tags));
            getAllTags(log).forEach(function(tag) {
                tagSet.add(tag);
                links.push({ source: 'soft_' + log.Nom, target: 'tag_' + tag, weight: 1 });
            });
        });

        tagSet.forEach(function(tag) {
            nodes.push({ id: 'tag_' + tag, label: tag, type: 'tag', category: tagToCategory[tag] || 'Autre' });
        });

        return { nodes: nodes, links: links };
    },

    clusters: function(data) {
        var nodes = data.logiciels.map(function(log) { return makeSoftwareNode(log, data.tags); });
        return { nodes: nodes, links: buildSharedTagLinks(data.logiciels, 2) };
    },

    cooccurrence: function(data) {
        var nodes = [];
        var links = [];
        var tagToCategory = buildTagToCategory(data.tags);
        var allTags = new Set();
        var tagFreq = {};

        data.logiciels.forEach(function(log) {
            getAllTags(log).forEach(function(u) {
                allTags.add(u);
                tagFreq[u] = (tagFreq[u] || 0) + 1;
            });
        });

        allTags.forEach(function(tag) {
            nodes.push({
                id: 'tag_' + tag, label: tag, type: 'tag',
                category: tagToCategory[tag] || 'Autre', freq: tagFreq[tag] || 0
            });
        });

        var tagsArr = Array.from(allTags);
        for (var i = 0; i < tagsArr.length; i++) {
            for (var j = i + 1; j < tagsArr.length; j++) {
                var coCount = 0;
                data.logiciels.forEach(function(log) {
                    var u = getAllTags(log);
                    if (u.includes(tagsArr[i]) && u.includes(tagsArr[j])) coCount++;
                });
                if (coCount > 0) {
                    links.push({ source: 'tag_' + tagsArr[i], target: 'tag_' + tagsArr[j], weight: coCount });
                }
            }
        }
        return { nodes: nodes, links: links };
    }
};

// ============================================================
// Loading
// ============================================================

loadData()
    .then(function(data) {
        database = data;
        initSvg();
        initUI();
        initGraph('affinity');
        document.addEventListener('theme-changed', function() { initGraph(currentMode); });
    })
    .catch(function(err) { console.error('Loading error:', err); });

// ============================================================
// SVG + Zoom
// ============================================================

function initSvg() {
    svg = d3.select('#graphSvg');
    var rect = svg.node().parentElement.getBoundingClientRect();
    svg.attr('width', rect.width).attr('height', rect.height);

    gContainer = svg.append('g');
    gLinks = gContainer.append('g').attr('class', 'links');
    gNodes = gContainer.append('g').attr('class', 'nodes');
    gLabels = gContainer.append('g').attr('class', 'labels');

    zoomBehavior = d3.zoom()
        .scaleExtent([0.1, 8])
        .on('zoom', function(event) { gContainer.attr('transform', event.transform); });

    svg.call(zoomBehavior);

    svg.on('click', function(event) {
        if (event.target === svg.node()) {
            resetHighlight();
            document.getElementById('infoPanel').classList.add('hidden');
        }
    });

    window.addEventListener('resize', function() {
        var r = svg.node().parentElement.getBoundingClientRect();
        svg.attr('width', r.width).attr('height', r.height);
        if (simulation) {
            simulation.force('center', d3.forceCenter(r.width / 2, r.height / 2));
            simulation.alpha(0.3).restart();
        }
    });
}

// ============================================================
// Graph pipeline: build -> filter -> render
// ============================================================

function initGraph(mode) {
    currentMode = mode;
    var threshold = parseInt(document.getElementById('seuilRange').value);
    var graphData = graphBuilders[mode](database, threshold);
    var filtered = filterGraphData(graphData, mode);

    currentNodes = filtered.nodes;
    currentLinks = filtered.links;

    renderGraph();
    updateLegend(mode);
    updateThresholdVisibility(mode);
}

function filterGraphData(graphData, mode) {
    var visibleIds = new Set();

    graphData.nodes.forEach(function(n) {
        var visible = true;
        if (n.type === 'software') {
            if (cartoFilters.licence !== 'tout' && n.licence !== cartoFilters.licence) visible = false;
            if (cartoFilters.platforms.length > 0) {
                var match = cartoFilters.platforms.some(function(p) { return (n.platforms || []).includes(p); });
                if (!match) visible = false;
            }
        }
        if (visible) visibleIds.add(n.id);
    });

    var filteredLinks = graphData.links.filter(function(l) {
        return visibleIds.has(linkId(l.source)) && visibleIds.has(linkId(l.target));
    });

    // Bipartite: drop orphan tags
    if (mode === 'bipartite') {
        var connectedTags = new Set();
        filteredLinks.forEach(function(l) {
            var src = linkId(l.source), tgt = linkId(l.target);
            if (src.startsWith('tag_')) connectedTags.add(src);
            if (tgt.startsWith('tag_')) connectedTags.add(tgt);
        });
        graphData.nodes.forEach(function(n) {
            if (n.type === 'tag' && !connectedTags.has(n.id)) visibleIds.delete(n.id);
        });
    }

    return {
        nodes: graphData.nodes.filter(function(n) { return visibleIds.has(n.id); }),
        links: filteredLinks
    };
}

// ============================================================
// D3 rendering
// ============================================================

function nodeRadius(d) {
    if (d.type === 'tag') return 4 + (d.freq || 1) * 1.2;
    return 5 + (d.usageCount || 1) * 2.5;
}

function nodeColor(d) {
    return COLORS[d.category] || '#999';
}

function renderGraph() {
    var rect = svg.node().parentElement.getBoundingClientRect();
    var w = rect.width, h = rect.height;

    if (simulation) simulation.stop();
    svg.call(zoomBehavior.transform, d3.zoomIdentity);

    var linkSel = renderLinks();
    var tagSel  = renderTagNodes();
    var nodeSel = renderSoftwareNodes();
    var labelSel = renderLabels();

    var allNodeSel = gNodes.selectAll('circle, rect');
    setupDrag(allNodeSel);
    setupTooltips(allNodeSel, linkSel);

    startSimulation(w, h, linkSel, nodeSel, tagSel, labelSel);
}

function renderLinks() {
    var maxWeight = 1;
    currentLinks.forEach(function(l) { if (l.weight > maxWeight) maxWeight = l.weight; });

    gLinks.selectAll('line').remove();
    return gLinks.selectAll('line')
        .data(currentLinks)
        .enter().append('line')
        .attr('stroke', function() { return cssVar('--graph-link'); })
        .attr('stroke-opacity', 0.25)
        .attr('stroke-width', function(d) { return Math.max(0.3, (d.weight / maxWeight) * 4); });
}

function renderTagNodes() {
    gNodes.selectAll('rect').remove();
    var tagNodes = currentNodes.filter(function(n) { return n.type === 'tag'; });
    return gNodes.selectAll('rect.tag-node')
        .data(tagNodes, function(d) { return d.id; })
        .enter().append('rect')
        .attr('class', 'tag-node')
        .attr('width',  function(d) { return nodeRadius(d) * 1.4; })
        .attr('height', function(d) { return nodeRadius(d) * 1.4; })
        .attr('x', function(d) { return -nodeRadius(d) * 0.7; })
        .attr('y', function(d) { return -nodeRadius(d) * 0.7; })
        .attr('fill', nodeColor)
        .attr('stroke', function() { return cssVar('--graph-stroke-privateur'); })
        .attr('stroke-width', 0.5)
        .attr('rx', 1)
        .style('cursor', 'pointer');
}

function renderSoftwareNodes() {
    gNodes.selectAll('circle').remove();
    var softNodes = currentNodes.filter(function(n) { return n.type === 'software'; });
    return gNodes.selectAll('circle.soft-node')
        .data(softNodes, function(d) { return d.id; })
        .enter().append('circle')
        .attr('class', 'soft-node')
        .attr('r', nodeRadius)
        .attr('fill', nodeColor)
        .attr('stroke', licenceStroke)
        .attr('stroke-width', function(d) { return d.licence === 'libre' ? 2.5 : 0.8; })
        .attr('stroke-dasharray', function(d) { return d.licence === 'libre' ? 'none' : '3,2'; })
        .style('cursor', 'pointer');
}

function renderLabels() {
    gLabels.selectAll('text').remove();
    return gLabels.selectAll('text')
        .data(currentNodes, function(d) { return d.id; })
        .enter().append('text')
        .text(function(d) { return d.label; })
        .attr('font-size', function(d) { return d.type === 'tag' ? '8px' : '9px'; })
        .attr('fill', function() { return cssVar('--text-label-graph'); })
        .attr('text-anchor', 'middle')
        .attr('dy', function(d) { return nodeRadius(d) + 12; })
        .attr('pointer-events', 'none');
}

function setupDrag(selection) {
    selection.call(d3.drag()
        .on('start', function(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
        })
        .on('drag', function(event, d) { d.fx = event.x; d.fy = event.y; })
        .on('end', function(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
        })
    );
}

function setupTooltips(nodeSelection, linkSelection) {
    var tooltip = document.getElementById('tooltip');

    function positionTooltip(event) {
        tooltip.style.left = (event.offsetX + 15) + 'px';
        tooltip.style.top  = (event.offsetY + 15) + 'px';
    }

    nodeSelection
        .on('mouseover', function(event, d) {
            tooltip.innerHTML = d.type === 'software' ? softwareTooltipHtml(d) : tagTooltipHtml(d);
            tooltip.classList.remove('hidden');
            positionTooltip(event);
        })
        .on('mousemove', function(event) { positionTooltip(event); })
        .on('mouseout',  function() { tooltip.classList.add('hidden'); })
        .on('click', function(event, d) {
            event.stopPropagation();
            highlightNeighborhood(d);
            showInfoPanel(d);
        });

    linkSelection
        .on('mouseover', function(event, d) {
            var html = '';
            if (d.sharedTags) html = '<div class="tooltip-edge">Shared tags: ' + d.sharedTags.join(', ') + '</div>';
            else if (d.weight) html = '<div class="tooltip-edge">Weight: ' + d.weight + '</div>';
            if (html) {
                tooltip.innerHTML = html;
                tooltip.classList.remove('hidden');
                positionTooltip(event);
            }
        })
        .on('mouseout', function() { tooltip.classList.add('hidden'); });
}

function softwareTooltipHtml(d) {
    var html = '<div class="tooltip-nom">' + d.label + '</div>';
    html += '<div class="tooltip-licence">' + (d.licence === 'libre' ? 'Free' : 'Proprietary') + '</div>';
    html += '<div class="tooltip-tags">' + (d.domaines || []).join(', ') + '</div>';
    html += '<div class="tooltip-tags" style="font-style:italic">' + (d.etapes || []).join(', ') + '</div>';
    if (d.description) {
        var desc = d.description.length > 150 ? d.description.substring(0, 150) + '...' : d.description;
        html += '<div class="tooltip-description">' + desc + '</div>';
    }
    return html;
}

function tagTooltipHtml(d) {
    var html = '<div class="tooltip-nom">' + d.label + '</div>';
    html += '<div class="tooltip-licence">' + (d.category || '') + '</div>';
    if (d.freq) html += '<div class="tooltip-tags">' + d.freq + ' software</div>';
    return html;
}

// ============================================================
// Force simulation
// ============================================================

function startSimulation(w, h, linkSel, nodeSel, tagSel, labelSel) {
    var params = FORCE_PARAMS[currentMode] || FORCE_PARAMS.bipartite;

    simulation = d3.forceSimulation(currentNodes)
        .force('link', d3.forceLink(currentLinks).id(function(d) { return d.id; })
            .distance(params.linkDistance)
            .strength(params.linkStrength))
        .force('charge', d3.forceManyBody().strength(params.charge))
        .force('center', d3.forceCenter(w / 2, h / 2))
        .force('collision', d3.forceCollide().radius(function(d) { return nodeRadius(d) + params.collisionPad; }))
        .on('tick', function() {
            linkSel
                .attr('x1', function(d) { return d.source.x; })
                .attr('y1', function(d) { return d.source.y; })
                .attr('x2', function(d) { return d.target.x; })
                .attr('y2', function(d) { return d.target.y; });
            nodeSel.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });
            tagSel.attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ') rotate(45)'; });
            labelSel.attr('x', function(d) { return d.x; }).attr('y', function(d) { return d.y; });
        });

    if (currentMode === 'clusters') applyClusterForces(w, h);
}

function applyClusterForces(w, h) {
    var categories = Object.keys(COLORS);
    var catAngle = {};
    categories.forEach(function(c, i) { catAngle[c] = (2 * Math.PI * i) / categories.length; });
    var radius = Math.min(w, h) * 0.35;

    simulation.force('radial', d3.forceRadial(radius, w / 2, h / 2).strength(0.3));
    simulation.force('x', d3.forceX(function(d) {
        return w / 2 + Math.cos(catAngle[d.category] || 0) * radius;
    }).strength(0.15));
    simulation.force('y', d3.forceY(function(d) {
        return h / 2 + Math.sin(catAngle[d.category] || 0) * radius;
    }).strength(0.15));
}

// ============================================================
// Highlight / Reset
// ============================================================

function highlightNeighborhood(d) {
    var neighborIds = new Set([d.id]);
    currentLinks.forEach(function(l) {
        var src = linkId(l.source), tgt = linkId(l.target);
        if (src === d.id) neighborIds.add(tgt);
        if (tgt === d.id) neighborIds.add(src);
    });

    gNodes.selectAll('circle, rect')
        .attr('opacity', function(n) { return neighborIds.has(n.id) ? 1 : 0.08; });
    gLabels.selectAll('text')
        .attr('opacity', function(n) { return neighborIds.has(n.id) ? 1 : 0.08; });
    gLinks.selectAll('line')
        .attr('stroke-opacity', function(l) {
            return (linkId(l.source) === d.id || linkId(l.target) === d.id) ? 0.7 : 0.02;
        })
        .attr('stroke', function(l) {
            return (linkId(l.source) === d.id || linkId(l.target) === d.id)
                ? cssVar('--graph-link-highlight') : cssVar('--graph-link');
        });
}

function resetHighlight() {
    gNodes.selectAll('circle, rect').attr('opacity', 1);
    gLabels.selectAll('text').attr('opacity', 1);
    gLinks.selectAll('line').attr('stroke-opacity', 0.25).attr('stroke', cssVar('--graph-link'));
    gNodes.selectAll('.search-highlight').classed('search-highlight', false);
}

// ============================================================
// Info panel
// ============================================================

function showInfoPanel(d) {
    var panel = document.getElementById('infoPanel');

    if (d.type === 'tag') {
        var tagName = d.label;
        var software = database.logiciels.filter(function(log) {
            return getAllTags(log).includes(tagName);
        });
        var html = '<h4>' + tagName + '</h4>';
        html += '<div style="font-size:11px;margin-bottom:6px">' + software.length + ' software</div>';
        html += '<div class="info-tags">';
        software.forEach(function(log) {
            var free = isFreeLicence(log["Prix licence"]);
            html += '<span class="info-tag" style="border-left:3px solid ' +
                (free ? '#27ae60' : '#999') + '">' + log.Nom + '</span>';
        });
        html += '</div>';
        panel.innerHTML = html;
        panel.classList.remove('hidden');
        return;
    }

    if (d.type !== 'software') { panel.classList.add('hidden'); return; }

    var html = '<h4>' + d.label + '</h4>';
    if (d.url) html += '<a href="' + d.url + '" target="_blank">Website</a><br>';
    html += '<div style="margin-top:4px;font-size:11px">' +
        (d.licence === 'libre' ? 'Free' : 'Proprietary') + '</div>';
    if (d.allTags && d.allTags.length > 0) {
        html += '<div class="info-tags">';
        d.allTags.forEach(function(t) { html += '<span class="info-tag">' + t + '</span>'; });
        html += '</div>';
    }
    if (d.description) {
        html += '<div style="margin-top:6px;font-size:11px">' + d.description + '</div>';
    }
    panel.innerHTML = html;
    panel.classList.remove('hidden');
}

// ============================================================
// UI: sidebar, filters, modes
// ============================================================

function initUI() {
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(function(btn) {
        btn.onclick = function() {
            document.querySelectorAll('.mode-btn').forEach(function(b) { b.classList.remove('actif'); });
            btn.classList.add('actif');
            initGraph(btn.dataset.mode);
        };
    });

    // Threshold slider
    var thresholdRange = document.getElementById('seuilRange');
    var thresholdValue = document.getElementById('seuilValeur');
    var debounceTimer = null;
    thresholdRange.oninput = function() {
        thresholdValue.textContent = thresholdRange.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
            if (currentMode === 'affinity') initGraph('affinity');
        }, 300);
    };

    // Licence filter
    document.querySelectorAll('.filtre-licence .filtre-btn').forEach(function(btn) {
        btn.onclick = function() {
            document.querySelectorAll('.filtre-licence .filtre-btn').forEach(function(b) { b.classList.remove('actif'); });
            btn.classList.add('actif');
            cartoFilters.licence = btn.dataset.licence;
            initGraph(currentMode);
        };
    });

    // Platform filter
    var platContainer = document.getElementById('filtrePlateformes');
    var uniquePlatforms = new Set();
    database.logiciels.forEach(function(log) {
        (log.Plateforme || []).forEach(function(p) { uniquePlatforms.add(p); });
    });
    var ordered = ['Windows', 'MacOS', 'Linux', 'Web'];
    var others = Array.from(uniquePlatforms).filter(function(p) { return !ordered.includes(p); }).sort();
    var all = ordered.filter(function(p) { return uniquePlatforms.has(p); }).concat(others);

    all.forEach(function(plat) {
        var btn = document.createElement('button');
        btn.textContent = plat;
        btn.className = 'filtre-btn';
        btn.onclick = function() {
            btn.classList.toggle('actif');
            if (btn.classList.contains('actif')) {
                cartoFilters.platforms.push(plat);
            } else {
                cartoFilters.platforms = cartoFilters.platforms.filter(function(p) { return p !== plat; });
            }
            initGraph(currentMode);
        };
        platContainer.appendChild(btn);
    });

    // Search
    var searchInput = document.getElementById('recherche');
    searchInput.oninput = function() {
        var query = searchInput.value.toLowerCase().trim();
        resetHighlight();
        if (query.length < 2) return;

        var matchIds = new Set();
        currentNodes.forEach(function(n) {
            if (n.label.toLowerCase().includes(query)) matchIds.add(n.id);
        });

        if (matchIds.size > 0) {
            gNodes.selectAll('circle, rect')
                .attr('opacity', function(n) { return matchIds.has(n.id) ? 1 : 0.08; })
                .attr('stroke', function(n) { return matchIds.has(n.id) ? '#f1c40f' : licenceStroke(n); })
                .attr('stroke-width', function(n) { return matchIds.has(n.id) ? 3 : (n.licence === 'libre' ? 2.5 : 0.8); });
            gLabels.selectAll('text')
                .attr('opacity', function(n) { return matchIds.has(n.id) ? 1 : 0.08; });
            gLinks.selectAll('line').attr('stroke-opacity', 0.02);
            zoomToNodes(currentNodes.filter(function(n) { return matchIds.has(n.id); }));
        }
    };

    // Recenter button
    document.getElementById('btnFit').onclick = function() {
        resetHighlight();
        gNodes.selectAll('circle')
            .attr('stroke', licenceStroke)
            .attr('stroke-width', function(d) { return d.licence === 'libre' ? 2.5 : 0.8; });
        svg.transition().duration(400).call(zoomBehavior.transform, d3.zoomIdentity);
    };

    // Export PNG button
    document.getElementById('btnExport').onclick = exportPng;
}

function zoomToNodes(nodes) {
    if (nodes.length === 0) return;
    var xMin = d3.min(nodes, function(n) { return n.x; }) - 50;
    var xMax = d3.max(nodes, function(n) { return n.x; }) + 50;
    var yMin = d3.min(nodes, function(n) { return n.y; }) - 50;
    var yMax = d3.max(nodes, function(n) { return n.y; }) + 50;
    var bw = xMax - xMin, bh = yMax - yMin;
    var rect = svg.node().parentElement.getBoundingClientRect();
    var scale = Math.min(rect.width / bw, rect.height / bh, 3);
    var tx = rect.width / 2 - (xMin + bw / 2) * scale;
    var ty = rect.height / 2 - (yMin + bh / 2) * scale;
    svg.transition().duration(500).call(zoomBehavior.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

function exportPng() {
    var svgEl = document.getElementById('graphSvg');
    var svgStr = new XMLSerializer().serializeToString(svgEl);
    var rect = svgEl.getBoundingClientRect();
    var canvas = document.createElement('canvas');
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    var ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = cssVar('--bg-graph');
    ctx.fillRect(0, 0, rect.width, rect.height);
    var blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function() {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
        URL.revokeObjectURL(url);
        var link = document.createElement('a');
        link.download = 'cartography-' + currentMode + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    img.src = url;
}

// ============================================================
// Legend
// ============================================================

function updateLegend(mode) {
    var container = document.getElementById('legende');
    var presentCats = new Set();
    currentNodes.forEach(function(n) { if (n.category) presentCats.add(n.category); });

    var html = '<h4>Categories</h4>';
    for (var cat in COLORS) {
        if (!presentCats.has(cat)) continue;
        html += '<div class="legende-item">' +
            '<span class="legende-couleur" style="background:' + COLORS[cat] + '"></span>' + cat + '</div>';
    }

    html += '<div class="legende-separation">Licence</div>';
    html += '<div class="legende-item"><span class="legende-couleur" style="background:transparent;border:2px solid #27ae60"></span>Free</div>';
    html += '<div class="legende-item"><span class="legende-couleur" style="background:transparent;border:2px dashed #555"></span>Proprietary</div>';

    if (mode === 'affinity' || mode === 'clusters') {
        html += '<div class="legende-separation">Size</div>';
        html += '<div class="legende-item" style="font-size:10px;color:#888">Proportional to number of usages</div>';
    } else if (mode === 'cooccurrence') {
        html += '<div class="legende-separation">Size</div>';
        html += '<div class="legende-item" style="font-size:10px;color:#888">Proportional to frequency</div>';
    }

    container.innerHTML = html;
}

function updateThresholdVisibility(mode) {
    document.getElementById('sectionSeuil').style.display = mode === 'affinity' ? 'block' : 'none';
}
