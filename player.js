class SimpleSTBPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Enter key për lidhje
        document.getElementById('serverUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToServer();
        });
        
        document.getElementById('macAddress').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.connectToServer();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const video = document.getElementById('videoPlayer');
            switch(e.key) {
                case ' ': e.preventDefault(); video.paused ? video.play() : video.pause(); break;
                case 'f': e.preventDefault(); this.toggleFullscreen(); break;
                case 'm': e.preventDefault(); video.muted = !video.muted; break;
            }
        });
    }

    async connectToServer() {
        const serverUrl = document.getElementById('serverUrl').value;
        const macAddress = document.getElementById('macAddress').value;

        if (!serverUrl || !macAddress) {
            this.showMessage('Plotëso të dyja fushat!', 'error');
            return;
        }

        this.showMessage('🔄 Duke u lidhur...', 'loading');

        try {
            // Simulojmë lidhjen dhe marrjen e kanaleve
            await this.simulateConnection(serverUrl, macAddress);
            this.loadChannels();
            this.showMessage('✅ U lidh me sukses!', 'success');
            
        } catch (error) {
            this.showMessage('❌ Gabim në lidhje: ' + error.message, 'error');
        }
    }

    async simulateConnection(serverUrl, macAddress) {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(`Lidhur me: ${serverUrl}, MAC: ${macAddress}`);
                resolve(true);
            }, 1000);
        });
    }

    loadChannels() {
        // Kanale simulim me URL të vërteta testuese
        this.channels = [
            {
                id: 1,
                name: '📺 RTSH 1 HD',
                url: 'https://tv.rtsh.live/rtsh1/index.m3u8',
                category: 'Shqipëri',
                quality: 'HD'
            },
            {
                id: 2,
                name: '📺 RTSH 2',
                url: 'https://tv.rtsh.live/rtsh2/index.m3u8',
                category: 'Shqipëri',
                quality: 'SD'
            },
            {
                id: 3,
                name: '🎬 Big Buck Bunny (Test MP4)',
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                category: 'Test',
                quality: 'HD'
            },
            {
                id: 4,
                name: '🌍 HLS Test Stream',
                url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
                category: 'Test',
                quality: 'HD'
            },
            {
                id: 5,
                name: '📡 Live Test Stream',
                url: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
                category: 'Test',
                quality: 'HD'
            }
        ];

        this.displayChannels();
    }

    displayChannels() {
        const sidebar = document.getElementById('channelsSidebar');
        sidebar.innerHTML = '<h3>📡 Kanalet e Gatshme</h3>';
        
        this.channels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.innerHTML = `
                <strong>${channel.name}</strong>
                <div style="font-size: 12px; opacity: 0.8;">
                    ${channel.category} • ${channel.quality}
                </div>
            `;
            
            channelElement.onclick = () => this.playChannel(channel);
            sidebar.appendChild(channelElement);
        });
    }

    async playChannel(channel) {
        this.showMessage(`🔄 Duke ngarkuar ${channel.name}...`, 'loading');
        
        const videoPlayer = document.getElementById('videoPlayer');
        this.currentChannel = channel;

        try {
            // Përdorim proxy për CORS
            const streamUrl = await this.getProxyUrl(channel.url);
            videoPlayer.src = streamUrl;
            
            videoPlayer.load();
            
            await videoPlayer.play();
            this.showMessage(`▶️ Po luan: ${channel.name}`, 'success');
            
        } catch (error) {
            console.error('Gabim:', error);
            this.showMessage(`❌ Nuk mund të luajë ${channel.name}`, 'error');
            
            // Provim pa proxy si fallback
            videoPlayer.src = channel.url;
            videoPlayer.play().catch(e => {
                this.showMessage('❌ Stream-i nuk funksionon. Provoni kanal tjetër.', 'error');
            });
        }
    }

    async getProxyUrl(url) {
        // Provim direkt fillimisht
        try {
            const test = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            return url; // Nëse nuk ka CORS error, përdor direkt
        } catch (error) {
            // Përdor proxy nëse ka CORS
            const proxyUrls = [
                `https://corsproxy.io/?${encodeURIComponent(url)}`,
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
            ];
            return proxyUrls[0];
        }
    }

    toggleFullscreen() {
        const videoContainer = document.querySelector('.player-area');
        
        if (!document.fullscreenElement) {
            videoContainer.requestFullscreen().catch(err => {
                console.log('Gabim në fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    showMessage(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = type;
    }
}

// Initialize player
const stbPlayer = new SimpleSTBPlayer();

// Funksionet globale për butonat
function connectToServer() {
    stbPlayer.connectToServer();
}

function toggleFullscreen() {
    stbPlayer.toggleFullscreen();
}
