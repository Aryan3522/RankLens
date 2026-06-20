# RankLens

## AI Visibility & SEO Intelligence Platform

### Mission

RankLens exists to help creators, businesses, marketers, developers, startups, and agencies understand why their content is not ranking, not being discovered, and not being surfaced by modern AI systems.

The platform must provide actionable recommendations instead of generic SEO scores.

Users should be able to paste:

* Website URLs
* Landing Pages
* Blog URLs
* Product Pages
* YouTube Videos
* YouTube Channels
* Instagram Reels
* Instagram Posts
* Instagram Profiles

And instantly receive:

* SEO Analysis
* AI Visibility Analysis
* Content Quality Analysis
* Technical SEO Analysis
* Keyword Gap Analysis
* Competitor Insights
* Actionable Improvement Steps

---

# Core Product Principles

## Rule 1

Never show raw scores without explanations.

Bad:

"SEO Score: 68"

Good:

"Your SEO score is reduced because:

* Missing H1 hierarchy
* Weak keyword placement
* No structured data
* Slow Largest Contentful Paint"

Every metric must explain:

* Why it matters
* What's causing issues
* How to fix it

---

## Rule 2

Recommendations must be actionable.

Bad:

"Improve SEO"

Good:

"Add your primary keyword within the first 100 words of content."

---

## Rule 3

Everything must remain free.

No paywalls.

No locked features.

No premium reports.

No feature restrictions.

If monetization is added later:

* API plans
* Team workspaces
* White labeling

Never lock core analysis.

---

## Rule 4

Speed First

Analysis must feel instant.

Target:

Initial response:
< 3 seconds

Full report:
< 10 seconds

Never make users wait for complete analysis before displaying results.

Use:

* Streaming UI
* Progressive loading
* Incremental reports
* Background jobs

Show findings as they arrive.

---

# Analysis Categories

## 1. SEO Visibility

Analyze:

### Keywords

* Primary keywords
* Secondary keywords
* Semantic keywords
* Long-tail keywords
* Keyword density
* Keyword stuffing

Detect:

* Missing target keywords
* Overused keywords
* Weak keyword distribution

Provide:

* Recommended keywords
* Keyword placements
* Suggested keyword density

---

### Metadata

Analyze:

* Title tag
* Meta description
* OpenGraph tags
* Twitter cards

Detect:

* Missing metadata
* Duplicate metadata
* Weak metadata

Provide:

* Better metadata examples

---

### Heading Structure

Analyze:

* H1
* H2
* H3
* H4

Detect:

* Missing H1
* Multiple H1s
* Broken hierarchy

---

### Internal Linking

Analyze:

* Link structure
* Anchor text quality

Detect:

* Orphan pages
* Weak anchors

---

### Technical SEO

Analyze:

* Sitemap
* Robots.txt
* Canonicals
* Redirects
* Indexability
* Mobile friendliness

---

### Performance

Analyze:

* LCP
* FCP
* CLS
* INP
* TTFB

Provide:

* Optimization suggestions

---

# 2. AI Visibility

This is RankLens' biggest differentiator.

Traditional SEO is not enough anymore.

The platform must help users rank inside AI systems.

Examples:

* ChatGPT
* Gemini
* Claude
* Perplexity
* Copilot
* Grok

---

## AI Visibility Analysis

Measure:

### AI Crawlability

Check:

* Robots.txt accessibility
* Content accessibility
* JS rendering issues

---

### AI Citation Readiness

Analyze:

* Facts
* Statistics
* Structured content
* Lists
* Tables
* FAQs

AI systems prefer citing content that is:

* Structured
* Clear
* Authoritative

---

### AI Extraction Quality

Determine:

Can an AI easily extract:

* Topic
* Facts
* Definitions
* Processes
* Entities

---

### E-E-A-T Signals

Analyze:

Experience

Expertise

Authority

Trust

Detect:

* Missing author profiles
* Weak credibility
* Missing references

---

### Entity Coverage

Detect:

* Brands
* Products
* Organizations
* Locations
* People

Provide:

* Missing entities
* Entity optimization suggestions

---

### AI Content Structure

Analyze:

* FAQ blocks
* Bullet lists
* Comparison tables
* Definitions

AI systems heavily favor these formats.

---

### AI Discoverability Score

