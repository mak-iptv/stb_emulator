class MAGPlayer {
    constructor() {
        this.serverUrl = '';
        this.macAddress = '';
        this.channels = [];
        this.player = null;
        this.isConnected = false;
    }

    initPlayer() {
        this.player = videojs('videoPlayer', {
            controls: true,
            autoplay: false,
            preload: 'auto',
            responsive: true,
            fluid: true
        });
    }

    async connectToServer() {
        this.serverUrl = document.getElementById('serverUrl').value;
        this.macAddress = document.getElementById('macAddress').value;

        if (!this.serverUrl || !this.macAddress) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }

        // Simulojmë lidhjen me serverin MAG
        try {
            document.getElementById('connectionStatus').textContent = '🟡 Duke u lidhur...';
            document.getElementById('connectionStatus').className = 'connection-status disconnected';

            // Simulim të dhënash për demonstrim
            await this.simulateConnection();
            
            this.isConnected = true;
            document.getElementById('connectionStatus').textContent = '🟢 I lidhur';
            document.getElementById('connectionStatus').className = 'connection-status connected';
            
            // Shfaq komponentët
            document.getElementById('playerContainer').classList.remove('hidden');
            document.getElementById('channelsContainer').classList.remove('hidden');
            
            // Ngarko kanalet
            await this.loadChannels();
            
        } catch (error) {
            console.error('Gabim në lidhje:', error);
            document.getElementById('connectionStatus').textContent = '🔴 Gabim në lidhje';
        }
    }

    async simulateConnection() {
        // Simulojmë një vonesë të lidhjes
        return new Promise(resolve => setTimeout(resolve, 2000));
    }

    async loadChannels() {
        // Kanale demo - në realitet do të merreshin nga serveri MAG
        this.channels = [
            { id: 1, name: 'RTSH 1', url: 'https://example.com/stream1.m3u8' },
            { id: 2, name: 'RTSH 2', url: 'https://example.com/stream2.m3u8' },
            { id: 3, name: 'Top Channel', url: 'https://example.com/stream3.m3u8' },
            { id: 4, name: 'Klan TV', url: 'https://example.com/stream4.m3u8' },
            { id: 5, name: 'Vizion Plus', url: 'https://example.com/stream5.m3u8' }
        ];

        this.displayChannels();
    }

    displayChannels() {
        const channelsGrid = document.getElementById('channelsGrid');
        channelsGrid.innerHTML = '';

        this.channels.forEach(channel => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.innerHTML = `
                <div class="channel-name">${channel.name}</div>
                <div class="channel-id">ID: ${channel.id}</div>
            `;
            channelElement.onclick = () => this.playChannel(channel);
            channelsGrid.appendChild(channelElement);
        });
    }

    playChannel(channel) {
        if (!this.player) {
            this.initPlayer();
        }

        // Nëse HLS është i suportuar
        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(channel.url);
            hls.attachMedia(this.player.tech().el);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.player.play();
            });
        } else if (this.player.canPlayType('application/vnd.apple.mpegurl')) {
            // Për Safari
            this.player.src(channel.url);
            this.player.play();
        }
    }
}

// Initialize app
const magApp = new MAGPlayer();

// Funksion global për butonin
function connectToServer() {
    magApp.connectToServer();
}

// Initialize player kur faqa ngarkohet
document.addEventListener('DOMContentLoaded', function() {
    magApp.initPlayer();
});
