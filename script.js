class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('loadPlaylist').addEventListener('click', () => {
            this.loadPlaylist();
        });

        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }

    async loadPlaylist() {
        const urlInput = document.getElementById('m3uUrl');
        const url = urlInput.value.trim();

        if (!url) {
            alert('Please enter M3U URL or select a file');
            return;
        }

        try {
            let m3uContent;
            
            if (url.startsWith('http')) {
                const response = await fetch(url);
                m3uContent = await response.text();
            } else {
                // Local file (already handled by file input)
                return;
            }

            this.parseM3U(m3uContent);
            this.displayChannels();
        } catch (error) {
            console.error('Error loading playlist:', error);
            alert('Error loading playlist. Please check the URL.');
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.parseM3U(e.target.result);
            this.displayChannels();
        };
        reader.readAsText(file);
    }

    parseM3U(content) {
        this.channels = [];
        const lines = content.split('\n');
        
        let currentChannel = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                // Parse channel info
                const info = this.parseExtinf(line);
                currentChannel = {
                    name: info.name,
                    logo: info.logo,
                    group: info.group
                };
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                // This is the URL line
                currentChannel.url = line;
                this.channels.push({...currentChannel});
                currentChannel = {};
            }
        }
        
        console.log('Parsed channels:', this.channels);
    }

    parseExtinf(line) {
        // Parse #EXTINF line with various attributes
        const match = line.match(/#EXTINF:(-?\d+)\s*(.*?),(.*)/);
        if (!match) return { name: 'Unknown' };

        const attributes = match[2];
        const name = match[3].trim();
        
        // Extract logo and group from attributes
        const logoMatch = attributes.match(/tvg-logo="([^"]*)"/);
        const groupMatch = attributes.match(/group-title="([^"]*)"/);
        
        return {
            name: name,
            logo: logoMatch ? logoMatch[1] : '',
            group: groupMatch ? groupMatch[1] : 'General'
        };
    }

    displayChannels() {
        const channelList = document.getElementById('channelList');
        channelList.innerHTML = '';

        this.channels.forEach((channel, index) => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.innerHTML = `
                <strong>${channel.name}</strong>
                ${channel.group ? `<br><small>${channel.group}</small>` : ''}
            `;
            
            channelElement.addEventListener('click', () => {
                this.playChannel(channel);
            });
            
            channelList.appendChild(channelElement);
        });
    }

    playChannel(channel) {
        const videoPlayer = document.getElementById('videoPlayer');
        const currentChannelElement = document.getElementById('currentChannel');
        
        currentChannelElement.textContent = channel.name;
        
        // Try to play the stream
        videoPlayer.src = channel.url;
        videoPlayer.load();
        
        videoPlayer.play().catch(error => {
            console.error('Error playing video:', error);
            alert('Error playing this channel. It might be incompatible or require specific codecs.');
        });
        
        this.currentChannel = channel;
    }
}

// Initialize the player when page loads
document.addEventListener('DOMContentLoaded', () => {
    new IPTVPlayer();
});
