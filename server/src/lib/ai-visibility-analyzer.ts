import type { CheerioAPI } from "cheerio";

// ======================================================
// TYPES
// ======================================================

export interface AiVisibilityResult {
  aiVisibilityScore: number;
  aiVisibilityInsights: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

interface CategoryResult {
  points: number;
  maxPoints: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// ======================================================
// MAIN ENTRY
// ======================================================

export function analyzeAiVisibility(
  $: CheerioAPI,
  url: string,
  lighthousePerformance: number,
  lighthouseMobile: number,
): AiVisibilityResult {
  const categories = [
    analyzeStructuredData($),
    analyzeSemanticHtml($),
    analyzeAiReadability($),
    analyzeCrawlability($, url),
    analyzeMetadataQuality($),
    analyzeFaqContent($),
    analyzeInternalLinking($),
    analyzePerformanceSignals(lighthousePerformance, lighthouseMobile),
    analyzeContentStructure($),
    analyzeEntitySignals($),
  ];

  const totalPoints = categories.reduce((s, c) => s + c.points, 0);
  const maxPoints = categories.reduce((s, c) => s + c.maxPoints, 0);
  const score = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  for (const cat of categories) {
    strengths.push(...cat.strengths);
    weaknesses.push(...cat.weaknesses);
    recommendations.push(...cat.recommendations);
  }

  return {
    aiVisibilityScore: Math.min(100, Math.max(0, score)),
    aiVisibilityInsights: { strengths, weaknesses, recommendations },
  };
}

// ======================================================
// 1. STRUCTURED DATA (10 pts)
// ======================================================

function analyzeStructuredData($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const jsonLdScripts = $('script[type="application/ld+json"]');
  const jsonLdTexts: string[] = [];
  jsonLdScripts.each((_, el) => {
    jsonLdTexts.push($(el).text().toLowerCase());
  });
  const allJsonLd = jsonLdTexts.join(" ");

  if (jsonLdScripts.length > 0) {
    r.points += 4;
    r.strengths.push("JSON-LD structured data detected");
  } else {
    r.weaknesses.push("No JSON-LD structured data found");
    r.recommendations.push("Add JSON-LD structured data (schema.org) to help AI systems understand your content");
  }

  if (allJsonLd.includes("schema.org")) {
    r.points += 2;
    r.strengths.push("schema.org vocabulary in use");
  }

  const schemaTypes = ["article", "product", "faqpage", "organization", "localbusiness", "webpage", "howto", "recipe"];
  const found = schemaTypes.filter(t => allJsonLd.includes(t));
  if (found.length > 0) {
    r.points += Math.min(4, found.length * 2);
    r.strengths.push(`Rich schema types detected: ${found.join(", ")}`);
  } else if (jsonLdScripts.length > 0) {
    r.recommendations.push("Add specific schema types like Article, FAQPage, or Product for richer AI snippets");
  }

  return r;
}

// ======================================================
// 2. SEMANTIC HTML (10 pts)
// ======================================================

function analyzeSemanticHtml($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const h1 = $("h1").length;
  const h2 = $("h2").length;
  const h3 = $("h3").length;

  if (h1 === 1) {
    r.points += 3;
    r.strengths.push("Proper single H1 heading hierarchy");
  } else if (h1 > 1) {
    r.points += 1;
    r.weaknesses.push(`Multiple H1 tags found (${h1}) — AI systems prefer a single primary heading`);
    r.recommendations.push("Use exactly one H1 tag per page for clear topic signaling to AI");
  } else {
    r.weaknesses.push("No H1 tag found — AI systems rely on headings to understand page topics");
    r.recommendations.push("Add a single H1 tag that clearly describes the page topic");
  }

  if (h2 >= 2) { r.points += 2; r.strengths.push("Good H2 subheading structure"); }
  if (h3 >= 1) { r.points += 1; }

  const semanticTags = ["article", "section", "nav", "main", "aside", "header", "footer"];
  const foundTags = semanticTags.filter(tag => $(tag).length > 0);

  if (foundTags.length >= 4) {
    r.points += 4;
    r.strengths.push(`Strong semantic HTML structure (${foundTags.join(", ")})`);
  } else if (foundTags.length >= 2) {
    r.points += 2;
    r.weaknesses.push("Partial semantic HTML — some semantic tags present but could be improved");
    r.recommendations.push("Use <article>, <section>, <nav>, <main> tags to help AI parse content regions");
  } else {
    r.weaknesses.push("Weak semantic HTML — page relies mostly on <div> elements");
    r.recommendations.push("Replace generic <div> wrappers with semantic HTML5 elements for better AI comprehension");
  }

  return r;
}

// ======================================================
// 3. AI READABILITY (10 pts)
// ======================================================

function analyzeAiReadability($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const paragraphs = $("p");
  const pCount = paragraphs.length;
  const pTexts: string[] = [];
  paragraphs.each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 10) pTexts.push(t);
  });

  if (pCount >= 5) {
    r.points += 3;
    r.strengths.push("Good paragraph density for AI content extraction");
  } else if (pCount >= 2) {
    r.points += 1;
    r.recommendations.push("Add more paragraph-based content for better AI readability");
  } else {
    r.weaknesses.push("Very few paragraphs — AI systems struggle with non-paragraph content");
    r.recommendations.push("Structure content into clear paragraphs for AI extraction");
  }

  const avgLen = pTexts.length > 0 ? pTexts.reduce((s, t) => s + t.split(/\s+/).length, 0) / pTexts.length : 0;
  if (avgLen >= 15 && avgLen <= 80) {
    r.points += 3;
    r.strengths.push("Paragraph lengths are well-suited for AI summarization");
  } else if (avgLen > 80) {
    r.points += 1;
    r.recommendations.push("Break long paragraphs into shorter chunks (20-60 words) for better AI digestion");
  }

  const headings = $("h1, h2, h3, h4");
  let descriptiveCount = 0;
  headings.each((_, el) => {
    const text = $(el).text().trim();
    if (text.split(/\s+/).length >= 3 && text.length <= 100) descriptiveCount++;
  });

  if (headings.length > 0 && descriptiveCount / headings.length >= 0.6) {
    r.points += 2;
    r.strengths.push("Headings are descriptive and contextual");
  } else if (headings.length > 0) {
    r.recommendations.push("Make headings more descriptive (3+ words) so AI can understand section topics");
  }

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").filter(w => w.length > 1).length;
  if (wordCount >= 300) {
    r.points += 2;
    r.strengths.push("Sufficient content depth for AI indexing");
  } else {
    r.weaknesses.push("Thin content — AI systems prefer pages with substantial text (300+ words)");
    r.recommendations.push("Add more substantive written content to improve AI discoverability");
  }

  return r;
}

