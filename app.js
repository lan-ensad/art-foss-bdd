let baseDeDonnees = { tags: {}, logiciels: [] };
let filtreActifs = {
    licence: 'tout',
    plateformes: [],
    usages: []
};

// fetch('https://raw.githubusercontent.com/lan-ensad/art-foss-bdd/refs/heads/main/bdd_soft.json')
fetch('bdd_soft.json')
    .then(response => response.json())
    .then(data => {
        baseDeDonnees = data;
        renderFiltres();
        afficherBase();
    })
    .catch(error => {
        console.error("Erreur de chargement :", error);
    });

function estLicenceLibre(prixLicence) {
    if (Array.isArray(prixLicence)) {
        return prixLicence.some(p =>
            p.toLowerCase().includes('libre') ||
            p.toLowerCase().includes('open source')
        );
    }
    const prix = (prixLicence || '').toLowerCase();
    return prix.includes('libre') || prix.includes('open source');
}

function renderFiltres() {
    renderFiltreLicence();
    renderFiltrePlateformes();
    renderTags();
}

function renderFiltreLicence() {
    const boutons = document.querySelectorAll('.filtre-licence .filtre-btn');
    boutons.forEach(btn => {
        btn.onclick = () => {
            boutons.forEach(b => b.classList.remove('actif'));
            btn.classList.add('actif');
            filtreActifs.licence = btn.dataset.licence;
            appliquerTousFiltres();
        };
    });
}

function renderFiltrePlateformes() {
    const container = document.getElementById('filtrePlateformes');
    container.innerHTML = '';

    const plateformesUniques = new Set();
    baseDeDonnees.logiciels.forEach(log => {
        (log.Plateforme || []).forEach(p => plateformesUniques.add(p));
    });

    const plateformesOrdonnees = ['Windows', 'MacOS', 'Linux', 'Web'];
    const autresPlateformes = [...plateformesUniques]
        .filter(p => !plateformesOrdonnees.includes(p))
        .sort();

    [...plateformesOrdonnees.filter(p => plateformesUniques.has(p)), ...autresPlateformes].forEach(plateforme => {
        const btn = document.createElement('button');
        btn.textContent = plateforme;
        btn.className = 'filtre-btn';
        btn.dataset.plateforme = plateforme;
        btn.onclick = () => {
            btn.classList.toggle('actif');
            if (btn.classList.contains('actif')) {
                filtreActifs.plateformes.push(plateforme);
            } else {
                filtreActifs.plateformes = filtreActifs.plateformes.filter(p => p !== plateforme);
            }
            appliquerTousFiltres();
        };
        container.appendChild(btn);
    });
}

function renderTags() {
    const container = document.getElementById('listeTags');
    container.innerHTML = '';

    for (const [categorie, tags] of Object.entries(baseDeDonnees.tags)) {
        const div = document.createElement('div');
        div.className = 'categorie';

        const h4 = document.createElement('h4');
        h4.textContent = categorie;
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
                    filtreActifs.usages.push(tag);
                } else {
                    filtreActifs.usages = filtreActifs.usages.filter(t => t !== tag);
                }
                appliquerTousFiltres();
            };
            tagsDiv.appendChild(btn);
        });

        div.appendChild(tagsDiv);
        container.appendChild(div);
    }
}

function afficherBase() {
    const table = document.getElementById('listeLogiciels');
    const compteur = document.getElementById('compteurLogiciels');
    table.innerHTML = '';
    const logiciels = shuffle(baseDeDonnees.logiciels);

    logiciels.forEach(log => {
        const row = document.createElement('tr');
        const prix = Array.isArray(log["Prix licence"]) ? log["Prix licence"].join(', ') : log["Prix licence"];
        const plateformes = log.Plateforme.join(', ');
        row.innerHTML = `
            <td><a href="${log.url}" target="_blank">${log.Nom}</a></td>
            <td class="usages-cell">${(log.Usages || []).join(", ")}</td>
            <td>${prix || "Inconnu"}</td>
            <td>${plateformes}</td>
        `;
        table.appendChild(row);
    });

    compteur.textContent = logiciels.length;
}

function appliquerTousFiltres() {
    const table = document.getElementById('listeLogiciels');
    const compteur = document.getElementById('compteurLogiciels');
    table.innerHTML = '';

    const filtres = shuffle(baseDeDonnees.logiciels.filter(log => {
        // Filtre par licence
        if (filtreActifs.licence !== 'tout') {
            const estLibre = estLicenceLibre(log["Prix licence"]);
            if (filtreActifs.licence === 'libre' && !estLibre) return false;
            if (filtreActifs.licence === 'privateur' && estLibre) return false;
        }

        // Filtre par plateforme
        if (filtreActifs.plateformes.length > 0) {
            const logPlateformes = log.Plateforme || [];
            const matchPlateforme = filtreActifs.plateformes.some(p => logPlateformes.includes(p));
            if (!matchPlateforme) return false;
        }

        // Filtre par usages
        if (filtreActifs.usages.length > 0) {
            if (!log.Usages || !filtreActifs.usages.every(tag => log.Usages.includes(tag))) {
                return false;
            }
        }

        return true;
    }));

    filtres.forEach(log => {
        const row = document.createElement('tr');
        const prix = Array.isArray(log["Prix licence"]) ? log["Prix licence"].join(', ') : log["Prix licence"];
        const plateformes = log.Plateforme.join(', ');
        row.innerHTML = `
            <td><a href="${log.url}" target="_blank">${log.Nom}</a></td>
            <td class="usages-cell">${(log.Usages || []).join(", ")}</td>
            <td>${prix || "Inconnu"}</td>
            <td>${plateformes}</td>
        `;
        table.appendChild(row);
    });
    compteur.textContent = filtres.length;
}

function shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
