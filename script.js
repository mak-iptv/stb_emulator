class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.videoPlayer = document.getElementById('videoPlayer');
        this.playlistItems = document.getElementById('playlistItems');
        this.searchInput = document.getElementById('searchInput');
        this.isPlaying = false;
        this.filteredPlaylist = [];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Ngarko skedarin M3U
        document.getElementById('m3uFile').addEventListener('change', (e) => {
            this.loadM3UFile(e.target.files[0]);
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

        // Kërkimi në playlist
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

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });
    }

    loadM3UFile(file) {
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
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (nextLine && !nextLine.startsWith('#')) {
                    const trackInfo = this.parseExtinf(line);
                    this.playlist.push({
                        title: trackInfo.title,
                        url: nextLine,
                        duration: trackInfo.duration,
                        group: trackInfo.group || currentGroup,
                        logo: trackInfo.logo
                    });
                    i++;
                }
            } else if (line.startsWith('#EXTGRP:')) {
                currentGroup = line.replace('#EXTGRP:', '').trim();
            } else if (line && !line.startsWith('#') && line !== '') {
                this.playlist.push({
                    title: `Kanali ${this.playlist.length + 1}`,
                    url: line,
                    duration: 0,
                    group: currentGroup
                });
            }
        }
    }

    parseExtinf(extinfLine) {
        const info = {
            duration: 0,
            title: 'Unknown Channel',
            group: 'General',
            logo: null
        };

        // Marr titullin
        const titleMatch = extinfLine.match(/,(.*)$/);
        if (titleMatch) {
            info.title = titleMatch[1].trim();
        }

        // Marr duration
        const durationMatch = extinfLine.match(/:-?\d+/);
        if (durationMatch) {
            info.duration = parseInt(durationMatch[0].substr(1));
        }

        // Marr group
        const groupMatch = extinfLine.match(/group-title="([^"]*)"/);
        if (groupMatch) {
            info.group = groupMatch[1];
        }

        // Marr logo
        const logoMatch = extinfLine.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) {
            info.logo = logoMatch[1];
        }

        return info;
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
                    ${channel.logo ? `<img src="${channel.logo}" alt="${channel.title}" style="width:100%;height:100%;border-radius:50%;">` : '📺'}
                </div>
                <div class="channel-info">
                    <div class="channel-name">${channel.title}</div>
                    <div class="channel-group">${channel.group}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                this.loadTrack(originalIndex);
            });
            
            this.playlistItems.appendChild(li);
        });
    }

    loadTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentTrackIndex = index;
            const track = this.playlist[index];
            
            this.videoPlayer.src = track.url;
            this.updateActiveTrack();
            this.updatePlayerTitle(track.title);
            
            this.play().catch(e => {
                console.log('Auto-play prevented:', e);
            });
        }
    }

    play() {
        return this.videoPlayer.play().then(() => {
            this.isPlaying = true;
        }).catch(e => {
            console.error('Error playing video:', e);
            alert('Gabim gjatë luajtjes së videos. Kontrolloni URL-në.');
        });
    }

    pause() {
        this.videoPlayer.pause();
        this.isPlaying = false;
    }

    nextTrack() {
        const nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        this.loadTrack(nextIndex);
    }

    previousTrack() {
        const prevIndex = this.currentTrackIndex - 1;
        this.loadTrack(prevIndex >= 0 ? prevIndex : this.playlist.length - 1);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.videoPlayer.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
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
