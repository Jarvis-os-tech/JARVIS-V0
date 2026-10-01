/**
 * J.A.R.V.I.S. Autonomous Internet Knowledge Gatherer
 * 
 * Fetches documentation, CLI usage, troubleshooting snippets, and external data
 * dynamically from the web when encountering unknown tools, errors, or APIs.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface GatheredKnowledge {
  query: string;
  results: WebSearchResult[];
  synthesizedGuidance: string;
}

class InternetKnowledgeGatherer {
  /**
   * Performs lightweight, dependency-free web research using DuckDuckGo Instant Answers & HTML search.
   */
  public async searchKnowledge(query: string, maxResults: number = 3): Promise<GatheredKnowledge> {
    const cleanQuery = query.trim();
    const results: WebSearchResult[] = [];

    try {
      // 1. Try DuckDuckGo Instant Answer API (JSON)
      const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 JARVIS-Autonomous/1.0' },
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const json: any = await res.json();
        if (json.AbstractText) {
          results.push({
            title: json.Heading || cleanQuery,
            url: json.AbstractURL || 'https://duckduckgo.com',
            snippet: json.AbstractText
          });
        }
        if (Array.isArray(json.RelatedTopics)) {
          for (const item of json.RelatedTopics.slice(0, maxResults - results.length)) {
            if (item.Text && item.FirstURL) {
              results.push({
                title: item.Text.split(' - ')[0] || cleanQuery,
                url: item.FirstURL,
                snippet: item.Text
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[Knowledge Gatherer] Primary API lookup failed:', e.message);
    }

    // 2. Fallback: Query DuckDuckGo HTML Lite if results are sparse
    if (results.length === 0) {
      try {
        const liteUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;
        const res = await fetch(liteUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const html = await res.text();
          // Extract result titles and snippets using regex
          const snippetMatches = [...html.matchAll(/<a class="result__snippet[^>]*>(.*?)<\/a>/g)];
          const titleMatches = [...html.matchAll(/<a class="result__url[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)];

          for (let i = 0; i < Math.min(maxResults, snippetMatches.length); i++) {
            const rawSnippet = snippetMatches[i]?.[1] || '';
            const cleanSnippet = rawSnippet.replace(/<[^>]+>/g, '').trim();
            const rawUrl = titleMatches[i]?.[1] || 'https://duckduckgo.com';
            if (cleanSnippet) {
              results.push({
                title: `${cleanQuery} - Reference`,
                url: rawUrl,
                snippet: cleanSnippet
              });
            }
          }
        }
      } catch (e: any) {
        console.warn('[Knowledge Gatherer] HTML fallback lookup failed:', e.message);
      }
    }

    const synthesizedGuidance = results.length > 0
      ? results.map((r, i) => `[${i + 1}] ${r.title}: ${r.snippet}`).join('\n')
      : `No external web documentation found for query: "${cleanQuery}". Relying on internal Linux system knowledge.`;

    return {
      query: cleanQuery,
      results,
      synthesizedGuidance
    };
  }

  /**
   * Fetches raw text from a documentation or manpage URL.
   */
  public async fetchDocContent(url: string, maxChars: number = 3000): Promise<string> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) JARVIS-Autonomous/1.0' },
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) return `HTTP error ${res.status}: ${res.statusText}`;
      const text = await res.text();
      // Strip scripts and styles, condense whitespace
      const clean = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return clean.substring(0, maxChars);
    } catch (err: any) {
      return `Failed to fetch documentation: ${err.message}`;
    }
  }
}

export const internetKnowledgeGatherer = new InternetKnowledgeGatherer();
