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
    return fetch('https://raw.githubusercontent.com/lan-ensad/art-foss-bdd/refs/heads/main/bdd_soft.json')
    // return fetch('bdd_soft.json') // Local dev
        .then(response => response.json());
}

function determinePrimaryCategory(usages, tagsDict) {
    if (!usages || usages.length === 0) return 'Autre';
    const catCounts = {};
    for (const [cat, tags] of Object.entries(tagsDict)) {
        catCounts[cat] = usages.filter(u => tags.includes(u)).length;
    }
    const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    return sorted[0][1] > 0 ? sorted[0][0] : 'Autre';
}
