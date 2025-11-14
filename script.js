class ExtreamTVPlayer {
    constructor() {
        // ... kodi ekzistues ...
        
        this.corsProxies = [
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://corsproxy.org/?',
            'https://api.allorigins.win/get?url='
        ];

        this.initializeEventListeners();
    }

    // ... kodi ekzistues ...

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
            // Provim me proxy të ndryshme
            let content = '';
            let success = false;

            for (const proxy of this.corsProxies) {
                try {
                    console.log(`Duke provuar proxy: ${proxy}`);
                    const proxyUrl = proxy === 'https://api.allorigins.win/get?url=' 
                        ? `${proxy}${encodeURIComponent(url)}`
                        : `${proxy}${encodeURIComponent(url)}`;
                    
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'Accept': 'text/plain,application/x-mpegURL,*/*'
                        },
                        timeout: 10000
                    });

                    if (response.ok) {
                        if (proxy.includes('api.allorigins.win')) {
                            const data = await response.json();
                            content = data.contents;
                        } else {
                            content = await response.text();
                        }
                        
                        success = true;
                        console.log('URL u ngarkua me sukses me proxy:', proxy);
                        break;
                    }
                } catch (error) {
                    console.log(`Proxy ${proxy} dështoi:`, error);
                    continue;
                }
            }

            if (!success) {
                // Provim direkt pa proxy (për URL që nuk kanë CORS)
                try {
                    console.log('Duke provuar direkt pa proxy...');
                    const response = await fetch(url, {
                        method: 'GET',
                        mode: 'no-cors',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                    
                    // Nëse kjo nuk hedh error, provojmë të përdorim URL direkt
                    content = `#EXTM3U\n#EXTINF:-1,Direct Stream\n${url}`;
                    console.log('Duke përdorur URL direkt');
                } catch (directError) {
                    throw new Error('Të gjitha proxy-t dështuan dhe direkt nuk funksionon');
                }
            }

            if (!content) {
                throw new Error('Nuk u gjet përmbajtje nga URL');
            }

            this.parseM3U(content);
            this.filteredPlaylist = [...this.playlist];
            this.renderCategories();
            this.renderPlaylist();
            this.closeExtreamModal();
            
            if (this.playlist.length > 0) {
                this.loadTrack(0);
            } else {
                this.showErrorMessage('Nuk u gjetën kanale në këtë URL');
            }
            
            this.hideLoadingMessage();
            
        } catch (error) {
            console.error('Error loading Extream URL:', error);
            this.hideLoadingMessage();
            this.showErrorMessage(`Gabim gjatë ngarkimit: ${error.message}`);
        }
    }

    // Metodë alternative për URL të thjeshta
    async loadDirectUrl() {
        const url = document.getElementById('extreamUrl').value.trim();
        
        // Krijo një playlist të thjeshtë me URL-në e dhënë
        this.playlist = [{
            title: 'Extream Stream',
            url: url,
            duration: 0,
            group: 'Extream',
            logo: '',
            country: 'International',
            countryCode: '🌍',
            rawUrl: url
        }];
        
        this.filteredPlaylist = [...this.playlist];
        this.renderCategories();
        this.renderPlaylist();
        this.closeExtreamModal();
        
        if (this.playlist.length > 0) {
            this.loadTrack(0);
        }
    }

    // Shto buton alternative në modal
    openExtreamModal() {
        document.getElementById('extreamModal').style.display = 'block';
        // Shto buton alternative
        setTimeout(() => {
            if (!document.getElementById('directLoadBtn')) {
                const directBtn = document.createElement('button');
                directBtn.id = 'directLoadBtn';
                directBtn.textContent = 'Ngarko Direkt (Nëse Proxy Dështon)';
                directBtn.style.cssText = `
                    margin-top: 10px;
                    padding: 10px;
                    background: #f39c12;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    width: 100%;
                `;
                directBtn.addEventListener('click', () => {
                    this.loadDirectUrl();
                });
                document.querySelector('.modal-content').appendChild(directBtn);
            }
        }, 100);
    }

    // ... pjesa tjetër e kodit ...
}
async loadExtreamUrl() {
    const url = document.getElementById('extreamUrl').value.trim();
    if (!url) {
        alert('Ju lutem shkruani një URL!');
        return;
    }

    this.showLoadingMessage('Duke ngarkuar...');

    try {
        // Krijo një skedar M3U virtual me URL-në e dhënë
        const virtualM3U = `#EXTM3U
#EXTINF:-1 tvg-id="extream1" tvg-name="Extream Stream 1" tvg-logo="" group-title="Extream",Extream Stream 1
${url}`;

        this.parseM3U(virtualM3U);
        this.filteredPlaylist = [...this.playlist];
        this.renderCategories();
        this.renderPlaylist();
        this.closeExtreamModal();
        
        if (this.playlist.length > 0) {
            this.loadTrack(0);
            this.showErrorMessage('URL u ngarkua! Nëse nuk punon, provoni direkt në VLC.');
        }
        
        this.hideLoadingMessage();
        
    } catch (error) {
        console.error('Error:', error);
        this.hideLoadingMessage();
        this.showErrorMessage('Provoni direkt në VLC ose shfletues tjetër');
    }
}
