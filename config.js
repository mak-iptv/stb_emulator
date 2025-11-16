// config.js - Konfigurimi dhe shërbimet e MAG Web Player

class MAGConfig {
    constructor() {
        this.defaultConfig = {
            serverUrl: '',
            macAddress: '',
            autoConnect: false,
            theme: 'dark',
            language: 'sq',
            videoQuality: 'auto',
            volume: 0.8,
            playbackRate: 1.0,
            enableSubtitles: false,
            defaultSubtitleLang: 'sq',
            bufferSize: 30,
            maxBufferLength: 60,
            lowLatencyMode: true,
            enableStats: true,
            favorites: [],
            recentChannels: [],
            parentalControl: false,
            parentalPin: '0000'
        };

        this.supportedProtocols = [
            'http',
            'https'
        ];

        this.defaultPorts = [
            80, 8080, 8000, 8001, 8008, 8081, 8888
        ];

        this.videoQualities = [
            { value: 'auto', label: 'Auto', description: 'Cilësi automatike' },
            { value: '1080p', label: '1080p', description: 'Full HD' },
            { value: '720p', label: '720p', description: 'HD' },
            { value: '480p', label: '480p', description: 'SD' },
            { value: '360p', label: '360p', description: 'Cilësi e ulët' }
        ];

        this.languages = [
            { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'it', name: 'Italiano', flag: '🇮🇹' },
            { code: 'gr', name: 'Ελληνικά', flag: '🇬🇷' }
        ];

        this.themes = [
            { id: 'dark', name: 'Dark Mode', class: 'theme-dark' },
            { id: 'light', name: 'Light Mode', class: 'theme-light' },
            { id: 'blue', name: 'Blue Ocean', class: 'theme-blue' },
            { id: 'purple', name: 'Purple Haze', class: 'theme-purple' }
        ];
    }

    // Metoda për inicializimin e konfigurimit
    initialize() {
        console.log('⚙️ Duke inicializuar konfigurimin...');
        
        const savedConfig = this.loadFromStorage();
        this.config = { ...this.defaultConfig, ...savedConfig };
        
        this.applyTheme();
        this.applyLanguage();
        this.setupAutoConnect();
        
        return this.config;
    }

