class M3UPlayer {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playlistItems = document.getElementById('playlistItems');
        this.isPlaying = false;

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

        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.audioPlayer.volume = e.target.value;
        });

        // Ndërhyrje kur përfundon një këngë
        this.audioPlayer.addEventListener('ended', () => {
            this.nextTrack();
        });

        // Përditësimi i kohës
        this.audioPlayer.addEventListener('timeupdate', () => {
            this.updateTime();
        });
    }

    loadM3UFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseM3U(content);
            this.renderPlaylist();
            
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            }
        };
        
        reader.readAsText(file);
    }

    parseM3U(content) {
        this.playlist = [];
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
                if (nextLine && !nextLine.startsWith('#')) {
                    const trackInfo = this.parseExtinf(line);
                    this.playlist.push({
                        title: trackInfo.title,
                        url: nextLine,
                        duration: trackInfo.duration
                    });
                    i++; // Kalojmë linjën e URL-së
                }
            } else if (line && !line.startsWith('#') && line !== '') {
                // Shto direkt URL pa metadata
                this.playlist.push({
                    title: `Track ${this.playlist.length + 1}`,
                    url: line,
                    duration: 0
                });
            }
        }
    }

    parseExtinf(extinfLine) {
        const match = extinfLine.match(/#EXTINF:(-?\d+),(.*)/);
        if (match) {
            return {
                duration: parseInt(match[1]),
                title: match[2]
            };
        }
        return { duration: 0, title: 'Unknown Track' };
    }

    renderPlaylist() {
        this.playlistItems.innerHTML = '';
        
        this.playlist.forEach((track, index) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.textContent = track.title;
            li.addEventListener('click', () => {
                this.loadTrack(index);
            });
            this.playlistItems.appendChild(li);
        });
    }

    loadTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentTrackIndex = index;
            const track = this.playlist[index];
            
            this.audioPlayer.src = track.url;
            this.updateActiveTrack();
            
            // Përpiqemi të luajmë automatikisht
            this.play().catch(e => {
                console.log('Auto-play prevented:', e);
            });
        }
    }

    play() {
        return this.audioPlayer.play().then(() => {
            this.isPlaying = true;
        });
    }

    pause() {
        this.audioPlayer.pause();
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

    updateActiveTrack() {
        const items = this.playlistItems.querySelectorAll('.playlist-item');
        items.forEach((item, index) => {
            if (index === this.currentTrackIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    updateTime() {
        const currentTime = document.getElementById('currentTime');
        const duration = document.getElementById('duration');
        
        currentTime.textContent = this.formatTime(this.audioPlayer.currentTime);
        duration.textContent = this.formatTime(this.audioPlayer.duration);
    }

    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize player kur faja të jetë e gatshme
document.addEventListener('DOMContentLoaded', () => {
    new M3UPlayer();
});
