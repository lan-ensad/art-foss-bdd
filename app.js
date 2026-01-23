let baseDeDonnees = { tags: {}, logiciels: [] };

fetch('bdd_soft.json')
    .then(response => response.json())
    .then(data => {
        baseDeDonnees = data;
        renderTags();
        afficherBase();
    })
    .catch(error => {
        console.error("Erreur de chargement :", error);
    });

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
                appliquerFiltreTagsActifs();
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
    const logiciels = baseDeDonnees.logiciels;

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

function appliquerFiltreTagsActifs() {
    const boutonsActifs = document.querySelectorAll('#listeTags button.actif');
    const tagsActifs = Array.from(boutonsActifs).map(b => b.dataset.tag);

    const table = document.getElementById('listeLogiciels');
    const compteur = document.getElementById('compteurLogiciels');
    table.innerHTML = '';

    const filtres = baseDeDonnees.logiciels.filter(log => {
        return tagsActifs.length === 0 || (
            log.Usages && tagsActifs.every(tag => log.Usages.includes(tag))
        );
    });

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
