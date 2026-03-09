import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Generate ETag based on the URL (deterministic, no need to fetch first)
    const urlHash = Buffer.from(url).toString('base64url').slice(0, 16);
    const serverETag = `"${urlHash}"`;

    // Handle conditional requests BEFORE fetching upstream — this is the fast path
    const clientETag = request.headers.get('If-None-Match');
    if (clientETag === serverETag) {
        return new NextResponse(null, {
            status: 304,
            headers: {
                'ETag': serverETag,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const headers = new Headers();

        // Pass through the content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            headers.set('Content-Type', contentType);
        }

        // Add CORS headers to allow canvas export
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('Vary', 'Origin');
        headers.set('ETag', serverETag);

        return new NextResponse(buffer, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
    }
}