// ======================================================
// 4. CRAWLABILITY (10 pts)
// ======================================================

function analyzeCrawlability($: CheerioAPI, _url: string): CategoryResult {
  const r = empty(10);

  const canonical = $('link[rel="canonical"]').attr("href");
  if (canonical) {
    r.points += 3;
    r.strengths.push("Canonical URL tag present");
  } else {
    r.weaknesses.push("No canonical tag found");
    r.recommendations.push("Add a <link rel=\"canonical\"> tag to prevent duplicate content issues with AI crawlers");
  }

  const robotsMeta = $('meta[name="robots"]').attr("content") || "";
  if (robotsMeta.includes("noindex")) {
    r.weaknesses.push("Page has noindex directive — AI crawlers will skip this page");
    r.recommendations.push("Remove noindex if you want this page discoverable by AI search engines");
  } else {
    r.points += 3;
    r.strengths.push("Page is indexable by AI crawlers");
  }

  const sitemapLink = $('a[href*="sitemap"]').length > 0 || $('link[rel="sitemap"]').length > 0;
  if (sitemapLink) {
    r.points += 2;
    r.strengths.push("Sitemap reference detected");
  } else {
    r.recommendations.push("Ensure a sitemap.xml is accessible and linked for AI crawler discovery");
  }

  const robotsLink = $('a[href*="robots.txt"]').length > 0;
  if (robotsLink) { r.points += 2; }
  else { r.points += 1; } // Most sites have robots.txt even without linking it

  return r;
}

// ======================================================
// 5. METADATA QUALITY (10 pts)
// ======================================================

function analyzeMetadataQuality($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const title = $("title").first().text().trim();
  if (title && title.length >= 20 && title.length <= 70) {
    r.points += 3;
    r.strengths.push("Well-optimized title tag for AI search results");
  } else if (title) {
    r.points += 1;
    r.recommendations.push("Optimize title tag length (20-70 chars) for best AI search display");
  } else {
    r.weaknesses.push("Missing title tag — critical for AI search visibility");
    r.recommendations.push("Add a descriptive title tag");
  }

  const desc = $('meta[name="description"]').attr("content") || "";
  if (desc.length >= 80 && desc.length <= 160) {
    r.points += 3;
    r.strengths.push("Meta description is well-optimized for AI snippets");
  } else if (desc) {
    r.points += 1;
    r.recommendations.push("Optimize meta description length (80-160 chars) for AI-generated snippets");
  } else {
    r.weaknesses.push("Missing meta description — AI systems use this for context and summaries");
    r.recommendations.push("Add a compelling meta description");
  }

  const og = $('meta[property^="og:"]').length;
  if (og >= 3) {
    r.points += 2;
    r.strengths.push("OpenGraph tags present for social AI previews");
  } else {
    r.recommendations.push("Add OpenGraph meta tags (og:title, og:description, og:image) for AI social previews");
  }

  const twitter = $('meta[name^="twitter:"]').length;
  if (twitter >= 2) {
    r.points += 2;
    r.strengths.push("Twitter Card meta tags detected");
  } else {
    r.recommendations.push("Add Twitter Card meta tags for AI-powered social sharing");
  }

  return r;
}

