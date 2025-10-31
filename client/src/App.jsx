import React, { useEffect, useRef, useState, useMemo } from 'react';
import Hls from 'hls.js';

const STORAGE_KEYS = {
  LOGIN: 'stb_login',
  M3U: 'stb_m3u',
  FAVORITES: 'stb_favs',
  LAST_CHANNEL_IDX: 'stb_last_channel_idx'
};

function parseM3U(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const channels = [];
  let lastMeta = null;
  for (const line of lines) {
    if (line.startsWith('#EXTINF:')) {
      lastMeta = line;
    } else if (!line.startsWith('#')) {
      const url = line;
      const meta = lastMeta || '';
      const attrRegex = /(\w+?)=\"([^\"]*)\"/g;
      const attrs = {};
      let m;
      while ((m = attrRegex.exec(meta)) !== null) {
        attrs[m[1]] = m[2];
      }
      const nameMatch = meta.match(/,((?:.|\s)*)$/);
      const name = (nameMatch && nameMatch[1]) ? nameMatch[1].trim() : attrs['tvg-name'] || 'Unknown';
      channels.push({
        name,
        url,
        tvg: attrs['tvg-id'] || attrs['tvg-name'] || null,
        logo: attrs['tvg-logo'] || null,
        group: attrs['group-title'] || 'Ungrouped',
        raw: meta
      });
      lastMeta = null;
    }
  }
  return channels;
}

function defaultEpg() {
  return {};
}

