/**
 * Qaraqalpaq tiliniń elektron korpusı v2.0
 * Global maǵlıwmatlar bazası hám basqarıv logikası
 */

let databases = {
    xmlDoc: null,
    n2: [],
    n3: [],
    n4: [],
    words: [],
    kwic: [] // KWIC_results.txt ushın
};

// Sahifa júklengende barlıq bazalardı parallel túrde júklew
window.onload = async () => {
    const files = [
        { key: 'xml', url: 'wiki_corpus.xml', type: 'xml' },
        { key: 'n2', url: 'wiki_corpus_n_gram.txt', type: 'txt' },
        { key: 'n3', url: 'wiki_corpus_3_gram.txt', type: 'txt' },
        { key: 'n4', url: 'wiki_corpus_4_gram.txt', type: 'txt' },
        { key: 'words', url: 'Word_results.csv', type: 'txt' },
        { key: 'kwic', url: 'KWIC_results.txt', type: 'txt' }
    ];

    for (const file of files) {
        try {
            const res = await fetch(file.url);
            if (!res.ok) throw new Error(`Fayl tabılmadı: ${file.url}`);
            
            const data = await res.text();
            
            if (file.type === 'xml') {
                const parser = new DOMParser();
                databases.xmlDoc = parser.parseFromString(data, "text/xml");
            } else {
                // Bos qatarlardı alıp taslap, massivke jıynav
                databases[file.key] = data.split('\n').filter(line => line.trim() !== "");
            }
        } catch (e) { 
            console.error(`${file.url} júklenbedi:`, e); 
        }
    }

    // Statusdı jańalav
    const statusEl = document.getElementById('statusIndicator');
    if (statusEl) {
        statusEl.innerHTML = '<span class="text-success fw-bold"><i class="bi bi-check-all"></i> Bazalar tayın</span>';
    }
    
    // Baslang'ısh maǵlıvmatlardı kórsetiw
    loadWordResults();
};