// ======================================================
// 6. FAQ & CONVERSATIONAL CONTENT (10 pts)
// ======================================================

function analyzeFaqContent($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const jsonLd = $('script[type="application/ld+json"]').text().toLowerCase();
  if (jsonLd.includes("faqpage") || jsonLd.includes("question")) {
    r.points += 5;
    r.strengths.push("FAQ structured data detected — excellent for AI answer generation");
  }

  const headingTexts: string[] = [];
  $("h1, h2, h3, h4, h5").each((_, el) => { headingTexts.push($(el).text().trim().toLowerCase()); });

  const questionHeadings = headingTexts.filter(
    t => t.startsWith("how") || t.startsWith("what") || t.startsWith("why") ||
         t.startsWith("when") || t.startsWith("where") || t.startsWith("who") ||
         t.startsWith("can") || t.startsWith("does") || t.startsWith("is") ||
         t.endsWith("?")
  );

  if (questionHeadings.length >= 3) {
    r.points += 3;
    r.strengths.push("Question-formatted headings detected — ideal for AI Q&A extraction");
  } else if (questionHeadings.length >= 1) {
    r.points += 1;
    r.recommendations.push("Add more question-formatted headings (e.g. 'How does X work?') for AI Q&A features");
  } else {
    r.recommendations.push("Structure some content as questions and answers for AI assistant compatibility");
  }

  const faqSections = $('[class*="faq"], [id*="faq"], [class*="question"], [class*="accordion"]').length;
  if (faqSections > 0) {
    r.points += 2;
    r.strengths.push("FAQ or Q&A section detected in page structure");
  }

  if (r.points === 0) {
    r.weaknesses.push("No FAQ or conversational content patterns found");
    r.recommendations.push("Add an FAQ section with JSON-LD FAQPage schema for AI-generated answers");
  }

  return r;
}

// ======================================================
// 7. INTERNAL LINKING (10 pts)
// ======================================================

function analyzeInternalLinking($: CheerioAPI): CategoryResult {
  const r = empty(10);

  let internalCount = 0;
  let descriptiveAnchors = 0;
  let genericAnchors = 0;
  const genericTexts = ["click here", "read more", "learn more", "here", "link", "more"];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim() || "";
    if (!href || href.startsWith("http") || href.startsWith("//") || href.startsWith("#") || href.startsWith("javascript:")) return;

    internalCount++;
    const text = $(el).text().trim().toLowerCase();
    if (text.length > 0 && !genericTexts.includes(text) && text.split(/\s+/).length >= 2) {
      descriptiveAnchors++;
    } else if (genericTexts.includes(text)) {
      genericAnchors++;
    }
  });

  if (internalCount >= 5) {
    r.points += 4;
    r.strengths.push(`Good internal linking structure (${internalCount} internal links)`);
  } else if (internalCount >= 2) {
    r.points += 2;
    r.recommendations.push("Add more internal links to help AI understand page relationships");
  } else {
    r.weaknesses.push("Very few internal links — AI systems use link structure to understand site topology");
    r.recommendations.push("Add meaningful internal links to related pages");
  }

  if (internalCount > 0 && descriptiveAnchors / internalCount >= 0.5) {
    r.points += 4;
    r.strengths.push("Anchor text is descriptive and contextual");
  } else if (genericAnchors > 2) {
    r.points += 1;
    r.weaknesses.push("Too many generic anchor texts ('click here', 'read more')");
    r.recommendations.push("Use descriptive anchor text that tells AI what the linked page is about");
  } else {
    r.points += 2;
  }

  const nav = $("nav a").length;
  if (nav >= 3) {
    r.points += 2;
    r.strengths.push("Navigation links provide clear site structure for AI crawlers");
  }

  return r;
}

// ======================================================
// 8. PERFORMANCE SIGNALS (10 pts)
// ======================================================

