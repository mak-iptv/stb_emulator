class IPTVPlayer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.addSamplePlaylists();
    }

    setupEventListeners() {
        document.getElementById('loadPlaylist').addEventListener('click', () => {
            this.loadPlaylist();
        });

        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // Allow pressing Enter in URL field
        document.getElementById('m3uUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadPlaylist();
            }
        });
    }

    addSamplePlaylists() {
        // Add some sample/test URLs for demonstration
        const sampleUrls = [
            'https://raw.githubusercontent.com/freearhey/iptv/master/channels/us.m3u',
            'https://raw.githubusercontent.com/iptv-org/iptv/master/channels/us.m3u'
        ];
        
        const urlInput = document.getElementById('m3uUrl');
        urlInput.placeholder = 'Enter M3U URL or try a sample from GitHub';
    }

    async loadPlaylist() {
        const urlInput = document.getElementById('m3uUrl');
        const url = urlInput.value.trim();
        const loadButton = document.getElementById('loadPlaylist');

        if (!url) {
            this.showError('Please enter M3U URL or select a file');
            return;
        }

        // Show loading state
        loadButton.textContent = 'Loading...';
        loadButton.disabled = true;

        try {
            let m3uContent;
            
            if (url.startsWith('http')) {
                // Add timestamp to avoid caching issues
                const fetchUrl = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
                
                const response = await fetch(fetchUrl, {
                    method: 'GET',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'text/plain',
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                m3uContent = await response.text();
                
                // Check if content is actually M3U format
                if (!m3uContent.includes('#EXTM3U')) {
                    throw new Error('Not a valid M3U file (missing #EXTM3U header)');
                }
            } else {
                this.showError('Please enter a valid HTTP/HTTPS URL');
                return;
            }

            this.parseM3U(m3uContent);
            this.displayChannels();
            this.showSuccess(`Loaded ${this.channels.length} channels successfully!`);
            
        } catch (error) {
            console.error('Error loading playlist:', error);
            this.showError(`Error: ${error.message}. \n\nPossible solutions:\n• Check if the URL is accessible\n• Try a CORS proxy\n• Use a local file instead`);
        } finally {
            // Reset button state
            loadButton.textContent = 'Load Playlist';
            loadButton.disabled = false;
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.m3u') && !file.name.endsWith('.m3u8')) {
            this.showError('Please select a valid M3U file (.m3u or .m3u8)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.parseM3U(e.target.result);
                this.displayChannels();
                this.showSuccess(`Loaded ${this.channels.length} channels from file!`);
            } catch (error) {
                this.showError('Error parsing M3U file: ' + error.message);
            }
        };
        
        reader.onerror = () => {
            this.showError('Error reading file');
        };
        
        reader.readAsText(file);
    }

    parseM3U(content) {
        this.channels = [];
        const lines = content.split('\n');
        
        let currentChannel = {};
        let channelCount = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const info = this.parseExtinf(line);
                currentChannel = {
                    name: info.name || `Channel ${channelCount + 1}`,
                    logo: info.logo,
                    group: info.group || 'General',
                    id: channelCount
                };
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                currentChannel.url = line;
                this.channels.push({...currentChannel});
                channelCount++;
                currentChannel = {};
            }
        }
        
        if (this.channels.length === 0) {
            throw new Error('No valid channels found in the playlist');
        }
    }

    parseExtinf(line) {
        try {
            const match = line.match(/#EXTINF:(-?\d+)\s*(.*?),(.*)/);
            if (!match) return { name: 'Unknown Channel' };

            const attributes = match[2];
            const name = match[3].trim();
            
            const logoMatch = attributes.match(/tvg-logo="([^"]*)"/);
            const groupMatch = attributes.match(/group-title="([^"]*)"/);
            
            return {
                name: name,
                logo: logoMatch ? logoMatch[1] : '',
                group: groupMatch ? groupMatch[1] : 'General'
            };
        } catch (error) {
            return { name: 'Unknown Channel', group: 'General' };
        }
    }

    displayChannels() {
        const channelList = document.getElementById('channelList');
        channelList.innerHTML = '';

        if (this.channels.length === 0) {
            channelList.innerHTML = '<div class="no-channels">No channels found</div>';
            return;
        }

        this.channels.forEach((channel) => {
            const channelElement = document.createElement('div');
            channelElement.className = 'channel-item';
            channelElement.innerHTML = `
                <div class="channel-info">
                    ${channel.logo ? `<img src="${channel.logo}" alt="" class="channel-logo" onerror="this.style.display='none'">` : ''}
                    <div class="channel-details">
                        <strong class="channel-name">${this.escapeHtml(channel.name)}</strong>
                        <small class="channel-group">${this.escapeHtml(channel.group)}</small>
                    </div>
                </div>
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
        
        currentChannelElement.textContent = `${channel.name} (${channel.group})`;
        
        // Show loading state
        videoPlayer.classList.add('loading');
        
        videoPlayer.src = channel.url;
        videoPlayer.load();
        
        videoPlayer.play().then(() => {
            videoPlayer.classList.remove('loading');
        }).catch(error => {
            console.error('Error playing video:', error);
            videoPlayer.classList.remove('loading');
            
            if (error.name === 'NotSupportedError') {
                this.showError('This stream format is not supported by your browser. Try using VLC or another player.');
            } else {
                this.showError('Cannot play this channel. The stream might be offline or require specific codecs.');
            }
        });
        
        this.currentChannel = channel;
    }

    showError(message) {
        alert('ERROR: ' + message);
    }

    showSuccess(message) {
        // Could be replaced with a toast notification
        console.log('SUCCESS: ' + message);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the player
document.addEventListener('DOMContentLoaded', () => {
    new IPTVPlayer();
});
