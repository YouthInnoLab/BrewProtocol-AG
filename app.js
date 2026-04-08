/* 
 * HTCPCP/1.0 Client Mock Engine & UI Logic
 */

/* ================== DOM Elements ================== */
const terminal = document.getElementById('terminal');
const methodSelect = document.getElementById('method');
const potSelect = document.getElementById('pot-select');
const additionCheckboxes = document.querySelectorAll('.addition');
const decafToggle = document.getElementById('decaf-toggle');
const sendBtn = document.getElementById('send-btn');

const potContainer = document.getElementById('pot-container');
const actPot = document.getElementById('active-pot');
const brewStatus = document.getElementById('brew-status');
const steamLayer = document.getElementById('steam-layer');
const liquid = document.getElementById('liquid');

/* ================== State ================== */
let inventory = [];
let achievements = {
    '418-standard': { title: 'Standard Teapot', desc: 'Received a 418 I\'m a teapot', unlocked: false, icon: '🫖' },
    '418-shortstout': { title: 'Short & Stout', desc: 'Encountered the Short & Stout variant', unlocked: false, icon: '🎵' },
    '418-earlgrey': { title: 'Earl Grey, Hot', desc: 'Captain\'s orders', unlocked: false, icon: '🌟' },
    '418-notcoffee': { title: 'Not Coffee', desc: 'Tried to brew coffee in a teapot', unlocked: false, icon: '❌' }
};

let activeSteamInterval = null;

/* ================== Initialization ================== */
function init() {
    loadData();
    renderInventory();
    renderAchievements();

    sendBtn.addEventListener('click', handleRequest);
    
    // Modal Logic
    document.getElementById('new-pot-btn').addEventListener('click', () => {
        document.getElementById('new-pot-modal').classList.remove('hidden');
    });
    document.getElementById('cancel-pot').addEventListener('click', () => {
        document.getElementById('new-pot-modal').classList.add('hidden');
    });
    document.getElementById('save-pot').addEventListener('click', registerPot);
    
    logTerm('info', 'HTCPCP/1.0 Client initialized. Ready for requests.');
}

/* ================== Local Storage logic ================== */
function loadData() {
    const inv = localStorage.getItem('pot-inventory');
    if (inv) inventory = JSON.parse(inv);
    else {
        // Defaults
        inventory = [
            { id: 'default', name: 'Default Coffee Pot', type: 'coffee', brews: 0 },
            { id: 'teapot', name: 'The Teapot', type: 'tea', brews: 0 }
        ];
        saveInventory();
    }
    
    // Update Pot selector based on inventory
    updatePotSelector();

    const ach = localStorage.getItem('418-achievements');
    if (ach) {
        const parsedAch = JSON.parse(ach);
        Object.keys(parsedAch).forEach(k => {
            if (achievements[k]) achievements[k].unlocked = parsedAch[k].unlocked;
        });
    }
}

function saveInventory() {
    localStorage.setItem('pot-inventory', JSON.stringify(inventory));
}
function saveAchievements() {
    localStorage.setItem('418-achievements', JSON.stringify(achievements));
}

/* ================== UI Renderers ================== */
function updatePotSelector() {
    const currentVal = potSelect.value;
    potSelect.innerHTML = '';
    inventory.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name + (p.type === 'tea' ? ' (Warning: Teapot)' : '');
        potSelect.appendChild(opt);
    });
    if (inventory.find(p => p.id === currentVal)) {
        potSelect.value = currentVal;
    }
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    inventory.forEach(pot => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <h3>${pot.name}</h3>
            <p>Type: ${pot.type}</p>
            <p>Brews: ${pot.brews}</p>
        `;
        grid.appendChild(div);
    });
}

function renderAchievements() {
    const grid = document.getElementById('achievement-grid');
    grid.innerHTML = '';
    Object.keys(achievements).forEach(id => {
        const ach = achievements[id];
        const div = document.createElement('div');
        div.className = `card achievement-card ${ach.unlocked ? 'unlocked' : ''}`;
        div.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <h3>${ach.title}</h3>
            <p>${ach.desc}</p>
        `;
        grid.appendChild(div);
    });
}

function registerPot() {
    const nameInput = document.getElementById('new-pot-name').value.trim();
    const typeSelect = document.getElementById('new-pot-type').value;
    
    if (!nameInput) return;
    
    const newId = 'pot-' + Date.now();
    inventory.push({ id: newId, name: nameInput, type: typeSelect, brews: 0 });
    saveInventory();
    
    renderInventory();
    updatePotSelector();
    
    document.getElementById('new-pot-name').value = '';
    document.getElementById('new-pot-modal').classList.add('hidden');
    
    logTerm('info', `Registered new ${typeSelect}: ${nameInput}`);
}

