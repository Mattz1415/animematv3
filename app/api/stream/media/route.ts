import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Media Stream Proxy Route
 * Proxies MP4/HLS video streams (e.g. googlevideo.com / ondesu) through the server
 * with spoofed browser headers, HTTPS enforcement, and Referrer-Policy: no-referrer.
 * Supports standard HTTP Range requests (206 Partial Content) for seamless seeking and buffering.
 */
export async function GET(req: NextRequest) {
  const rawUrlParam = req.nextUrl.searchParams.get('url');

  if (!rawUrlParam) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  let cleanUrl = rawUrlParam.trim();
  // Enforce HTTPS
  if (cleanUrl.startsWith('http://')) {
    cleanUrl = 'https://' + cleanUrl.slice(7);
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(cleanUrl);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  const rangeHeader = req.headers.get('range') || 'bytes=0-';

  // Target-specific Referer and headers
  let targetReferer = 'https://desustream.net/';
  if (targetUrl.hostname.includes('googlevideo.com') || targetUrl.hostname.includes('googleusercontent.com')) {
    targetReferer = 'https://desustream.net/';
  } else if (targetUrl.hostname.includes('ondesu') || targetUrl.hostname.includes('desustream')) {
    targetReferer = 'https://desustream.net/';
  } else if (targetUrl.hostname.includes('otakudesu')) {
    targetReferer = 'https://otakudesu.blog/';
  } else {
    targetReferer = targetUrl.origin + '/';
  }

  try {
    // Note: Do NOT send an Origin header for raw video requests, as Google Video and video CDNs
    // will block requests with unexpected Origin values with 403 Forbidden.
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Range': rangeHeader,
      'Referer': targetReferer,
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    };

    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');
    const acceptRanges = upstreamRes.headers.get('accept-ranges') || 'bytes';

    const responseHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Accept-Ranges': acceptRanges,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Content-Range, Content-Type',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'public, max-age=14400',
    };

    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    console.error('[media-proxy error]', err);
    return new NextResponse('Media proxy connection error', { status: 502 });
  }
}
