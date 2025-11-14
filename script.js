class SimpleStalkerTester {
    constructor() {
        this.elements = {
            portalUrl: document.getElementById('portalUrl'),
            macAddress: document.getElementById('macAddressInput'),
            connectBtn: document.getElementById('connectBtn'),
            status: document.getElementById('connectionStatus'),
            logs: document.getElementById('logContainer')
        };
        
        this.init();
    }

    init() {
        this.elements.connectBtn.addEventListener('click', () => this.testConnection());
    }

    async testConnection() {
        const portalUrl = this.elements.portalUrl.value;
        const mac = this.elements.macAddress.value;

        this.log('Duke testuar lidhjen...');
        this.updateStatus('Testing');

        // Test 1: Accessibility check
        await this.testAccessibility(portalUrl);
        
        // Test 2: Handshake check
        await this.testHandshake(portalUrl, mac);
    }

    async testAccessibility(url) {
        try {
            this.log(`Duke kontrolluar: ${url}`);
            
            // Provoni me fetch të thjeshtë
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'no-cors'
            });
            
            this.log('✅ URL është e arritshme', 'success');
            return true;
        } catch (error) {
            this.log(`❌ URL nuk është e arritshme: ${error.message}`, 'error');
            return false;
        }
    }

    async testHandshake(portalUrl, mac) {
        const handshakeUrl = `${portalUrl}/server/load.php?type=stb&action=handshake&token=&JsHttpRequest=1-xml`;
        
        this.log(`Duke provuar handshake: ${handshakeUrl}`);
        
        try {
            // Metoda 1: Fetch direkt
            const response = await fetch(handshakeUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                    'MAC': mac
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.log('✅ Handshake i suksesshëm!', 'success');
                this.updateStatus('Connected');
                return data;
            } else {
                this.log(`❌ Handshake dështoi: ${response.status}`, 'error');
            }
        } catch (error) {
            this.log(`❌ Gabim në handshake: ${error.message}`, 'error');
            this.log('Duke provuar me proxy...');
            
            // Metoda 2: Proxy fallback
            await this.tryWithProxy(handshakeUrl, mac);
        }
    }

    async tryWithProxy(url, mac) {
        const proxies = [
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest=',
            'https://cors.bridged.cc/'
        ];

        for (const proxy of proxies) {
            try {
                this.log(`Duke provuar proxy: ${proxy}`);
                
                const response = await fetch(proxy + url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
                        'MAC': mac
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.log('✅ Handshake i suksesshëm me proxy!', 'success');
                    this.updateStatus('Connected via Proxy');
                    return data;
                }
            } catch (proxyError) {
                this.log(`Proxy dështoi: ${proxy}`, 'error');
            }
        }
        
        this.log('❌ Të gjitha proxy-t dështuan', 'error');
        this.updateStatus('Failed');
    }

    log(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.logs.appendChild(logEntry);
    }

    updateStatus(status) {
        this.elements.status.textContent = status;
    }
}
