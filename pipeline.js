// Pipelines are loaded from bdd_soft.json → allData.pipelines

// ---- Compatibility engine (simple) ----

function formatCompatibility(softA, softB) {
    // Score = |export_A ∩ import_B| / max(|export_A|, 1)
    const exA = softA.formats?.export || [];
    const imB = softB.formats?.import || [];
    if (exA.length === 0 && imB.length === 0) return 0;
    if (exA.length === 0) return 0;
    const common = exA.filter(f => imB.includes(f));
    return common.length / exA.length;
}

function protocoleCompatibility(softA, softB) {
    // Score = |proto_A ∩ proto_B| / max(|proto_A ∪ proto_B|, 1)
    const pA = softA.collaboration?.protocoles || [];
    const pB = softB.collaboration?.protocoles || [];
    if (pA.length === 0 && pB.length === 0) return 0;
    const union = [...new Set([...pA, ...pB])];
    if (union.length === 0) return 0;
    const common = pA.filter(p => pB.includes(p));
    return common.length / union.length;
}

function platformCompatibility(softA, softB) {
    const pA = softA.Plateforme || [];
    const pB = softB.Plateforme || [];
    const union = [...new Set([...pA, ...pB])];
    if (union.length === 0) return 0;
    const common = pA.filter(p => pB.includes(p));
    return common.length / union.length;
}

function computeCompatibility(softA, softB) {
    // Weighted average: formats 50%, platform 30%, protocoles 20%
    const fScore = formatCompatibility(softA, softB);
    const plScore = platformCompatibility(softA, softB);
    const prScore = protocoleCompatibility(softA, softB);
    return fScore * 0.5 + plScore * 0.3 + prScore * 0.2;
}

function commonFormats(softA, softB) {
    const exA = softA.formats?.export || [];
    const imB = softB.formats?.import || [];
    return exA.filter(f => imB.includes(f));
}

function commonProtocoles(softA, softB) {
    const pA = softA.collaboration?.protocoles || [];
    const pB = softB.collaboration?.protocoles || [];
    return pA.filter(p => pB.includes(p));
}

// ---- App state ----
let allData = null;
let selectedPipeline = null;
let selectedSoftware = {}; // { stageIndex: softwareObj }
let filtrelicence = 'tout';
let filtrePlateforme = null;

// ---- Init ----
document.addEventListener('DOMContentLoaded', function() {
    loadData().then(function(data) {
        allData = data;
        initPipelineSelect();
        initFilters();
    });
});

function initPipelineSelect() {
    const select = document.getElementById('pipelineSelect');
    allData.pipelines.forEach(function(p, i) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = p.nom;
        select.appendChild(opt);
    });
    select.addEventListener('change', function() {
        const idx = this.value;
        if (idx === '') {
            selectedPipeline = null;
            selectedSoftware = {};
            renderPipeline();
            return;
        }
        selectedPipeline = allData.pipelines[parseInt(idx)];
        selectedSoftware = {};
        renderPipeline();
    });
}

function initFilters() {
    // Licence buttons
    document.querySelectorAll('.filtre-licence .filtre-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filtre-licence .filtre-btn').forEach(b => b.classList.remove('actif'));
            this.classList.add('actif');
            filtrelicence = this.dataset.licence;
            renderPipeline();
        });
    });

    // Platform buttons
    const plateformes = [...new Set(allData.logiciels.flatMap(s => s.Plateforme || []))].sort();
    const container = document.getElementById('filtrePlateformes');
    plateformes.forEach(function(p) {
        const btn = document.createElement('button');
        btn.className = 'filtre-btn';
        btn.textContent = p;
        btn.addEventListener('click', function() {
            if (this.classList.contains('actif')) {
                this.classList.remove('actif');
                filtrePlateforme = null;
            } else {
                container.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('actif'));
                this.classList.add('actif');
                filtrePlateforme = p;
            }
            renderPipeline();
        });
        container.appendChild(btn);
    });
}

// ---- Filtering ----
function filterSoftware(logiciels) {
    return logiciels.filter(function(s) {
        if (filtrelicence === 'libre' && !isFreeLicence(s['Prix licence'])) return false;
        if (filtrelicence === 'privateur' && isFreeLicence(s['Prix licence'])) return false;
        if (filtrePlateforme && !(s.Plateforme || []).includes(filtrePlateforme)) return false;
        return true;
    });
}

