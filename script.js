class STBPlayer {
    constructor() {
        this.serverUrl = '';
        this.macAddress = '';
        this.port = '8080';
        this.isConnected = false;
        this.channels = [];
        this.currentChannel = null;
        this.profiles = JSON.parse(localStorage.getItem('stbProfiles')) || [];
        
        this.initializeApp();
    }

    initializeApp() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        this.loadProfiles();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Video player events
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        videoPlayer.addEventListener('error', () => this.onVideoError());
        videoPlayer.addEventListener('waiting', () => this.onVideoBuffering());
        videoPlayer.addEventListener('playing', () => this.onVideoPlaying());
    }

    async connectToServer() {
        this.serverUrl = document.getElementById('serverUrl').value;
        this.port = document.getElementById('serverPort').value;
        this.macAddress = document.getElementById('macAddress').value;
        const deviceType = document.getElementById('deviceType').value;

        if (!this.validateInputs()) {
            return;
        }

        this.updateStatus('🔄 Duke u lidhur me server...', 'loading');
        
        try {
            // Simulojmë lidhjen me serverin STB
            await this.simulateSTBConnection();
            
            this.isConnected = true;
            this.updateServerInfo();
            this.loadChannels();
            this.updateStatus('✅ U lidh me sukses!', 'success');
            
        } catch (error) {
            console.error('Gabim në lidhje:', error);
            this.updateStatus('❌ Gabim në lidhje me server', 'error');
        }
    }

    validateInputs() {
        if (!this.serverUrl || !this.port || !this.macAddress) {
            this.showMessage('Ju lutem plotësoni të gjitha fushat!', 'error');
            return false;
        }

        if (!this.isValidMacAddress(this.macAddress)) {
            this.showMessage('MAC Address jo valid! Format i pranueshëm: 00:1A:79:XX:XX:XX', 'error');
            return false;
        }

        return true;
    }

    isValidMacAddress(mac) {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac);
    }

    async simulateSTBConnection() {
        // Simulojmë një vonesë të lidhjes
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // 90% shans sukses për demonstrim
                if (Math.random() > 0.1) {
                    resolve({
                        status: 'connected',
                        server: this.serverUrl,
                        mac: this.macAddress,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    reject(new Error('Server-i nuk u gjet ose nuk është i disponueshëm'));
                }
            }, 2000);
        });
    }

    async loadChannels() {
        this.updateStatus('📡 Duke ngarkuar kanalet...', 'loading');
        
        try {
            // Kanale simulime për demonstrim
            const mockChannels = this.generateMockChannels();
            this.channels = mockChannels;
            
            this.displayChannels();
            this.updateStatus(`✅ U ngarkuan ${this.channels.length} kanale`, 'success');
            
        } catch (error) {
            console.error('Gabim në ngarkimin e kanaleve:', error);
            this.updateStatus('❌ Gabim në ngarkimin e kanaleve', 'error');
        }
    }

    generateMockChannels() {
        const categories = ['Shqipëri', 'Filma', 'Sport', 'Lajme', 'Dokumentar', 'Muzik', 'Fëmijë'];
        const qualities = ['SD', 'HD', 'FHD', '4K'];
        
        return Array.from({ length: 50 }, (_, i) => {
            const category = categories[Math.floor(Math.random() * categories.length)];
            const quality = qualities[Math.floor(Math.random() * qualities.length)];
            
            return {
                id: i + 1,
                name: `${this.getChannelName(i)} ${quality}`,
                url: this.generateStreamUrl(i, quality),
                category: category,
                quality: quality,
                bitrate: this.getBitrate(quality),
                resolution: this.getResolution(quality),
                isOnline: Math.random() > 0.1 // 90% online
            };
        });
    }

    getChannelName(index) {
        const names = [
            'RTSH', 'Top Channel', 'Klan', 'Vizion Plus', 'ABC News', 'Discovery', 
            'National Geographic', 'Film Hits', 'Action TV', 'Sports Max',
            'News 24', 'Music Box', 'Kids World', 'Movie Central', 'Documentary HD'
        ];
        return names[index % names.length] + ' ' + (Math.floor(index / names.length) + 1);
    }

    generateStreamUrl(channelId, quality) {
        // URL simulim stream-i
        const formats = ['m3u8', 'mp4', 'ts'];
        const format = formats[Math.floor(Math.random() * formats.length)];
        return `http://stream-server.com/channel${channelId}/${quality}.${format}`;
    }

    getBitrate(quality) {
        const bitrates = { 'SD': '1.5 Mbps', 'HD': '3 Mbps', 'FHD': '6 Mbps', '4K': '15 Mbps' };
        return bitrates[quality] || '1.5 Mbps';
    }

    getResolution(quality) {
        const resolutions = { 'SD': '720x576', 'HD': '1280x720', 'FHD': '1920x1080', '4K': '3840x2160' };
        return resolutions[quality] || '720x576';
    }

    displayChannels() {
        const channelList = document.getElementById('channelList');
        const categoryFilter = document.getElementById('categoryFilter');
        
        // Pastro listën
        channelList.innerHTML = '';
        
        // Përditëso kategoritë
        const categories = [...new Set(this.channels.map(ch => ch.category))];
        categoryFilter.innerHTML = '<option value="">Të gjitha kategoritë</option>';
        categories.forEach(cat => {
            categoryFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
        
        // Shfaq kanalet
        const filteredChannels = this.getFilteredChannels();
        
        if (filteredChannels.length === 0) {
            channelList.innerHTML = '<div class="empty-state">Nuk u gjetën kanale</div>';
            return;
        }
        
        filteredChannels.forEach(channel => {
            const channelElement = this.createChannelElement(channel);
            channelList.appendChild(channelElement);
        });
        
        this.updateChannelStats();
    }

    createChannelElement(channel) {
        const div = document.createElement('div');
        div.className = `channel-item ${channel.isOnline ? '' : 'offline'}`;
        div.innerHTML = `
            <div class="channel-info">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-meta">${channel.category} • ${channel.quality}</div>
            </div>
            <div class="channel-status">
                ${channel.isOnline ? '🟢' : '🔴'}
            </div>
        `;
        
        if (channel.isOnline) {
            div.onclick = () => this.playChannel(channel);
        }
        
        return div;
    }

    getFilteredChannels() {
        const searchTerm = document.getElementById('searchChannels').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const quality = document.getElementById('qualityFilter').value;
        
        return this.channels.filter(channel => {
            const matchesSearch = channel.name.toLowerCase().includes(searchTerm);
            const matchesCategory = !category || channel.category === category;
            const matchesQuality = !quality || channel.quality === quality;
            const isOnline = channel.isOnline;
            
            return matchesSearch && matchesCategory && matchesQuality && isOnline;
        });
    }

    playChannel(channel) {
        if (!channel.isOnline) {
            this.showMessage('Ky kanal nuk është online', 'warning');
            return;
        }
        
        this.currentChannel = channel;
        const videoPlayer = document.getElementById('videoPlayer');
        
        // Hiq aktivin nga të gjitha kanalet
        document.querySelectorAll('.channel-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Shto aktiv tek kanali i zgjedhur
        event.target.closest('.channel-item').classList.add('active');
        
        // Përditëso informacionin
        document.getElementById('currentChannelName').textContent = channel.name;
        document.getElementById('streamQuality').textContent = channel.quality;
        document.getElementById('streamBitrate').textContent = channel.bitrate;
        document.getElementById('streamResolution').textContent = channel.resolution;
        
        // Përpiqu të luajë stream-in
        try {
            videoPlayer.src = channel.url;
            videoPlayer.load();
            
            videoPlayer.play().then(() => {
                this.updateStatus(`▶️ Duke luajtur: ${channel.name}`, 'success');
            }).catch(error => {
                console.error('Gabim në play:', error);
                this.handleStreamError(channel);
            });
            
        } catch (error) {
            console.error('Gabim në ngarkimin e stream-it:', error);
            this.handleStreamError(channel);
        }
    }

    handleStreamError(channel) {
        this.showMessage(`Nuk mund të luhet stream-i për ${channel.name}. Mund të jetë CORS ose format i pambështetur.`, 'error');
        
        // Provim me stream fallback për demonstrim
        const fallbackUrl = this.getFallbackStreamUrl();
        if (fallbackUrl) {
            document.getElementById('videoPlayer').src = fallbackUrl;
        }
    }

    getFallbackStreamUrl() {
        // Një stream publik testues
        return 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }

    updateChannelStats() {
        const total = this.channels.length;
        const online = this.channels.filter(ch => ch.isOnline).length;
        
        document.getElementById('totalChannels').textContent = `Total: ${total}`;
        document.getElementById('onlineChannels').textContent = `Online: ${online}`;
    }

    updateServerInfo() {
        document.getElementById('serverStatus').textContent = 'Online';
        document.getElementById('serverStatus').className = 'status-online';
        document.getElementById('displayMac').textContent = this.macAddress;
        document.getElementById('displayUrl').textContent = `${this.serverUrl}:${this.port}`;
        document.getElementById('connectionTime').textContent = new Date().toLocaleTimeString();
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = message;
        
        // Ndrysho ngjyrën bazuar në tipin
        statusElement.className = '';
        if (type === 'error') statusElement.style.color = 'var(--error-color)';
        else if (type === 'success') statusElement.style.color = 'var(--success-color)';
        else if (type === 'loading') statusElement.style.color = 'var(--warning-color)';
        else statusElement.style.color = 'var(--text-color)';
    }

    updateTime() {
        document.getElementById('currentTime').textContent = new Date().toLocaleTimeString();
    }

    // Kontrollet e player-it
    togglePlay() {
        const videoPlayer = document.getElementById('videoPlayer');
        const playBtn = document.getElementById('playBtn');
        
        if (videoPlayer.paused) {
            videoPlayer.play();
            playBtn.innerHTML = '⏸️ Pause';
            document.getElementById('playerStatus').textContent = 'Playing';
        } else {
            videoPlayer.pause();
            playBtn.innerHTML = '▶️ Play';
            document.getElementById('playerStatus').textContent = 'Paused';
        }
    }

    toggleMute() {
        const videoPlayer = document.getElementById('videoPlayer');
        const muteBtn = document.getElementById('muteBtn');
        
        videoPlayer.muted = !videoPlayer.muted;
        muteBtn.innerHTML = videoPlayer.muted ? '🔇' : '🔊';
    }

    volumeUp() {
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.volume = Math.min(1, videoPlayer.volume + 0.1);
    }

    volumeDown() {
        const videoPlayer = document.getElementById('videoPlayer');
        videoPlayer.volume = Math.max(0, videoPlayer.volume - 0.1);
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.video-container');
        
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.error('Gabim në fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    reloadStream() {
        const videoPlayer = document.getElementById('videoPlayer');
        const currentTime = videoPlayer.currentTime;
        videoPlayer.src += ''; // Reload source
        videoPlayer.currentTime = currentTime;
        videoPlayer.play();
    }

    // Gjenerimi i MAC
    generateMac() {
        const prefixes = ['00:1A:79', '00:1B:67', '00:1C:43', '00:1D:33'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        
        const suffix = Array.from({ length: 3 }, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':');
        
        const mac = `${prefix}:${suffix}`.toUpperCase();
        document.getElementById('macAddress').value = mac;
    }

    // Menaxhimi i profileve
    saveProfile() {
        const profile = {
            id: Date.now(),
            name: `Profile ${this.profiles.length + 1}`,
            serverUrl: this.serverUrl,
            port: this.port,
            macAddress: this.macAddress,
            deviceType: document.getElementById('deviceType').value,
            createdAt: new Date().toISOString()
        };
        
        this.profiles.push(profile);
        localStorage.setItem('stbProfiles', JSON.stringify(this.profiles));
        this.showMessage('Profili u ruajt!', 'success');
    }

    loadProfiles() {
        const modal = document.getElementById('profilesModal');
        const profilesList = document.getElementById('profilesList');
        
        profilesList.innerHTML = '';
        
        if (this.profiles.length === 0) {
            profilesList.innerHTML = '<div class="empty-state">Nuk ka profile të ruajtura</div>';
        } else {
            this.profiles.forEach(profile => {
                const div = document.createElement('div');
                div.className = 'profile-item';
                div.innerHTML = `
                    <strong>${profile.name}</strong>
                    <div>${profile.serverUrl}:${profile.port}</div>
                    <div>MAC: ${profile.macAddress}</div>
                    <small>${new Date(profile.createdAt).toLocaleDateString()}</small>
                `;
                div.onclick = () => this.loadProfile(profile);
                profilesList.appendChild(div);
            });
        }
        
        modal.style.display = 'block';
    }

    loadProfile(profile) {
        document.getElementById('serverUrl').value = profile.serverUrl;
        document.getElementById('serverPort').value = profile.port;
        document.getElementById('macAddress').value = profile.macAddress;
        document.getElementById('deviceType').value = profile.deviceType;
        
        this.closeModal();
        this.showMessage(`Profili "${profile.name}" u ngarkua!`, 'success');
    }

    closeModal() {
        document.getElementById('profilesModal').style.display = 'none';
    }

    // Event handlers për video
    onVideoLoaded() {
        console.log('Video u ngarkua');
    }

    onVideoError() {
        this.showMessage('Gabim në ngarkimin e video. Kontrollo stream-in.', 'error');
    }

    onVideoBuffering() {
        this.updateStatus('🔄 Duke u buffuar...', 'loading');
    }

    onVideoPlaying() {
        this.updateStatus('▶️ Duke luajtur', 'success');
    }

    // Keyboard controls
    handleKeyboard(event) {
        const videoPlayer = document.getElementById('videoPlayer');
        
        switch(event.key) {
            case ' ':
                event.preventDefault();
                this.togglePlay();
                break;
            case 'f':
            case 'F':
                event.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
            case 'M':
                event.preventDefault();
                this.toggleMute();
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.volumeUp();
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.volumeDown();
                break;
            case 'ArrowRight':
                event.preventDefault();
                videoPlayer.currentTime += 10;
                break;
            case 'ArrowLeft':
                event.preventDefault();
                videoPlayer.currentTime -= 10;
                break;
        }
    }

    // Filtri i kanaleve
    filterChannels() {
        this.displayChannels();
    }

    // Shfaq mesazhe
    showMessage(message, type = 'info') {
        // Implementim i thjeshtë alert-i
        alert(`[${type.toUpperCase()}] ${message}`);
    }

    changeQuality() {
        const qualitySelector = document.getElementById('qualitySelector');
        const selectedQuality = qualitySelector.value;
        
        if (selectedQuality !== 'auto' && this.currentChannel) {
            // Në praktikë, kjo do të ndryshonte stream-in në cilësinë e zgjedhur
            this.showMessage(`Cilësia u ndryshua në: ${selectedQuality}`, 'info');
        }
    }
}

// Funksionet globale për butonat HTML
let stbPlayer;

function connectToServer() {
    if (!stbPlayer) stbPlayer = new STBPlayer();
    stbPlayer.connectToServer();
}

function generateMac() {
    if (!stbPlayer) stbPlayer = new STBPlayer();
    stbPlayer.generateMac();
}

function saveProfile() {
    if (!stbPlayer) stbPlayer = new STBPlayer();
    stbPlayer.saveProfile();
}

function loadProfiles() {
    if (!stbPlayer) stbPlayer = new STBPlayer();
    stbPlayer.loadProfiles();
}

function closeModal() {
    if (stbPlayer) stbPlayer.closeModal();
}

function filterChannels() {
    if (stbPlayer) stbPlayer.filterChannels();
}

function togglePlay() {
    if (stbPlayer) stbPlayer.togglePlay();
}

function toggleMute() {
    if (stbPlayer) stbPlayer.toggleMute();
}

function volumeUp() {
    if (stbPlayer) stbPlayer.volumeUp();
}

function volumeDown() {
    if (stbPlayer) stbPlayer.volumeDown();
}

function toggleFullscreen() {
    if (stbPlayer) stbPlayer.toggleFullscreen();
}

function reloadStream() {
    if (stbPlayer) stbPlayer.reloadStream();
}

function changeQuality() {
    if (stbPlayer) stbPlayer.changeQuality();
}

// Inicializimi kur faja të ngarkohet
document.addEventListener('DOMContentLoaded', function() {
    stbPlayer = new STBPlayer();
});

// Në script.js, shto këtë funksion për të kontrolluar formatet
function checkStreamCompatibility(url) {
    const supportedFormats = ['.m3u8', '.mp4', '.mpd', '.ts'];
    const isSupported = supportedFormats.some(format => url.includes(format));
    
    if (!isSupported) {
        console.warn('Format i pambështetur:', url);
        return false;
    }
    return true;
}

// Modifiko funksionin playChannel
function playChannel(channel) {
    if (!checkStreamCompatibility(channel.url)) {
        showMessage('Formati i stream-it nuk mbështetet nga browser-i', 'error');
        return;
    }
    // ... pjesa tjetër e kodit
}

// Shto këto stream-e testuese në klasën STBPlayer
getFallbackStreamUrls() {
    return [
        'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // HLS test
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // MP4 test
        'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8' // Live HLS test
    ];
}

// Modifiko handleStreamError
handleStreamError(channel) {
    console.error('Stream error për:', channel.name);
    
    const fallbackUrls = this.getFallbackStreamUrls();
    let currentFallbackIndex = 0;
    
    const tryNextFallback = () => {
        if (currentFallbackIndex < fallbackUrls.length) {
            const fallbackUrl = fallbackUrls[currentFallbackIndex];
            this.showMessage(`Duke provuar stream fallback ${currentFallbackIndex + 1}...`, 'info');
            
            const videoPlayer = document.getElementById('videoPlayer');
            videoPlayer.src = fallbackUrl;
            videoPlayer.load();
            
            videoPlayer.play().then(() => {
                this.showMessage('Stream fallback u lidh me sukses!', 'success');
            }).catch(() => {
                currentFallbackIndex++;
                tryNextFallback();
            });
        } else {
            this.showMessage('Të gjitha stream-et fallback dështuan', 'error');
        }
    };
    
    tryNextFallback();
}
// Shto këtë funksion për debug
setupVideoDebugging() {
    const videoPlayer = document.getElementById('videoPlayer');
    
    videoPlayer.addEventListener('error', (e) => {
        console.error('Video Error:', videoPlayer.error);
        console.error('Error Code:', videoPlayer.error?.code);
        console.error('Error Message:', videoPlayer.error?.message);
        
        this.showDetailedError(videoPlayer.error);
    });
    
    videoPlayer.addEventListener('loadstart', () => {
        console.log('Video load start');
        this.updateStatus('🔄 Duke filluar ngarkimin...', 'loading');
    });
    
    videoPlayer.addEventListener('canplay', () => {
        console.log('Video can play');
        this.updateStatus('✅ Video gati për luajtje', 'success');
    });
}

showDetailedError(error) {
    if (!error) {
        this.showMessage('Gabim i panjohur në video', 'error');
        return;
    }
    
    const errorMessages = {
        1: 'Video u anulua',
        2: 'Problem në rrjet',
        3: 'Video e dëmtuar ose format i pambështetur',
        4: 'Video nuk mund të dekodohet'
    };
    
    const message = errorMessages[error.code] || 'Gabim i panjohur në video';
    this.showMessage(`${message} (Kodi: ${error.code})`, 'error');
}

// Funksion për të përdorur CORS proxy
async getStreamWithProxy(url) {
    // Provim direkt
    try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) return url;
    } catch (error) {
        console.log('Stream kërkon CORS proxy');
    }
    
    // Përdor CORS proxy
    const proxyUrls = [
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        `https://cors-anywhere.herokuapp.com/${url}`
    ];
    
    return proxyUrls[0]; // Kthe proxy-n e parë
}

// Modifiko playChannel për të përdorur proxy
async playChannel(channel) {
    try {
        const streamUrl = await this.getStreamWithProxy(channel.url);
        const videoPlayer = document.getElementById('videoPlayer');
        
        videoPlayer.src = streamUrl;
        videoPlayer.load();
        
        await videoPlayer.play();
        this.updateStatus(`▶️ Duke luajtur: ${channel.name}`, 'success');
        
    } catch (error) {
        console.error('Gabim në play:', error);
        this.handleStreamError(channel);
    }
}
// Shto këtë në klasën STBPlayer
enableTestMode() {
    this.testMode = true;
    this.addTestChannels();
}

addTestChannels() {
    const testChannels = [
        {
            id: 9991,
            name: 'TEST - Big Buck Bunny (MP4)',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            category: 'Test',
            quality: 'HD',
            isOnline: true
        },
        {
            id: 9992,
            name: 'TEST - HLS Stream',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            category: 'Test',
            quality: 'HD',
            isOnline: true
        },
        {
            id: 9993,
            name: 'TEST - Elephant Dream (MP4)',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            category: 'Test',
            quality: 'HD',
            isOnline: true
        }
    ];
    
    this.channels = [...testChannels, ...this.channels];
    this.displayChannels();
    this.showMessage('Test Mode u aktivizua!', 'success');
}
