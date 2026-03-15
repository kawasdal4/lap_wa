import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = await response.text();
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;
    
    // Clean up Zoom title - remove "Zoom" suffix if present
    let cleanTitle = title;
    if (cleanTitle) {
      // Remove common Zoom suffixes
      cleanTitle = cleanTitle.replace(/\s*-\s*Zoom\s*$/i, '');
      cleanTitle = cleanTitle.replace(/\s*\|\s*Zoom\s*$/i, '');
      cleanTitle = cleanTitle.trim();
    }
    
    return NextResponse.json({ 
      title: cleanTitle || title,
      originalTitle: title 
    });
  } catch (error) {
    console.error('Failed to fetch title:', error);
    return NextResponse.json({ error: 'Failed to fetch title' }, { status: 500 });
  }
}
