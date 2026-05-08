import * as cheerio from "cheerio";
import { logger } from "@/lib/logger.js";

interface IssueDetail {
  category: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedUrl: string | null;
  element: string | null;
  lineNumber: number | null;
  fixExample: string | null;
  helpUrl: string | null;
}

interface RecommendationDetail {
  priority: "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  estimatedImpact: number;
  dismissed: boolean;
}

interface SeoAnalysisResult {
  seoScore: number;
  metaTitle: string | null;
  metaDescription: string | null;
  h1Count: number;
  h2Count: number;
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  imagesMissingAlt: number;
  pageLoadScore: number;
  mobileScore: number;
  pageCount: number;
  issues: IssueDetail[];
  recommendations: RecommendationDetail[];
}

function getLineNumber(html: string, searchStr: string): number | null {
  const idx = html.toLowerCase().indexOf(searchStr.toLowerCase());
  if (idx === -1) return null;
  return html.substring(0, idx).split("\n").length;
}

function trunc(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.substring(0, len) + "…";
}

async function fetchPage(url: string, timeout = 15000): Promise<{ html: string; finalUrl: string; status: number } | null> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOIntelligenceBot/1.0; +https://seo-intelligence.app/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    const html = await resp.text();
    return { html, finalUrl: resp.url || url, status: resp.status };
  } catch (err) {
    logger.warn({ url, err: String(err) }, "Failed to fetch page");
    return null;
  }
}

export async function generateSeoAnalysis(url: string, type: string): Promise<SeoAnalysisResult> {
  logger.info({ url, type }, "Running real SEO analysis");
  if (type === "website") return analyzeWebsite(url);
  if (type === "youtube") return analyzeYouTube(url);
  return analyzeInstagram(url);
}

async function analyzeWebsite(rootUrl: string): Promise<SeoAnalysisResult> {
  const maxPages = 20; // Limit for performance
  const concurrency = 3; // Number of concurrent page analyses
  const pagesToCrawl = [rootUrl];
  const crawledPages = new Set<string>();
  const allResults: SeoAnalysisResult[] = [];
  
  let rootDomain = "";
  try { rootDomain = new URL(rootUrl).hostname; } catch { rootDomain = ""; }

  // Simple concurrency-controlled worker
  const processNextPage = async () => {
    while (pagesToCrawl.length > 0 && crawledPages.size < maxPages) {
      const url = pagesToCrawl.shift();
      if (!url || crawledPages.has(url)) continue;
      
      crawledPages.add(url);
      logger.debug({ url, count: crawledPages.size }, "Crawling page");
      
      const result = await analyzePage(url);
      allResults.push(result);

      // If it's a critical fetch error on the first page, we stop early
      if (crawledPages.size === 1 && result.seoScore === 0 && result.issues.some(i => i.title === "Page could not be fetched")) {
        return;
      }

      // Discover new internal links
      const fetched = await fetchPage(url);
      if (fetched && fetched.html) {
        const $ = cheerio.load(fetched.html);
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href")?.trim();
          if (!href) return;
          try {
            const absoluteUrl = new URL(href, url);
            absoluteUrl.hash = ""; // Remove hashes
            const normalizedUrl = absoluteUrl.toString();
            
            if (
              (absoluteUrl.hostname === rootDomain || absoluteUrl.hostname.endsWith(`.${rootDomain}`)) &&
              !crawledPages.has(normalizedUrl) &&
              !pagesToCrawl.includes(normalizedUrl) &&
              !normalizedUrl.includes("#") &&
              (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://"))
            ) {
              // Avoid common non-html files
              const path = absoluteUrl.pathname.toLowerCase();
              const isAsset = /\.(png|jpe?g|gif|svg|ico|css|js|woff2?|ttf|otf|mp4|webm|pdf|zip|gz|tar|exe|dmg|bin|apk)$/.test(path);
              
              if (!isAsset) {
                pagesToCrawl.push(normalizedUrl);
              }
            }
          } catch { /* ignore invalid URLs */ }
        });
      }
    }
  };

  // Start concurrent workers
  const workers = Array.from({ length: concurrency }).map(() => processNextPage());
  await Promise.all(workers);

  // Aggregate results (same logic as before, now with allResults populated by workers)
  const pageCount = allResults.length;
  if (pageCount === 0) {
    // Should not happen if rootUrl is valid, but for safety:
    return {
      seoScore: 0, metaTitle: null, metaDescription: null, h1Count: 0, h2Count: 0, wordCount: 0,
      internalLinks: 0, externalLinks: 0, imagesMissingAlt: 0, pageLoadScore: 0, mobileScore: 0,
      pageCount: 0, issues: [], recommendations: []
    };
  }
  const homePage = allResults[0];

  const aggregated: SeoAnalysisResult = {
    seoScore: Math.round(allResults.reduce((sum, r) => sum + r.seoScore, 0) / pageCount),
    metaTitle: homePage.metaTitle,
    metaDescription: homePage.metaDescription,
    h1Count: allResults.reduce((sum, r) => sum + r.h1Count, 0),
    h2Count: allResults.reduce((sum, r) => sum + r.h2Count, 0),
    wordCount: allResults.reduce((sum, r) => sum + r.wordCount, 0),
    internalLinks: allResults.reduce((sum, r) => sum + r.internalLinks, 0),
    externalLinks: allResults.reduce((sum, r) => sum + r.externalLinks, 0),
    imagesMissingAlt: allResults.reduce((sum, r) => sum + r.imagesMissingAlt, 0),
    pageLoadScore: Math.round(allResults.reduce((sum, r) => sum + r.pageLoadScore, 0) / pageCount),
    mobileScore: Math.round(allResults.reduce((sum, r) => sum + r.mobileScore, 0) / pageCount),
    pageCount,
    issues: allResults.flatMap(r => r.issues),
    recommendations: [], // We'll aggregate recommendations below
  };

  // Aggregating recommendations (unique by title)
  const recommendationMap = new Map<string, RecommendationDetail>();
  allResults.forEach(r => {
    r.recommendations.forEach(rec => {
      if (!recommendationMap.has(rec.title)) {
        recommendationMap.set(rec.title, { ...rec });
      } else {
        // If recommendation exists, maybe update description to mention multiple pages
        const existing = recommendationMap.get(rec.title)!;
        if (!existing.description.includes("multiple pages")) {
           existing.description += " (Detected on multiple pages across the site)";
        }
      }
    });
  });
  aggregated.recommendations = Array.from(recommendationMap.values());

  return aggregated;
}

