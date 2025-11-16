class MAGPlayer {
    constructor() {
        this.serverUrl = '';
        this.macAddress = '';
        this.channels = [];
        this.player = null;
        this.isConnected = false;
    }

    async connectToServer() {
        this.serverUrl = document.getElementById('serverUrl').value.trim();
        this.macAddress = document.getElementById('macAddress').value.trim().toUpperCase();

        if (!this.serverUrl || !this.macAddress) {
            alert('Ju lutem plotësoni të gjitha fushat!');
            return;
        }

        try {
            document.getElementById('connectionStatus').textContent = '🟡 Duke u lidhur...';
            
            // Testo lidhjen dhe merr kanalet
            await this.testConnection();
            await this.getChannelsList();
            
            this.isConnected = true;
            document.getElementById('connectionStatus').textContent = '🟢 I lidhur';
            document.getElementById('connectionStatus').className = 'connection-status connected';
            
            document.getElementById('playerContainer').classList.remove('hidden');
            document.getElementById('channelsContainer').classList.remove('hidden');
            
        } catch (error) {
            console.error('Gabim në lidhje:', error);
            document.getElementById('connectionStatus').textContent = '🔴 Gabim në lidhje';
            alert('Nuk mund të lidhem me serverin. Kontrolloni URL dhe MAC.');
        }
    }

    async testConnection() {
        // Testo nëse serveri përgjigjet
        const testUrl = `${this.serverUrl}/portal.php`;
        
        try {
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Serveri ktheu status: ${response.status}`);
            }
            
            console.log('Lidhja me server është OK');
        } catch (error) {
            throw new Error(`Nuk mund të lidhem me serverin: ${error.message}`);
        }
    }

    async getChannelsList() {
        // Përpijo URL-n e duhur për kanalet
        const channelsUrl = this.buildChannelsUrl();
        
        try {
            console.log('Duke marrë kanalet nga:', channelsUrl);
            
            const response = await fetch(channelsUrl, {
                method: 'GET',
                headers: {
                    'MAC': this.macAddress,
                    'Content-Type': 'application/json',
                    'User-Agent': 'MAG Player Web App'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Përgjigja nga serveri:', data);
            
            // Proceso përgjigjen në varësi të formatit
            this.processChannelsResponse(data);
            
        } catch (error) {
            console.error('Gabim në marrjen e kanaleve:', error);
            
            // Shfaq kanale demo për testim
            this.useDemoChannels();
            alert('Serveri u lidh por nuk dërgoi kanale. Shfaqim të dhëna demo.');
        }
    }

    buildChannelsUrl() {
        // Versione të ndryshme URL-sh sipas implementimeve MAG
        const urlVariants = [
            `${this.serverUrl}/portal.php?type=itv&action=get_live_streams`,
            `${this.serverUrl}/portal.php?action=get_live_streams`,
            `${this.serverUrl}/portal.php?type=get_live_streams`,
            `${this.serverUrl}/get.php?type=itv&action=get_live_streams`,
            `${this.serverUrl}/c/`,
            `${this.serverUrl}/player_api.php?action=get_live_streams`
        ];

        return urlVariants[0]; // Fillojmë me variantin standard
    }

    processChannelsResponse(data) {
        // Kontrollo formate të ndryshme përgjigjesh
        if (Array.isArray(data)) {
            // Format 1: Array direkt
            this.channels = data.map(ch => ({
                id: ch.id || ch.stream_id,
                name: ch.name || ch.title,
                number: ch.num || ch.number,
                url: this.buildStreamUrl(ch.stream_id || ch.id),
                logo: ch.logo || ch.logo_url
            }));
        } else if (data.data && Array.isArray(data.data)) {
            // Format 2: {data: [...]}
            this.channels = data.data.map(ch => ({
                id: ch.id || ch.stream_id,
                name: ch.name || ch.title,
                number: ch.num || ch.number,
                url: this.buildStreamUrl(ch.stream_id || ch.id),
                logo: ch.logo || ch.logo_url
            }));
        } else if (data.channels) {
            // Format 3: {channels: [...]}
            this.channels = data.channels.map(ch => ({
                id: ch.id || ch.stream_id,
                name: ch.name || ch.title,
                number: ch.num || ch.number,
                url: this.buildStreamUrl(ch.stream_id || ch.id),
                logo: ch.logo || ch.logo_url
            }));
        } else {
            throw new Error('Format i panjohur i përgjigjes');
        }

        if (this.channels.length === 0) {
            throw new Error('Nuk u gjetën kanale');
        }

        this.displayChannels();
    }

    buildStreamUrl(streamId) {
        // Ndërto URL-n e stream-it bazuar në ID
        return `${this.serverUrl}/live/${this.macAddress}/${streamId}.m3u8`;
    }

    useDemoChannels() {
        // Përdor kanale demo nëse serveri nuk kthen asgjë
        this.channels = [
            { id: 1, name: 'RTSH 1', number: '1', url: 'demo', logo: '' },
            { id: 2, name: 'RTSH 2', number: '2', url: 'demo', logo: '' },
            { id: 3, name: 'Top Channel', number: '3', url: 'demo', logo: '' },
            { id: 4, name: 'Klan TV', number: '4', url: 'demo', logo: '' },
            { id: 5, name: 'Vizion Plus', number: '5', url: 'demo', logo: '' },
            { id: 6, name: 'ABC News', number: '6', url: 'demo', logo: '' }
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
                <div class="channel-number">${channel.number || channel.id}</div>
                <div class="channel-name">${channel.name}</div>
                ${channel.logo ? `<img src="${channel.logo}" class="channel-logo" alt="Logo">` : ''}
            `;
            
            if (channel.url !== 'demo') {
                channelElement.onclick = () => this.playChannel(channel);
            } else {
                channelElement.style.opacity = '0.6';
                channelElement.title = 'Kanale demo - Vendosni serverin tuaj real';
            }
            
            channelsGrid.appendChild(channelElement);
        });

        console.log(`Shfaqur ${this.channels.length} kanale`);
    }

    playChannel(channel) {
        if (!this.player) {
            this.initPlayer();
        }

        console.log('Duke luajtur kanalin:', channel);
        
        // Për stream demo
        if (channel.url === 'demo') {
            alert('Kjo është vetëm demonstrues. Vendosni serverin tuaj real për të luajtur kanale.');
            return;
        }

        // Për server real
        if (Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: false,
                lowLatencyMode: true
            });
            
            hls.loadSource(channel.url);
            hls.attachMedia(this.player.tech().el);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.player.play();
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
                console.error('Gabim HLS:', data);
                alert('Gabim në luajtjen e stream-it. Kontrolloni URL-n.');
            });
        }
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
                    overrideNative: true
                }
            }
        });
    }
}

// Debug info në konsolë
const magApp = new MAGPlayer();

function connectToServer() {
    magApp.connectToServer();
}

document.addEventListener('DOMContentLoaded', function() {
    magApp.initPlayer();
    console.log('MAG Web Player u inicializua');
});