    // Ngarkon konfigurimin nga localStorage
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('magPlayerConfig');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('❌ Gabim në leximin e konfigurimit:', error);
        }
        return {};
    }

    // Ruaj konfigurimin në localStorage
    saveToStorage(config = null) {
        try {
            const configToSave = config || this.config;
            localStorage.setItem('magPlayerConfig', JSON.stringify(configToSave));
            console.log('💾 Konfigurimi u ruajt');
            return true;
        } catch (error) {
            console.error('❌ Gabim në ruajtjen e konfigurimit:', error);
            return false;
        }
    }

    // Përditëso një setting specifik
    updateSetting(key, value) {
        if (key in this.config) {
            this.config[key] = value;
            this.saveToStorage();
            
            // Apliko ndryshimet në real-time
            this.applySetting(key, value);
            
            return true;
        }
        return false;
    }

    // Apliko setting në real-time
    applySetting(key, value) {
        switch (key) {
            case 'theme':
                this.applyTheme();
                break;
            case 'language':
                this.applyLanguage();
                break;
            case 'volume':
                this.applyVolume();
                break;
            case 'autoConnect':
                this.setupAutoConnect();
                break;
        }
    }

    // Apliko theme-n e zgjedhur
    applyTheme() {
        const theme = this.config.theme;
        document.documentElement.className = `theme-${theme}`;
        
        // Shto CSS class për theme
        this.themes.forEach(t => {
            document.body.classList.remove(t.class);
        });
        document.body.classList.add(`theme-${theme}`);
    }

    // Apliko gjuhën e zgjedhur
    applyLanguage() {
        const lang = this.config.language;
        document.documentElement.lang = lang;
        
        // Në të ardhmen, mund të implementoni translations këtu
        console.log(`🌐 Gjuha e zgjedhur: ${lang}`);
    }

    // Apliko volum-in
    applyVolume() {
        if (window.magApp && window.magApp.player) {
            window.magApp.player.volume(this.config.volume);
        }
    }

    // Konfiguro auto-connect
    setupAutoConnect() {
        if (this.config.autoConnect && this.config.serverUrl && this.config.macAddress) {
            console.log('🔗 Auto-connect i aktivizuar');
            // Në të ardhmen, mund të aktivizohet lidhja automatikisht
        }
    }

    // Valido URL-n e serverit
    validateServerUrl(url) {
        if (!url) {
            return { valid: false, error: 'URL nuk mund të jetë bosh' };
        }

        try {
            // Shto http:// nëse mungon
            if (!url.startsWith('http')) {
                url = 'http://' + url;
            }

            const urlObj = new URL(url);
            
            // Kontrollo protokollin
            if (!this.supportedProtocols.includes(urlObj.protocol.replace(':', ''))) {
                return { valid: false, error: 'Vetëm HTTP dhe HTTPS mbështeten' };
            }

            // Kontrollo portën
            const port = urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80);
            if (port < 1 || port > 65535) {
                return { valid: false, error: 'Porta e pavlefshme' };
            }

            return { 
                valid: true, 
                normalizedUrl: url,
                hostname: urlObj.hostname,
                port: parseInt(port),
                protocol: urlObj.protocol.replace(':', '')
            };

        } catch (error) {
            return { valid: false, error: 'URL e pavlefshme' };
        }
    }

    // Valido MAC adresën
    validateMacAddress(mac) {
        if (!mac) {
            return { valid: false, error: 'MAC adresa nuk mund të jetë bosh' };
        }

        // Normalizo MAC adresën
        const normalizedMac = mac.toUpperCase().replace(/[^A-F0-9]/g, '');
        
        // Kontrollo gjatësinë
        if (normalizedMac.length !== 12) {
            return { valid: false, error: 'MAC adresa duhet të ketë 12 karaktere hex' };
        }

        // Kontrollo formatin hex
        if (!/^[0-9A-F]{12}$/.test(normalizedMac)) {
            return { valid: false, error: 'MAC adresa përmban karaktere të pavlefshme' };
        }

        // Format standard (00:1A:79:XX:XX:XX)
        const formattedMac = normalizedMac.match(/.{1,2}/g).join(':');

        return {
            valid: true,
            normalizedMac: normalizedMac,
            formattedMac: formattedMac
        };
    }

    // Gjej URL të mundshme për server
    generateServerUrls(baseUrl) {
        const urls = [];
        const validation = this.validateServerUrl(baseUrl);
        
        if (!validation.valid) {
            return urls;
        }

        const { hostname, port, protocol } = validation;
        const basePath = `${protocol}://${hostname}:${port}`;

        // Shto variante të ndryshme të URL-ve
        urls.push(`${basePath}/portal.php`);
        urls.push(`${basePath}/c/`);
        urls.push(`${basePath}/`);
        urls.push(`${basePath}/player_api.php`);
        urls.push(`${basePath}/api.php`);
        urls.push(`${basePath}/stalker_portal.php`);
        urls.push(`${basePath}/xmltv.php`);

        return urls;
    }

    // Gjej endpoint-et e mundshme për kanale
    getChannelEndpoints(serverUrl) {
        return [
            `${serverUrl}?type=itv&action=get_live_streams`,
            `${serverUrl}?action=get_live_streams`,
            `${serverUrl}?type=get_live_streams`,
            `${serverUrl}/get_live_streams`,
            `${serverUrl}/channels`,
            `${serverUrl}/live_streams`
        ];
    }

    // Kthe konfigurimin aktual
    getConfig() {
        return { ...this.config };
    }

    // Reset konfigurimin në default
    resetToDefaults() {
        this.config = { ...this.defaultConfig };
        this.saveToStorage();
        this.applyTheme();
        this.applyLanguage();
        return this.config;
    }

    // Eksporto konfigurimin
    exportConfig() {
        const configToExport = {
            ...this.config,
            exportDate: new Date().toISOString(),
            version: '1.0.0'
        };

        // Fshi të dhëna sensitive
        delete configToExport.parentalPin;
        delete configToExport.favorites;
        delete configToExport.recentChannels;

        return JSON.stringify(configToExport, null, 2);
    }

    // Importo konfigurimin
    importConfig(configString) {
        try {
            const importedConfig = JSON.parse(configString);
            
            // Verifiko versionin
            if (!importedConfig.version) {
                throw new Error('Konfigurim i pavlefshëm: versioni mungon');
            }

            // Mbishkruaj vetëm fushat e lejuara
            const allowedFields = [
                'serverUrl', 'macAddress', 'autoConnect', 'theme', 'language',
                'videoQuality', 'volume', 'playbackRate', 'enableSubtitles',
                'defaultSubtitleLang', 'bufferSize', 'maxBufferLength',
                'lowLatencyMode', 'enableStats'
            ];

            allowedFields.forEach(field => {
                if (field in importedConfig) {
                    this.config[field] = importedConfig[field];
                }
            });

            this.saveToStorage();
            this.applyTheme();
            this.applyLanguage();

            return { success: true, message: 'Konfigurimi u importua me sukses' };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Menaxho kanalet e preferuara
    addToFavorites(channelId) {
        if (!this.config.favorites.includes(channelId)) {
            this.config.favorites.push(channelId);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    removeFromFavorites(channelId) {
        const index = this.config.favorites.indexOf(channelId);
        if (index > -1) {
            this.config.favorites.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    isFavorite(channelId) {
        return this.config.favorites.includes(channelId);
    }

    // Menaxho kanalet e fundit
    addToRecent(channelId) {
        // Hiq nëse ekziston tashmë
        const index = this.config.recentChannels.indexOf(channelId);
        if (index > -1) {
            this.config.recentChannels.splice(index, 1);
        }

        // Shto në fillim
        this.config.recentChannels.unshift(channelId);

        // Kufizo në 10 elementët e fundit
        if (this.config.recentChannels.length > 10) {
            this.config.recentChannels = this.config.recentChannels.slice(0, 10);
        }

        this.saveToStorage();
    }

    getRecentChannels() {
        return [...this.config.recentChannels];
    }

    // Kontrollo parental control
    checkParentalControl() {
        return this.config.parentalControl;
    }

    verifyParentalPin(pin) {
        return pin === this.config.parentalPin;
    }

    setParentalControl(enabled, pin = null) {
        this.config.parentalControl = enabled;
        if (pin) {
            this.config.parentalPin = pin;
        }
        this.saveToStorage();
    }

    // Kthe settings për HLS player
    getHlsConfig() {
        return {
            enableWorker: false,
            lowLatencyMode: this.config.lowLatencyMode,
            backBufferLength: this.config.bufferSize,
            maxBufferLength: this.config.maxBufferLength,
            maxMaxBufferLength: 600,
            maxBufferSize: 60 * 1000 * 1000, // 60MB
            maxBufferHole: 0.5,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 3,
            maxFragLookUpTolerance: 0.25,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            liveDurationInfinity: false,
            liveBackBufferLength: null,
            maxLiveSyncPlaybackRate: 1
        };
    }

    // Kthe settings për Video.js
    getVideoJsConfig() {
        return {
            controls: true,
            autoplay: true,
            preload: 'auto',
            responsive: true,
            fluid: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            html5: {
                vhs: {
                    overrideNative: true,
                    enableLowInitialPlaylist: true,
                    smoothQualityChange: true,
                    fastQualityChange: true
                }
            }
        };
    }

    // Gjej informacion për sistemin
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            javaEnabled: navigator.javaEnabled ? navigator.javaEnabled() : false,
            online: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            indexedDB: !!window.indexedDB,
            webWorker: !!window.Worker,
            serviceWorker: !!navigator.serviceWorker,
            webGL: this.detectWebGL(),
            hlsSupport: this.detectHlsSupport(),
            webrtcSupport: this.detectWebRTC()
        };
    }

    // Zbuloni nëse WebGL është i mundësuar
    detectWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }

    // Zbuloni nëse HLS mbështetet
    detectHlsSupport() {
        return {
            native: !!document.createElement('video').canPlayType('application/vnd.apple.mpegurl'),
            hlsJs: window.Hls && window.Hls.isSupported(),
            mediaSource: !!window.MediaSource || !!window.WebKitMediaSource
        };
    }

    // Zbuloni nëse WebRTC mbështetet
    detectWebRTC() {
        return !!(navigator.getUserMedia || 
                 navigator.webkitGetUserMedia || 
                 navigator.mozGetUserMedia || 
                 navigator.msGetUserMedia);
    }

    // Gjej versionin e aplikacionit
    getAppVersion() {
        return {
            version: '1.0.0',
            build: '2024.01.01',
            name: 'MAG Web Player',
            author: 'IPTV Solutions',
            license: 'MIT'
        };
    }
}

// Krijoni instancë globale të konfigurimit
const magConfig = new MAGConfig();

// Eksporto për përdorim në module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MAGConfig, magConfig };
}
// Shto këtë në klasën MAGConfig
getDebugEndpoints(serverUrl) {
    const baseUrls = [];
    
    // Testo porta të ndryshme
    const ports = [80, 8080, 8000, 8001, 8008, 8081, 8888, 8443, 1935];
    const protocols = ['http', 'https'];
    
    protocols.forEach(protocol => {
        ports.forEach(port => {
            // Nëse URL ka tashmë portë, mos e ndrysho
            if (!serverUrl.includes(':')) {
                baseUrls.push(`${protocol}://${serverUrl}:${port}`);
            }
        });
    });
    
    return baseUrls;
}

// Metodë për debug
async debugConnection(serverUrl, macAddress) {
    const debugResults = {
        success: false,
        workingUrls: [],
        errors: [],
        suggestions: []
    };

    // Gjenero URL të mundshme
    const possibleUrls = this.getDebugEndpoints(serverUrl);
    
    for (let url of possibleUrls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                debugResults.workingUrls.push({
                    url: url,
                    status: response.status,
                    headers: Object.fromEntries(response.headers)
                });
            }
        } catch (error) {
            debugResults.errors.push({
                url: url,
                error: error.message
            });
        }
    }

    // Gjenero sugjerime
    if (debugResults.workingUrls.length > 0) {
        debugResults.success = true;
        debugResults.suggestions.push('U gjetën serverë funksionalë!');
    } else {
        debugResults.suggestions.push('Kontrolloni nëse serveri është online');
        debugResults.suggestions.push('Kontrolloni firewall-in dhe portat');
        debugResults.suggestions.push('Provoni http në vend të https (ose anasjelltas)');
    }

    return debugResults;
}
