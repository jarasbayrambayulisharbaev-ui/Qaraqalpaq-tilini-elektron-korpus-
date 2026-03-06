// Global maǵlıwmatlar bazası
let databases = {
    xmlDoc: null, // XML-di pútinliginshe saqlaymız (gáplerdi tabıw ushın)
    n2: [],
    n3: [],
    n4: [],
    words: []
};

// Sahifa yuklanganda barcha bazalarni parallel yuklash
window.onload = async () => {
    const files = [
        { key: 'xml', url: 'wiki_corpus.xml', type: 'xml' },
        { key: 'n2', url: 'wiki_corpus_n_gram.txt', type: 'txt' },
        { key: 'n3', url: 'wiki_corpus_3_gram.txt', type: 'txt' },
        { key: 'n4', url: 'wiki_corpus_4_gram.txt', type: 'txt' },
        { key: 'words', url: 'Word_results.csv', type: 'txt' }
    ];

    for (const file of files) {
        try {
            const res = await fetch(file.url);
            const data = await res.text();
            if (file.type === 'xml') {
                const parser = new DOMParser();
                databases.xmlDoc = parser.parseFromString(data, "text/xml");
            } else {
                databases[file.key] = data.split('\n').filter(line => line.trim() !== "");
            }
        } catch (e) { 
            console.error(`${file.url} yuklanmadi:`, e); 
        }
    }
    document.getElementById('statusIndicator').innerHTML = '<span class="text-success">● Bazalar tayın</span>';
    loadWordResults();
};

// Sectionlarni almashtirish
function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('d-none'));
    document.getElementById(`section-${id}`).classList.remove('d-none');
    document.querySelectorAll('.list-group-item').forEach(i => i.classList.remove('active'));
    
    // Event handling for sidebar
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}

// XML Qidiruv - Gáp tarkibinde kórsetiw
function handleXMLSearch() {
    const query = document.getElementById('xmlInput').value.toLowerCase();
    const type = document.getElementById('xmlType').value;
    const out = document.getElementById('xmlOutput');
    out.innerHTML = "";

    if (!query || !databases.xmlDoc) return;

    const sentences = databases.xmlDoc.getElementsByTagName("sentence");
    let matchFound = false;

    // Hár bir gápti analiz qılıw
    for (let s = 0; s < sentences.length; s++) {
        const words = sentences[s].getElementsByTagName("word");
        let sentenceHTML = "";
        let sentenceHasMatch = false;

        for (let w = 0; w < words.length; w++) {
            const wordNode = words[w];
            const wordText = wordNode.textContent;
            const attrVal = (type === 'word' ? wordText : wordNode.getAttribute(type) || "").toLowerCase();

            // Qıdırılǵan sóz bolsa highlight qılıw
            if (attrVal.includes(query)) {
                sentenceHasMatch = true;
                matchFound = true;
                sentenceHTML += `<span class="search-highlight" onclick="showDetailedAnalysis(${s}, ${w})">${wordText}</span> `;
            } else {
                sentenceHTML += `<span class="word-clickable" onclick="showDetailedAnalysis(${s}, ${w})">${wordText}</span> `;
            }
        }

        if (sentenceHasMatch) {
            out.innerHTML += `
                <div class="col-12 mb-3">
                    <div class="result-card shadow-sm p-3">
                        <div class="sentence-box">${sentenceHTML.trim()}</div>
                        <div class="mt-2"><small class="text-muted text-uppercase" style="font-size: 0.65rem;">Gáp ID: ${sentences[s].getAttribute('id') || s+1}</small></div>
                    </div>
                </div>`;
        }
    }

    if (!matchFound) {
        out.innerHTML = `<div class="col-12 text-center p-5 text-muted">Hesh nárse tabılmadı.</div>`;
    }
}

// Detallı morfologiyalıq tahlil (Modal oyna)
function showDetailedAnalysis(sIndex, wIndex) {
    const sentence = databases.xmlDoc.getElementsByTagName("sentence")[sIndex];
    const wordNode = sentence.getElementsByTagName("word")[wIndex];

    const word = wordNode.textContent;
    const lemma = wordNode.getAttribute('lemma') || '—';
    const pos = wordNode.getAttribute('pos') || '—';
    const morph = wordNode.getAttribute('morph') || 'Standard (qosımshasız)';

    document.getElementById('modalWordTitle').innerText = `"${word}" sózi tahlili`;
    document.getElementById('modalBodyContent').innerHTML = `
        <div class="tahlil-container">
            <table class="table table-borderless">
                <tr>
                    <th class="text-muted" style="width: 40%">Tiykar (Asos):</th>
                    <td class="fw-bold text-primary h5">${lemma}</td>
                </tr>
                <tr>
                    <th class="text-muted">Sóz shaqabı:</th>
                    <td><span class="badge bg-info p-2">${pos}</span></td>
                </tr>
                <tr>
                    <th class="text-muted">Morfemalar:</th>
                    <td class="text-danger fw-bold">${morph}</td>
                </tr>
            </table>
            <hr>
            <div class="mt-3 p-3 bg-light rounded italic text-center">
                <span class="text-dark h4">${lemma}</span> 
                <span class="text-danger h4"> + ${morph === 'Standard (qosımtasız)' ? '∅' : morph}</span>
            </div>
        </div>
    `;

    // Bootstrap modaldı shıǵarıw
    const modalElement = document.getElementById('analysisModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

// N-Gram Tahlili
function handleNGram(n) {
    const query = document.getElementById('ngramInput').value.toLowerCase();
    const out = document.getElementById('ngramOutput');
    const data = databases[`n${n}`];
    
    if (!query) return;

    out.innerHTML = `<h5 class="mb-3 text-success">${n}-Gram boyınsha natiyjeler:</h5>`;
    const results = data.filter(line => line.toLowerCase().includes(query));

    if (results.length > 0) {
        results.forEach(res => {
            out.innerHTML += `
                <div class="ngram-item p-2 mb-2 bg-white rounded shadow-sm border-start border-success border-3">
                    <i class="bi bi-hash text-success me-2"></i> ${res}
                </div>`;
        });
    } else {
        out.innerHTML += `<p class="text-muted">Sáykes birikpeler tabılmadı.</p>`;
    }
}

// Word Results Tahlili
function loadWordResults() {
    const out = document.getElementById('wordResultsOutput');
    if (databases.words.length === 0) return;
    
    out.innerHTML = databases.words.map(w => `
        <div class="list-group-item list-group-item-action border-0 border-bottom d-flex align-items-center">
            <i class="bi bi-check2-circle text-warning me-3"></i>
            <span class="small">${w}</span>
        </div>
    `).join('');
}