async function analyzePage(url: string): Promise<SeoAnalysisResult> {
  const fetched = await fetchPage(url);

  if (!fetched || !fetched.html) {
    return {
      seoScore: 0, metaTitle: null, metaDescription: null,
      h1Count: 0, h2Count: 0, wordCount: 0,
      internalLinks: 0, externalLinks: 0, imagesMissingAlt: 0,
      pageLoadScore: 0, mobileScore: 0, pageCount: 1,
      issues: [{
        category: "Crawlability", severity: "critical",
        title: "Page could not be fetched",
        description: "The URL returned no content. Ensure the page is publicly accessible and the URL is correct. This prevents any SEO analysis from being performed.",
        affectedUrl: url, element: null, lineNumber: null,
        fixExample: "<!-- Ensure your server returns 200 OK for this URL.\nCheck: robots.txt, firewall rules, or login requirements that might block access. -->",
        helpUrl: "https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers",
      }],
      recommendations: [{
        priority: "high", category: "Crawlability",
        title: "Ensure the page is publicly accessible",
        description: "The URL could not be fetched. Remove authentication requirements, IP blocks, or verify the URL is correct and the server is live.",
        estimatedImpact: 100, dismissed: false,
      }],
    };
  }

  const { html, finalUrl: resolvedUrl } = fetched;
  const $ = cheerio.load(html);
  const issues: IssueDetail[] = [];
  const recommendations: RecommendationDetail[] = [];

  let domain = "";
  try { domain = new URL(resolvedUrl).hostname; } catch { domain = ""; }
  const isHttps = resolvedUrl.startsWith("https://");

  // ── HTTPS ──
  if (!isHttps) {
    issues.push({
      category: "Security", severity: "critical",
      title: "Page is not served over HTTPS",
      description: "Google uses HTTPS as a ranking signal since 2014. Non-HTTPS pages display a 'Not Secure' warning in Chrome, reducing user trust and increasing bounce rates.",
      affectedUrl: resolvedUrl, element: resolvedUrl, lineNumber: null,
      fixExample: `# Enable HTTPS redirect in .htaccess\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]`,
      helpUrl: "https://developers.google.com/search/docs/crawling-indexing/https/https-overview",
    });
    recommendations.push({
      priority: "high", category: "Security",
      title: "Enable HTTPS with a free SSL certificate",
      description: "Install a free Let's Encrypt SSL certificate and set up a 301 redirect from HTTP to HTTPS. HTTPS is a confirmed ranking signal and prevents browser security warnings.",
      estimatedImpact: 90, dismissed: false,
    });
  }

  // ── TITLE TAG ──
  const titleEl = $("title").first();
  const titleText = titleEl.text().trim();
  const titleLine = getLineNumber(html, "<title");

  if (!titleText) {
    issues.push({
      category: "Meta Tags", severity: "critical",
      title: "Missing <title> tag",
      description: "The page has no <title> tag. This is one of the most important on-page SEO elements — it appears in search engine result pages (SERPs), browser tabs, and social shares.",
      affectedUrl: resolvedUrl, element: "<!-- <title> tag not found in <head> -->", lineNumber: titleLine,
      fixExample: `<head>\n  <title>Primary Keyword – Page Topic | Brand Name</title>\n  <!-- Keep between 50-60 characters -->\n</head>`,
      helpUrl: "https://developers.google.com/search/docs/appearance/title-link",
    });
    recommendations.push({
      priority: "high", category: "Meta Tags",
      title: "Add a descriptive <title> tag (50-60 characters)",
      description: "Write a unique title containing your primary keyword near the front. Use the format: 'Primary Keyword – Topic | Brand'. Every page needs a distinct, descriptive title.",
      estimatedImpact: 95, dismissed: false,
    });
  } else if (titleText.length < 30) {
    issues.push({
      category: "Meta Tags", severity: "warning",
      title: `Title tag is too short (${titleText.length} chars)`,
      description: `Your title "${titleText}" is only ${titleText.length} characters. Titles should be 50-60 characters to maximize SERP visibility and communicate clear value to searchers.`,
      affectedUrl: resolvedUrl, element: `<title>${titleText}</title>`, lineNumber: titleLine,
      fixExample: `<title>${titleText} – Your Primary Keyword | Brand Name</title>\n<!-- Aim for 50-60 characters total -->`,
      helpUrl: "https://developers.google.com/search/docs/appearance/title-link",
    });
    recommendations.push({
      priority: "high", category: "Meta Tags",
      title: "Expand the page title to 50-60 characters",
      description: `Current title: "${titleText}" (${titleText.length} chars). Add your primary keyword and brand name. Example: "${titleText} — Best Practices & Guide | ${domain || 'Brand'}"`,
      estimatedImpact: 75, dismissed: false,
    });
  } else if (titleText.length > 60) {
    issues.push({
      category: "Meta Tags", severity: "warning",
      title: `Title tag is too long (${titleText.length} chars)`,
      description: `Your title is ${titleText.length} characters — Google typically displays ~60 characters and truncates the rest with "…". The cut-off portion won't be seen by searchers.`,
      affectedUrl: resolvedUrl, element: `<title>${titleText}</title>`, lineNumber: titleLine,
      fixExample: `<title>${trunc(titleText, 57)}</title>\n<!-- Trim to under 60 characters while keeping the keyword at the front -->`,
      helpUrl: "https://developers.google.com/search/docs/appearance/title-link",
    });
    recommendations.push({
      priority: "medium", category: "Meta Tags",
      title: "Shorten the title tag to under 60 characters",
      description: `Current: "${trunc(titleText, 80)}" (${titleText.length} chars). Edit to ~55 characters keeping the primary keyword near the start and removing secondary phrases.`,
      estimatedImpact: 55, dismissed: false,
    });
  }

  // ── META DESCRIPTION ──
  const metaDescEl = $('meta[name="description"]').first();
  const metaDesc = metaDescEl.attr("content")?.trim() ?? "";
  const metaDescLine = getLineNumber(html, 'name="description"') ?? getLineNumber(html, "name='description'");

  if (!metaDesc) {
    issues.push({
      category: "Meta Tags", severity: "warning",
      title: "Missing meta description",
      description: "No meta description tag was found. Although not a direct ranking factor, a well-written meta description appears in SERPs and can significantly increase click-through rates (CTR) by 5-10%.",
      affectedUrl: resolvedUrl, element: `<!-- <meta name="description"> not found in <head> -->`, lineNumber: metaDescLine,
      fixExample: `<meta name="description" content="Write a compelling 150-160 character description. Include your primary keyword naturally and end with a call to action. This is what searchers read in Google results.">`,
      helpUrl: "https://developers.google.com/search/docs/appearance/snippet",
    });
    recommendations.push({
      priority: "high", category: "Meta Tags",
      title: "Add a meta description tag (150-160 characters)",
      description: "Write a compelling 150-160 character description including your primary keyword. It should summarize the page and include a call-to-action. Studies show good meta descriptions improve CTR by 5.8% on average.",
      estimatedImpact: 80, dismissed: false,
    });
  } else if (metaDesc.length < 120) {
    issues.push({
      category: "Meta Tags", severity: "warning",
      title: `Meta description is too short (${metaDesc.length} chars)`,
      description: `Your meta description is only ${metaDesc.length} characters. Ideal length is 150-160 characters. Short descriptions leave unused space in SERPs and may not communicate enough value.`,
      affectedUrl: resolvedUrl, element: `<meta name="description" content="${metaDesc}">`, lineNumber: metaDescLine,
      fixExample: `<meta name="description" content="${metaDesc} [Expand with benefits, differentiators, or a call-to-action to reach 150-160 characters.]">`,
      helpUrl: "https://developers.google.com/search/docs/appearance/snippet",
    });
    recommendations.push({
      priority: "medium", category: "Meta Tags",
      title: "Expand the meta description to 150-160 characters",
      description: `Current (${metaDesc.length} chars): "${trunc(metaDesc, 100)}". Add more detail — include a keyword, a benefit/differentiator, and a CTA like "Learn more" or "Get started today".`,
      estimatedImpact: 60, dismissed: false,
    });
  } else if (metaDesc.length > 160) {
    issues.push({
      category: "Meta Tags", severity: "info",
      title: `Meta description may be truncated (${metaDesc.length} chars)`,
      description: `Your meta description is ${metaDesc.length} characters. Google displays around 155-160 characters in desktop results. The excess will be cut off and replaced with "…".`,
      affectedUrl: resolvedUrl, element: `<meta name="description" content="${metaDesc}">`, lineNumber: metaDescLine,
      fixExample: `<meta name="description" content="${trunc(metaDesc, 157)}">`,
      helpUrl: "https://developers.google.com/search/docs/appearance/snippet",
    });
  }

  // ── VIEWPORT META ──
  const viewportContent = $('meta[name="viewport"]').attr("content")?.trim() ?? null;
  const viewportLine = getLineNumber(html, 'name="viewport"');
  if (!viewportContent) {
    issues.push({
      category: "Mobile", severity: "critical",
      title: "Missing viewport meta tag",
      description: "No viewport tag found. Mobile browsers will render the page at full desktop width and scale it down, causing a poor mobile experience. Google uses mobile-first indexing.",
      affectedUrl: resolvedUrl, element: `<!-- <meta name="viewport"> not found in <head> -->`, lineNumber: viewportLine,
      fixExample: `<meta name="viewport" content="width=device-width, initial-scale=1">\n<!-- Add this in <head> for responsive rendering on all devices -->`,
      helpUrl: "https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing",
    });
    recommendations.push({
      priority: "high", category: "Mobile",
      title: "Add viewport meta tag for mobile-first indexing",
      description: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> inside <head>. Google indexes mobile version first — missing viewport is a major mobile SEO penalty.",
      estimatedImpact: 88, dismissed: false,
    });
  }

  // ── LANG ATTRIBUTE ──
  const htmlLang = $("html").attr("lang");
  if (!htmlLang) {
    const htmlLine = getLineNumber(html, "<html");
    issues.push({
      category: "Accessibility", severity: "warning",
      title: "Missing lang attribute on <html>",
      description: 'The <html> element has no lang attribute. This helps search engines determine the language of the content and is required for WCAG 2.1 accessibility compliance.',
      affectedUrl: resolvedUrl, element: `<html>  <!-- Missing lang attribute -->`, lineNumber: htmlLine,
      fixExample: `<html lang="en">  <!-- Use ISO 639-1 language code: 'en', 'es', 'fr', 'de', 'zh', etc. -->`,
      helpUrl: "https://developers.google.com/search/docs/specialty/international/localized-versions",
    });
    recommendations.push({
      priority: "low", category: "Accessibility",
      title: `Add lang attribute to <html> element`,
      description: 'Add lang="en" (or appropriate language code) to the opening <html> tag. This signals the content language to search engines and helps screen readers deliver correct pronunciation.',
      estimatedImpact: 30, dismissed: false,
    });
  }

  // ── CANONICAL TAG ──
  const canonicalHref = $('link[rel="canonical"]').attr("href")?.trim() ?? null;
  const canonicalLine = getLineNumber(html, 'rel="canonical"');
  if (!canonicalHref) {
    issues.push({
      category: "Crawlability", severity: "warning",
      title: "Missing canonical tag",
      description: "No canonical tag was found. Without it, search engines may index multiple versions of this page (http/https, www/non-www, trailing slash variants) as separate URLs, splitting your ranking signals.",
      affectedUrl: resolvedUrl, element: `<!-- <link rel="canonical"> not found in <head> -->`, lineNumber: canonicalLine,
      fixExample: `<link rel="canonical" href="${resolvedUrl}">\n<!-- Add in <head> to declare the preferred URL for this page -->`,
      helpUrl: "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
    });
    recommendations.push({
      priority: "medium", category: "Crawlability",
      title: "Add a canonical tag to consolidate duplicate URLs",
      description: `Add <link rel="canonical" href="${resolvedUrl}"> in your <head>. This prevents duplicate content issues from URL variations (trailing slashes, query strings, protocol differences).`,
      estimatedImpact: 58, dismissed: false,
    });
  }

  // ── H1 TAGS ──
  const h1Tags = $("h1");
  const h1Count = h1Tags.length;
  const h1Texts: string[] = [];
  h1Tags.each((_, el) => { h1Texts.push($(el).text().trim()); });
  const h1Line = getLineNumber(html, "<h1");

  if (h1Count === 0) {
    issues.push({
      category: "Content Structure", severity: "critical",
      title: "Missing H1 heading",
      description: "No H1 tag was found. The H1 is the primary heading that signals the main topic of the page to search engines. It should contain your target keyword and appear once near the top of the content.",
      affectedUrl: resolvedUrl, element: `<!-- <h1> tag not found on page -->`, lineNumber: null,
      fixExample: `<h1>Your Primary Keyword — Clear Page Topic</h1>\n<!-- Place one H1 near the top of the main content area -->\n<!-- Then use H2/H3 for subheadings -->`,
      helpUrl: "https://developers.google.com/search/docs/appearance/title-link",
    });
    recommendations.push({
      priority: "high", category: "Content Structure",
      title: "Add a single H1 heading with your primary keyword",
      description: "Add exactly one H1 tag containing your target keyword. It should be the most prominent heading and accurately describe the page content. Place it before other headings.",
      estimatedImpact: 85, dismissed: false,
    });
  } else if (h1Count > 1) {
    issues.push({
      category: "Content Structure", severity: "warning",
      title: `Multiple H1 headings detected (${h1Count})`,
      description: `Found ${h1Count} H1 tags: ${h1Texts.map(t => `"${trunc(t, 35)}"`).join(" | ")}. Having multiple H1s dilutes the page's topic signal. Each page should have exactly one H1.`,
      affectedUrl: resolvedUrl,
      element: h1Texts.slice(0, 3).map(t => `<h1>${t}</h1>`).join("\n"),
      lineNumber: h1Line,
      fixExample: `<!-- Keep only ONE <h1>: -->\n<h1>${h1Texts[0] ?? "Primary Heading"}</h1>\n\n<!-- Convert extras to <h2>: -->\n${h1Texts.slice(1).map(t => `<h2>${t}</h2>`).join("\n")}`,
      helpUrl: "https://developers.google.com/search/docs/appearance/title-link",
    });
    recommendations.push({
      priority: "medium", category: "Content Structure",
      title: `Reduce to exactly one H1 (found ${h1Count})`,
      description: `H1s found: ${h1Texts.map(t => `"${trunc(t, 30)}"`).join(", ")}. Keep the most keyword-rich one as H1 and change the others to H2 or H3. Use H2s for major sections and H3s for subsections.`,
      estimatedImpact: 50, dismissed: false,
    });
  }

  // ── OPEN GRAPH TAGS ──
  const ogTitle = $('meta[property="og:title"]').attr("content");
  const ogDesc = $('meta[property="og:description"]').attr("content");
  const ogImage = $('meta[property="og:image"]').attr("content");
  const ogType = $('meta[property="og:type"]').attr("content");
  const ogLine = getLineNumber(html, 'property="og:');

  const missingOg = [
    !ogTitle && "og:title",
    !ogDesc && "og:description",
    !ogImage && "og:image",
    !ogType && "og:type",
  ].filter(Boolean) as string[];

  if (missingOg.length >= 3) {
    issues.push({
      category: "Social Media", severity: "warning",
      title: "Open Graph meta tags are missing",
      description: `Open Graph tags control how your page looks when shared on Facebook, LinkedIn, WhatsApp, Slack, and other platforms. Missing: ${missingOg.join(", ")}.`,
      affectedUrl: resolvedUrl, element: `<!-- Open Graph meta tags not found in <head> -->`, lineNumber: ogLine,
      fixExample: `<!-- Add these in <head> for rich social previews: -->\n<meta property="og:title" content="${titleText || 'Your Page Title'}">\n<meta property="og:description" content="${metaDesc || 'Your page description (150-160 chars)'}">\n<meta property="og:image" content="https://${domain}/og-image.jpg">  <!-- Use 1200×630px image -->\n<meta property="og:type" content="website">\n<meta property="og:url" content="${resolvedUrl}">`,
      helpUrl: "https://ogp.me/",
    });
    recommendations.push({
      priority: "medium", category: "Social Media",
      title: "Add Open Graph meta tags for social sharing",
      description: "Add og:title, og:description, og:image (1200×630px), og:type, and og:url to the <head>. These tags control link previews on Facebook, LinkedIn, Twitter, and messaging apps — heavily impacting click-through rates.",
      estimatedImpact: 55, dismissed: false,
    });
  } else if (missingOg.length > 0) {
    issues.push({
      category: "Social Media", severity: "info",
      title: `Incomplete Open Graph tags (missing: ${missingOg.join(", ")})`,
      description: `Some Open Graph tags are missing: ${missingOg.join(", ")}. Complete the set for consistent, attractive social sharing previews.`,
      affectedUrl: resolvedUrl,
      element: `<!-- Present: ${["og:title", "og:description", "og:image", "og:type"].filter(t => !missingOg.includes(t)).join(", ")} -->\n<!-- Missing: ${missingOg.join(", ")} -->`,
      lineNumber: ogLine,
      fixExample: missingOg.map(tag => {
        if (tag === "og:title") return `<meta property="og:title" content="${titleText || 'Your Page Title'}">`;
        if (tag === "og:description") return `<meta property="og:description" content="${metaDesc || 'Page description'}">`;
        if (tag === "og:image") return `<meta property="og:image" content="https://${domain}/og-image.jpg">  <!-- 1200×630px -->`;
        if (tag === "og:type") return `<meta property="og:type" content="website">`;
        return "";
      }).join("\n"),
      helpUrl: "https://ogp.me/",
    });
  }

  // ── TWITTER CARD ──
  const twitterCard = $('meta[name="twitter:card"]').attr("content");
  const twitterLine = getLineNumber(html, 'name="twitter:');
  if (!twitterCard) {
    issues.push({
      category: "Social Media", severity: "info",
      title: "Missing Twitter Card meta tags",
      description: "Twitter Card tags are missing. Without them, tweets linking to this page show no preview image or description — significantly reducing click-through rates from Twitter/X.",
      affectedUrl: resolvedUrl, element: `<!-- <meta name="twitter:card"> not found in <head> -->`, lineNumber: twitterLine,
      fixExample: `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${titleText || 'Your Page Title'}">\n<meta name="twitter:description" content="${trunc(metaDesc || 'Your page description', 200)}">\n<meta name="twitter:image" content="https://${domain}/twitter-image.jpg">  <!-- 1200×628px -->`,
      helpUrl: "https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards",
    });
    recommendations.push({
      priority: "low", category: "Social Media",
      title: "Add Twitter Card meta tags",
      description: "Add twitter:card (use 'summary_large_image'), twitter:title, twitter:description, and twitter:image to the <head>. These create rich link previews on Twitter/X, improving CTR from social.",
      estimatedImpact: 35, dismissed: false,
    });
  }

  // ── IMAGES WITHOUT ALT ──
  const imagesNoAlt: string[] = [];
  const imagesEmptyAlt: string[] = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    const src = $(el).attr("src") ?? $(el).attr("data-src") ?? "unknown";
    if (alt === undefined) imagesNoAlt.push(src);
    else if (alt.trim() === "") imagesEmptyAlt.push(src);
  });

  if (imagesNoAlt.length > 0) {
    const firstFew = imagesNoAlt.slice(0, 4);
    const firstSrc = imagesNoAlt[0] ?? "";
    const firstImgLine = firstSrc ? (getLineNumber(html, `src="${firstSrc}"`) ?? getLineNumber(html, `src='${firstSrc}'`)) : null;
    issues.push({
      category: "Images", severity: "warning",
      title: `${imagesNoAlt.length} image${imagesNoAlt.length > 1 ? "s" : ""} missing the alt attribute`,
      description: `${imagesNoAlt.length} image${imagesNoAlt.length > 1 ? "s are" : " is"} completely missing the alt attribute. Alt text is required for: (1) image SEO indexing, (2) WCAG accessibility compliance, (3) display when images fail to load. Images: ${firstFew.map(s => `"${trunc(s.split("/").pop() ?? s, 40)}"`).join(", ")}${imagesNoAlt.length > 4 ? ` + ${imagesNoAlt.length - 4} more` : ""}.`,
      affectedUrl: resolvedUrl,
      element: firstFew.map(src => `<img src="${src}">  <!-- Line: image missing alt -->`).join("\n"),
      lineNumber: firstImgLine ?? null,
      fixExample: firstFew.map(src => {
        const file = src.split("/").pop()?.split("?")[0] ?? "image";
        const name = file.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return `<img src="${src}" alt="${name}">`;
      }).join("\n") + `\n<!-- Write descriptive alt text that explains what the image shows.\n     Include a keyword where it naturally fits.\n     Example: alt="Blue running shoes on white background" -->`,
      helpUrl: "https://developers.google.com/search/docs/appearance/google-images#use-descriptive-alt-text",
    });
    recommendations.push({
      priority: "high", category: "Images",
      title: `Add descriptive alt text to ${imagesNoAlt.length} image${imagesNoAlt.length > 1 ? "s" : ""}`,
      description: `${imagesNoAlt.length} images need alt attributes. Write alt text describing what the image shows. Include keywords naturally (don't stuff). Example: <img src="product.jpg" alt="Red leather wallet with card slots">. This helps Google Image Search surface your content.`,
      estimatedImpact: 70, dismissed: false,
    });
  }

  if (imagesEmptyAlt.length > 0) {
    const firstFew = imagesEmptyAlt.slice(0, 3);
    issues.push({
      category: "Images", severity: "info",
      title: `${imagesEmptyAlt.length} image${imagesEmptyAlt.length > 1 ? "s have" : " has"} empty alt text`,
      description: `${imagesEmptyAlt.length} images have alt="" (intentionally empty or overlooked). Empty alt is correct for purely decorative images. If any of these images convey meaning, they need descriptive alt text. Files: ${firstFew.map(s => `"${trunc(s.split("/").pop() ?? s, 40)}"`).join(", ")}.`,
      affectedUrl: resolvedUrl,
      element: firstFew.map(src => `<img src="${src}" alt="">  <!-- Empty alt -->`).join("\n"),
      lineNumber: null,
      fixExample: `<!-- For MEANINGFUL images (diagrams, product photos, infographics): -->\n${firstFew.map(src => {
        const file = src.split("/").pop()?.split("?")[0] ?? "image";
        const name = file.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
        return `<img src="${src}" alt="${name}">`;
      }).join("\n")}\n\n<!-- For DECORATIVE images (spacers, dividers, backgrounds): -->\n<img src="decorative.jpg" alt="">  <!-- Empty alt is correct -->`,
      helpUrl: "https://developers.google.com/search/docs/appearance/google-images#use-descriptive-alt-text",
    });
  }

  // ── STRUCTURED DATA ──
  const hasJsonLd = $('script[type="application/ld+json"]').length > 0;
  const structuredDataLine = getLineNumber(html, "application/ld+json");
  if (!hasJsonLd) {
    issues.push({
      category: "Structured Data", severity: "info",
      title: "No JSON-LD structured data found",
      description: "Structured data (Schema.org markup via JSON-LD) helps Google understand your content and enables rich results like star ratings, FAQs, breadcrumbs, and event details in search results — these typically get 20-30% more clicks.",
      affectedUrl: resolvedUrl, element: `<!-- <script type="application/ld+json"> not found on page -->`, lineNumber: structuredDataLine,
      fixExample: `<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "${titleText || 'Page Title'}",\n  "description": "${trunc(metaDesc || 'Page description', 100)}",\n  "url": "${resolvedUrl}",\n  "publisher": {\n    "@type": "Organization",\n    "name": "Your Brand Name"\n  }\n}\n</script>`,
      helpUrl: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
    });
    recommendations.push({
      priority: "medium", category: "Structured Data",
      title: "Add JSON-LD structured data markup",
      description: "Implement Schema.org structured data appropriate to your content type: Article, Product, LocalBusiness, FAQPage, BreadcrumbList, etc. Use Google's Rich Results Test to validate. Structured data can increase CTR by 20-30%.",
      estimatedImpact: 70, dismissed: false,
    });
  }

  // ── LINKS ──
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() ?? "";
    if (!href || href === "#" || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) return;
    try {
      const linkUrl = new URL(href, resolvedUrl);
      if (linkUrl.hostname === domain || linkUrl.hostname.endsWith(`.${domain}`)) internalLinks++;
      else externalLinks++;
    } catch {
      if (!href.startsWith("http")) internalLinks++;
    }
  });

  if (internalLinks === 0 && h1Count > 0) {
    issues.push({
      category: "Links", severity: "warning",
      title: "No internal links found on the page",
      description: "No links pointing to other pages on the same site were detected. Internal links are critical for: (1) helping search engines discover all your pages, (2) distributing page authority (PageRank) through your site, (3) improving user navigation.",
      affectedUrl: resolvedUrl, element: `<!-- No <a href="/..."> internal links detected -->`, lineNumber: null,
      fixExample: `<!-- Add contextual links to related pages: -->\n<a href="/related-article">Related Article Title</a>\n<a href="/products">Browse Our Products</a>\n<a href="/about">Learn About Us</a>\n<!-- Include keyword-rich anchor text that describes the destination page -->`,
      helpUrl: "https://developers.google.com/search/docs/crawling-indexing/links-crawlable",
    });
    recommendations.push({
      priority: "medium", category: "Links",
      title: "Add internal links to related pages",
      description: "Add 3-5 contextual internal links pointing to related content on your site. Use descriptive anchor text (e.g., 'our guide to SEO' not 'click here'). Internal links distribute authority and help search engines understand site structure.",
      estimatedImpact: 55, dismissed: false,
    });
  }

  // ── ROBOTS META / NOINDEX ──
  const robotsContent = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const robotsLine = getLineNumber(html, 'name="robots"');
  if (robotsContent.includes("noindex")) {
    issues.push({
      category: "Crawlability", severity: "critical",
      title: "Page has noindex directive — excluded from Google",
      description: "This page has a robots meta tag with 'noindex', instructing search engines to exclude it from their index. If unintentional, this is blocking all organic search traffic to this page.",
      affectedUrl: resolvedUrl, element: `<meta name="robots" content="${robotsContent}">`, lineNumber: robotsLine,
      fixExample: `<!-- To ALLOW indexing, change to: -->\n<meta name="robots" content="index, follow">\n\n<!-- Or simply REMOVE the meta robots tag to use default (index, follow) -->`,
      helpUrl: "https://developers.google.com/search/docs/crawling-indexing/block-indexing",
    });
    recommendations.push({
      priority: "high", category: "Crawlability",
      title: "Remove noindex directive if the page should rank",
      description: "The noindex tag prevents this page from appearing in search results. If you want it indexed, change to 'index, follow' or remove the meta robots tag entirely. Then request re-crawling via Google Search Console.",
      estimatedImpact: 100, dismissed: false,
    });
  }

  // ── FAVICON ──
  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length > 0;
  if (!hasFavicon) {
    const faviconLine = getLineNumber(html, 'rel="icon"');
    issues.push({
      category: "Branding", severity: "info",
      title: "No favicon link tag found",
      description: "No favicon was detected. Favicons appear in browser tabs, bookmark lists, and some search result displays. They improve brand recognition and professionalism.",
      affectedUrl: resolvedUrl, element: `<!-- <link rel="icon"> not found in <head> -->`, lineNumber: faviconLine,
      fixExample: `<!-- Add in <head> -->\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`,
      helpUrl: "https://developers.google.com/search/docs/appearance/favicon-in-search",
    });
  }

  // ── WORD COUNT ──
  $("script, style, noscript").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").filter(w => w.length > 1).length;
  if (wordCount < 300) {
    issues.push({
      category: "Content", severity: "warning",
      title: `Thin content — only ~${wordCount} words on page`,
      description: `The page has approximately ${wordCount} words of body text. Pages with thin content rarely rank well for competitive keywords. Google's Helpful Content guidelines prefer comprehensive, in-depth coverage of a topic.`,
      affectedUrl: resolvedUrl, element: `<!-- Body text word count: approximately ${wordCount} words -->`, lineNumber: null,
      fixExample: `<!-- Expand content by adding:\n  - Detailed explanations of your topic\n  - Frequently Asked Questions (FAQ section)\n  - Step-by-step guides or how-to sections\n  - Comparison tables\n  - Customer testimonials or case studies\n  Target: 600-1500+ words for competitive topics -->`,
      helpUrl: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    });
    recommendations.push({
      priority: "medium", category: "Content",
      title: `Expand page content to at least 600 words (currently ~${wordCount})`,
      description: `Add value through FAQs, detailed explanations, how-to guides, or case studies. For competitive keywords, aim for 1,000-2,000 words. Focus on covering the topic comprehensively rather than padding with filler text.`,
      estimatedImpact: 65, dismissed: false,
    });
  }

  const h2Count = $("h2").length;
  const altIssueCount = imagesNoAlt.length + imagesEmptyAlt.length;

  // ── SCORE ──
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 20;
    else if (issue.severity === "warning") score -= 10;
    else score -= 3;
  }
  if (titleText && titleText.length >= 30 && titleText.length <= 60) score += 5;
  if (metaDesc && metaDesc.length >= 120 && metaDesc.length <= 160) score += 5;
  if (hasJsonLd) score += 5;
  if (ogTitle && ogDesc && ogImage) score += 3;
  if (twitterCard) score += 2;
  if (isHttps) score += 5;
  if (canonicalHref) score += 3;
  if (htmlLang) score += 2;

  const finalScore = Math.max(10, Math.min(100, score));
  const htmlSize = html.length;
  const pageLoadScore = viewportContent
    ? (htmlSize < 50000 ? 88 : htmlSize < 150000 ? 75 : htmlSize < 300000 ? 62 : 48)
    : (htmlSize < 50000 ? 80 : 65);
  const mobileScore = viewportContent ? Math.min(100, 55 + Math.round(finalScore * 0.45)) : Math.min(45, Math.round(finalScore * 0.45));

  return {
    seoScore: finalScore, metaTitle: titleText || null, metaDescription: metaDesc || null,
    h1Count, h2Count, wordCount, internalLinks, externalLinks,
    imagesMissingAlt: altIssueCount, pageLoadScore, mobileScore, pageCount: 1,
    issues, recommendations,
  };
}