/**
 * 1. SEKIYALARDI ALMASTIRIW
 */
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
    const target = document.getElementById(`section-${id}`);
    if (target) target.classList.remove('d-none');

    // Sidebar aktivligin ózgertiw
    document.querySelectorAll('.list-group-item').forEach(i => i.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

/**
 * 2. KWIC ANALIZI (TAB-SEPARATED FORMAT USHIN)
 */
function handleKWICSearch() {
    const query = document.getElementById('kwicInput').value.toLowerCase().trim();
    const out = document.getElementById('kwicOutput');
    
    if (!query) {
        alert("Izlew ushın sóz jazıń!");
        return;
    }

    out.innerHTML = "";
    // Bazadan filtrlew
    const filtered = databases.kwic.filter(line => line.toLowerCase().includes(query));

    if (filtered.length === 0) {
        out.innerHTML = "<tr><td colspan='3' class='text-center p-5 text-muted'>Keshiriń, bul kontekst boyınsha maǵlıvmat tabılmadı.</td></tr>";
        return;
    }

    filtered.forEach(line => {
        // Fayl formatı: File [TAB] Left [TAB] Hit [TAB] Right
        // Eger Tab bolmasa, probeller boyınsha ajıratıvǵa háreket etedi
        const parts = line.split('\t'); 
        
        let left, node, right;

        if (parts.length >= 4) {
            // Standart KWIC formatı (File baǵanasın esapqa almaǵanda)
            left = parts[1] || "";
            node = parts[2] || "";
            right = parts[3] || "";
        } else {
            // Eger format buzılǵan bolsa, tekstli izlew logikası
            const index = line.toLowerCase().indexOf(query);
            left = line.substring(0, index);
            node = line.substring(index, index + query.length);
            right = line.substring(index + query.length);
        }

        out.innerHTML += `
            <tr>
                <td class="text-end text-muted small pe-3" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${left}</td>
                <td class="text-center"><span class="kwic-node">${node}</span></td>
                <td class="text-start text-muted small ps-3" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${right}</td>
            </tr>`;
    });
}

/**
 * 3. XML MORFOLOGIYALIQ IZLEW
 */
function handleXMLSearch() {
    const query = document.getElementById('xmlInput').value.toLowerCase().trim();
    const type = document.getElementById('xmlType').value;
    const out = document.getElementById('xmlOutput');
    
    out.innerHTML = "";
    if (!query || !databases.xmlDoc) return;

    const phrases = databases.xmlDoc.getElementsByTagName("phrase");
    let matchFound = false;

    for (let s = 0; s < phrases.length; s++) {
        const iwords = phrases[s].getElementsByTagName("iword");
        let sentenceHTML = "";
        let sentenceHasMatch = false;

        for (let w = 0; w < iwords.length; w++) {
            const iw = iwords[w];
            const txt = iw.querySelector('item[type="txt"]')?.textContent || "";
            const pos = iw.querySelector('item[type="pos"]')?.textContent || "";
            const gls = iw.querySelector('item[type="gls"]')?.textContent || "";

            let isMatch = false;
            if (type === 'word') isMatch = txt.toLowerCase().includes(query);
            else if (type === 'pos') isMatch = pos.toLowerCase().includes(query);
            else if (type === 'lemma') isMatch = gls.toLowerCase().includes(query);

            if (isMatch) {
                sentenceHasMatch = true;
                matchFound = true;
                sentenceHTML += `<span class="search-highlight" onclick="showDetailedAnalysis(${s}, ${w})">${txt}</span> `;
            } else {
                sentenceHTML += `<span class="word-clickable" onclick="showDetailedAnalysis(${s}, ${w})">${txt}</span> `;
            }
        }

        if (sentenceHasMatch) {
            out.innerHTML += `
                <div class="col-12 mb-3">
                    <div class="result-card p-4 shadow-sm bg-white rounded border-start border-primary border-4">
                        <div class="sentence-box">${sentenceHTML.trim()}</div>
                        <div class="text-end mt-2">
                            <small class="badge bg-light text-secondary">Gáp #${s + 1}</small>
                        </div>
                    </div>
                </div>`;
        }
    }

    if (!matchFound) {
        out.innerHTML = "<div class='col-12 text-center p-5 text-muted'>Morfologiyalıq baza boyınsha nátiyje joq.</div>";
    }
}

/**
 * 4. DETALLI TAHLIL (MODAL)
 */
function showDetailedAnalysis(sIndex, wIndex) {
    const phrase = databases.xmlDoc.getElementsByTagName("phrase")[sIndex];
    const iword = phrase.getElementsByTagName("iword")[wIndex];

    const word = iword.querySelector('item[type="txt"]')?.textContent || '—';
    const glsFull = iword.querySelector('item[type="gls"]')?.textContent || '—';
    const pos = iword.querySelector('item[type="pos"]')?.textContent || '—';
    
    const parts = glsFull.split('=');
    const base = parts[0];
    const morph = parts.length > 1 ? parts[1] : 'Jalǵawsız (Nolik forma)';

    document.getElementById('modalWordTitle').innerText = `"${word}" sózi tahlili`;
    document.getElementById('modalBodyContent').innerHTML = `
        <div class="p-2">
            <table class="table table-borderless">
                <tr><td class="text-muted">Tiykar (Lemma):</td><td class="fw-bold h5 text-primary">${base}</td></tr>
                <tr><td class="text-muted">Sóz shaqabı (POS):</td><td><span class="badge bg-info p-2">${pos}</span></td></tr>
                <tr><td class="text-muted">Morfologiya:</td><td class="text-danger fw-bold">${morph}</td></tr>
            </table>
            <div class="mt-3 p-3 bg-light rounded text-center border-dashed">
                <span class="h4 text-dark">${base}</span> <span class="h4 text-danger">+ ${morph === 'Jalǵawsız (Nolik forma)' ? '∅' : morph}</span>
            </div>
        </div>
    `;

    const modal = new bootstrap.Modal(document.getElementById('analysisModal'));
    modal.show();
}

/**
 * 5. N-GRAM ANALIZI
 */
function handleNGram(n) {
    const query = document.getElementById('ngramInput').value.toLowerCase().trim();
    const out = document.getElementById('ngramOutput');
    const data = databases[`n${n}`];

    if (!query || !data) return;

    out.innerHTML = `<h5 class="mb-3 text-success"><i class="bi bi-check2-circle"></i> ${n}-Gram nátiyjeleri:</h5>`;
    const results = data.filter(line => line.toLowerCase().includes(query));

    if (results.length > 0) {
        results.forEach(res => {
            out.innerHTML += `<div class="ngram-item p-3 mb-2 bg-white rounded shadow-sm border-start border-success border-3">${res}</div>`;
        });
    } else {
        out.innerHTML += `<p class="text-muted p-3">Sáykes birikpeler tabılmadı.</p>`;
    }
}

/**
 * 6. SÓZLER DIZIMI (CSV)
 */
function loadWordResults() {
    const out = document.getElementById('wordResultsOutput');
    if (!out || databases.words.length === 0) return;

    // Tek dáslepki 100 sózdi kórsetemiz (Performance ushın)
    const limitedWords = databases.words.slice(0, 100);
    out.innerHTML = limitedWords.map(w => `
        <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
            <span>${w}</span>
            <i class="bi bi-chevron-right text-light"></i>
        </div>
    `).join('');
}

/**
 * ENTER TÚYMESI QOSIMSHASI
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const activeSection = document.querySelector('.content-section:not(.d-none)').id;
        if (activeSection === 'section-search') handleXMLSearch();
        if (activeSection === 'section-kwic') handleKWICSearch();
        if (activeSection === 'section-ngram') handleNGram(2); // Default 2-gram
    }
});