class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playlistItems = document.getElementById('playlistItems');
        this.searchInput = document.getElementById('searchInput');
        this.isPlaying = false;
        this.filteredPlaylist = [];

        // CORS Proxy për të shmangur problemet CORS
        this.corsProxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/'
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadM3UFile(e.target.files[0]);
        });

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

        this.searchInput.addEventListener('input', (e) => {
            this.filterPlaylist(e.target.value);
        });

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

        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    async loadM3UFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseM3U(content);
            this.filteredPlaylist = [...this.playlist];
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
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const trackInfo = this.parseExtinf(line);
                currentGroup = trackInfo.group || currentGroup;
                currentLogo = trackInfo.logo || currentLogo;
                
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (nextLine && !nextLine.startsWith('#')) {
                    this.playlist.push({
                        title: trackInfo.title,
                        url: nextLine,
                        duration: trackInfo.duration,
                        group: currentGroup,
                        logo: currentLogo,
                        rawUrl: nextLine // Ruaj URL-në origjinale
                    });
                    i++;
                }
            } else if (line.startsWith('#EXTGRP:')) {
                currentGroup = line.replace('#EXTGRP:', '').trim();
            } else if (line.startsWith('#EXTIMG:')) {
                currentLogo = line.replace('#EXTIMG:', '').trim();
            } else if (line && !line.startsWith('#') && line !== '') {
                this.playlist.push({
                    title: `Kanali ${this.playlist.length + 1}`,
                    url: line,
                    duration: 0,
                    group: currentGroup,
                    logo: currentLogo,
                    rawUrl: line
                });
            }
        }
        
        console.log(`U gjetën ${this.playlist.length} kanale`);
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
                // Provim me URL të ndryshme
                const videoUrl = await this.prepareVideoUrl(track.rawUrl);
                this.videoPlayer.src = videoUrl;
                
                // Shtojmë header-a të nevojshme për stream
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
        // Kontrollojmë nëse URL është e vlefshme
        if (!originalUrl || originalUrl.trim() === '') {
            throw new Error('URL e zbrazët');
        }

        // Nëse është URL lokale ose direkt video file
        if (originalUrl.startsWith('http') && 
            (originalUrl.match(/\.(m3u8|mp4|avi|mkv|webm)$/) || 
             originalUrl.includes('m3u8') ||
             originalUrl.includes('stream'))) {
            
            // Provim direkt
            try {
                const testResponse = await fetch(originalUrl, { 
                    method: 'HEAD',
                    mode: 'no-cors'
                });
                return originalUrl;
            } catch (error) {
                console.log('Duke përdorur proxy për:', originalUrl);
                // Përdorim proxy nëse direkt nuk funksionon
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
            
            // Provim me approach të ndryshëm për HLS
            if (this.videoPlayer.src.includes('.m3u8')) {
                this.showErrorMessage('Formati M3U8 kërkon mbështetje të veçantë. Përdorni HLS.js për shfletues.');
            }
            
            throw error;
        }
    }

    pause() {
        this.videoPlayer.pause();
        this.isPlaying = false;
    }

    nextTrack() {
        let nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        let attempts = 0;
        
        // Provim deri në 5 kanale të radhës
        while (attempts < 5) {
            this.loadTrack(nextIndex);
            nextIndex = (nextIndex + 1) % this.playlist.length;
            attempts++;
            break; // Hiqni këtë nëse doni të provoni automatikisht kanale të ndryshme
        }
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

    handleVideoError(e) {
        console.error('Video error:', e);
        const error = this.videoPlayer.error;
        
        let message = 'Gabim në video: ';
        switch(error?.code) {
            case 1:
                message += 'Video e abortuar';
                break;
            case 2:
                message += 'Problem rrjeti';
                break;
            case 3:
                message += 'Gabim dekodimi';
                break;
            case 4:
                message += 'Video nuk mbështetet';
                break;
            default:
                message += 'Gabim i panjohur';
        }
        
        this.showErrorMessage(message);
    }

    showLoadingMessage(message) {
        this.hideLoadingMessage();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loadingMessage';
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
        `;
        loadingDiv.textContent = message;
        this.videoPlayer.parentElement.style.position = 'relative';
        this.videoPlayer.parentElement.appendChild(loadingDiv);
    }

    hideLoadingMessage() {
        const existing = document.getElementById('loadingMessage');
        if (existing) existing.remove();
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    filterPlaylist(searchTerm) {
        if (!searchTerm) {
            this.filteredPlaylist = [...this.playlist];
        } else {
            this.filteredPlaylist = this.playlist.filter(channel =>
                channel.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                channel.group.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        this.renderPlaylist();
    }

    renderPlaylist() {
        this.playlistItems.innerHTML = '';
        
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
                    <div class="channel-url">${this.truncateUrl(channel.rawUrl)}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.loadTrack(originalIndex);
            });
            
            this.playlistItems.appendChild(li);
        });
    }

    truncateUrl(url) {
        if (url.length > 40) {
            return url.substring(0, 37) + '...';
        }
        return url;
    }

    updateActiveTrack() {
        const items = this.playlistItems.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            const originalIndex = this.playlist.findIndex(c => c.url === this.filteredPlaylist[index]?.url);
            if (originalIndex === this.currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateProgress() {
        const progressBar = document.getElementById('progressBar');
        const currentTime = document.getElementById('currentTime');
        
        if (this.videoPlayer.duration) {
            const progress = (this.videoPlayer.currentTime / this.videoPlayer.duration) * 100;
            progressBar.value = progress;
        }
        
        currentTime.textContent = this.formatTime(this.videoPlayer.currentTime);
    }

    updateDuration() {
        const duration = document.getElementById('duration');
        duration.textContent = this.formatTime(this.videoPlayer.duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00:00';
        
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    updatePlayerTitle(title) {
        document.title = `${title} - M3U Player`;
    }

    handleKeyboard(e) {
        switch(e.key) {
            case ' ':
                e.preventDefault();
                this.isPlaying ? this.pause() : this.play();
                break;
            case 'ArrowRight':
                this.videoPlayer.currentTime += 10;
                break;
            case 'ArrowLeft':
                this.videoPlayer.currentTime -= 10;
                break;
            case 'ArrowUp':
                this.videoPlayer.volume = Math.min(1, this.videoPlayer.volume + 0.1);
                document.getElementById('volumeSlider').value = this.videoPlayer.volume;
                break;
            case 'ArrowDown':
                this.videoPlayer.volume = Math.max(0, this.videoPlayer.volume - 0.1);
                document.getElementById('volumeSlider').value = this.videoPlayer.volume;
                break;
            case 'f':
                this.toggleFullscreen();
                break;
        }
    }
}

// Initialize player
document.addEventListener('DOMContentLoaded', () => {
    new M3UPlayer();
});