// ---- Rendering ----
function renderPipeline() {
    const view = document.getElementById('pipelineView');
    if (!selectedPipeline) {
        view.innerHTML = '<p class="pipeline-placeholder">Select a workflow to build a pipeline.</p>';
        updateCompatInfo();
        return;
    }

    const filtered = filterSoftware(allData.logiciels);
    view.innerHTML = '';

    selectedPipeline.etapes.forEach(function(stage, stageIdx) {
        // Arrow between stages
        if (stageIdx > 0) {
            const arrow = document.createElement('div');
            arrow.className = 'pipeline-arrow';
            arrow.textContent = '→';
            view.appendChild(arrow);
        }

        const col = document.createElement('div');
        col.className = 'pipeline-stage';

        const header = document.createElement('div');
        header.className = 'stage-header';
        header.textContent = stage.role;
        col.appendChild(header);

        const body = document.createElement('div');
        body.className = 'stage-body';

        // Find software matching this stage (by allTags ∩ stage.tags)
        const stageTags = stage.tags || [];
        const matching = filtered.filter(function(s) {
            const tags = getAllTags(s);
            return stageTags.some(t => tags.includes(t));
        });

        // Sort by compatibility with previous selected software
        const prevSelected = selectedSoftware[stageIdx - 1];
        if (prevSelected) {
            matching.sort(function(a, b) {
                return computeCompatibility(prevSelected, b) - computeCompatibility(prevSelected, a);
            });
        }

        matching.forEach(function(soft) {
            const card = document.createElement('div');
            card.className = 'pipeline-card';

            // Compatibility indicator
            let score = null;
            if (prevSelected) {
                score = computeCompatibility(prevSelected, soft);
                if (score >= 0.4) card.classList.add('compatible-high');
                else if (score >= 0.15) card.classList.add('compatible-mid');
                else card.classList.add('compatible-low');
            }

            // Selected state
            if (selectedSoftware[stageIdx] && selectedSoftware[stageIdx].Nom === soft.Nom) {
                card.classList.add('selected');
            }

            const nom = document.createElement('div');
            nom.className = 'card-nom';
            nom.textContent = soft.Nom;
            card.appendChild(nom);

            const licence = document.createElement('span');
            const isFree = isFreeLicence(soft['Prix licence']);
            licence.className = 'card-licence ' + (isFree ? 'libre' : 'proprio');
            licence.textContent = isFree ? 'Free' : 'Proprietary';
            card.appendChild(licence);

            if (score !== null) {
                const scoreEl = document.createElement('div');
                scoreEl.className = 'card-score';
                scoreEl.textContent = Math.round(score * 100) + '%';
                card.appendChild(scoreEl);
            }

            // Show common formats with previous
            if (prevSelected) {
                const common = commonFormats(prevSelected, soft);
                if (common.length > 0) {
                    const fmts = document.createElement('div');
                    fmts.className = 'card-formats';
                    fmts.textContent = 'Formats: ' + common.join(', ');
                    card.appendChild(fmts);
                }
            }

            card.addEventListener('click', function() {
                selectedSoftware[stageIdx] = soft;
                renderPipeline();
            });

            // Tooltip on hover
            card.addEventListener('mouseenter', function(e) {
                showTooltip(e, soft, prevSelected);
            });
            card.addEventListener('mousemove', function(e) {
                moveTooltip(e);
            });
            card.addEventListener('mouseleave', hideTooltip);

            body.appendChild(card);
        });

        if (matching.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color: var(--text-muted); font-size: 12px; padding: 10px; text-align: center;';
            empty.textContent = 'No matching software';
            body.appendChild(empty);
        }

        col.appendChild(body);
        view.appendChild(col);
    });

    updateCompatInfo();
}