/* ================== Protocol Logic & Mock Engine ================== */
async function handleRequest() {
    const method = methodSelect.value;
    const potId = potSelect.value;
    const decaf = decafToggle.checked;
    
    const additions = Array.from(additionCheckboxes)
        .filter(c => c.checked)
        .map(c => c.value);

    // Find Pot
    const targetPot = inventory.find(p => p.id === potId);
    if(!targetPot) {
        logTerm('err', 'Target pot not found!');
        return;
    }

    // Build Request Text
    let reqText = `${method} coffee://custom-brew/${potId} HTCPCP/1.0\n`;
    reqText += `Host: 127.0.0.1\n`;
    reqText += `Content-Type: message/coffeepot\n`;
    if (additions.length > 0) {
        reqText += `Accept-Additions: ${additions.join(';')}\n`;
    }
    logTerm('req', '\n> ' + reqText.replace(/\n/g, '\n> '));

    // Reset UI
    actPot.className = 'pot';
    if(targetPot.type === 'tea') actPot.classList.add('is-teapot');
    if(decaf) actPot.classList.add('is-decaf');
    liquid.style.height = '0%';
    liquid.style.transition = 'none';
    stopSteam();
    
    brewStatus.textContent = 'CONNECTING...';
    sendBtn.disabled = true;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));

    // Response Logic
    if (method === 'BREW' || method === 'POST') {
        if (targetPot.type === 'tea') {
            // It's a teapot -> 418
            handle418Error();
        } else if (decaf) {
            // Teapots don't reach here. Coffee pot wanting decaf -> 503
            logTerm('res', '< HTTP/1.1 503 Service Unavailable\n< Content-Type: text/plain\n<\n< Decaffeinated coffee is temporarily unavailable.');
            brewStatus.textContent = '503 DECAF_REJECTED';
        } else {
            // Successful Brew
            executeBrew(targetPot);
        }
    } else if (method === 'GET' || method === 'PROPFIND') {
        logTerm('res', `< HTTP/1.1 200 OK\n< Content-Type: message/coffeepot\n<\n< type=${targetPot.type};brews=${targetPot.brews}`);
        brewStatus.textContent = '200 OK';
    } else if (method === 'WHEN') {
        // Technically WHEN should be sent when pouring milk.
        logTerm('res', `< HTTP/1.1 200 OK\n< Content-Type: message/coffeepot\n<\n< Pouring stopped.`);
        brewStatus.textContent = 'POURED';
    }

    sendBtn.disabled = false;
}

function handle418Error() {
    brewStatus.textContent = '418 I\'M A TEAPOT';
    actPot.classList.add('shaking');
    
    // Pick a random Easter egg flavor for the 418
    const rand = Math.random();
    let body = "I am a teapot and cannot brew coffee.";
    let achId = '418-standard';

    if (rand < 0.2) {
        body = "I'm a little teapot, short and stout.";
        achId = '418-shortstout';
    } else if (rand < 0.4) {
        body = "Tea, Earl Grey, Hot. (Wait, I'm just a teapot!)";
        achId = '418-earlgrey';
    } else if (rand < 0.6) {
        body = "Error: Attempted to brew coffee in a teapot.";
        achId = '418-notcoffee';
    }

    logTerm('err', `< HTTP/1.1 418 I'm a teapot\n< Content-Type: text/plain\n<\n< ${body}`);
    createSteam(true); // Angry steam
    unlockAchievement(achId);
    
    setTimeout(() => {
        actPot.classList.remove('shaking');
        stopSteam();
    }, 2000);
}

function executeBrew(targetPot) {
    logTerm('res', `< HTTP/1.1 200 OK\n< Content-Type: message/coffeepot\n<\n< Brewing commenced.`);
    brewStatus.textContent = 'BREWING...';
    actPot.classList.add('brewing');
    
    // Liquid fill
    setTimeout(() => { liquid.style.transition = 'height 2s ease-in-out'; liquid.style.height = '80%'; }, 50);
    
    createSteam(false);

    setTimeout(() => {
        actPot.classList.remove('brewing');
        brewStatus.textContent = 'DONE';
        targetPot.brews += 1;
        saveInventory();
        renderInventory();
        logTerm('info', `Brew finished for ${targetPot.name} (Total brews: ${targetPot.brews})`);
    }, 2500);
}

/* ================== Achievements ================== */
function unlockAchievement(id) {
    if (achievements[id] && !achievements[id].unlocked) {
        achievements[id].unlocked = true;
        saveAchievements();
        renderAchievements();
        logTerm('info', `*** ACHIEVEMENT UNLOCKED: ${achievements[id].title} ***`);
    }
}

/* ================== Terminal ================== */
function logTerm(type, message) {
    const div = document.createElement('div');
    div.className = `term-line ${type}`;
    div.textContent = message;
    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
}

/* ================== Animations ================== */
function createSteam(angry = false) {
    if (activeSteamInterval) clearInterval(activeSteamInterval);
    
    activeSteamInterval = setInterval(() => {
        const particle = document.createElement('div');
        particle.className = 'steam-particle';
        
        // Randomize
        const size = Math.random() * 20 + 20;
        const left = Math.random() * 80 + 10; // 10% to 90%
        const duration = Math.random() * 2 + (angry ? 1 : 2); // Faster if angry
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${left}%`;
        particle.style.animationDuration = `${duration}s`;
        
        if (angry) particle.style.background = '#fca5a5';
        
        steamLayer.appendChild(particle);
        
        // Cleanup
        setTimeout(() => {
            if (steamLayer.contains(particle)) steamLayer.removeChild(particle);
        }, duration * 1000);
        
    }, angry ? 200 : 400);
}

function stopSteam() {
    if (activeSteamInterval) {
        clearInterval(activeSteamInterval);
        activeSteamInterval = null;
    }
    // Fade existing steam out smoothly
    Array.from(steamLayer.children).forEach(c => {
        c.style.opacity = '0';
    });
    setTimeout(() => { steamLayer.innerHTML = ''; }, 1000);
}

// Start app
init();
