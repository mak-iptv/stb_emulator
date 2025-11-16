class MAGWebPlayer {
    constructor() {
        this.serverUrl = '';
        this.macAddress = '';
        this.channels = [];
        this.favorites = [];
        this.player = null;
        this.isConnected = false;
        this.currentChannel = null;
        
        this.initializeApp();
    }

    initializeApp() {
        this.initPlayer();
        this.loadConfig();
        this.setupEventListeners();
        this.setupNavigation();
        
        console.log('🎬 MAG Web Player u inicializua');
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('channelSearch').addEventListener('input', (e) => {
            this.filterChannels(e.target.value);
        });

        // Category filtering
        document.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.filterByCategory(item.dataset.category);
            });
        });

        // Enter key for connection
        document.getElementById('serverUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToServer();
        });

        document.getElementById('macAddress').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToServer();
        });
    }

    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }

    initPlayer() {
        this.player = videojs('videoPlayer', {
            controls: true,
            autoplay: true,
            preload: 'auto',
            responsive: true,
            fluid: true,
            html5: {
                vhs: {
                    overrideNative: true,
                    enableLowInitialPlaylist: true,
                    smoothQualityChange: true,
                    fastQualityChange: true
                }
            },
            playbackRates: [0.5, 1, 1.25, 1.5, 2]
        });

        // Player events
        this.player.on('loadstart', () => {
            this.updatePlayerStatus('Duke ngarkuar...');
        });

        this.player.on('playing', () => {
            this.updatePlayerStatus('Duke luajtur');
        });

        this.player.on('error', () => {
            this.updatePlayerStatus('Gabim në luajtje');
        });
    }

    async connectToServer() {
        this.serverUrl = document.getElementById('serverUrl').value.trim();
        this.macAddress = document.getElementById('macAddress').value.trim().toUpperCase();

        if (!this.validateInputs()) return;

        this.showLoading(true);
        this.updateConnectionStatus('Duke u lidhur...', 'warning');

        try {
            // Test connection
            await this.testConnection();
            
            // Get channels list
            await this.getChannelsList();
            
            // Update UI
            this.isConnected = true;
            this.updateConnectionStatus('I lidhur', 'connected');
            this.saveConfig();
            this.switchTab('channels');
            
            this.showSuccess('Lidhja u krye me sukses!');
            
        } catch (error) {
            console.error('❌ Gabim në lidhje:', error);
            this.updateConnectionStatus('Gabim në lidhje', 'disconnected');
            this.showError(`Gabim: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    validateInputs() {
        if (!this.serverUrl || !this.macAddress) {
            this.showError('Ju lutem plotësoni të gjitha fushat!');
            return false;
        }

        // Validate URL format
        if (!this.serverUrl.startsWith('http')) {
            this.showError('URL duhet të fillojë me http:// ose https://');
            return false;
        }

        // Validate MAC format
        const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
        if (!macRegex.test(this.macAddress)) {
            this.showError('MAC adresë e gabuar. Përdorni format: 00:1A:79:XX:XX:XX');
            return false;
        }

        return true;
    }

    async testConnection() {
        console.log('🔍 Duke testuar lidhjen...');

        const testUrls = [
            `${this.serverUrl}/portal.php`,
            `${this.serverUrl}/c/`,
            `${this.serverUrl}/`,
            `${this.serverUrl}/player_api.php`
        ];

        for (let url of testUrls) {
            try {
                console.log(`🔄 Duke testuar: ${url}`);
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'MAG-Web-Player/1.0'
                    }
                });
                
                if (response.ok) {
                    console.log(`✅ URL funksionon: ${url}`);
                    this.serverUrl = url.split('/').slice(0, -1).join('/'); // Normalize URL
                    return true;
                }
            } catch (error) {
                console.log(`❌ URL nuk funksionon: ${url}`);
                continue;
            }
        }
        
        throw new Error('Serveri nuk u gjet. Kontrolloni URL dhe portën.');
    }

    async getChannelsList() {
        console.log('📡 Duke marrë listën e kanaleve...');

        const channelsUrl = `${this.serverUrl}/portal.php?type=itv&action=get_live_streams`;

        try {
            const response = await fetch(channelsUrl, {
                method: 'GET',
                headers: {
                    'MAC': this.macAddress,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Serveri ktheu gabim: ${response.status}`);
            }

            const data = await response.json();
            console.log('📊 Të dhënat e marra:', data);

            this.processChannelsData(data);
            
        } catch (error) {
            console.error('❌ Gabim në marrjen e kanaleve:', error);
            
            // Use demo data for testing
            this.useDemoChannels();
            throw new Error('Nuk mund të merren kanale. Shiko konzolën për detaje.');
        }
    }

    processChannelsData(data) {
        if (Array.isArray(data)) {
            this.channels = data.map((ch, index) => ({
                id: ch.id || ch.stream_id || index + 1,
                name: ch.name || ch.title || `Kanal ${index + 1}`,
                number: ch.num || ch.number || index + 1,
                url: this.buildStreamUrl(ch.stream_id || ch.id || index + 1),
                logo: ch.logo || ch.logo_url || '',
                category: ch.category_name || 'entertainment',
                isFavorite: false
            }));
        } else if (data.data && Array.isArray(data.data)) {
            this.channels = data.data.map((ch, index) => ({
                id: ch.id || ch.stream_id || index + 1,
                name: ch.name || ch.title || `Kanal ${index + 1}`,
                number: ch.num || ch.number || index + 1,
                url: this.buildStreamUrl(ch.stream_id || ch.id || index + 1),
                logo: ch.logo || ch.logo_url || '',
                category: ch.category_name || 'entertainment',
                isFavorite: false
            }));
        } else {
            throw new Error('Format i panjohur i të dhënave nga serveri');
        }

        if (this.channels.length === 0) {
            throw new Error('Nuk u gjetën kanale në server');
        }

        this.displayChannels();
    }

    buildStreamUrl(streamId) {
        return `${this.serverUrl}/live/${this.macAddress}/${streamId}.m3u8`;
    }

    useDemoChannels() {
        console.log('🎭 Përdorim të dhëna demo');
        
        this.channels = [
            { id: 1, name: 'RTSH 1', number: '1', url: 'demo', logo: '', category: 'entertainment', isFavorite: false },
            { id: 2, name: 'RTSH 2', number: '2', url: 'demo', logo: '', category: 'entertainment', isFavorite: false },
            { id: 3, name: 'Top Channel', number: '3', url: 'demo', logo: '', category: 'entertainment', isFavorite: false },
            { id: 4, name: 'Klan TV', number: '4', url: 'demo', logo: '', category: 'entertainment', isFavorite: false },
            { id: 5, name: 'Vizion Plus', number: '5', url: 'demo', logo: '', category: 'entertainment', isFavorite: false },
            { id: 6, name: 'CNN International', number: '6', url: 'demo', logo: '', category: 'news', isFavorite: false },
            { id: 7, name: 'BBC World', number: '7', url: 'demo', logo: '', category: 'news', isFavorite: false },
            { id: 8, name: 'EuroSport', number: '8', url: 'demo', logo: '', category: 'sports', isFavorite: false }
        ];

        this.displayChannels();
    }

    displayChannels() {
        const channelsGrid = document.getElementById('channelsGrid');
        const noChannels = document.getElementById('noChannels');
        
        if (this.channels.length === 0) {
            noChannels.style.display = 'block';
            channelsGrid.innerHTML = '';
            return;
        }

        noChannels.style.display = 'none';
        channelsGrid.innerHTML = '';

        this.channels.forEach(channel => {
            const channelElement = this.createChannelElement(channel);
            channelsGrid.appendChild(channelElement);
        });

        console.log(`✅ Shfaqur ${this.channels.length} kanale`);
    }

    createChannelElement(channel) {
        const div = document.createElement('div');
        div.className = 'channel-card';
        div.innerHTML = `
            <div class="channel-logo">
                ${channel.logo ? 
                    `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'">` : 
                    `<i class="fas fa-tv"></i>`
                }
            </div>
            <div class="channel-name">${channel.name}</div>
            <div class="channel-number">${channel.number}</div>
            <div class="channel-actions">
                <button class="btn-favorite ${channel.isFavorite ? 'active' : ''}" 
                        onclick="magApp.toggleFavorite(${channel.id})">
                    <i class="fas ${channel.isFavorite ? 'fa-star' : 'fa-star'}"></i>
                </button>
            </div>
        `;

        if (channel.url !== 'demo') {
            div.addEventListener('click', () => this.playChannel(channel));
        } else {
            div.style.opacity = '0.6';
            div.title = 'Kanale demo - Vendosni serverin tuaj real';
        }

        return div;
    }

    playChannel(channel) {
        if (channel.url === 'demo') {
            this.showInfo('Kjo është vetëm demonstrues. Vendosni serverin tuaj real për të luajtur kanale.');
            return;
        }

        this.currentChannel = channel;
        this.showPlayer();
        this.updatePlayerUI();

        if (Hls.isSupported()) {
            this.playHlsStream(channel.url);
        } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
            this.playNativeHls(channel.url);
        } else {
            this.showError('Shfletuesi juaj nuk mbështet HLS streaming.');
        }
    }

    playHlsStream(url) {
        if (this.hls) {
            this.hls.destroy();
        }

        this.hls = new Hls({
            enableWorker: false,
            lowLatencyMode: true,
            backBufferLength: 90
        });

        this.hls.loadSource(url);
        this.hls.attachMedia(this.player.tech().el);

        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.player.play();
            this.updatePlayerStatus('Duke luajtur');
        });

        this.hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('❌ Gabim HLS:', data);
            if (data.fatal) {
                this.showError('Gabim në luajtjen e stream-it. Kontrolloni lidhjen.');
            }
        });
    }

    playNativeHls(url) {
        this.player.src({
            src: url,
            type: 'application/x-mpegURL'
        });
        this.player.play();
    }

    showPlayer() {
        document.getElementById('playerSection').classList.add('active');
    }

    closePlayer() {
        document.getElementById('playerSection').classList.remove('active');
        if (this.player) {
            this.player.pause();
        }
        if (this.hls) {
            this.hls.destroy();
        }
    }

    updatePlayerUI() {
        document.getElementById('nowPlaying').textContent = this.currentChannel.name;
        document.getElementById('userMac').textContent = `MAC: ${this.macAddress}`;
    }

    updatePlayerStatus(status) {
        document.getElementById('playerStatus').textContent = status;
    }

    updateConnectionStatus(status, type) {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.innerHTML = `<i class="fas fa-wifi"></i><span>${status}</span>`;
        statusElement.className = `connection-status ${type}`;
    }

    filterChannels(searchTerm) {
        const filtered = this.channels.filter(channel => 
            channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.number.toString().includes(searchTerm)
        );
        this.displayFilteredChannels(filtered);
    }

    filterByCategory(category) {
        if (category === 'all') {
            this.displayChannels();
        } else {
            const filtered = this.channels.filter(channel => channel.category === category);
            this.displayFilteredChannels(filtered);
        }
    }

    displayFilteredChannels(channels) {
        const channelsGrid = document.getElementById('channelsGrid');
        channelsGrid.innerHTML = '';

        if (channels.length === 0) {
            channelsGrid.innerHTML = `
                <div class="no-channels" style="grid-column: 1 / -1;">
                    <i class="fas fa-search"></i>
                    <h3>Nuk u gjetën kanale</h3>
                    <p>Provoni një kërkim tjetër</p>
                </div>
            `;
            return;
        }

        channels.forEach(channel => {
            const channelElement = this.createChannelElement(channel);
            channelsGrid.appendChild(channelElement);
        });
    }

    toggleFavorite(channelId) {
        const channel = this.channels.find(ch => ch.id === channelId);
        if (channel) {
            channel.isFavorite = !channel.isFavorite;
            this.saveFavorites();
            this.displayChannels();
        }
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.classList.toggle('active', show);
    }

    showError(message) {
        alert(`❌ ${message}`);
    }

    showSuccess(message) {
        console.log(`✅ ${message}`);
        // Mund të shtoni toast notification këtu
    }

    showInfo(message) {
        alert(`ℹ️ ${message}`);
    }

    saveConfig() {
        const config = {
            serverUrl: this.serverUrl,
            macAddress: this.macAddress,
            channels: this.channels,
            favorites: this.favorites
        };
        localStorage.setItem('magPlayerConfig', JSON.stringify(config));
    }

    loadConfig() {
        const saved = localStorage.getItem('magPlayerConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                this.serverUrl = config.serverUrl || '';
                this.macAddress = config.macAddress || '';
                this.channels = config.channels || [];
                this.favorites = config.favorites || [];

                document.getElementById('serverUrl').value = this.serverUrl;
                document.getElementById('macAddress').value = this.macAddress;

                if (this.channels.length > 0) {
                    this.displayChannels();
                }
            } catch (error) {
                console.error('Gabim në leximin e konfigurimit:', error);
            }
        }
    }

    saveFavorites() {
        this.favorites = this.channels.filter(ch => ch.isFavorite).map(ch => ch.id);
        this.saveConfig();
    }
}

// Global functions for HTML buttons
const magApp = new MAGWebPlayer();

function connectToServer() {
    magApp.connectToServer();
}

function clearConfig() {
    if (confirm('Jeni i sigurt që dëshironi të pastroni konfigurimin?')) {
        localStorage.removeItem('magPlayerConfig');
        document.getElementById('serverUrl').value = 'http://';
        document.getElementById('macAddress').value = '00:1A:79:';
        magApp.channels = [];
        magApp.displayChannels();
        magApp.updateConnectionStatus('I palidhur', 'disconnected');
    }
}

function refreshChannels() {
    if (magApp.isConnected) {
        magApp.getChannelsList();
    } else {
        magApp.showError('Lidhuni fillimisht me serverin.');
    }
}

function closePlayer() {
    magApp.closePlayer();
}

// Test functions
async function testURL() {
    const url = document.getElementById('serverUrl').value.trim();
    const results = document.getElementById('testResults');
    
    if (!url) {
        results.innerHTML = '<div style="color: #ef4444;">❌ Ju lutem shkruani URL</div>';
        return;
    }
    
    results.innerHTML = '<div style="color: #f59e0b;">🔄 Duke testuar URL...</div>';
    
    try {
        if (!url.startsWith('http')) {
            throw new Error('URL duhet të fillojë me http:// ose https://');
        }
        
        const response = await fetch(url, { method: 'HEAD' });
        
        results.innerHTML = `
            <div style="color: #10b981;">
                ✅ URL e saktë<br>
                📍 Status: ${response.status} ${response.statusText}<br>
                🌐 Serveri është i arritshëm
            </div>
        `;
        
    } catch (error) {
        results.innerHTML = `
            <div style="color: #ef4444;">
                ❌ Problem me URL:<br>
                ${error.message}<br>
                🔧 Kontrolloni: http://serveri:port
            </div>
        `;
    }
}

function testMAC() {
    const mac = document.getElementById('macAddress').value.trim().toUpperCase();
    const results = document.getElementById('testResults');
    
    if (!mac) {
        results.innerHTML = '<div style="color: #ef4444;">❌ Ju lutem shkruani MAC adresën</div>';
        return;
    }
    
    const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
    
    if (macRegex.test(mac)) {
        results.innerHTML = `
            <div style="color: #10b981;">
                ✅ MAC adresë e saktë<br>
                🔢 Format: ${mac}<br>
                📏 Gjatësi: ${mac.length} karaktere
            </div>
        `;
    } else {
        results.innerHTML = `
            <div style="color: #ef4444;">
                ❌ Format i gabuar MAC<br>
                📝 Shembuj të saktë:<br>
                • 00:1A:79:AB:CD:EF<br>
                • 00-1A-79-12-34-56<br>
                🔢 Duhet 12 karaktere hex me : ose -
            </div>
        `;
    }
}

async function testFullConnection() {
    const url = document.getElementById('serverUrl').value.trim();
    const mac = document.getElementById('macAddress').value.trim().toUpperCase();
    const results = document.getElementById('testResults');
    
    if (!url || !mac) {
        results.innerHTML = '<div style="color: #ef4444;">❌ Plotësoni të dyja fushat</div>';
        return;
    }
    
    results.innerHTML = '<div style="color: #f59e0b;">🔄 Duke testuar lidhjen e plotë...</div>';
    
    try {
        // Test URL
        const urlTest = await fetch(url, { method: 'HEAD' });
        
        // Test MAC format
        const macRegex = /^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/;
        if (!macRegex.test(mac)) {
            throw new Error('MAC adresë e gabuar');
        }
        
        results.innerHTML = `
            <div style="color: #10b981;">
                ✅ ✅ Testi kaloi me sukses!<br>
                🌐 Serveri: I arritshëm<br>
                📟 MAC: Format i saktë<br>
                🚀 Gati për lidhje
            </div>
        `;
        
    } catch (error) {
        results.innerHTML = `
            <div style="color: #ef4444;">
                ❌ Testi dështoi:<br>
                ${error.message}<br>
                🔧 Kontrolloni:<br>
                • URL të saktë me port<br>
                • MAC adresën e saktë<br>
                • Internet connection
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 MAG Web Player u ngarkua');
});