Generated from:

* Structure
* Entities
* E-E-A-T
* Crawlability
* Citation readiness

Must always explain:

Why score is low.

How to improve.

---

# 3. YouTube Analysis

Analyze:

### Title

* CTR potential
* Keyword usage
* Length

---

### Description

Detect:

* Missing keywords
* Missing context

---

### Tags

Suggest:

* High opportunity tags
* Related tags
* Long-tail tags

---

### Transcript

Analyze:

* Keyword frequency
* Topic consistency

---

### Engagement Indicators

Estimate:

* Content strength
* Topic competition

---

### Viral Potential

Analyze:

* Search demand
* Topic saturation
* Content positioning

---

# 4. Instagram Analysis

Analyze:

### Caption

* Keywords
* Hooks
* CTA quality

---

### Hashtags

Detect:

* Overused hashtags
* Weak hashtags

Suggest:

* Better hashtags
* Niche hashtags
* Trending hashtags

---

### Discoverability

Evaluate:

* Caption structure
* Topic clarity
* Searchability

---

### Viral Potential

Analyze:

* Hook quality
* Retention signals
* Shareability

---

# Output Structure

Every report must contain:

## Summary

Quick overview

---

## Critical Issues

High priority problems

---

## SEO Visibility

Detailed report

---

## AI Visibility

Detailed report

---

## Keyword Opportunities

Detailed report

---

## Technical Issues

Detailed report

---

## Action Plan

Step-by-step implementation plan

Priority:

1. Critical
2. Important
3. Nice To Have

---

# User Experience Rules

## Homepage

Single input field.

Placeholder:

"Paste a Website, YouTube Video, or Instagram URL"

---

## Analysis Flow

User submits URL.

Show:

Step 1
Fetching content...

Step 2
Analyzing SEO...

Step 3
Analyzing AI Visibility...

Step 4
Finding Opportunities...

Step 5
Generating Recommendations...

---

# UI/UX Requirements

## Notifications

Use Sonner.

Success:

Analysis complete.

Info:

Analysis started.

Warning:

URL may have accessibility issues.

Error:

Unable to access page.

---

## Dialogs

Use dialogs for:

* Export report
* Delete history
* Rate limit warnings

---

## Empty States

Show helpful guidance.

Never show blank screens.

---

## Error States

Always provide:

* What happened
* Why it happened
* How to fix it

---

## Loading States

Use:

* Skeletons
* Streaming cards
* Progressive rendering

Never use spinner-only screens.

---

# Rate Limiting

Required.

Maximum:

1 analysis request per user per minute.

Implementation:

* IP based
* User based

Return:

429 Too Many Requests

Message:

"Please wait 60 seconds before starting another analysis."

Show countdown timer.

---

# Performance Rules

Must use:

* Server caching
* Redis caching
* Edge caching
* Streaming responses

Avoid:

* Blocking requests
* Heavy synchronous operations

---

# Technical Stack

Frontend:

* Next.js 16
* TypeScript
* Tailwind CSS v4
* Framer Motion
* Sonner

Backend:

* Next.js Route Handlers
* Node.js

Database:

* PostgreSQL

Cache:

* Redis

Queue:

* BullMQ

---

# Security Rules

Never store:

* Website content permanently
* User data unnecessarily

Sanitize:

* URLs
* Inputs
* Outputs

Protect against:

* XSS
* SSRF
* Rate limit abuse

---

# Things We Must Never Do

❌ Fake scores

❌ Random recommendations

❌ Generic SEO advice

❌ Paywall essential features

❌ Slow loading reports

❌ Spinner-only experiences

❌ Analysis without explanations

❌ AI-generated suggestions without evidence

❌ Keyword stuffing recommendations

❌ Black hat SEO recommendations

❌ Manipulative ranking tactics

---

# Success Criteria

A successful RankLens report should answer:

1. Why am I not ranking?
2. Why am I not visible to AI systems?
3. Which keywords am I missing?
4. Which technical issues are hurting me?
5. What should I fix first?
6. What should I fix next?
7. How much impact will each fix have?
8. What can I do today to improve rankings?

If the user finishes a report and still has unanswered questions, the report is incomplete.

RankLens should function as an SEO consultant, AI visibility consultant, content strategist, and technical auditor combined into a single platform.
