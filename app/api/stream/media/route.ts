import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Media Stream Proxy Route
 * Proxies MP4 video streams (e.g. googlevideo.com / ondesu) through the server
 * so IP-bound tokens and referer restrictions never result in HTTP 403 Forbidden on the client!
 * Supports standard HTTP Range requests (206 Partial Content) for seamless seeking and buffering.
 */
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

  const rangeHeader = req.headers.get('range') || 'bytes=0-';

  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Range': rangeHeader,
      'Referer': 'https://otakudesu.blog/',
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