async function analyzeYouTube(url: string): Promise<SeoAnalysisResult> {
  const issues: IssueDetail[] = [];
  const recommendations: RecommendationDetail[] = [];

  // Extract video ID
  let videoId = "";
  try {
    const u = new URL(url);
    videoId = u.searchParams.get("v") ?? u.pathname.replace("/", "");
  } catch { videoId = ""; }

  // Fetch oEmbed data
  let videoTitle = "";
  let channelName = "";
  let thumbnailUrl = "";

  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
    if (resp.ok) {
      const data = await resp.json() as { title?: string; author_name?: string; thumbnail_url?: string };
      videoTitle = data.title ?? "";
      channelName = data.author_name ?? "";
      thumbnailUrl = data.thumbnail_url ?? "";
    }
  } catch {
    logger.warn({ url }, "Could not fetch YouTube oEmbed data");
  }

  // Fetch video page for description and tags
  let description = "";
  let descriptionMeta = "";
  const fetched = await fetchPage(`https://www.youtube.com/watch?v=${videoId}`);
  if (fetched?.html) {
    const $ = cheerio.load(fetched.html);
    descriptionMeta = $('meta[name="description"]').attr("content")?.trim() ?? "";
    description = descriptionMeta;
    videoTitle = videoTitle || $("title").first().text().replace(" - YouTube", "").trim();
  }

  // ── TITLE ANALYSIS ──
  if (!videoTitle) {
    issues.push({
      category: "Title", severity: "critical",
      title: "Could not fetch video title",
      description: "Unable to retrieve the video title from YouTube. Ensure the video is public and the URL is correct.",
      affectedUrl: url, element: null, lineNumber: null,
      fixExample: null, helpUrl: "https://support.google.com/youtube/answer/57404",
    });
  } else if (videoTitle.length > 70) {
    issues.push({
      category: "Title", severity: "warning",
      title: `Video title is too long (${videoTitle.length} chars)`,
      description: `Your title "${trunc(videoTitle, 80)}" is ${videoTitle.length} characters. YouTube displays ~70 characters in search results and cuts off the rest. Put your main keyword in the first 40 characters.`,
      affectedUrl: url, element: `Title: "${videoTitle}"`, lineNumber: null,
      fixExample: `Shorten to: "${trunc(videoTitle, 65)}"\n\n// Best format: [Primary Keyword]: [Benefit/Hook] ([year if relevant])\n// Example: "SEO Tips 2024: 10 Strategies That Tripled My Traffic"`,
      helpUrl: "https://support.google.com/youtube/answer/57404",
    });
    recommendations.push({
      priority: "high", category: "Title",
      title: "Trim the video title to under 70 characters",
      description: `Current: "${trunc(videoTitle, 80)}" (${videoTitle.length} chars). Put the primary keyword in the first 40 characters. Use a format like: "Keyword: Hook (Year)" — e.g., "React Tutorial 2024: Build a Full App in 2 Hours".`,
      estimatedImpact: 75, dismissed: false,
    });
  } else if (videoTitle.length < 30) {
    issues.push({
      category: "Title", severity: "warning",
      title: `Video title is too short (${videoTitle.length} chars)`,
      description: `Title "${videoTitle}" is only ${videoTitle.length} characters. Longer, keyword-rich titles (40-70 chars) perform significantly better in YouTube search results.`,
      affectedUrl: url, element: `Title: "${videoTitle}"`, lineNumber: null,
      fixExample: `Expand to: "${videoTitle}: [Detailed description with keywords]"\n// Aim for 40-70 characters with keyword-rich, benefit-driven language`,
      helpUrl: "https://support.google.com/youtube/answer/57404",
    });
    recommendations.push({
      priority: "high", category: "Title",
      title: "Expand the video title to 40-70 characters",
      description: `Current title: "${videoTitle}" (${videoTitle.length} chars). Expand it to include your target keyword, a benefit, and optionally a number or year. Example: "${videoTitle} — Step-by-Step Tutorial 2024".`,
      estimatedImpact: 72, dismissed: false,
    });
  }

  // ── DESCRIPTION ──
  if (!description) {
    issues.push({
      category: "Description", severity: "critical",
      title: "Missing video description",
      description: "No video description was found. YouTube uses descriptions for SEO ranking. A well-written description helps YouTube understand your video topic and rank it for relevant searches.",
      affectedUrl: url, element: "Description: [empty]", lineNumber: null,
      fixExample: `Write a 200-500 word description that:\n1. States the main topic in the first 2 lines (visible without clicking "Show more")\n2. Naturally includes your target keyword 2-3 times\n3. Lists key topics covered with timestamps\n4. Includes links to related videos/playlists\n5. Ends with a call-to-action (like, subscribe, comment)`,
      helpUrl: "https://support.google.com/youtube/answer/57404",
    });
    recommendations.push({
      priority: "high", category: "Description",
      title: "Write a detailed 200-500 word video description",
      description: "Add a description that includes your target keyword in the first 125 characters (visible in search results), timestamps for chapters, links to resources mentioned, and a call to action. Longer, keyword-rich descriptions help YouTube understand and rank your video.",
      estimatedImpact: 85, dismissed: false,
    });
  } else if (description.length < 125) {
    issues.push({
      category: "Description", severity: "warning",
      title: `Video description is very short (${description.length} chars)`,
      description: `The description is only ${description.length} characters. YouTube shows the first 125 characters in search results — make those count. Aim for a 200-500 word description with keywords, timestamps, and CTAs.`,
      affectedUrl: url, element: `Description: "${description}"`, lineNumber: null,
      fixExample: `Expand description to include:\n"${description}\n\n📌 What you'll learn in this video:\n- [Topic 1]\n- [Topic 2]\n\n⏱️ Timestamps:\n00:00 - Introduction\n02:30 - [Chapter 1]\n\n🔗 Resources mentioned: [links]\n\n👍 If this helped, like and subscribe!"`,
      helpUrl: "https://support.google.com/youtube/answer/57404",
    });
    recommendations.push({
      priority: "high", category: "Description",
      title: "Expand the description to 200-500+ words",
      description: `Current: "${trunc(description, 100)}" (${description.length} chars). Expand with: key points covered, timestamps (major ranking factor), target keywords appearing naturally 2-3 times, links to related content, and a subscribe CTA.`,
      estimatedImpact: 78, dismissed: false,
    });
  }

  // Check for timestamps
  const hasTimestamps = /\d+:\d+/.test(description);
  if (description && !hasTimestamps) {
    issues.push({
      category: "Engagement", severity: "info",
      title: "No timestamps (chapters) in description",
      description: "No timestamps were found in the description. YouTube chapter markers improve watch time, reduce bounce rate, and appear as rich snippets in Google Search results — all of which boost rankings.",
      affectedUrl: url, element: `Description: "${trunc(description, 150)}"`, lineNumber: null,
      fixExample: `Add chapters at the start of the description:\n\n00:00 Introduction\n01:30 [Topic 1 name]\n04:45 [Topic 2 name]\n08:20 [Topic 3 name]\n12:00 Conclusion\n\n// First chapter must start at 00:00\n// Need at least 3 chapters\n// Minimum 10 seconds per chapter`,
      helpUrl: "https://support.google.com/youtube/answer/9884579",
    });
    recommendations.push({
      priority: "medium", category: "Engagement",
      title: "Add timestamps/chapters to the description",
      description: "Add chapter timestamps (e.g., '00:00 Intro', '02:30 Chapter 1'). Chapters appear as interactive markers in the video player and as rich snippets in Google Search, increasing click-through rates and watch time.",
      estimatedImpact: 60, dismissed: false,
    });
  }

  // Custom thumbnail
  recommendations.push({
    priority: "high", category: "Thumbnail",
    title: "Use a custom thumbnail with bold text overlay",
    description: "Videos with custom thumbnails get ~30% more clicks than auto-generated ones. Design a 1280×720px image with: high-contrast background, large readable text (3-5 words max), an expressive face if possible, and brand colors.",
    estimatedImpact: 80, dismissed: false,
  });

  recommendations.push({
    priority: "medium", category: "Tags",
    title: "Add 5-15 relevant keyword tags to the video",
    description: "Use YouTube Studio to add tags: 1-2 exact match keyword tags, 3-5 broader topic tags, and 5-8 related phrase tags. Tags help YouTube's algorithm understand content and recommend your video. Don't use misleading tags — it can lower ranking.",
    estimatedImpact: 45, dismissed: false,
  });

  // Score
  let score = 80;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 20;
    else if (issue.severity === "warning") score -= 10;
    else score -= 3;
  }
  const finalScore = Math.max(10, Math.min(100, score));

  return {
    seoScore: finalScore, metaTitle: videoTitle || null, metaDescription: description || null,
    h1Count: 0, h2Count: 0, wordCount: description.split(" ").filter(w => w.length > 0).length,
    internalLinks: 0, externalLinks: 0, imagesMissingAlt: 0,
    pageLoadScore: 0, mobileScore: 0, pageCount: 1, issues, recommendations,
  };
}

