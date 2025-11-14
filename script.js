class STBPlayer {
    constructor() {
        this.videoPlayer = document.getElementById('videoPlayer');
        this.macDisplay = document.getElementById('macAddress');
        this.urlDisplay = document.getElementById('urlDisplay');
        this.currentUrl = document.getElementById('currentUrl');
        this.loading = document.getElementById('loading');
        this.channelsContainer = document.getElementById('channelsContainer');
        this.serverUrlInput = document.getElementById('serverUrl');
        this.macPrefixInput = document.getElementById('macPrefix');
        
        this.config = {
            serverUrl: 'http://localhost:8080',
            macPrefix: '00:A1:79'
        };
        
        this.init();
    }

    init() {
        this.loadConfig();
        this.generateMAC();
        this.setupEventListeners();
        this.loadChannels();
        this.updateDisplay();
        this.simulateConnection();
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('stbConfig');
        if (savedConfig) {
            this.config = JSON.parse(savedConfig);
            this.serverUrlInput.value = this.config.serverUrl;
            this.macPrefixInput.value = this.config.macPrefix;
        }
    }

    saveConfig() {
        this.config.serverUrl = this.serverUrlInput.value;
        this.config.macPrefix = this.macPrefixInput.value;
        localStorage.setItem('stbConfig', JSON.stringify(this.config));
        this.generateMAC();
        this.updateDisplay();
        alert('Konfigurimi u ruajt!');
    }

    generateMAC() {
        // Gjeneron pjesën e fundit të MAC adresës
        const suffix = Array.from({length: 3}, () => 
            Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
        ).join(':');
        
        const fullMAC = `${this.config.macPrefix}:${suffix}`;
        this.macDisplay.textContent = fullMAC.toUpperCase();
        return fullMAC;
    }

    updateDisplay() {
        const mac = this.macDisplay.textContent;
        const fullUrl = `${this.config.serverUrl}/c?mac=${mac}`;
        this.urlDisplay.textContent = `URL: ${this.config.serverUrl}/c`;
        this.currentUrl.textContent = fullUrl;
    }

    setupEventListeners() {
        // Kontrollet e videos
        document.getElementById('playBtn').addEventListener('click', () => {
            this.videoPlayer.play();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.videoPlayer.pause();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('connectBtn').addEventListener('click', () => {
            this.connectToServer();
        });

        document.getElementById('saveConfig').addEventListener('click', () => {
            this.saveConfig();
        });

        // Simulim të ndryshimeve në input
        this.serverUrlInput.addEventListener('change', () => {
            this.updateDisplay();
        });

        this.macPrefixInput.addEventListener('input', () => {
            this.updateDisplay();
        });
    }

    async connectToServer() {
        this.showLoading();
        
        try {
            // Simulim të lidhjes me server
            const mac = this.macDisplay.textContent;
            const connectUrl = `${this.config.serverUrl}/c?mac=${mac}`;
            
            console.log('Duke u lidhur me:', connectUrl);
            
            // Simulim delay të lidhjes
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Këtu do të bëhej një kërkesë e vërtetë
            // const response = await fetch(connectUrl);
            
            this.hideLoading();
            alert(`U lidh me sukses!\nServer: ${this.config.serverUrl}\nMAC: ${mac}`);
            
        } catch (error) {
            this.hideLoading();
            alert('Gabim në lidhje: ' + error.message);
        }
    }

    simulateConnection() {
        // Simulon një lidhje aktive
        console.log('STB Player i gatshëm');
        console.log('MAC:', this.macDisplay.textContent);
        console.log('Server:', this.config.serverUrl);
    }

    loadChannels() {
        const sampleChannels = [
            { name: 'Kanal 1 SHQIP', url: 'http://example.com/stream1.m3u8' },
            { name: 'Kanal 2 NEWS', url: 'http://example.com/stream2.m3u8' },
            { name: 'Kanal 3 FILMA', url: 'http://example.com/stream3.m3u8' },
            { name: 'Kanal 4 SPORT', url: 'http://example.com/stream4.m3u8' },
            { name: 'Kanal 5 MUZIKË', url: 'http://example.com/stream5.m3u8' },
            { name: 'Kanal 6 DOC', url: 'http://example.com/stream6.m3u8' }
        ];

        this.channelsContainer.innerHTML = '';
        sampleChannels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel';
            channelElement.textContent = channel.name;
            channelElement.addEventListener('click', () => {
                this.playChannel(channel.url);
                // Aktivizo kanalin e zgjedhur
                document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
                channelElement.classList.add('active');
            });
            this.channelsContainer.appendChild(channelElement);
        });
    }

    playChannel(url) {
        this.showLoading();
        
        // Simulim të ngarkimit të kanalit
        setTimeout(() => {
            this.videoPlayer.src = url;
            this.videoPlayer.play().catch(error => {
                console.log('Gabim në play:', error);
                this.hideLoading();
                alert('Stream nuk mund të luhet. Kjo është një simulim.');
            });
            this.hideLoading();
        }, 1000);
    }

    showLoading() {
        this.loading.style.display = 'block';
    }

    hideLoading() {
        this.loading.style.display = 'none';
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (this.videoPlayer.requestFullscreen) {
                this.videoPlayer.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new STBPlayer();
});

// Shembull i kërkesës aktuale
async function connectToRealServer() {
    const response = await fetch('http://your-server:port/c', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            mac: '00:A1:79:XX:XX:XX',
            action: 'authenticate'
        })
    });
    return await response.json();
}
