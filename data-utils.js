// Shared utilities between index.html and cartographie.html

// ---- Light/dark theme ----
(function() {
    var saved = localStorage.getItem('theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
    }

    function updateToggleLabel() {
        var btn = document.getElementById('themeToggle');
        if (!btn) return;
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.textContent = isDark ? 'Light mode' : 'Dark mode';
    }

    document.addEventListener('DOMContentLoaded', function() {
        updateToggleLabel();
        var btn = document.getElementById('themeToggle');
        if (btn) {
            btn.addEventListener('click', function() {
                var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                var next = isDark ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('theme', next);
                updateToggleLabel();
                document.dispatchEvent(new CustomEvent('theme-changed', { detail: next }));
            });
        }
    });
})();

function isFreeLicence(licencePrice) {
    if (Array.isArray(licencePrice)) {
        return licencePrice.some(p =>
            p.toLowerCase().includes('libre') ||
            p.toLowerCase().includes('open source')
        );
    }
    const price = (licencePrice || '').toLowerCase();
    return price.includes('libre') || price.includes('open source');
}

function loadData() {
    return Promise.all([
        fetch('data/soft.json').then(r => r.json()),
        fetch('data/tags.json').then(r => r.json()),
        fetch('data/pipelines.json').then(r => r.json())
    ]).then(function([logiciels, tags, pipelines]) {
        return { logiciels: logiciels, tags: tags, pipelines: pipelines };
    });
}

function determinePrimaryCategory(log, tagsDict) {
    var domaines = log.Domaines || [];
    if (domaines.length === 0) return 'Autre';
    var catCounts = {};
    for (var cat in (tagsDict.domaines || {})) {
        catCounts[cat] = domaines.filter(function(d) { return tagsDict.domaines[cat].includes(d); }).length;
    }
    var sorted = Object.entries(catCounts).sort(function(a, b) { return b[1] - a[1]; });
    return sorted[0][1] > 0 ? sorted[0][0] : 'Autre';
}

function getAllTags(log) {
    return [].concat(log.Domaines || [], log.Etapes || []);
}