async function analyzeInstagram(url: string): Promise<SeoAnalysisResult> {
  const issues: IssueDetail[] = [];
  const recommendations: RecommendationDetail[] = [];

  let caption = "";
  let title = "";

  const fetched = await fetchPage(url);
  if (fetched?.html) {
    const $ = cheerio.load(fetched.html);
    title = $('meta[property="og:title"]').attr("content") ?? $("title").first().text().trim();
    caption = $('meta[property="og:description"]').attr("content")?.trim()
      ?? $('meta[name="description"]').attr("content")?.trim()
      ?? "";
  }

  // Extract hashtags
  const hashtags = (caption.match(/#\w+/g) ?? []);
  const hashtagCount = hashtags.length;

  // Caption analysis
  if (!caption) {
    issues.push({
      category: "Caption", severity: "warning",
      title: "No caption or description could be extracted",
      description: "No caption was detected (Instagram may require login to view content). Generally, Instagram posts with 138-150 character captions get 2x more engagement than no-caption posts.",
      affectedUrl: url, element: "Caption: [not accessible or empty]", lineNumber: null,
      fixExample: `Write a caption that:\n1. Opens with a hook (question, bold statement, or emoji)\n2. Tells a story or provides value in 138-150 characters\n3. Ends with a clear call-to-action\n4. Lists hashtags below or in the first comment\n\nExample:\n"Struggling with SEO? 🤔 These 3 changes took our traffic from 500 to 50,000/mo in 6 months.\n\nSave this post — you'll want it later. 👇\n\n#SEOtips #digitalmarketing #growthhacking"`,
      helpUrl: "https://business.instagram.com/blog/instagram-seo-tips",
    });
    recommendations.push({
      priority: "high", category: "Caption",
      title: "Write an engaging caption with hook + CTA",
      description: "Craft a 138-150 character caption (the visible portion before 'more'). Start with a hook (question, surprising fact, or emoji), provide value or tell a story, and end with a clear CTA (save, share, comment, link in bio).",
      estimatedImpact: 80, dismissed: false,
    });
  } else {
    if (caption.length > 200) {
      issues.push({
        category: "Caption", severity: "info",
        title: `Long caption — first 138 chars are key`,
        description: `Caption is ${caption.length} characters. Instagram shows only the first ~138 characters before the 'more' button. Make sure the hook and key message appear in those first 138 chars.`,
        affectedUrl: url, element: `Caption: "${caption}"`, lineNumber: null,
        fixExample: `Optimize the opening 138 chars:\n"${trunc(caption, 138)}"\n\n[Rest of caption with hashtags, links, and details...]`,
        helpUrl: "https://business.instagram.com/blog/instagram-seo-tips",
      });
    }
  }

  // Hashtag analysis
  if (hashtagCount === 0) {
    issues.push({
      category: "Hashtags", severity: "warning",
      title: "No hashtags found",
      description: "No hashtags were detected in the caption. Hashtags make your post discoverable to people searching for or following those topics. Instagram recommends 3-5 highly relevant hashtags.",
      affectedUrl: url, element: "Hashtags: [none found]", lineNumber: null,
      fixExample: `Add 3-5 highly relevant hashtags:\n\n#[PrimaryTopic] #[NicheTopic] #[BrandHashtag]\n\n// 3-tier strategy:\n// • 1-2 large hashtags (1M+ posts): broad reach\n// • 2-3 medium hashtags (100K-1M posts): engaged audience\n// • 1-2 niche hashtags (<100K posts): best chance of ranking`,
      helpUrl: "https://business.instagram.com/blog/instagram-seo-tips",
    });
    recommendations.push({
      priority: "high", category: "Hashtags",
      title: "Add 3-5 targeted hashtags",
      description: "Instagram's algorithm uses hashtags to categorize and distribute content. Use 3-5 highly relevant hashtags mixing large (#digitalmarketing), medium (#instagramseo), and niche (#b2bseo) tags. Avoid banned hashtags.",
      estimatedImpact: 75, dismissed: false,
    });
  } else if (hashtagCount > 30) {
    issues.push({
      category: "Hashtags", severity: "warning",
      title: `Too many hashtags (${hashtagCount})`,
      description: `${hashtagCount} hashtags were found. Instagram limits posts to 30 hashtags, and using the maximum can look spammy. Research shows posts with 3-5 targeted hashtags often outperform those with 30 generic ones.`,
      affectedUrl: url, element: `Hashtags (${hashtagCount}): ${hashtags.slice(0, 8).join(" ")} …`, lineNumber: null,
      fixExample: `Reduce to 3-5 high-quality hashtags:\n\n#[YourBestHashtag1] #[YourBestHashtag2] #[BrandHashtag]\n\n// Remove generic high-competition tags\n// Keep your most niche, targeted ones`,
      helpUrl: "https://business.instagram.com/blog/instagram-seo-tips",
    });
    recommendations.push({
      priority: "medium", category: "Hashtags",
      title: "Reduce to 3-5 highly targeted hashtags",
      description: `You're using ${hashtagCount} hashtags. Research shows 3-5 niche, relevant hashtags drive better reach than 30 generic ones. Focus on hashtags where your content has a realistic chance of appearing in the top posts.`,
      estimatedImpact: 50, dismissed: false,
    });
  }

  // CTA check
  const ctaKeywords = ["comment", "share", "save", "click", "link in bio", "tag", "follow", "subscribe", "dm", "swipe"];
  const hasCta = ctaKeywords.some(kw => caption.toLowerCase().includes(kw));
  if (caption && !hasCta) {
    issues.push({
      category: "Engagement", severity: "info",
      title: "No call-to-action detected in caption",
      description: "No call-to-action was detected. CTAs like 'save this post', 'comment below', or 'share with someone who needs this' drive 89% higher engagement rates according to Instagram data.",
      affectedUrl: url, element: `Caption: "${trunc(caption, 150)}"`, lineNumber: null,
      fixExample: `Add a CTA at the end of your caption:\n\n"${trunc(caption, 100)} [...]\n\n👇 [Choose one CTA:]\n• 'Save this post for later!'\n• 'Tag someone who needs to hear this'\n• 'Comment with your thoughts below'\n• 'Click the link in bio for the full guide'"`,
      helpUrl: "https://business.instagram.com/blog/instagram-seo-tips",
    });
    recommendations.push({
      priority: "medium", category: "Engagement",
      title: "Add a clear call-to-action to the caption",
      description: "End every caption with one clear CTA. Studies show posts with CTAs get 89% more engagement. Options: 'Save this for later', 'Tag a friend', 'Drop a comment below', 'Link in bio for more'. Pick the action most aligned with your goal.",
      estimatedImpact: 65, dismissed: false,
    });
  }

  recommendations.push({
    priority: "high", category: "Keywords",
    title: "Add keywords to the caption text for Instagram SEO",
    description: "Instagram now indexes caption text for search. Include your main topic keyword (e.g., 'digital marketing tips') naturally in the first sentence of your caption. This makes your post discoverable when users search that term on Instagram.",
    estimatedImpact: 70, dismissed: false,
  });

  recommendations.push({
    priority: "low", category: "Posting Time",
    title: "Schedule posts during peak engagement hours",
    description: "Post when your specific audience is most active. Check Instagram Insights → Audience → Most Active Times. Generally: 9am-11am and 6pm-8pm local time on weekdays. Consistent posting rhythm also signals reliability to the algorithm.",
    estimatedImpact: 40, dismissed: false,
  });

  let score = 75;
  for (const issue of issues) {
    if (issue.severity === "critical") score -= 20;
    else if (issue.severity === "warning") score -= 10;
    else score -= 3;
  }

  return {
    seoScore: Math.max(10, Math.min(100, score)),
    metaTitle: title || null, metaDescription: caption || null,
    h1Count: 0, h2Count: 0,
    wordCount: caption.split(" ").filter(w => w.length > 0).length,
    internalLinks: 0, externalLinks: hashtagCount,
    imagesMissingAlt: 0, pageLoadScore: 0, mobileScore: 0, pageCount: 1,
    issues, recommendations,
  };
}
