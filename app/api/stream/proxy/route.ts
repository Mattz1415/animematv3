import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ExtractedStream {
  type: 'mp4' | 'hls' | 'raw';
  mediaUrl: string;
}

/**
 * Enforces HTTPS for all stream and asset URLs to prevent Mixed Content blocking.
 */
function enforceHttps(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (trimmed.startsWith('http://')) return 'https://' + trimmed.slice(7);
  return trimmed;
}

/**
 * Safe base-N encoder that supports radix up to 62 (0-9, a-z, A-Z)
 * without calling Number.prototype.toString(radix) which throws RangeError when radix > 36.
 */
function encodeBaseN(val: number, radix: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const r = radix || 36;
  if (val === 0) return '0';
  let res = '';
  let curr = val;
  while (curr > 0) {
    res = chars[curr % r] + res;
    curr = Math.floor(curr / r);
  }
  return res;
}

/**
 * Bulletproof Dean Edwards packer unpacker for VidHide and video CDNs.
 * Uses safe Function evaluation first, with a fallback to regex and safe base-N dictionary decoding.
 */
function unpackDeanEdwards(script: string): string | null {
  try {
    // 1. Try safe Function invocation if eval(function(p,a,c,k,e,d)...) is present
    const evalIndex = script.indexOf('eval(function(p,a,c,k,e,d)');
    if (evalIndex !== -1) {
      const sub = script.substring(evalIndex + 5);
      let depth = 1;
      let endIdx = -1;
      for (let i = 0; i < sub.length; i++) {
        if (sub[i] === '(') depth++;
        else if (sub[i] === ')') {
          depth--;
          if (depth === 0) {
            endIdx = i;
            break;
          }
        }
      }
      if (endIdx !== -1) {
        const invocation = sub.substring(0, endIdx);
        try {
          const result = new Function('return (' + invocation + ')')();
          if (typeof result === 'string') {
            return result;
          }
        } catch {
          // Fall through to manual regex unpacker
        }
      }
    }

    // 2. Manual regex unpacker supporting escaped quotes and base-62
    const regex = /}\s*\(\s*['"]((?:\\.|[^'"])*)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]([\s\S]*?)['"]\.split\(['"]\|['"]\)/;
    const match = script.match(regex);
    if (!match) return null;

    const [_, payload, radixStr, countStr, keywordsStr] = match;
    const radix = parseInt(radixStr, 10) || 36;
    const count = parseInt(countStr, 10);
    const keywords = keywordsStr.split('|');

    const dict: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const key = encodeBaseN(i, radix);
      dict[key] = keywords[i] || key;
    }

    return payload.replace(/\b\w+\b/g, (token) => {
      return Object.prototype.hasOwnProperty.call(dict, token) ? dict[token] : token;
    });
  } catch (err) {
    console.warn('[unpackDeanEdwards error]', err);
    return null;
  }
}

/**
 * Extracts direct MP4 or HLS stream URLs from diverse HTML structures
 * (odcdn, ondesu, Google Video, VidHide, archive.org, jwplayer, HTML5 video).
 */
function extractStreamFromHtml(html: string): ExtractedStream | null {
  if (!html) return null;

  // 1. Check odcdn format: const videoURL = "https://..."
  const odcdnMatch = html.match(/const\s+videoURL\s*=\s*["']([^"']+)["']/i);
  if (odcdnMatch && odcdnMatch[1]) {
    return { type: 'mp4', mediaUrl: enforceHttps(odcdnMatch[1]) };
  }

  // 2. Check arcg or general file: "https://...mp4" or "https://...m3u8"
  const fileMatch = html.match(/file\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^\s"']*)["']/i);
  if (fileMatch && fileMatch[1]) {
    const isHls = fileMatch[1].includes('.m3u8');
    return { type: isHls ? 'hls' : 'mp4', mediaUrl: enforceHttps(fileMatch[1]) };
  }

  // 3. Check sources array: sources: [{ file: "..." }] or [{ src: "..." }]
  const sourcesMatch = html.match(/sources\s*:\s*\[\s*\{\s*(?:file|src)\s*:\s*["']([^"']+)["']/i);
  if (sourcesMatch && sourcesMatch[1]) {
    const url = enforceHttps(sourcesMatch[1]);
    const isHls = url.includes('.m3u8');
    return { type: isHls ? 'hls' : 'mp4', mediaUrl: url };
  }

  // 4. Check ondesu (google video) & HTML5 format: <source src="..." type="video/mp4">
  const ondesuSourceMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (ondesuSourceMatch && ondesuSourceMatch[1]) {
    const url = enforceHttps(ondesuSourceMatch[1].replace(/&amp;/g, '&'));
    const isHls = url.includes('.m3u8');
    return { type: isHls ? 'hls' : 'mp4', mediaUrl: url };
  }

  const videoTagMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
  if (videoTagMatch && videoTagMatch[1]) {
    const url = enforceHttps(videoTagMatch[1].replace(/&amp;/g, '&'));
    const isHls = url.includes('.m3u8');
    return { type: isHls ? 'hls' : 'mp4', mediaUrl: url };
  }

  // 5. Check direct googlevideo URL in script or attributes
  const gvideoMatch = html.match(/https?:\/\/[^\s"'<>]+\.googlevideo\.com\/videoplayback[^\s"'<>]*/i);
  if (gvideoMatch && gvideoMatch[0]) {
    return { type: 'mp4', mediaUrl: enforceHttps(gvideoMatch[0].replace(/&amp;/g, '&')) };
  }

  // 6. Check VidHide & Dean Edwards Packer format: eval(function(p,a,c,k,e,d)...)
  const unpacked = unpackDeanEdwards(html);
  if (unpacked) {
    const m3u8Match = unpacked.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
    if (m3u8Match && m3u8Match[0]) {
      return { type: 'hls', mediaUrl: enforceHttps(m3u8Match[0]) };
    }
    const mp4Match = unpacked.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/i);
    if (mp4Match && mp4Match[0]) {
      return { type: 'mp4', mediaUrl: enforceHttps(mp4Match[0]) };
    }
  }

  // 7. Look for any standalone m3u8 or mp4 in raw script tags
  const standaloneHls = html.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
  if (standaloneHls && standaloneHls[0]) {
    return { type: 'hls', mediaUrl: enforceHttps(standaloneHls[0]) };
  }

  return null;
}

/**
 * Builds a clean, unified player with hls.js for HLS and direct video tag for MP4.
 * Includes <meta name="referrer" content="no-referrer"> to completely defeat hotlink protection
 * and avoid leaking Vercel domain referrers.
 */
function buildUnifiedPlayerHtml(
  type: 'mp4' | 'hls' | 'raw',
  mediaUrl: string,
  originalUrl: string
): string {
  const cleanMediaUrl = enforceHttps(mediaUrl);
  const cleanOriginalUrl = enforceHttps(originalUrl);
  const posterUrl =
    'https://1.bp.blogspot.com/-_hry8Jf4-rE/YUFwSer_GmI/AAAAAAAAJzQ/x3FebfvoOmcpwVGyUmkDqx5a7t8-GmN8ACLcBGAsYHQ/s960/Otakudesu%2BStreaming.png';

  // For restricted CDNs (e.g. googlevideo / ondesu), provide proxy route as secondary fallback
  const proxyMediaUrl = `/api/stream/media?url=${encodeURIComponent(cleanMediaUrl)}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>SankaVerse Stream Player</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 100%;
      height: 100%;
      background: #000;
      color: #fff;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .player-wrap {
      position: relative;
      width: 100vw;
      height: 100vh;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      outline: none;
    }
    .play-overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 30;
      transition: opacity 0.25s ease;
    }
    .poster-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
      opacity: 0.85;
    }
    .play-circle {
      position: relative;
      z-index: 40;
      width: 78px;
      height: 78px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      box-shadow: 0 0 35px rgba(220, 38, 38, 0.7), inset 0 0 10px rgba(255,255,255,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      cursor: pointer;
      border: 3px solid rgba(255, 255, 255, 0.9);
    }
    .play-circle:hover {
      transform: scale(1.12);
      box-shadow: 0 0 45px rgba(239, 68, 68, 0.9), inset 0 0 15px rgba(255,255,255,0.6);
    }
    .play-icon {
      width: 0;
      height: 0;
      margin-left: 6px;
      border-top: 15px solid transparent;
      border-bottom: 15px solid transparent;
      border-left: 24px solid #fff;
    }
    .badge-bar {
      position: absolute;
      bottom: 24px;
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(18, 18, 20, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      font-size: 11px;
      font-family: ui-monospace, monospace;
      color: #d4d4d8;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 8px #22c55e;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    .error-card {
      display: none;
      position: absolute;
      inset: 0;
      background: #09090b;
      z-index: 50;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
    }
    .error-card.visible { display: flex; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #dc2626;
      color: #fff;
      font-weight: bold;
      font-size: 12px;
      padding: 10px 18px;
      border-radius: 10px;
      text-decoration: none;
      cursor: pointer;
      border: none;
      margin-top: 14px;
      box-shadow: 0 0 20px rgba(220, 38, 38, 0.4);
    }
    .btn:hover { background: #ef4444; }
  </style>
  ${
    type === 'hls'
      ? `<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js"></script>`
      : ''
  }
</head>
<body>
  <div class="player-wrap">
    <video
      id="mainVideo"
      controls
      playsinline
      preload="metadata"
      referrerpolicy="no-referrer"
      poster="${posterUrl}"
    >
      ${type === 'mp4' ? `<source src="${cleanMediaUrl}" type="video/mp4"><source src="${proxyMediaUrl}" type="video/mp4">` : ''}
    </video>

    <!-- Overlay Play Button -->
    <div class="play-overlay" id="playOverlay" title="Klik untuk memutar video">
      <img class="poster-img" src="${posterUrl}" alt="Video Poster" />
      <div class="play-circle">
        <div class="play-icon"></div>
      </div>
      <div class="badge-bar">
        <div class="dot"></div>
        <span>Klik untuk Putar (${type === 'hls' ? 'HLS HD Stream' : 'HD Video Direct'})</span>
      </div>
    </div>

    <!-- Fallback Card jika stream gagal dimuat -->
    <div class="error-card" id="errorCard">
      <h3 style="color:#ef4444; font-size:15px; margin-bottom:8px;">Stream Siap Diputar</h3>
      <p style="font-size:12px; color:#a1a1aa; max-width:400px; line-height:1.5;">
        Video dapat diputar langsung di Popout Player atau klik tombol di bawah untuk membuka mirror:
      </p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:12px;">
        <button class="btn" style="background:#dc2626;" onclick="window.parent.postMessage({ type: 'SANKA_OPEN_POPOUT' }, '*')">
          ⚡ Buka Popout Player
        </button>
        <button class="btn" style="background:#27272a; color:#f4f4f5;" onclick="window.parent.postMessage({ type: 'SANKA_SWITCH_DIRECT' }, '*')">
          🌐 Mode Direct Browser
        </button>
        <a class="btn" href="${cleanOriginalUrl}" target="_blank" rel="noopener noreferrer" style="background:#18181b; border:1px solid #3f3f46; color:#a1a1aa;">
          ↗ Buka Tab Baru
        </a>
      </div>
    </div>
  </div>

  <script>
    (function() {
      var video = document.getElementById('mainVideo');
      var overlay = document.getElementById('playOverlay');
      var errorCard = document.getElementById('errorCard');
      var directUrl = ${JSON.stringify(cleanMediaUrl)};
      var proxyUrl = ${JSON.stringify(proxyMediaUrl)};
      var isHls = ${type === 'hls'};

      var isInitialized = false;

      function startPlayback() {
        if (overlay) overlay.style.display = 'none';

        if (!isInitialized) {
          isInitialized = true;
          if (isHls && window.Hls && Hls.isSupported()) {
            var hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90
            });
            hls.loadSource(directUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
              video.play().catch(function(err) {
                console.log('Autoplay deferred:', err);
              });
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
              if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                } else {
                  hls.destroy();
                  showError();
                }
              }
            });
          } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari iOS/macOS Native HLS
            video.src = directUrl;
            video.play().catch(function(e) { console.log(e); });
          } else {
            // MP4 Direct via client browser IP
            if (!video.src) video.src = directUrl;
            video.play().catch(function(e) {
              console.log('Direct play deferred, trying proxy fallback...');
              if (video.src !== proxyUrl) {
                video.src = proxyUrl;
                video.play().catch(function() {});
              }
            });
          }
        } else {
          video.play().catch(function(e) { console.log(e); });
        }
      }

      function showError() {
        if (overlay) overlay.style.display = 'none';
        if (errorCard) errorCard.classList.add('visible');
      }

      if (overlay) {
        overlay.addEventListener('click', startPlayback);
      }

      video.addEventListener('error', function(e) {
        console.warn('Video source error, attempting secondary fallback...');
        if (!video.dataset.recovered && video.src !== proxyUrl) {
          video.dataset.recovered = 'true';
          video.src = proxyUrl;
          video.load();
          video.play().catch(function() {
            showError();
          });
          return;
        }
        showError();
      });

      // Keyboard shortcuts
      window.addEventListener('keydown', function(e) {
        if (e.code === 'Space') {
          e.preventDefault();
          if (video.paused) {
            startPlayback();
          } else {
            video.pause();
          }
        } else if (e.code === 'KeyF') {
          if (!document.fullscreenElement) {
            video.requestFullscreen().catch(function() {});
          } else {
            document.exitFullscreen().catch(function() {});
          }
        }
      });
    })();
  </script>
