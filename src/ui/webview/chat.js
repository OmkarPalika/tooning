const vscode = acquireVsCodeApi();

const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');

function appendMessage(role, content, isTemporary = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    
    if (isTemporary) {
        msgDiv.id = 'temp-msg';
    } else {
        const temp = document.getElementById('temp-msg');
        if (temp) temp.remove();
    }

    if (role === 'user') {
        msgDiv.textContent = content;
    } else {
        msgDiv.innerHTML = marked.parse(content);
    }
    
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateStreamingMessage(content) {
    let msgDiv = document.getElementById('temp-msg');
    
    // If it doesn't exist, create it (we shouldn't hit this usually)
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant';
        msgDiv.id = 'temp-msg';
        chatContainer.appendChild(msgDiv);
    }
    
    msgDiv.innerHTML = marked.parse(content);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Ensure marked doesn't throw errors on partial markdown blocks
marked.setOptions({
    gfm: true,
    breaks: true
});

let workspaceFiles = [];
const popup = document.getElementById('autocomplete-popup');
let selectedPopupIndex = -1;

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'addMessage':
            appendMessage(message.role, message.content, message.role === 'assistant' && message.content === 'Analyzing your workspace...');
            break;
        case 'updateLastMessage':
            if (message.mode === 'stream') {
                updateStreamingMessage(message.content);
            } else {
                appendMessage('assistant', message.content);
            }
            break;
        case 'loadHistory':
            chatContainer.innerHTML = '';
            message.messages.forEach(msg => {
                appendMessage(msg.role, msg.content);
            });
            break;
        case 'indexState':
            const statusDiv = document.getElementById('indexing-status');
            const statusText = document.getElementById('indexing-text');
            if (message.state === 'indexing') {
                statusDiv.style.display = 'flex';
                statusText.textContent = message.msg;
            } else {
                statusDiv.style.display = 'none';
            }
            break;
        case 'fileList':
            workspaceFiles = message.files;
            break;
        case 'dashboardUpdate':
            const dashboard = document.getElementById('efficiency-dashboard');
            const rawVal = document.getElementById('raw-val');
            const toonVal = document.getElementById('toon-val');
            const rawBar = document.getElementById('raw-bar');
            const toonBar = document.getElementById('toon-bar');
            const badge = document.getElementById('savings-badge');
            const rerankBadge = document.getElementById('reranking-badge');

            const { rawTokens, toonTokens } = message;
            
            if (rawTokens > 0) {
                dashboard.classList.remove('hidden');
                rerankBadge.style.display = 'inline-block';
                rawVal.textContent = `${rawTokens.toLocaleString()} tokens`;
                toonVal.textContent = `${toonTokens.toLocaleString()} tokens`;
                
                const savings = Math.max(0, Math.round((1 - (toonTokens / rawTokens)) * 100));
                badge.textContent = `${savings}% Saving`;
                
                // Animate bars
                setTimeout(() => {
                    rawBar.style.width = '100%';
                    toonBar.style.width = `${Math.max(2, (toonTokens / rawTokens) * 100)}%`;
                }, 100);
            }
            break;
    }
});

function insertMention(fileName) {
    const text = promptInput.value;
    const cursor = promptInput.selectionStart || text.length;
    const lastAtIdx = text.lastIndexOf('@', cursor - 1);
    
    if (lastAtIdx !== -1) {
        const pre = text.substring(0, lastAtIdx);
        const post = text.substring(cursor);
        promptInput.value = pre + '@' + fileName + ' ' + post;
        
        // Focus and set cursor
        promptInput.focus();
        // Since it's a VS Code custom element, cursor setting might be tricky,
        // but we assume appending is fine.
    }
    popup.classList.add('hidden');
}

function updatePopup(search) {
    if (!search || workspaceFiles.length === 0) {
        popup.classList.add('hidden');
        return;
    }
    
    const term = search.toLowerCase();
    const hits = workspaceFiles.filter(f => f.toLowerCase().includes(term)).slice(0, 10);
    
    if (hits.length === 0) {
        popup.classList.add('hidden');
        return;
    }
    
    popup.innerHTML = '';
    hits.forEach((hit, idx) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        if (idx === 0) div.classList.add('selected');
        div.textContent = hit;
        div.onclick = () => insertMention(hit);
        popup.appendChild(div);
    });
    
    selectedPopupIndex = 0;
    popup.classList.remove('hidden');
}

promptInput.addEventListener('input', (e) => {
    const text = promptInput.value;
    const cursor = promptInput.selectionStart || text.length;
    
    // Find if we are typing after an @
    const lastAtIdx = text.lastIndexOf('@', cursor - 1);
    if (lastAtIdx !== -1) {
        const afterAt = text.substring(lastAtIdx + 1, cursor);
        if (!afterAt.includes(' ')) {
            updatePopup(afterAt || " "); // show all if just @
            return;
        }
    }
    popup.classList.add('hidden');
});

sendBtn.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (text) {
        vscode.postMessage({ type: 'prompt', value: text });
        promptInput.value = '';
        popup.classList.add('hidden');
    }
});

promptInput.addEventListener('keydown', (e) => {
    if (!popup.classList.contains('hidden')) {
        const items = popup.getElementsByClassName('autocomplete-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (selectedPopupIndex < items.length - 1) {
                if (items[selectedPopupIndex]) items[selectedPopupIndex].classList.remove('selected');
                selectedPopupIndex++;
                items[selectedPopupIndex].classList.add('selected');
            }
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (selectedPopupIndex > 0) {
                if (items[selectedPopupIndex]) items[selectedPopupIndex].classList.remove('selected');
                selectedPopupIndex--;
                items[selectedPopupIndex].classList.add('selected');
            }
            return;
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (items[selectedPopupIndex]) {
                insertMention(items[selectedPopupIndex].textContent);
            }
            return;
        }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

// Delegated listener for dynamically inserted buttons
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.copy-toon-btn');
    if (btn) {
        const raw = btn.getAttribute('data-toon');
        if (raw) {
            try {
                const decoded = decodeURIComponent(raw);
                vscode.postMessage({ type: 'copyToClipboard', value: decoded });
            } catch (err) {
                console.error('Failed to decode TOON payload', err);
            }
        }
    }
});

// Load history on start
vscode.postMessage({ type: 'ready' });