// ---- Tooltip ----
function showTooltip(e, soft, prevSoft) {
    const tip = document.getElementById('tooltip');
    let html = '<div class="tooltip-nom">' + soft.Nom + '</div>';
    html += '<div class="tooltip-licence">' + (Array.isArray(soft['Prix licence']) ? soft['Prix licence'].join(' | ') : soft['Prix licence']) + '</div>';
    html += '<div class="tooltip-tags">' + (soft.Domaines || []).join(', ') + '</div>';
    html += '<div class="tooltip-tags" style="font-style:italic">' + (soft.Etapes || []).join(', ') + '</div>';

    const ex = soft.formats?.export || [];
    const im = soft.formats?.import || [];
    if (ex.length > 0) html += '<div class="tooltip-tags">Export: ' + ex.join(', ') + '</div>';
    if (im.length > 0) html += '<div class="tooltip-tags">Import: ' + im.join(', ') + '</div>';

    const proto = soft.collaboration?.protocoles || [];
    if (proto.length > 0) html += '<div class="tooltip-tags">Protocoles: ' + proto.join(', ') + '</div>';

    if (prevSoft) {
        const score = computeCompatibility(prevSoft, soft);
        html += '<div class="tooltip-edge">Compatibility with ' + prevSoft.Nom + ': ' + Math.round(score * 100) + '%</div>';
    }

    if (soft.Description) {
        html += '<div class="tooltip-description">' + soft.Description + '</div>';
    }

    tip.innerHTML = html;
    tip.classList.remove('hidden');
    moveTooltip(e);
}

function moveTooltip(e) {
    const tip = document.getElementById('tooltip');
    const main = document.querySelector('.carto-main');
    const rect = main.getBoundingClientRect();
    tip.style.left = (e.clientX - rect.left + 12) + 'px';
    tip.style.top = (e.clientY - rect.top + 12) + 'px';
}

function hideTooltip() {
    document.getElementById('tooltip').classList.add('hidden');
}

// ---- Compatibility info panel ----
function updateCompatInfo() {
    const panel = document.getElementById('compatInfo');
    if (!selectedPipeline) {
        panel.innerHTML = '<p class="text-muted">Select a workflow to see compatibility.</p>';
        return;
    }

    const indices = Object.keys(selectedSoftware).map(Number).sort();
    if (indices.length < 2) {
        panel.innerHTML = '<p class="text-muted">Select software in at least 2 stages to see compatibility.</p>';
        return;
    }

    let html = '';
    for (let i = 0; i < indices.length - 1; i++) {
        const idxA = indices[i];
        const idxB = indices[i + 1];
        // Only show adjacent pairs
        if (idxB - idxA !== 1) continue;
        const softA = selectedSoftware[idxA];
        const softB = selectedSoftware[idxB];
        const score = computeCompatibility(softA, softB);
        const fScore = formatCompatibility(softA, softB);
        const plScore = platformCompatibility(softA, softB);
        const prScore = protocoleCompatibility(softA, softB);
        const common = commonFormats(softA, softB);
        const commonProto = commonProtocoles(softA, softB);
        const exportsA = softA.formats?.export || [];
        const importsB = softB.formats?.import || [];

        const color = score >= 0.4 ? '#22c55e' : score >= 0.15 ? '#f59e0b' : '#ef4444';

        html += '<div class="compat-pair">';
        html += '<div class="compat-pair-title">' + softA.Nom + ' → ' + softB.Nom + '</div>';
        html += '<div class="compat-bar"><div class="compat-bar-fill" style="width:' + Math.round(score * 100) + '%; background:' + color + '"></div></div>';
        html += '<div class="compat-detail">Score: ' + Math.round(score * 100) + '%</div>';
        html += '<div class="compat-detail">Export ' + softA.Nom + ': ' + (exportsA.length > 0 ? exportsA.join(', ') : 'none') + '</div>';
        html += '<div class="compat-detail">Import ' + softB.Nom + ': ' + (importsB.length > 0 ? importsB.join(', ') : 'none') + '</div>';
        html += '<div class="compat-detail">Formats communs: ' + Math.round(fScore * 100) + '% — ' + (common.length > 0 ? common.join(', ') : 'none') + '</div>';
        html += '<div class="compat-detail">Platforms: ' + Math.round(plScore * 100) + '%</div>';
        html += '<div class="compat-detail">Protocoles: ' + Math.round(prScore * 100) + '% — ' + (commonProto.length > 0 ? commonProto.join(', ') : 'none') + '</div>';
        html += '</div>';
    }

    if (html === '') {
        html = '<p class="text-muted">Select software in adjacent stages.</p>';
    }
    panel.innerHTML = html;
}