export default function App() {
  const [portalUrl, setPortalUrl] = useState(() => localStorage.getItem('stb_portal_url') || '');
  const [password, setPassword] = useState('');
  useEffect(() => { localStorage.setItem('stb_portal_url', portalUrl || ''); }, [portalUrl]);

  const [login, setLogin] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGIN)) || { method: 'mac', id: '' }; }
    catch { return { method: 'mac', id: '' }; }
  });

  const [isLogged, setIsLogged] = useState(Boolean(login && login.id));
  const [m3uText, setM3uText] = useState(() => localStorage.getItem(STORAGE_KEYS.M3U) || '');
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(() => Number(localStorage.getItem(STORAGE_KEYS.LAST_CHANNEL_IDX) || 0));
  const [epg, setEpg] = useState(defaultEpg);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setMuted] = useState(false);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]'));
  const [osdVisible, setOsdVisible] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LOGIN, JSON.stringify(login)); }, [login]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.M3U, m3uText); }, [m3uText]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LAST_CHANNEL_IDX, String(currentIdx)); }, [currentIdx]);

  useEffect(() => {
    try {
      const parsed = parseM3U(m3uText || '');
      setChannels(parsed);
      setFilteredChannels(parsed);
      const g = Array.from(new Set(parsed.map(c => c.group || 'Ungrouped')));
      setGroups(g);
      if (parsed.length && currentIdx >= parsed.length) setCurrentIdx(0);
    } catch (e) {
      console.error('M3U parse err', e);
      setChannels([]);
      setFilteredChannels([]);
      setGroups([]);
    }
  }, [m3uText]);

  useEffect(() => {
    if (!search) { setFilteredChannels(channels); return; }
    const s = search.toLowerCase();
    setFilteredChannels(channels.filter(c =>
      (c.name || '').toLowerCase().includes(s) || (c.group || '').toLowerCase().includes(s)
    ));
  }, [search, channels]);

  useEffect(() => {
    if (!filteredChannels || filteredChannels.length === 0) return;
    const ch = filteredChannels[currentIdx] || filteredChannels[0];
    if (!ch) return;
    playStream(ch.url);
    setOsdVisible(true);
    const t = setTimeout(() => setOsdVisible(false), 3500);
    return () => clearTimeout(t);
  }, [currentIdx, filteredChannels]);

  useEffect(() => () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } }, []);

  function playStream(url) {
    setPlayingUrl(url);
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => {});
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ capLevelToPlayerSize: true });
      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        hls.loadSource(url);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error', event, data);
      });
    } else {
      video.src = url;
      video.play().catch(() => {});
    }
  }

  async function loginSubmit(e) {
    e.preventDefault();
    const base = portalUrl ? portalUrl.replace(/\/$/, '') : '';
    let loaded = false;

    // Try Xtream/XUI Player API
    if (base && login && login.id && password) {
      const apiUrl = `${base}/player_api.php?username=${encodeURIComponent(login.id)}&password=${encodeURIComponent(password)}`;
      try {
        const resp = await fetch(apiUrl);
        if (resp.ok) {
          const data = await resp.json();
          let streams = data.live || data.live_streams || data;
          if (!Array.isArray(streams) && typeof streams === 'object') streams = Object.values(streams);
          if (Array.isArray(streams) && streams.length) {
            const chans = streams.map(ch => ({
              name: ch.name || ch.stream_display_name || ch.title || `#${ch.stream_id || ''}`,
              url: ch.stream_id ? `${base}/live/${login.id}/${password}/${ch.stream_id}.m3u8` : (ch.stream_url || ch.cmd || ''),
              logo: ch.stream_icon || ch.icon || null,
              group: ch.category_name || ch.category || 'Live'
            }));
            setChannels(chans);
            setFilteredChannels(chans);
            setGroups(Array.from(new Set(chans.map(c => c.group))));
            loaded = true;
          }
        }
      } catch (err) {
        console.warn('player_api fetch failed:', err);
      }
    }

    if (!loaded) {
      try {
        const m3uResp = await fetch('/sample.m3u');
        if (m3uResp.ok) setM3uText(await m3uResp.text());
        const epgResp = await fetch('/epg.json');
        if (epgResp.ok) setEpg(await epgResp.json());
      } catch (err) {
        console.error('Failed to load fallback samples', err);
      }
    }

    setIsLogged(Boolean((channels && channels.length) || m3uText));
  }

  const grouped = useMemo(() => {
    const map = {};
    for (const ch of filteredChannels) {
      const g = ch.group || 'Ungrouped';
      if (!map[g]) map[g] = [];
      map[g].push(ch);
    }
    return map;
  }, [filteredChannels]);

  const currChannel = filteredChannels[currentIdx] || null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
        {/* Left: Player */}
        <div className="col-span-8 space-y-3">
          <div className="bg-black rounded-2xl overflow-hidden shadow-2xl relative">
            <video ref={videoRef} className="w-full h-96 bg-black" controls muted={isMuted} volume={volume}></video>
            {osdVisible && currChannel && (
              <div className="absolute left-4 top-4 bg-black/60 p-3 rounded-md">
                <div className="flex items-center gap-3">
                  {currChannel.logo ? (
                    <img src={currChannel.logo} alt="logo" className="h-12 w-12 object-contain" />
                  ) : (
                    <div className="h-12 w-12 bg-gray-700 rounded" />
                  )}
                  <div>
                    <div className="font-semibold">{currChannel.name}</div>
                    <div className="text-sm text-gray-300">{currChannel.group}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Portal / Channels */}
        <div className="col-span-4 space-y-3">
          {!isLogged ? (
            <div className="bg-gray-800 p-4 rounded-2xl shadow-lg">
              <h2 className="text-xl font-bold mb-3">Portal / Login</h2>
              <form onSubmit={loginSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Portal URL</label>
                  <input
                    type="text"
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    placeholder="http://example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">MAC / Username</label>
                  <input
                    type="text"
                    value={login.id}
                    onChange={(e) => setLogin({ ...login, id: e.target.value })}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                    placeholder="00:1A:79:xx:xx:xx"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Password (optional)</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 rounded bg-gray-700 text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 w-full p-2 rounded text-white font-semibold"
                >
                  Login
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-2xl shadow-lg overflow-y-auto h-[600px]">
              <h2 className="text-xl font-bold mb-3">Channels</h2>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full p-2 rounded bg-gray-700 text-white mb-3"
              />
              {Object.entries(grouped).map(([group, chans]) => (
                <div key={group} className="mb-3">
                  <h3 className="font-semibold text-lg mb-1">{group}</h3>
                  {chans.map((ch) => (
                    <div
                      key={ch.url}
                      onClick={() => setCurrentIdx(filteredChannels.indexOf(ch))}
                      className={`p-2 rounded cursor-pointer ${
                        currentIdx === filteredChannels.indexOf(ch)
                          ? 'bg-blue-600'
                          : 'hover:bg-gray-700'
                      }`}
                    >
                      {ch.name}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
