const API_URL = 'http://localhost:3000/api';

const toggleFormBtn = document.getElementById('toggleFormBtn');
const addForm = document.getElementById('addForm');
const cancelBtn = document.getElementById('cancelBtn');
const hackathonForm = document.getElementById('hackathonForm');
const hackathonList = document.getElementById('hackathonList');
const urlInput = document.getElementById('urlInput');
const fetchBtn = document.getElementById('fetchBtn');
const loading = document.getElementById('loading');
const editIdInput = document.getElementById('editId');
const dropzone = document.getElementById('dropzone');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const prizesInput = document.getElementById('prizes');
const notesInput = document.getElementById('notes');
const joinedInput = document.getElementById('joined');
const joinedStatus = document.getElementById('joined-status');

// State
let hackathons = [];

// Drag & Drop
dropzone.addEventListener('click', () => logoInput.click());
logoInput.addEventListener('change', handleFile);
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        logoInput.files = e.dataTransfer.files;
        handleFile();
    }
});

function handleFile() {
    const file = logoInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            logoPreview.src = e.target.result;
            logoPreview.classList.remove('hidden');
            dropzone.querySelector('p').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Event Listeners
toggleFormBtn.addEventListener('click', () => {
    addForm.classList.remove('hidden');
    toggleFormBtn.classList.add('hidden');
    resetForm();
});

cancelBtn.addEventListener('click', () => {
    addForm.classList.add('hidden');
    toggleFormBtn.classList.remove('hidden');
    resetForm();
});

fetchBtn.addEventListener('click', async () => {
    const url = urlInput.value;
    if (!url) return alert('Please enter a URL');
    
    loading.classList.remove('hidden');
    try {
        const res = await fetch(`${API_URL}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const result = await res.json();
        
        if (result.data) {
            populateForm(result.data);
        } else {
            alert('Could not extract data');
        }
    } catch (err) {
        console.error(err);
        alert('Failed to fetch data');
    } finally {
        loading.classList.add('hidden');
    }
});

hackathonForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('title').value);
    formData.append('url', document.getElementById('link').value);
    formData.append('deadline', document.getElementById('deadline').value);
    formData.append('prize_pool', document.getElementById('prize_pool').value);
    formData.append('difficulty', document.getElementById('difficulty').value);
    formData.append('confidence', document.getElementById('confidence').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('rules', document.getElementById('rules').value);
    formData.append('prizes', prizesInput.value);
    formData.append('notes', notesInput.value);
    formData.append('joined', joinedInput.checked ? 1 : 0);
    
    if (logoInput.files[0]) {
        formData.append('logo', logoInput.files[0]);
    }

    const id = editIdInput.value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/hackathons/${id}` : `${API_URL}/hackathons`;

    try {
        const res = await fetch(url, {
            method: method,
            body: formData
        });
        
        if (res.ok) {
            addForm.classList.add('hidden');
            toggleFormBtn.classList.remove('hidden');
            fetchHackathons();
            resetForm();
        } else {
            alert('Error saving hackathon');
        }
    } catch (err) {
        console.error(err);
        alert('Error saving hackathon');
    }
});

// Functions
async function fetchHackathons() {
    try {
        const res = await fetch(`${API_URL}/hackathons`);
        const result = await res.json();
        hackathons = result.data;
        renderHackathons();
    } catch (err) {
        console.error(err);
    }
}

function renderHackathons() {
    hackathonList.innerHTML = '';
    
    if (hackathons.length === 0) {
        hackathonList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No hackathons tracked yet. Add one!</p>';
        return;
    }

    hackathons.forEach(h => {
        const card = document.createElement('div');
        card.className = `hackathon-card`;
        
        // Calculate Days Left
        let daysLeft = '';
        if (h.deadline) {
            const date = new Date(h.deadline);
            if (!isNaN(date)) {
                const diff = Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
                daysLeft = diff < 0 ? 'Ended' : (diff === 0 ? 'Today' : `${diff}d left`);
            }
        }

        // Colors logic
        const diffColors = {
            'Beginner': 'background:rgba(52, 199, 89, 0.1); color:var(--success);',
            'Intermediate': 'background:rgba(0, 113, 227, 0.1); color:var(--accent);',
            'Advanced': 'background:rgba(255, 149, 0, 0.1); color:#ff9500;',
            'Hardcore': 'background:rgba(255, 59, 48, 0.1); color:var(--danger);'
        };
        const diffStyle = diffColors[h.difficulty] || diffColors['Intermediate'];

        const confColors = {
            '5': 'background:rgba(52, 199, 89, 0.1); color:var(--success);',
            '4': 'background:rgba(0, 113, 227, 0.1); color:var(--accent);',
            '3': 'background:rgba(255, 149, 0, 0.1); color:#ff9500;',
            '2': 'background:rgba(255, 59, 48, 0.1); color:var(--danger);',
            '1': 'background:rgba(255, 59, 48, 0.1); color:var(--danger);'
        };
        const confStyle = confColors[h.confidence] || confColors['3'];

        // Strict joined check
        const isJoined = Number(h.joined) === 1;

        // Bento Card Layout
        card.innerHTML = `
            <div class="card-top">
                <img src="${h.logo || 'https://via.placeholder.com/100?text=H'}" class="card-logo" alt="Logo">
                <div class="card-header-content">
                    <a href="${h.url}" target="_blank" class="card-title">${h.title}</a>
                    <div style="display:flex; gap:5px; margin-top:5px; flex-wrap: wrap;">
                        ${isJoined ? '<span class="status-badge status-joined">Joined</span>' : '<span class="status-badge" style="background:#eee; color:#666;">Not Joined</span>'}
                        <span class="status-badge" style="${diffStyle}">${h.difficulty || 'Normal'}</span>
                        <span class="status-badge" style="${confStyle}">Conf: ${h.confidence}/5</span>
                    </div>
                </div>
            </div>

            <div class="bento-row">
                <div class="bento-box bg-gradient-red">
                    <div class="bento-label">Deadline</div>
                    <div class="bento-value">${h.deadline || 'TBA'}</div>
                    ${daysLeft ? `<div class="bento-sub" style="color:var(--danger)">${daysLeft}</div>` : ''}
                </div>
                <div class="bento-box bg-gradient-green">
                    <div class="bento-label">Prize</div>
                    <div class="bento-value">${h.prize_pool || '-'}</div>
                </div>
            </div>
            
            <div class="card-summary">${h.description || 'No description available.'}</div>
            
            <div class="card-actions">
                <button class="icon-btn" onclick="editHackathon(${h.id})">✏️</button>
                <button class="icon-btn delete" onclick="deleteHackathon(${h.id})">🗑️</button>
            </div>
        `;
        hackathonList.appendChild(card);
    });
}

function populateForm(data) {
    document.getElementById('title').value = data.title || '';
    document.getElementById('link').value = data.url || '';
    document.getElementById('description').value = data.description || '';
    document.getElementById('rules').value = data.rules || '';
    if (data.prizes) prizesInput.value = data.prizes;

    if (data.deadline) document.getElementById('deadline').value = data.deadline;
    if (data.prize_pool) document.getElementById('prize_pool').value = data.prize_pool;
}

function resetForm() {
    hackathonForm.reset();
    editIdInput.value = '';
    urlInput.value = '';
    document.getElementById('confidence').nextElementSibling.value = '3';
    logoInput.value = '';
    logoPreview.src = '';
    logoPreview.classList.add('hidden');
    dropzone.querySelector('p').classList.remove('hidden');
    joinedStatus.innerText = 'Not Joined';
}

window.editHackathon = (id) => {
    const h = hackathons.find(x => x.id === id);
    if (!h) return;

    editIdInput.value = h.id;
    document.getElementById('title').value = h.title;
    document.getElementById('link').value = h.url;
    document.getElementById('deadline').value = h.deadline;
    document.getElementById('prize_pool').value = h.prize_pool;
    document.getElementById('difficulty').value = h.difficulty;
    document.getElementById('confidence').value = h.confidence;
    document.getElementById('confidence').nextElementSibling.value = h.confidence;
    document.getElementById('description').value = h.description;
    document.getElementById('rules').value = h.rules || '';
    prizesInput.value = h.prizes || '';
    notesInput.value = h.notes || '';
    
    const isJoined = Number(h.joined) === 1;
    joinedInput.checked = isJoined;
    joinedStatus.innerText = isJoined ? 'Joined' : 'Not Joined';

    if (h.logo) {
        logoPreview.src = h.logo;
        logoPreview.classList.remove('hidden');
        dropzone.querySelector('p').classList.add('hidden');
    } else {
        logoPreview.classList.add('hidden');
        dropzone.querySelector('p').classList.remove('hidden');
    }

    addForm.classList.remove('hidden');
    toggleFormBtn.classList.add('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteHackathon = async (id) => {
    if (!confirm('Are you sure?')) return;
    
    try {
        await fetch(`${API_URL}/hackathons/${id}`, { method: 'DELETE' });
        fetchHackathons();
    } catch (err) {
        console.error(err);
    }
};

// Init
fetchHackathons();
