// Global maǵlıwmatlar bazası
let databases = {
    xmlDoc: null, 
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
    
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
    }
}

// XML Qidiruv - Kaa-Latn XML strukturasiga moslashtirilgan
function handleXMLSearch() {
    const query = document.getElementById('xmlInput').value.toLowerCase();
    const type = document.getElementById('xmlType').value; // 'word', 'pos' yoki 'lemma'
    const out = document.getElementById('xmlOutput');
    out.innerHTML = "";

    if (!query || !databases.xmlDoc) return;

    // XML-da 'phrase' teglari asosiy birlik
    const phrases = databases.xmlDoc.getElementsByTagName("phrase");
    let matchFound = false;

    for (let s = 0; s < phrases.length; s++) {
        const iwords = phrases[s].getElementsByTagName("iword");
        let sentenceHTML = "";
        let sentenceHasMatch = false;

        for (let w = 0; w < iwords.length; w++) {
            const iword = iwords[w];
            
            // XML-dan kerakli ma'lumotlarni olish
            const txtNode = iword.querySelector('item[type="txt"]');
            const posNode = iword.querySelector('item[type="pos"]');
            const glsNode = iword.querySelector('item[type="gls"]');

            const wordText = txtNode ? txtNode.textContent : "";
            const posText = posNode ? posNode.textContent : "";
            const lemmaText = glsNode ? glsNode.textContent : "";

            // Qidiruv turiga qarab tekshirish
            let attrVal = "";
            if (type === 'word') attrVal = wordText;
            else if (type === 'pos') attrVal = posText;
            else if (type === 'lemma') attrVal = lemmaText;

            if (attrVal.toLowerCase().includes(query)) {
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
                    <div class="result-card shadow-sm p-3 bg-white rounded">
                        <div class="sentence-box">${sentenceHTML.trim()}</div>
                        <div class="mt-2">
                            <small class="text-muted text-uppercase" style="font-size: 0.65rem;">
                                Phrase Index: ${s + 1}
                            </small>
                        </div>
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
    const phrase = databases.xmlDoc.getElementsByTagName("phrase")[sIndex];
    const iword = phrase.getElementsByTagName("iword")[wIndex];

    const word = iword.querySelector('item[type="txt"]')?.textContent || '—';
    const lemmaFull = iword.querySelector('item[type="gls"]')?.textContent || '—';
    const pos = iword.querySelector('item[type="pos"]')?.textContent || '—';
    
    // Lemma va morfologiyani gls ichidan ajratib olish (sodda usul)
    const lemmaParts = lemmaFull.split('=');
    const baseLemma = lemmaParts[0];
    const morphology = lemmaParts.length > 1 ? lemmaParts[1] : 'Standard (qosımshasız)';

    document.getElementById('modalWordTitle').innerText = `"${word}" sózi tahlili`;
    document.getElementById('modalBodyContent').innerHTML = `
        <div class="tahlil-container">
            <table class="table table-borderless">
                <tr>
                    <th class="text-muted" style="width: 40%">Tiykar (Asos):</th>
                    <td class="fw-bold text-primary h5">${baseLemma}</td>
                </tr>
                <tr>
                    <th class="text-muted">Sóz shaqabı (POS):</th>
                    <td><span class="badge bg-info p-2">${pos}</span></td>
                </tr>
                <tr>
                    <th class="text-muted">Morfologiya/Gloss:</th>
                    <td class="text-danger fw-bold">${morphology}</td>
                </tr>
            </table>
            <hr>
            <div class="mt-3 p-3 bg-light rounded italic text-center">
                <span class="text-dark h4">${baseLemma}</span> 
                <span class="text-danger h4"> + ${morphology === 'Standard (qosımshasız)' ? '∅' : morphology}</span>
            </div>
        </div>
    `;

    const modalElement = document.getElementById('analysisModal');
    const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
    modalInstance.show();
}

// N-Gram va Word Results funksiyalari o'zgarishsiz qoladi...
function handleNGram(n) {
    const query = document.getElementById('ngramInput').value.toLowerCase();
    const out = document.getElementById('ngramOutput');
    const data = databases[`n${n}`];
    if (!query || !data) return;
    out.innerHTML = `<h5 class="mb-3 text-success">${n}-Gram boyınsha natiyjeler:</h5>`;
    const results = data.filter(line => line.toLowerCase().includes(query));
    if (results.length > 0) {
        results.forEach(res => {
            out.innerHTML += `<div class="ngram-item p-2 mb-2 bg-white rounded shadow-sm border-start border-success border-3">${res}</div>`;
        });
    } else {
        out.innerHTML += `<p class="text-muted">Sáykes birikpeler tabılmadı.</p>`;
    }
}

function loadWordResults() {
    const out = document.getElementById('wordResultsOutput');
    if (!out || databases.words.length === 0) return;
    out.innerHTML = databases.words.map(w => `
        <div class="list-group-item list-group-item-action border-0 border-bottom d-flex align-items-center">
            <span class="small">${w}</span>
        </div>
    `).join('');
}