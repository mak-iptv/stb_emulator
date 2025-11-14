class StalkerPortalPlayer {
    constructor() {
        this.portalUrl = '';
        this.macAddress = '';
        this.token = '';
        this.channels = [];
        this.categories = [];
        this.currentChannel = null;
        
        this.elements = {
            portalUrl: document.getElementById('portalUrl'),
            macAddressInput: document.getElementById('macAddressInput'),
            username: document.getElementById('username'),
            password: document.getElementById('password'),
            connectBtn: document.getElementById('connectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            connectionInfo: document.getElementById('connectionInfo'),
            serverInfo: document.getElementById('serverInfo'),
            videoPlayer: document.getElementById('videoPlayer'),
            loading: document.getElementById('loading'),
            playerControls: document.getElementById('playerControls'),
            categoriesContainer: document.getElementById('categoriesContainer'),
            categoriesList: document.getElementById('categoriesList'),
            channelsContainer: document.getElementById('channelsContainer'),
            channelsList: document.getElementById('channelsList'),
            logContainer: document.getElementById('logContainer')
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedConfig();
        this.log('Player i inicializuar');
    }

    setupEventListeners() {
        this.elements.connectBtn.addEventListener('click', () => {
            this.connectToPortal();
        });

        // Kontrollet e videos
        document.getElementById('playBtn').addEventListener('click', () => {
            this.elements.videoPlayer.play();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.elements.videoPlayer.pause();
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            this.stopPlayback();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }

    async connectToPortal() {
        this.portalUrl = this.elements.portalUrl.value.trim();
        this.macAddress = this.elements.macAddressInput.value.trim();
        const username = this.elements.username.value.trim();
        const password = this.elements.password.value.trim();

        if (!this.portalUrl || !this.macAddress) {
            this.log('Gabim: URL dhe MAC adresa janë të detyrueshme', 'error');
            return;
        }

        this.showLoading();
        this.elements.connectBtn.disabled = true;
        this.updateStatus('Duke u lidhur...');

        try {
            // Hapi 1: Handshake me portal
            await this.handshake();
            
            // Hapi 2: Marr token
            await this.getToken(username, password);
            
            // Hapi 3: Merr informacion profili
            await this.getProfile();
            
            // Hapi 4: Merr kanalet
            await this.getChannels();
            
            this.log('U lidh me sukses me portal!', 'success');
            this.showPlayerInterface();
            
        } catch (error) {
            this.log('Gabim në lidhje: ' + error.message, 'error');
            this.updateStatus('Lidhja dështoi');
        } finally {
            this.hideLoading();
            this.elements.connectBtn.disabled = false;
        }
    }

    async handshake() {
        this.log('Duke kryer handshake...');
        
        const handshakeUrl = `${this.portalUrl}/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
        
        const response = await fetch(handshakeUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'X-User-Agent': 'Model: MAG250; Link: Ethernet'
            }
        });

        if (!response.ok) {
            throw new Error(`Handshake dështoi: ${response.status}`);
        }

        const data = await response.json();
        this.log('Handshake i suksesshëm');
        return data;
    }

    async getToken(username, password) {
        this.log('Duke marrë token...');
        
        let authUrl = `${this.portalUrl}/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
        
        // Nëse ka credentials, përdor autentikim
        if (username && password) {
            authUrl += `&login=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        } else {
            // Autentikim me MAC
            authUrl += `&mac=${this.macAddress}`;
        }

        const response = await fetch(authUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'X-User-Agent': 'Model: MAG250; Link: Ethernet',
                'MAC': this.macAddress
            }
        });

        if (!response.ok) {
            throw new Error(`Autentikimi dështoi: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.js && data.js.token) {
            this.token = data.js.token;
            this.log('Token i marrë: ' + this.token.substring(0, 10) + '...', 'success');
        } else {
            throw new Error('Nuk u gjet token në përgjigje');
        }
    }

    async getProfile() {
        this.log('Duke marrë informacion profili...');
        
        const profileUrl = `${this.portalUrl}/server/load.php?type=stb&action=get_profile&token=${this.token}&JsHttpRequest=1-xml`;
        
        const response = await fetch(profileUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                'MAC': this.macAddress
            }
        });

        const data = await response.json();
        this.displayServerInfo(data);
        this.log('Profili i marrë');
    }

    async getChannels() {
        this.log('Duke marrë listën e kanaleve...');
        
        const channelsUrl = `${this.portalUrl}/server/load.php?type=stb&action=get_all_channels&token=${this.token}&JsHttpRequest=1-xml`;
        
        const response = await fetch(channelsUrl, {
            headers: {
                'MAC': this.macAddress
            }
        });

        const data = await response.json();
        
        if (data.js && data.js.data) {
            this.channels = data.js.data;
            this.displayChannels();
            this.log(`U gjetën ${this.channels.length} kanale`, 'success');
        }
    }

    displayServerInfo(profileData) {
        let infoHTML = '';
        
        if (profileData.js && profileData.js.data) {
            const info = profileData.js.data;
            infoHTML = `
                <p><strong>Server:</strong> ${this.portalUrl}</p>
                <p><strong>MAC:</strong> ${this.macAddress}</p>
                <p><strong>Status:</strong> <span style="color: #28a745;">I lidhur</span></p>
                ${info.full_name ? `<p><strong>Abonues:</strong> ${info.full_name}</p>` : ''}
                ${info.license ? `<p><strong>Licencë:</strong> ${info.license}</p>` : ''}
            `;
        }
        
        this.elements.serverInfo.innerHTML = infoHTML;
        this.elements.connectionInfo.style.display = 'block';
        this.updateStatus('I lidhur');
    }

    displayChannels() {
        this.elements.channelsList.innerHTML = '';
        
        this.channels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel';
            channelElement.innerHTML = `
                <strong>${channel.name}</strong>
                ${channel.Number ? `<br><small>Numri: ${channel.Number}</small>` : ''}
            `;
            
            channelElement.addEventListener('click', () => {
                this.playChannel(channel);
            });
            
            this.elements.channelsList.appendChild(channelElement);
        });
        
        this.elements.channelsContainer.style.display = 'block';
    }

    async playChannel(channel) {
        this.log(`Duke luajtur: ${channel.name}`);
        this.showLoading();
        
        try {
            // Merr URL-në e stream-it për këtë kanal
            const streamUrl = await this.getStreamUrl(channel.id);
            
            if (streamUrl) {
                this.elements.videoPlayer.style.display = 'block';
                this.elements.videoPlayer.src = streamUrl;
                
                this.elements.videoPlayer.play().then(() => {
                    this.log(`Duke luajtur: ${channel.name}`, 'success');
                    this.hideLoading();
                    this.elements.playerControls.style.display = 'flex';
                }).catch(error => {
                    this.log('Gabim në play: ' + error.message, 'error');
                    this.hideLoading();
                });
            }
        } catch (error) {
            this.log('Gabim në marrjen e stream-it: ' + error.message, 'error');
            this.hideLoading();
        }
    }

    async getStreamUrl(channelId) {
        const streamUrl = `${this.portalUrl}/server/load.php?type=stb&action=create_link&token=${this.token}&JsHttpRequest=1-xml&cmd=${channelId}`;
        
        const response = await fetch(streamUrl, {
            headers: {
                'MAC': this.macAddress
            }
        });

        const data = await response.json();
        
        if (data.js && data.js.cmd) {
            // Kthe URL-në e stream-it
            return data.js.cmd;
        } else {
            throw new Error('Nuk u gjet stream URL');
        }
    }

    stopPlayback() {
        this.elements.videoPlayer.pause();
        this.elements.videoPlayer.src = '';
        this.elements.videoPlayer.style.display = 'none';
        this.elements.playerControls.style.display = 'none';
        this.log('Playback u ndal');
    }

    showPlayerInterface() {
        this.elements.playerControls.style.display = 'flex';
        this.elements.categoriesContainer.style.display = 'block';
        this.elements.channelsContainer.style.display = 'block';
    }

    showLoading() {
        this.elements.loading.style.display = 'block';
    }

    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    updateStatus(status) {
        this.elements.connectionStatus.textContent = status;
        this.elements.connectionStatus.className = status === 'I lidhur' ? 'status connected' : 'status disconnected';
    }

    log(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        this.elements.logContainer.appendChild(logEntry);
        this.elements.logContainer.scrollTop = this.elements.logContainer.scrollHeight;
        
        console.log(`[StalkerPlayer] ${message}`);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.elements.videoPlayer.requestFullscreen) {
                this.elements.videoPlayer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    loadSavedConfig() {
        const savedConfig = localStorage.getItem('stalkerConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            this.elements.portalUrl.value = config.portalUrl || '';
            this.elements.macAddressInput.value = config.macAddress || '00:1A:79:00:00:01';
            this.elements.username.value = config.username || '';
        }
    }

    saveConfig() {
        const config = {
            portalUrl: this.elements.portalUrl.value,
            macAddress: this.elements.macAddressInput.value,
            username: this.elements.username.value
        };
        localStorage.setItem('stalkerConfig', JSON.stringify(config));
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new StalkerPortalPlayer();
});