</body>
</html>`;
}

export async function GET(req: NextRequest) {
  const rawUrlParam = req.nextUrl.searchParams.get('url');

  if (!rawUrlParam) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  const cleanUrl = enforceHttps(rawUrlParam);

  let targetUrl: URL;
  try {
    targetUrl = new URL(cleanUrl);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  // Determine realistic target Referer based on provider domain
  let targetReferer = 'https://desustream.net/';
  if (targetUrl.hostname.includes('desustream') || targetUrl.hostname.includes('desu')) {
    targetReferer = 'https://desustream.net/';
  } else if (targetUrl.hostname.includes('vidhide') || targetUrl.hostname.includes('odvidhide')) {
    targetReferer = targetUrl.origin + '/';
  } else if (targetUrl.hostname.includes('ondesu')) {
    targetReferer = 'https://desustream.net/';
  } else if (targetUrl.hostname.includes('otakudesu')) {
    targetReferer = 'https://otakudesu.blog/';
  } else {
    targetReferer = targetUrl.origin + '/';
  }

  // Authentic browser navigation headers.
  // CRITICAL: Omit Origin on GET requests to avoid triggering anti-bot WAFs.
  const browserHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/*;q=0.8,*/*;q=0.5',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': targetReferer,
    'Sec-Fetch-Dest': 'iframe',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  try {
    let res = await fetch(targetUrl.toString(), {
      redirect: 'follow',
      headers: browserHeaders,
    });

    // If initial fetch gets blocked, retry with alternate referer
    if (!res.ok) {
      const altReferer = targetReferer.includes('desustream')
        ? 'https://otakudesu.blog/'
        : targetUrl.origin + '/';
      try {
        const retryRes = await fetch(targetUrl.toString(), {
          redirect: 'follow',
          headers: { ...browserHeaders, Referer: altReferer },
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      } catch {
        // Keep original
      }
    }

    // If server still returns error (e.g. datacenter IP blocked on Vercel),
    // deliver client-side auto-fallback so the user's local residential IP plays the stream!
    if (!res.ok) {
      const recoveryHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta name="referrer" content="no-referrer">
          <title>Stream Recovery Bridge</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #09090b;
              color: #f4f4f5;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              padding: 20px;
              text-align: center;
            }
            .card {
              max-width: 480px;
              padding: 24px;
              background: #18181b;
              border: 1px solid #27272a;
              border-radius: 16px;
              box-shadow: 0 0 30px rgba(0,0,0,0.8);
            }
            h3 { color: #f87171; font-size: 15px; margin-bottom: 8px; }
            p { font-size: 12px; color: #a1a1aa; line-height: 1.5; margin-bottom: 16px; }
            .btn-group { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
            .btn {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              background: #dc2626;
              color: white;
              padding: 10px 18px;
              border-radius: 10px;
              font-size: 12px;
              text-decoration: none;
              cursor: pointer;
              font-weight: bold;
              border: none;
              transition: all 0.2s;
            }
            .btn:hover { background: #b91c1c; }
            .btn-secondary { background: #27272a; color: #f4f4f5; }
            .btn-secondary:hover { background: #3f3f46; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>⚡ Mengalihkan ke Koneksi Client IP Lokal</h3>
            <p>Menghubungkan langsung melalui browser user tanpa batasan serverless Vercel.</p>
            <div class="btn-group">
              <button class="btn" onclick="window.parent.postMessage({ type: 'SANKA_SWITCH_DIRECT', url: '${targetUrl.toString()}' }, '*')">
                🌐 Putar Langsung di Player
              </button>
              <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'SANKA_OPEN_POPOUT' }, '*')">
                🚀 Buka Popout Player
              </button>
              <a class="btn btn-secondary" href="${targetUrl.toString()}" target="_blank" rel="noopener noreferrer">
                ↗ Tab Baru
              </a>
            </div>
          </div>
          <script>
            // Automatically switch parent player to direct embed mode with no-referrer
            setTimeout(function() {
              try {
                window.parent.postMessage({ type: 'SANKA_SWITCH_DIRECT', url: '${targetUrl.toString()}' }, '*');
              } catch(e) {}
            }, 600);
          </script>
        </body>
        </html>
      `;
      return new NextResponse(recoveryHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }

    const html = await res.text();
    const origin = targetUrl.origin;

    // STEP 1: Attempt to extract direct MP4 or HLS stream
    const extracted = extractStreamFromHtml(html);
    if (extracted && (extracted.type === 'mp4' || extracted.type === 'hls')) {
      const unifiedHtml = buildUnifiedPlayerHtml(
        extracted.type,
        extracted.mediaUrl,
        targetUrl.toString()
      );
      return new NextResponse(unifiedHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Access-Control-Allow-Origin': '*',
          'Referrer-Policy': 'no-referrer',
        },
      });
    }

    // STEP 2: Check if page is an iframe wrapper (common in Desustream/Ondesu)
    const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch && iframeMatch[1] && !iframeMatch[1].includes('recaptcha') && !iframeMatch[1].includes('google.com/recaptcha')) {
      let nestedUrl = iframeMatch[1].trim();
      if (nestedUrl.startsWith('//')) nestedUrl = 'https:' + nestedUrl;
      else if (nestedUrl.startsWith('/')) nestedUrl = origin + nestedUrl;
      else if (nestedUrl.startsWith('http://')) nestedUrl = 'https://' + nestedUrl.slice(7);

      try {
        const nestedRes = await fetch(nestedUrl, {
          redirect: 'follow',
          headers: {
            ...browserHeaders,
            Referer: targetUrl.toString(),
          },
        });
        if (nestedRes.ok) {
          const nestedHtml = await nestedRes.text();
          const nestedExtracted = extractStreamFromHtml(nestedHtml);
          if (nestedExtracted) {
            const unifiedHtml = buildUnifiedPlayerHtml(
              nestedExtracted.type,
              nestedExtracted.mediaUrl,
              targetUrl.toString()
            );
            return new NextResponse(unifiedHtml, {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Access-Control-Allow-Origin': '*',
                'Referrer-Policy': 'no-referrer',
              },
            });
          }
        }
      } catch {
        // Continue with original page processing
      }
    }

    // STEP 3: Fallback for complex web pages (rewriting relative URLs and neutralizing anti-sandbox)
    let modifiedHtml = html;

    // Rewrite root-relative URLs so assets load from original host
    modifiedHtml = modifiedHtml.replace(
      /src=["']\/([^"']+)["']/g,
      (match, path) => `src="${origin}/${path}"`
    );
    modifiedHtml = modifiedHtml.replace(
      /href=["']\/([^"']+)["']/g,
      (match, path) => `href="${origin}/${path}"`
    );
    modifiedHtml = modifiedHtml.replace(
      /url\(["']?\/([^"')]+)["']?\)/g,
      (match, path) => `url("${origin}/${path}")`
    );

    // Fix relative playerjs.js if present in arcg
    if (targetUrl.pathname.includes('/dstream/arcg/')) {
      modifiedHtml = modifiedHtml.replace(
        /src=['"]playerjs\.js['"]/g,
        `src="${origin}/dstream/arcg/playerjs.js"`
      );
    }

    // Base tag & No-Referrer meta
    const baseTag = `<base href="${origin}/">\n<meta name="referrer" content="no-referrer">\n`;

    // Modern styling
    const videoStyle = `
      <style>
        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #000 !important;
          overflow: hidden !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        video {
          width: 100% !important;
          height: 100% !important;
          max-height: 100vh !important;
          object-fit: contain !important;
          outline: none !important;
          background: #000 !important;
        }
      </style>
    `;

    // Anti-sandbox defense script: mocks window.top and window.parent so VidHide thinks it's top-level
    const antiSandboxScript = `
      <script>
        try {
          Object.defineProperty(window, 'top', { get: function() { return window.self; } });
          Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
          Object.defineProperty(window, 'frameElement', { get: function() { return null; } });
        } catch(e) {}
        window.addEventListener('error', function(e) {
          if (e.message && (
            e.message.indexOf('sandboxed') !== -1 ||
            e.message.indexOf('SecurityError') !== -1 ||
            e.message.indexOf('Blocked a frame') !== -1
          )) {
            e.preventDefault();
            e.stopPropagation();
            return true;
          }
        }, true);
      </script>
    `;

    // Neutralize VidHide anti-sandbox script & text
    modifiedHtml = modifiedHtml.replace(
      /This video is not available due to sandboxed iframe!?/gi,
      ''
    );
    modifiedHtml = modifiedHtml.replace(
      /!function\(\)\{try\{var t=\["sandbox"[\s\S]*?<\/script>/gi,
      '/* anti-sandbox removed */</script>'
    );
    modifiedHtml = modifiedHtml.replace(
      /function e\(\)\{try\{if\(config\.ampallow\)/g,
      'function e(){return;try{if(config.ampallow)'
    );
    modifiedHtml = modifiedHtml.replace(
      /setTimeout\(function\(\)\{location\[t\[5\]\]=["']\/sandboxed\.html["']\},900\)/g,
      '/* neutralized */'
    );
    modifiedHtml = modifiedHtml.replace(
      /location\[t\[5\]\]=["']\/sandboxed\.html["']/g,
      '/* neutralized */'
    );
    modifiedHtml = modifiedHtml.replace(
      /location\.href\s*=\s*["']\/sandboxed\.html["']/g,
      '/* neutralized */'
    );
    modifiedHtml = modifiedHtml.replace(
      /location\.replace\(["']\/sandboxed\.html["']\)/g,
      '/* neutralized */'
    );
    modifiedHtml = modifiedHtml.replace(
      /location\.assign\(["']\/sandboxed\.html["']\)/g,
      '/* neutralized */'
    );
    modifiedHtml = modifiedHtml.replace(/\/sandboxed\.html/g, 'javascript:void(0)');

    // Ensure raw <video> tags have playsinline, controls, and referrerpolicy="no-referrer"
    modifiedHtml = modifiedHtml.replace(
      /<video /g,
      '<video playsinline controls referrerpolicy="no-referrer" '
    );

    // Inject base, style, and anti-sandbox script into <head>
    if (modifiedHtml.includes('<head>')) {
      modifiedHtml = modifiedHtml.replace(
        '<head>',
        `<head>\n${baseTag}${videoStyle}${antiSandboxScript}`
      );
    } else {
      modifiedHtml = baseTag + videoStyle + antiSandboxScript + modifiedHtml;
    }

    return new NextResponse(modifiedHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (err: unknown) {
    // On unexpected connection error or timeout, gracefully hand off to client-side direct playback
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="referrer" content="no-referrer">
        <title>Stream Recovery Bridge</title>
        <style>
          body {
            background: #09090b;
            color: #f4f4f5;
            font-family: ui-monospace, monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
          }
          .box {
            padding: 24px;
            background: #18181b;
            border: 1px solid #27272a;
            border-radius: 14px;
            max-width: 440px;
          }
          h3 { color: #f87171; margin-bottom: 8px; font-size: 14px; }
          p { font-size: 12px; color: #a1a1aa; line-height: 1.5; margin-bottom: 14px; }
          .btn-group { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
          .btn {
            display: inline-block;
            padding: 9px 16px;
            border-radius: 8px;
            background: #dc2626;
            color: white;
            font-size: 11px;
            text-decoration: none;
            font-weight: bold;
            border: none;
            cursor: pointer;
          }
          .btn-secondary { background: #27272a; color: #f4f4f5; }
        </style>
      </head>
      <body>
        <div class="box">
          <h3>⚡ Dialihkan ke Koneksi Browser Langsung</h3>
          <p>Koneksi server dialihkan ke browser IP lokal tanpa hambatan proxy.</p>
          <div class="btn-group">
            <button class="btn" onclick="window.parent.postMessage({ type: 'SANKA_SWITCH_DIRECT', url: '${targetUrl.toString()}' }, '*')">
              🌐 Putar di Player
            </button>
            <button class="btn btn-secondary" onclick="window.parent.postMessage({ type: 'SANKA_OPEN_POPOUT' }, '*')">
              🚀 Popout Player
            </button>
            <a class="btn btn-secondary" href="${targetUrl.toString()}" target="_blank" rel="noopener noreferrer">
              ↗ Buka Tab Baru
            </a>
          </div>
        </div>
        <script>
          // Automatic recovery trigger
          setTimeout(function() {
            try {
              window.parent.postMessage({ type: 'SANKA_SWITCH_DIRECT', url: '${targetUrl.toString()}' }, '*');
            } catch(e) {}
          }, 800);
        </script>
      </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
      },
    });
  }
}
