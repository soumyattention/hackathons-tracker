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

// State
let hackathons = [];

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
    
    const formData = {
        title: document.getElementById('title').value,
        url: document.getElementById('link').value,
        deadline: document.getElementById('deadline').value,
        prize_pool: document.getElementById('prize_pool').value,
        difficulty: document.getElementById('difficulty').value,
        confidence: document.getElementById('confidence').value,
        description: document.getElementById('description').value,
        rules: document.getElementById('rules').value,
        hashtag_counts: document.getElementById('hashtag_counts').value,
        joined: document.getElementById('joined').checked,
        notes: '' 
    };

    const id = editIdInput.value;
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/hackathons/${id}` : `${API_URL}/hackathons`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
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
        card.className = `hackathon-card ${h.joined ? 'joined' : ''}`;
        
        const deadlineDate = h.deadline ? new Date(h.deadline).toLocaleDateString() : 'No date';
        
        card.innerHTML = `
            <div class="card-header">
                <a href="${h.url}" target="_blank" class="card-title">${h.title}</a>
                ${h.joined ? '<span class="badge" style="background: var(--success); color: #000;">Joined</span>' : ''}
            </div>
            
            <div class="card-badges">
                ${h.prize_pool ? `<span class="badge prize">🏆 ${h.prize_pool}</span>` : ''}
                ${h.deadline ? `<span class="badge deadline">📅 ${h.deadline}</span>` : ''}
                <span class="badge">${h.difficulty}</span>
                <span class="badge">Confidence: ${h.confidence}/5</span>
            </div>
            
            <p class="card-desc">${h.description || 'No description'}</p>
            
            ${h.rules ? `<div class="card-meta" style="display:block; margin-top:10px;"><strong>Rules:</strong><br>${h.rules}</div>` : ''}
            ${h.hashtag_counts ? `<div class="card-meta" style="color:var(--accent);"><strong>Hashtag Stats:</strong> ${h.hashtag_counts}</div>` : ''}

            <div class="card-actions">
                <button class="icon-btn edit" onclick="editHackathon(${h.id})">✏️</button>
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
    document.getElementById('hashtag_counts').value = data.hashtag_counts || '';

    if (data.deadline) document.getElementById('deadline').value = data.deadline;
    if (data.prize_pool) document.getElementById('prize_pool').value = data.prize_pool;
}

function resetForm() {
    hackathonForm.reset();
    editIdInput.value = '';
    urlInput.value = '';
    document.getElementById('confidence').nextElementSibling.value = '3';
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
    document.getElementById('hashtag_counts').value = h.hashtag_counts || '';
    document.getElementById('joined').checked = !!h.joined;

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
