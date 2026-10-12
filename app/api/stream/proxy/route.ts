import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ExtractedStream {
  type: 'mp4' | 'hls' | 'raw';
  mediaUrl: string;
}

function encodeRadix(val: number, r: number): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (val === 0) return '0';
  let res = '';
  while (val > 0) {
    res = chars[val % r] + res;
    val = Math.floor(val / r);
  }
  return res;
}

function unpackDeanEdwards(script: string): string | null {
  const regex = /}\s*\(\s*['"]([\s\S]*?)['"]\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*['"]([\s\S]*?)['"]\.split\(['"]\|['"]\)/;
  const match = script.match(regex);
  if (!match) return null;
  const [_, payload, radixStr, countStr, keywordsStr] = match;
  const radix = parseInt(radixStr, 10);
  const count = parseInt(countStr, 10);
  const keywords = keywordsStr.split('|');

  const dict: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    const key = i < radix ? i.toString(radix) : encodeRadix(i, radix);
    dict[key] = keywords[i] || key;
  }

  return payload.replace(/\b\w+\b/g, (token) => {
    return Object.prototype.hasOwnProperty.call(dict, token) ? dict[token] : token;
  });
}

function extractStreamFromHtml(html: string): ExtractedStream | null {
  // 1. Check odcdn format: const videoURL = "https://..."
  const odcdnMatch = html.match(/const\s+videoURL\s*=\s*["']([^"']+)["']/i);
  if (odcdnMatch && odcdnMatch[1]) {
    return { type: 'mp4', mediaUrl: odcdnMatch[1] };
  }

  // 2. Check arcg format: file:"https://archive.org/download/..."
  const arcgMatch = html.match(/file\s*:\s*["']([^"']+\.mp4[^\s"']*)["']/i);
  if (arcgMatch && arcgMatch[1]) {
    return { type: 'mp4', mediaUrl: arcgMatch[1] };
  }

  // 3. Check ondesu (google video) format: <source src="..." type="video/mp4">
  const ondesuSourceMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (ondesuSourceMatch && ondesuSourceMatch[1]) {
    return {
      type: 'mp4',
      mediaUrl: ondesuSourceMatch[1].replace(/&amp;/g, '&'),
    };
  }

  const videoTagMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
  if (videoTagMatch && videoTagMatch[1]) {
    return {
      type: 'mp4',
      mediaUrl: videoTagMatch[1].replace(/&amp;/g, '&'),
    };
  }

  // 4. Check VidHide & Dean Edwards Packer format: eval(function(p,a,c,k,e,d)...)
  const unpacked = unpackDeanEdwards(html);
  if (unpacked) {
    const m3u8Match = unpacked.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
    if (m3u8Match && m3u8Match[0]) {
      return { type: 'hls', mediaUrl: m3u8Match[0] };
    }
    const mp4Match = unpacked.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/);
    if (mp4Match && mp4Match[0]) {
      return { type: 'mp4', mediaUrl: mp4Match[0] };
    }
  }

  // Fallback unpacking with eval in case of variation
  if (html.includes('eval(function(p,a,c,k,e,d)')) {
    const start = html.indexOf('eval(function(p,a,c,k,e,d)');
    const end = html.indexOf('</script>', start);
    if (start !== -1 && end !== -1) {
      let packed = html.substring(start, end).trim();
      packed = packed.replace(/^eval\(/, '');
      const lastParen = packed.lastIndexOf(')');
      if (lastParen !== -1) {
        packed = packed.substring(0, lastParen);
      }
      try {
        const evalUnpacked = eval('(' + packed + ')');
        if (typeof evalUnpacked === 'string') {
          const m3u8Match = evalUnpacked.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
          if (m3u8Match && m3u8Match[0]) {
            return { type: 'hls', mediaUrl: m3u8Match[0] };
          }
          const mp4Match = evalUnpacked.match(/https?:\/\/[^\s"']+\.mp4[^\s"']*/);
          if (mp4Match && mp4Match[0]) {
            return { type: 'mp4', mediaUrl: mp4Match[0] };
          }
        }
      } catch {
        // Continue
      }
    }
  }

  // 5. Look for any standalone m3u8 or mp4
  const standaloneHls = html.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/i);
  if (standaloneHls && standaloneHls[0]) {
    return { type: 'hls', mediaUrl: standaloneHls[0] };
  }

  return null;
}

function buildUnifiedPlayerHtml(
  type: 'mp4' | 'hls',
  mediaUrl: string,
  originalUrl: string
): string {
  const posterUrl =
    'https://1.bp.blogspot.com/-_hry8Jf4-rE/YUFwSer_GmI/AAAAAAAAJzQ/x3FebfvoOmcpwVGyUmkDqx5a7t8-GmN8ACLcBGAsYHQ/s960/Otakudesu%2BStreaming.png';

  const isRestrictedCdn = /googlevideo\.com|googleusercontent\.com|ondesu|blogger\.com/i.test(mediaUrl);
  const primarySourceUrl = isRestrictedCdn
    ? `/api/stream/media?url=${encodeURIComponent(mediaUrl)}`
    : mediaUrl;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    /* Lazy Click-to-Play Overlay (Identik dengan default desustream, anti-black screen) */
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
      ${type === 'mp4' ? `<source src="${primarySourceUrl}" type="video/mp4"><source src="${mediaUrl}" type="video/mp4">` : ''}
    </video>

    <!-- Overlay Play Button -->
    <div class="play-overlay" id="playOverlay" title="Klik untuk memutar video">
      <img class="poster-img" src="${posterUrl}" alt="Video Poster" />
      <div class="play-circle">
        <div class="play-icon"></div>
      </div>
      <div class="badge-bar">
        <div class="dot"></div>
        <span>Klik untuk Putar (${type === 'hls' ? 'HLS Stream' : 'HD Video'})</span>
      </div>
    </div>

    <!-- Fallback Card jika stream gagal dimuat -->
    <div class="error-card" id="errorCard">
      <h3 style="color:#ef4444; font-size:15px; margin-bottom:8px;">Stream Mengalami Kendala</h3>
      <p style="font-size:12px; color:#a1a1aa; max-width:400px; line-height:1.5;">
        Video ini sedang mengalami kendala pemutaran otomatis. Anda dapat memutar langsung di Popout Player atau membuka mirror alternatif di bawah player:
      </p>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; margin-top:12px;">
        <button class="btn" style="background:#dc2626;" onclick="window.parent.postMessage({ type: 'SANKA_OPEN_POPOUT' }, '*')">
          ⚡ Buka Popout Player
        </button>
        <a class="btn" href="${originalUrl}" target="_blank" rel="noopener noreferrer" style="background:#27272a; color:#f4f4f5;">
          ↗ Buka Link Langsung
        </a>
        <button class="btn" style="background:#18181b; border:1px solid #3f3f46; color:#a1a1aa;" onclick="location.reload()">
          🔄 Coba Muat Ulang
        </button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      var video = document.getElementById('mainVideo');
      var overlay = document.getElementById('playOverlay');
      var errorCard = document.getElementById('errorCard');
      var primaryUrl = ${JSON.stringify(primarySourceUrl)};
      var fallbackUrl = ${JSON.stringify(mediaUrl)};
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
            hls.loadSource(fallbackUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
              video.play().catch(function(err) {
                console.log('Autoplay prevented:', err);
              });
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
              if (data.fatal) {
                console.warn('Fatal HLS error:', data);
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
            // Native Safari HLS
            video.src = fallbackUrl;
            video.play().catch(function(e) { console.log(e); });
          } else {
            // MP4 Direct via stream proxy with Range support
            if (!video.src) video.src = primaryUrl;
            video.play().catch(function(e) { console.log(e); });
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
        console.warn('Video load error occurred, attempting fallback...');
        if (!video.dataset.recovered && primaryUrl !== fallbackUrl) {
          video.dataset.recovered = 'true';
          video.src = fallbackUrl;
          video.load();
          video.play().catch(function() {});
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
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  try {
    const res = await fetch(targetUrl.toString(), {
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        Referer: 'https://otakudesu.blog/',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      },
    });

    // If mirror server returns an error (404, 500, etc.),
    // return a gracefully styled in-player recovery page with status 200
    // so Vercel or iframe NEVER shows a raw "Page 404 Not Found"!
    if (!res.ok) {
      const fallbackHtml = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Stream Notice</title>
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
              padding: 24px;
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
            .btn {
              display: inline-block;
              background: #dc2626;
              color: white;
              padding: 10px 18px;
              border-radius: 10px;
              font-size: 12px;
              text-decoration: none;
              cursor: pointer;
              font-weight: bold;
              border: none;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>⚡ Server Mirror Sedang Diperbarui</h3>
            <p>Mirror ini sedang dalam proses sinkronisasi. Silakan klik server mirror alternatif lain di bawah player atau gunakan Popout Player.</p>
            <a class="btn" href="${targetUrl.toString()}" target="_blank" rel="noopener noreferrer">
              ↗ Buka Link Langsung di Tab Baru
            </a>
          </div>
        </body>
        </html>
      `;
      return new NextResponse(fallbackHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
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
        },
      });
    }

    // STEP 2: Fallback for complex web pages (e.g., mega.nz or raw embedders)
    let modifiedHtml = html;

    // Rewrite root-relative URLs so assets load from original CDN/host and never 404 on Vercel
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

    // Base tag
    const baseTag = `<base href="${origin}/">\n`;

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

    // Anti-sandbox defense script
    const antiSandboxScript = `
      <script>
        try {
          Object.defineProperty(window, 'top', { get: function() { return window.self; } });
          Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
        } catch(e) {}
        window.addEventListener('error', function(e) {
          if (e.message && (e.message.indexOf('sandboxed') !== -1 || e.message.indexOf('SecurityError') !== -1)) {
            e.preventDefault();
            e.stopPropagation();
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
      /!function\(\)\{try\{var t=\["sandbox"[\s\S]*?<\/script>/,
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
    modifiedHtml = modifiedHtml.replace(/\/sandboxed\.html/g, 'javascript:void(0)');

    // Ensure raw <video> tags have playsinline, controls, and referrerpolicy="no-referrer"
    modifiedHtml = modifiedHtml.replace(
      /<video /g,
      '<video playsinline controls referrerpolicy="no-referrer" '
    );

    // Inject tags
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
      },
    });
  } catch (err: unknown) {
    const errorHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
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
            max-width: 400px;
          }
          h3 { color: #f87171; margin-bottom: 8px; font-size: 14px; }
          p { font-size: 12px; color: #a1a1aa; line-height: 1.5; }
          .btn {
            display: inline-block;
            margin-top: 12px;
            padding: 8px 16px;
            border-radius: 8px;
            background: #dc2626;
            color: white;
            font-size: 11px;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="box">
          <h3>⚡ Koneksi Mirror Sedang Dialihkan</h3>
          <p>Silakan gunakan tombol server di bawah untuk memutar server mirror lainnya atau buka Popout Player.</p>
          <a class="btn" href="${targetUrl.toString()}" target="_blank" rel="noopener noreferrer">
            ↗ Buka Tab Baru
          </a>
        </div>
      </body>
      </html>
    `;
    return new NextResponse(errorHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