function analyzePerformanceSignals(
  performanceScore: number,
  mobileScore: number,
): CategoryResult {
  const r = empty(10);

  if (performanceScore >= 80) {
    r.points += 5;
    r.strengths.push("Strong Lighthouse performance score — AI crawlers favor fast pages");
  } else if (performanceScore >= 50) {
    r.points += 3;
    r.recommendations.push("Improve page performance to boost AI crawler prioritization");
  } else {
    r.points += 1;
    r.weaknesses.push("Low performance score may cause AI crawlers to deprioritize this page");
    r.recommendations.push("Optimize page load speed — AI systems penalize slow pages");
  }

  if (mobileScore >= 80) {
    r.points += 5;
    r.strengths.push("Mobile-friendly page — important for AI mobile search results");
  } else if (mobileScore >= 50) {
    r.points += 3;
    r.recommendations.push("Improve mobile experience for better AI mobile search visibility");
  } else {
    r.points += 1;
    r.weaknesses.push("Poor mobile score impacts AI search rankings");
  }

  return r;
}

// ======================================================
// 9. CONTENT STRUCTURE (10 pts)
// ======================================================

function analyzeContentStructure($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const tables = $("table").length;
  if (tables > 0) {
    r.points += 3;
    r.strengths.push("Tabular data found — AI excels at extracting structured tables");
  }

  const lists = $("ul, ol").length;
  if (lists >= 2) {
    r.points += 3;
    r.strengths.push("Good use of lists for scannable, AI-extractable content");
  } else if (lists >= 1) {
    r.points += 1;
    r.recommendations.push("Add more list-based content for AI snippet extraction");
  } else {
    r.recommendations.push("Use bullet/numbered lists to structure key information for AI");
  }

  const dl = $("dl").length;
  if (dl > 0) {
    r.points += 1;
    r.strengths.push("Definition lists detected — great for AI knowledge extraction");
  }

  const sections = $("section, article").length;
  const headingsInSections = $("section h2, section h3, article h2, article h3").length;

  if (sections >= 3 && headingsInSections >= 2) {
    r.points += 3;
    r.strengths.push("Content is well-chunked into headed sections");
  } else if (sections >= 1) {
    r.points += 1;
    r.recommendations.push("Break content into more <section> blocks with descriptive headings");
  } else {
    r.weaknesses.push("Content lacks clear sectional structure");
    r.recommendations.push("Organize content into distinct sections with headings for AI comprehension");
  }

  return r;
}

// ======================================================
// 10. ENTITY & TOPIC SIGNALS (10 pts)
// ======================================================

function analyzeEntitySignals($: CheerioAPI): CategoryResult {
  const r = empty(10);

  const headingTexts: string[] = [];
  $("h1, h2, h3").each((_, el) => { headingTexts.push($(el).text().trim()); });

  // Check for capitalized named entities in headings
  const entityPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  const entities = new Set<string>();
  for (const text of headingTexts) {
    const matches = text.match(entityPattern);
    if (matches) matches.forEach(m => entities.add(m));
  }

  if (entities.size >= 2) {
    r.points += 4;
    r.strengths.push(`Named entities detected in headings: ${[...entities].slice(0, 3).join(", ")}`);
  } else if (entities.size === 1) {
    r.points += 2;
  }

  // Topic consistency: check if title words appear in headings
  const title = $("title").first().text().trim().toLowerCase();
  const titleWords = title.split(/\s+/).filter(w => w.length > 3);
  const allHeadingText = headingTexts.join(" ").toLowerCase();

  let matchingWords = 0;
  for (const word of titleWords) {
    if (allHeadingText.includes(word)) matchingWords++;
  }

  if (titleWords.length > 0 && matchingWords / titleWords.length >= 0.4) {
    r.points += 3;
    r.strengths.push("Strong topic consistency between title and headings");
  } else if (titleWords.length > 0) {
    r.points += 1;
    r.recommendations.push("Align heading topics more closely with the page title for AI topic modeling");
  }

  // Semantic density: meta keywords or strong/em usage
  const emphasized = $("strong, em, b, mark").length;
  if (emphasized >= 3) {
    r.points += 3;
    r.strengths.push("Key terms are emphasized for AI entity extraction");
  } else {
    r.points += 1;
    r.recommendations.push("Use <strong> or <em> tags to highlight key entities and terms for AI");
  }

  return r;
}

// ======================================================
// HELPER
// ======================================================

function empty(maxPoints: number): CategoryResult {
  return { points: 0, maxPoints, strengths: [], weaknesses: [], recommendations: [] };
}
