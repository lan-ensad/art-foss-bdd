let database = { tags: {}, logiciels: [] };
let activeFilters = {
    licence: 'tout',
    platforms: [],
    usages: []
};

// fetch('https://raw.githubusercontent.com/lan-ensad/art-foss-bdd/refs/heads/main/bdd_soft.json')
fetch('bdd_soft.json') // Local dev
    .then(response => response.json())
    .then(data => {
        database = data;
        renderFilters();
        displayAll();
    })
    .catch(error => {
        console.error("Loading error:", error);
    });

// isFreeLicence() is in data-utils.js

function renderFilters() {
    renderLicenceFilter();
    renderPlatformFilter();
    renderTags();
}

function renderLicenceFilter() {
    const buttons = document.querySelectorAll('.filtre-licence .filtre-btn');
    buttons.forEach(btn => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove('actif'));
            btn.classList.add('actif');
            activeFilters.licence = btn.dataset.licence;
            applyAllFilters();
        };
    });
}

function renderPlatformFilter() {
    const container = document.getElementById('filtrePlateformes');
    container.innerHTML = '';

    const uniquePlatforms = new Set();
    database.logiciels.forEach(log => {
        (log.Plateforme || []).forEach(p => uniquePlatforms.add(p));
    });

    const orderedPlatforms = ['Windows', 'MacOS', 'Linux', 'Web'];
    const otherPlatforms = [...uniquePlatforms]
        .filter(p => !orderedPlatforms.includes(p))
        .sort();

    [...orderedPlatforms.filter(p => uniquePlatforms.has(p)), ...otherPlatforms].forEach(platform => {
        const btn = document.createElement('button');
        btn.textContent = platform;
        btn.className = 'filtre-btn';
        btn.dataset.plateforme = platform;
        btn.onclick = () => {
            btn.classList.toggle('actif');
            if (btn.classList.contains('actif')) {
                activeFilters.platforms.push(platform);
            } else {
                activeFilters.platforms = activeFilters.platforms.filter(p => p !== platform);
            }
            applyAllFilters();
        };
        container.appendChild(btn);
    });
}

function renderTags() {
    const container = document.getElementById('listeTags');
    container.innerHTML = '';

    for (const [category, tags] of Object.entries(database.tags)) {
        const div = document.createElement('div');
        div.className = 'categorie';

        const h4 = document.createElement('h4');
        h4.textContent = category;
        div.appendChild(h4);

        const tagsDiv = document.createElement('div');
        tagsDiv.className = 'categorie-tags';

        tags.forEach(tag => {
            const btn = document.createElement('button');
            btn.textContent = tag;
            btn.dataset.tag = tag;
            btn.onclick = () => {
                btn.classList.toggle('actif');
                if (btn.classList.contains('actif')) {
                    activeFilters.usages.push(tag);
                } else {
                    activeFilters.usages = activeFilters.usages.filter(t => t !== tag);
                }
                applyAllFilters();
            };
            tagsDiv.appendChild(btn);
        });

        div.appendChild(tagsDiv);
        container.appendChild(div);
    }
}

function displayAll() {
    const table = document.getElementById('listeLogiciels');
    const counter = document.getElementById('compteurLogiciels');
    table.innerHTML = '';
    const software = shuffle(database.logiciels);

    software.forEach(log => {
        const row = document.createElement('tr');
        const price = Array.isArray(log["Prix licence"]) ? log["Prix licence"].join(', ') : log["Prix licence"];
        const platforms = log.Plateforme.join(', ');
        row.innerHTML = `
            <td><a href="${log.url}" target="_blank">${log.Nom}</a></td>
            <td class="usages-cell">${(log.Usages || []).join(", ")}</td>
            <td>${price || "Unknown"}</td>
            <td>${platforms}</td>
        `;
        table.appendChild(row);
    });

    counter.textContent = software.length;
}

function applyAllFilters() {
    const table = document.getElementById('listeLogiciels');
    const counter = document.getElementById('compteurLogiciels');
    table.innerHTML = '';

    const filtered = shuffle(database.logiciels.filter(log => {
        // Filter by licence
        if (activeFilters.licence !== 'tout') {
            const isFree = isFreeLicence(log["Prix licence"]);
            if (activeFilters.licence === 'libre' && !isFree) return false;
            if (activeFilters.licence === 'privateur' && isFree) return false;
        }

        // Filter by platform
        if (activeFilters.platforms.length > 0) {
            const logPlatforms = log.Plateforme || [];
            const matchPlatform = activeFilters.platforms.some(p => logPlatforms.includes(p));
            if (!matchPlatform) return false;
        }

        // Filter by usages
        if (activeFilters.usages.length > 0) {
            if (!log.Usages || !activeFilters.usages.every(tag => log.Usages.includes(tag))) {
                return false;
            }
        }

        return true;
    }));

    filtered.forEach(log => {
        const row = document.createElement('tr');
        const price = Array.isArray(log["Prix licence"]) ? log["Prix licence"].join(', ') : log["Prix licence"];
        const platforms = log.Plateforme.join(', ');
        row.innerHTML = `
            <td><a href="${log.url}" target="_blank">${log.Nom}</a></td>
            <td class="usages-cell">${(log.Usages || []).join(", ")}</td>
            <td>${price || "Unknown"}</td>
            <td>${platforms}</td>
        `;
        table.appendChild(row);
    });
    counter.textContent = filtered.length;
}

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
