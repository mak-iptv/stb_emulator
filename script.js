let channels = [];
let currentChannel = null;
let isMuted = false;

// Funksioni për të lidhur me server STB
async function loadSTBChannels() {
    const serverUrl = document.getElementById('serverUrl').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!serverUrl || !username || !password) {
        alert('Ju lutem plotësoni të gjitha fushat!');
        return;
    }
    
    updateStatus('Duke u lidhur me server...', 'loading');
    
    try {
        // Simulim të dhënash STB (në praktikë do të kishe nevojë për API të vërtetë)
        const mockChannels = [
            { name: 'RTSH 1 HD', url: 'http://example.com/stream1.m3u8', category: 'Shqipëri', quality: 'HD' },
            { name: 'RTSH 2', url: 'http://example.com/stream2.m3u8', category: 'Shqipëri', quality: 'SD' },
            { name: 'Top Channel HD', url: 'http://example.com/stream3.m3u8', category: 'Shqipëri', quality: 'HD' },
            { name: 'CNN International', url: 'http://example.com/stream4.m3u8', category: 'Ndotëror', quality: 'HD' },
            { name: 'Discovery Science', url: 'http://example.com/stream5.m3u8', category: 'Dokumentar', quality: 'HD' }
        ];
        
        channels = mockChannels;
        displayChannels();
        updateStatus('I lidhur me sukses', 'connected');
        
    } catch (error) {
        console.error('Gabim në lidhje:', error);
        updateStatus('Gabim në lidhje', 'error');
    }
}

// Funksioni për ngarkimin e skedarit M3U
function loadM3UFile() {
    const fileInput = document.getElementById('m3uFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Zgjidhni një skedar M3U!');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        parseM3UContent(e.target.result);
        displayChannels();
        updateStatus(`U ngarkuan ${channels.length} kanale`, 'success');
    };
    
    reader.onerror = function() {
        updateStatus('Gabim në leximin e skedarit', 'error');
    };
    
    reader.readAsText(file);
}

// Funksioni për parsimin e përmbajtjes M3U
function parseM3UContent(content) {
    channels = [];
    const lines = content.split('\n');
    let currentChannel = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
            // Nxjerr informacionin e kanalit
            const info = parseExtinf(line);
            currentChannel = {
                name: info.name,
                url: '',
                category: info.group || 'Të tjera',
                quality: info.quality || 'SD'
            };
        } else if (line && !line.startsWith('#') && currentChannel.name) {
            // URL e stream-it
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {};
        }
    }
}

// Funksioni për parsimin e linjës EXTINF
function parseExtinf(extinfLine) {
    const match = extinfLine.match(/#EXTINF:.*?,(.*)$/);
    const name = match ? match[1].trim() : 'Kanal i panjohur';
    
    // Nxjerr group/tvg-group nëse ekziston
    const groupMatch = extinfLine.match(/group-title="([^"]*)"/);
    const group = groupMatch ? groupMatch[1] : 'Të tjera';
    
    // Përcakton quality bazuar në emër
    let quality = 'SD';
    if (name.includes('HD')) quality = 'HD';
    if (name.includes('4K')) quality = '4K';
    if (name.includes('FHD')) quality = 'FHD';
    
    return { name, group, quality };
}

// Funksioni për shfaqjen e kanaleve
function displayChannels() {
    const channelList = document.getElementById('channelList');
    const categoryFilter = document.getElementById('categoryFilter');
    
    channelList.innerHTML = '';
    
    // Përditëso filterin e kategorive
    const categories = [...new Set(channels.map(ch => ch.category))];
    categoryFilter.innerHTML = '<option value="">Të gjitha kategoritë</option>';
    categories.forEach(cat => {
        categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
    
    // Shfaq kanalet e filtruara
    const filteredChannels = getFilteredChannels();
    
    filteredChannels.forEach((channel, index) => {
        const channelElement = document.createElement('div');
        channelElement.className = 'channel-item';
        channelElement.innerHTML = `
            <strong>${channel.name}</strong>
            <div style="font-size: 12px; opacity: 0.8;">
                ${channel.category} • ${channel.quality}
            </div>
        `;
        
        channelElement.onclick = () => playChannel(channel);
        channelList.appendChild(channelElement);
    });
    
    document.getElementById('channelCount').textContent = `Kanale: ${filteredChannels.length}`;
}

// Funksioni për luajtjen e kanalit
function playChannel(channel) {
    const videoPlayer = document.getElementById('videoPlayer');
    const currentChannelElement = document.getElementById('currentChannel');
    
    // Hiq klasën active nga të gjitha kanalet
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Shto klasën active tek kanali i zgjedhur
    event.target.closest('.channel-item').classList.add('active');
    
    currentChannel = channel;
    currentChannelElement.textContent = `${channel.name} (${channel.quality})`;
    
    try {
        videoPlayer.src = channel.url;
        videoPlayer.load();
        
        videoPlayer.play().then(() => {
            updateStatus(`Duke luajtur: ${channel.name}`, 'playing');
        }).catch(e => {
            console.error('Gabim në play:', e);
            updateStatus('Gabim në luajtje - kontrollo stream-in', 'error');
        });
        
    } catch (error) {
        console.error('Gabim:', error);
        updateStatus('Gabim në ngarkimin e stream-it', 'error');
    }
}

// Funksionet e filtrit
function getFilteredChannels() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;
    
    return channels.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !category || channel.category === category;
        return matchesSearch && matchesCategory;
    });
}

function filterChannels() {
    displayChannels();
}

// Kontrollet e player-it
function toggleFullscreen() {
    const videoContainer = document.querySelector('.video-container');
    
    if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
            console.error('Gabim në fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function toggleMute() {
    const videoPlayer = document.getElementById('videoPlayer');
    const muteButton = document.querySelector('.player-controls button:nth-child(2)');
    
    isMuted = !isMuted;
    videoPlayer.muted = isMuted;
    muteButton.textContent = isMuted ? '🔊' : '🔇';
}

// Përditësimi i statusit
function updateStatus(message, type) {
    const statusElement = document.getElementById('connectionStatus');
    statusElement.textContent = message;
    
    statusElement.className = '';
    if (type === 'error') statusElement.style.color = '#ff6b6b';
    else if (type === 'success') statusElement.style.color = '#51cf66';
    else if (type === 'loading') statusElement.style.color = '#ffd700';
    else statusElement.style.color = 'white';
}

// Event listeners për keyboard shortcuts
document.addEventListener('keydown', function(e) {
    const videoPlayer = document.getElementById('videoPlayer');
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            if (videoPlayer.paused) videoPlayer.play();
            else videoPlayer.pause();
            break;
        case 'f':
        case 'F':
            toggleFullscreen();
            break;
        case 'm':
        case 'M':
            toggleMute();
            break;
    }
});

// Inicializimi
document.addEventListener('DOMContentLoaded', function() {
    updateStatus('Gati për përdorim', 'success');
});
