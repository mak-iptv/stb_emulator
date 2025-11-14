class ExtreamTVPlayer {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playlistItems = document.getElementById('playlistItems');
        this.searchInput = document.getElementById('searchInput');
        this.categoryFilters = document.getElementById('categoryFilters');
        this.isPlaying = false;
        this.filteredPlaylist = [];
        this.currentCategory = 'all';

        this.countryCategories = {
            'AL': '🇦🇱 Shqipëri',
            'US': '🇺🇸 USA',
            'UK': '🇬🇧 Angli',
            'IT': '🇮🇹 Itali',
            'DE': '🇩🇪 Gjermani',
            'FR': '🇫🇷 Franca',
            'ES': '🇪🇸 Spanja',
            'GR': '🇬🇷 Greqia',
            'TR': '🇹🇷 Turqia',
            'RS': '🇷🇸 Serbi',
            'MK': '🇲🇰 Maqedoni',
            'XK': '🇽🇰 Kosova',
            'ME': '🇲🇪 Mali i Zi',
            'HR': '🇭🇷 Kroaci',
            'BA': '🇧🇦 Bosnje',
            'BG': '🇧🇬 Bullgari',
            'RO': '🇷🇴 Rumani',
            'RU': '🇷🇺 Rusi',
            'AR': '🇦🇷 Argjentinë',
            'BR': '🇧🇷 Brazil',
            'CA': '🇨🇦 Kanada',
            'AU': '🇦🇺 Australi',
            'IN': '🇮🇳 India',
            'CN': '🇨🇳 Kinë',
            'JP': '🇯🇵 Japoni',
            'KR': '🇰🇷 Koreja'
        };

        this.corsProxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/'
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Ngarko skedarin M3U
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadM3UFile(e.target.files[0]);
        });

        // Extream URL
        document.getElementById('loadExtream').addEventListener('click', () => {
            this.openExtreamModal();
        });

        document.getElementById('loadUrlBtn').addEventListener('click', () => {
            this.loadExtreamUrl();
        });

        // Modal
        document.querySelector('.close').addEventListener('click', () => {
            this.closeExtreamModal();
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('extreamModal')) {
                this.closeExtreamModal();
            }
        });

        // Kontrollat e playerit
        document.getElementById('playBtn').addEventListener('click', () => {
            this.play();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pause();
        });

        document.getElementById('prevBtn').addEventListener('click', () => {
            this.previousTrack();
        });

        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextTrack();
        });

        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.videoPlayer.volume = e.target.value;
        });

        document.getElementById('progressBar').addEventListener('input', (e) => {
            const seekTime = (e.target.value / 100) * this.videoPlayer.duration;
            this.videoPlayer.currentTime = seekTime;
        });

        // Kërkimi
        this.searchInput.addEventListener('input', (e) => {
            this.filterPlaylist(e.target.value);
        });

        // Ndërhyrje video
        this.videoPlayer.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.videoPlayer.addEventListener('loadedmetadata', () => {
            this.updateDuration();
        });

        this.videoPlayer.addEventListener('ended', () => {
            this.nextTrack();
        });

        this.videoPlayer.addEventListener('error', (e) => {
            this.handleVideoError(e);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    openExtreamModal() {
        document.getElementById('extreamModal').style.display = 'block';
    }

    closeExtreamModal() {
        document.getElementById('extreamModal').style.display = 'none';
    }

    async loadExtreamUrl() {
        const url = document.getElementById('extreamUrl').value.trim();
        if (!url) {
            alert('Ju lutem shkruani një URL!');
            return;
        }

        if (!url.startsWith('http')) {
            alert('URL duhet të fillojë me http:// ose https://');
            return;
        }

        this.showLoadingMessage('Duke ngarkuar nga Extream URL...');

        try {
            const response = await fetch(this.corsProxies[0] + encodeURIComponent(url));
            if (!response.ok) throw new Error('Network response was not ok');
            
            const content = await response.text();
            this.parseM3U(content);
            this.filteredPlaylist = [...this.playlist];
            this.renderCategories();
            this.renderPlaylist();
            this.closeExtreamModal();
            
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
            
            this.hideLoadingMessage();
        } catch (error) {
            console.error('Error loading Extream URL:', error);
            this.hideLoadingMessage();
            this.showErrorMessage('Gabim gjatë ngarkimit të URL. Kontrolloni link-un.');
        }
    }

    async loadM3UFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseM3U(content);
            this.filteredPlaylist = [...this.playlist];
            this.renderCategories();
            this.renderPlaylist();
            
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
        };
        
        reader.onerror = () => {
            alert('Gabim gjatë leximit të skedarit!');
        };
        
        reader.readAsText(file);
    }

    parseM3U(content) {
        this.playlist = [];
        const lines = content.split('\n');
        let currentGroup = 'General';
        let currentLogo = '';
        let currentCountry = 'AL';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const trackInfo = this.parseExtinf(line);
                currentGroup = trackInfo.group || currentGroup;
                currentLogo = trackInfo.logo || currentLogo;
                currentCountry = this.detectCountry(trackInfo.title, trackInfo.group);
                
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (nextLine && !nextLine.startsWith('#')) {
                    this.playlist.push({
                        title: trackInfo.title,
                        url: nextLine,
                        duration: trackInfo.duration,
                        group: currentGroup,
                        logo: currentLogo,
                        country: currentCountry,
                        countryCode: this.getCountryCode(currentCountry),
                        rawUrl: nextLine
                    });
                    i++;
                }
            } else if (line.startsWith('#EXTGRP:')) {
                currentGroup = line.replace('#EXTGRP:', '').trim();
            } else if (line && !line.startsWith('#') && line !== '') {
                const country = this.detectCountry('', currentGroup);
                this.playlist.push({
                    title: `Kanali ${this.playlist.length + 1}`,
                    url: line,
                    duration: 0,
                    group: currentGroup,
                    logo: currentLogo,
                    country: country,
                    countryCode: this.getCountryCode(country),
                    rawUrl: line
                });
            }
        }
        
        console.log(`U gjetën ${this.playlist.length} kanale nga ${this.getUniqueCountries().length} shtete`);
    }

    detectCountry(title, group) {
        const text = (title + ' ' + group).toLowerCase();
        
        // Kontrollo për shtete specifike
        const countryPatterns = {
            'Shqipëri': ['shqip', 'albania', 'tiran', 'kosov', 'al'],
            'Itali': ['italy', 'italia', 'ital', 'rai', 'mediaset', 'it'],
            'Gjermani': ['germany', 'deutsch', 'ard', 'zdf', 'de'],
            'Franca': ['france', 'franca', 'french', 'tf1', 'fr'],
            'Spanja': ['spain', 'spanja', 'españa', 'es'],
            'Greqia': ['greece', 'greqi', 'ert', 'gr'],
            'Turqia': ['turkey', 'turq', 'trt', 'tr'],
            'Serbi': ['serbia', 'serbi', 'rtv', 'rs'],
            'USA': ['usa', 'united states', 'american', 'us '],
            'Angli': ['uk ', 'united kingdom', 'british', 'bbc ', 'itv ']
        };

        for (const [country, patterns] of Object.entries(countryPatterns)) {
            if (patterns.some(pattern => text.includes(pattern))) {
                return country;
            }
        }

        return 'International';
    }

    getCountryCode(countryName) {
        const countryCodes = {
            'Shqipëri': 'AL', 'Itali': 'IT', 'Gjermani': 'DE', 'Franca': 'FR',
            'Spanja': 'ES', 'Greqia': 'GR', 'Turqia': 'TR', 'Serbi': 'RS',
            'USA': 'US', 'Angli': 'UK', 'International': '🌍'
        };
        return countryCodes[countryName] || '🌍';
    }

    getUniqueCountries() {
        const countries = [...new Set(this.playlist.map(channel => channel.country))];
        return countries.sort();
    }

    renderCategories() {
        this.categoryFilters.innerHTML = '';
        
        // Butoni "Të Gjitha"
        const allBtn = document.createElement('button');
        allBtn.className = `category-btn ${this.currentCategory === 'all' ? 'active' : ''}`;
        allBtn.textContent = '🌍 Të Gjitha';
        allBtn.addEventListener('click', () => {
            this.filterByCategory('all');
        });
        this.categoryFilters.appendChild(allBtn);

        // Butonat për çdo shtet
        const countries = this.getUniqueCountries();
        countries.forEach(country => {
            const btn = document.createElement('button');
            btn.className = `category-btn ${this.currentCategory === country ? 'active' : ''}`;
            const flag = this.getCountryCode(country);
            btn.textContent = `${flag} ${country}`;
            btn.addEventListener('click', () => {
                this.filterByCategory(country);
            });
            this.categoryFilters.appendChild(btn);
        });
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        // Update active buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (category === 'all') {
            this.filteredPlaylist = [...this.playlist];
            document.querySelector('.category-btn:first-child').classList.add('active');
        } else {
            this.filteredPlaylist = this.playlist.filter(channel => 
                channel.country === category
            );
            document.querySelectorAll('.category-btn').forEach(btn => {
                if (btn.textContent.includes(category)) {
                    btn.classList.add('active');
                }
            });
        }
        
        this.renderPlaylist();
    }

    parseExtinf(extinfLine) {
        const info = {
            duration: 0,
            title: 'Unknown Channel',
            group: 'General',
            logo: ''
        };

        // Titulli
        const titleMatch = extinfLine.match(/,(.*)$/);
        if (titleMatch) {
            info.title = titleMatch[1].trim();
        }

        // Duration
        const durationMatch = extinfLine.match(/:(-?\d+)/);
        if (durationMatch) {
            info.duration = parseInt(durationMatch[1]);
        }

        // Group
        const groupMatch = extinfLine.match(/group-title="([^"]*)"/i);
        if (groupMatch) {
            info.group = groupMatch[1];
        }

        // Logo
        const logoMatch = extinfLine.match(/tvg-logo="([^"]*)"/i);
        if (logoMatch) {
            info.logo = logoMatch[1];
        }

        return info;
    }

    async loadTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentTrackIndex = index;
            const track = this.playlist[index];
            
            this.showLoadingMessage(`Duke ngarkuar: ${track.title}`);
            this.updatePlayerTitle(track.title);
            
            try {
                const videoUrl = await this.prepareVideoUrl(track.rawUrl);
                this.videoPlayer.src = videoUrl;
                this.videoPlayer.setAttribute('crossorigin', 'anonymous');
                
                await this.play();
                this.hideLoadingMessage();
                
            } catch (error) {
                console.error('Error loading track:', error);
                this.hideLoadingMessage();
                this.showErrorMessage(`Gabim: ${track.title} - Provoni kanalin tjetër`);
            }
            
            this.updateActiveTrack();
        }
    }

    async prepareVideoUrl(originalUrl) {
        if (!originalUrl || originalUrl.trim() === '') {
            throw new Error('URL e zbrazët');
        }

        if (originalUrl.startsWith('http')) {
            try {
                // Provim direkt
                const testResponse = await fetch(originalUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                return originalUrl;
            } catch (error) {
                // Përdorim proxy
                return this.corsProxies[0] + encodeURIComponent(originalUrl);
            }
        }

        return originalUrl;
    }

    async play() {
        try {
            await this.videoPlayer.play();
            this.isPlaying = true;
            return true;
        } catch (error) {
            console.error('Play error:', error);
            throw error;
        }
    }

    pause() {
        this.videoPlayer.pause();
        this.isPlaying = false;
    }

    nextTrack() {
        let nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.loadTrack(nextIndex);
    }

    previousTrack() {
        const prevIndex = this.currentTrackIndex - 1;
        this.loadTrack(prevIndex >= 0 ? prevIndex : this.playlist.length - 1);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            const player = this.videoPlayer.parentElement;
            player.requestFullscreen?.() || 
            player.webkitRequestFullscreen?.() || 
            player.mozRequestFullScreen?.();
        } else {
            document.exitFullscreen?.() || 
            document.webkitExitFullscreen?.() || 
            document.mozCancelFullScreen?.();
        }
    }

    filterPlaylist(searchTerm) {
        if (!searchTerm) {
            this.filteredPlaylist = this.currentCategory === 'all' 
                ? [...this.playlist] 
                : this.playlist.filter(channel => channel.country === this.currentCategory);
        } else {
            this.filteredPlaylist = this.playlist.filter(channel =>
                (channel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 channel.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 channel.country.toLowerCase().includes(searchTerm.toLowerCase())) &&
                (this.currentCategory === 'all' || channel.country === this.currentCategory)
            );
        }
        this.renderPlaylist();
    }

    renderPlaylist() {
        this.playlistItems.innerHTML = '';
        
        // Update channel count
        document.getElementById('channelCount').textContent = this.filteredPlaylist.length;
        
        if (this.filteredPlaylist.length === 0) {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.textContent = 'Nuk u gjet asnjë kanal';
            this.playlistItems.appendChild(li);
            return;
        }
        
        this.filteredPlaylist.forEach((channel, index) => {
            const originalIndex = this.playlist.findIndex(c => c.url === channel.url);
            const li = document.createElement('li');
            li.className = 'playlist-item';
            if (originalIndex === this.currentTrackIndex) {
                li.classList.add('active');
            }
            
            li.innerHTML = `
                <div class="channel-logo">
                    ${channel.logo ? 
                        `<img src="${channel.logo}" alt="${channel.title}" onerror="this.style.display='none'" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : 
                        '📺'}
                </div>
                <div class="channel-info">
                    <div class="channel-name">${channel.title}</div>
                    <div class="channel-group">${channel.group}</div>
                    <div class="channel-country">${channel.countryCode} ${channel.country}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.loadTrack(originalIndex);
            });
            
            this.playlistItems.appendChild(li);
        });
    }

    // ... (metodat e mbetura të njëjta si më parë: showLoadingMessage, hideLoadingMessage, showErrorMessage, updateActiveTrack, updateProgress, updateDuration, formatTime, updatePlayerTitle, handleKeyboard, handleVideoError)
    // I kam lënë jashtë për shkak të kufizimit të karaktereve, por janë të njëjta si në versionin e mëparshëm
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new ExtreamTVPlayer();
});
