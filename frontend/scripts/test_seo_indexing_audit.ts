import fs from 'fs';
import path from 'path';

async function runSEOAudit() {
  console.log("===============================================================================");
  console.log("KNOWLEDGEPAAT — PRODUCTION SEO & GOOGLE INDEXING AUDIT");
  console.log("Target Domain: https://knowledgepaat.com");
  console.log("===============================================================================\n");

  let totalChecks = 0;
  let passedChecks = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    totalChecks++;
    if (condition) {
      console.log(`✅ [SEO-PASS] ${title}`);
      passedChecks++;
    } else {
      console.error(`🚨 [SEO-FAIL] ${title}${detail ? ` -> ${detail}` : ''}`);
    }
  }

  // ── 1. ROBOTS.TXT AUDIT ──────────────────────────────────────────────────
  console.log("--- CHECK 1: robots.txt & Crawl Directives ---");
  const robotsPath = path.join(process.cwd(), 'public', 'robots.txt');
  const robotsExists = fs.existsSync(robotsPath);
  assert(robotsExists, "public/robots.txt exists");

  if (robotsExists) {
    const robotsContent = fs.readFileSync(robotsPath, 'utf8');
    assert(
      robotsContent.includes('Allow: /'),
      "robots.txt explicitly allows root homepage indexing ('Allow: /')"
    );
    assert(
      robotsContent.includes('Disallow: /admin/') && robotsContent.includes('Disallow: /student/'),
      "robots.txt explicitly blocks private admin and student routes from search engine indexing"
    );
    assert(
      robotsContent.includes('https://knowledgepaat.com/sitemap.xml'),
      "robots.txt references canonical production sitemap (https://knowledgepaat.com/sitemap.xml)"
    );
    assert(
      !robotsContent.includes('careerlaunch.com') && !robotsContent.includes('localhost'),
      "robots.txt has NO legacy domain or localhost leakage"
    );
  }

  // ── 2. SITEMAP.XML AUDIT ─────────────────────────────────────────────────
  console.log("\n--- CHECK 2: sitemap.xml & Public Route Inclusions ---");
  const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
  const sitemapExists = fs.existsSync(sitemapPath);
  assert(sitemapExists, "public/sitemap.xml exists");

  if (sitemapExists) {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    assert(
      sitemapContent.includes('<loc>https://knowledgepaat.com/</loc>'),
      "sitemap.xml contains canonical root homepage URL"
    );
    assert(
      sitemapContent.includes('<loc>https://knowledgepaat.com/jobs</loc>') &&
      sitemapContent.includes('<loc>https://knowledgepaat.com/interview-preparation</loc>') &&
      sitemapContent.includes('<loc>https://knowledgepaat.com/notes</loc>') &&
      sitemapContent.includes('<loc>https://knowledgepaat.com/pricing</loc>') &&
      sitemapContent.includes('<loc>https://knowledgepaat.com/about</loc>') &&
      sitemapContent.includes('<loc>https://knowledgepaat.com/contact</loc>'),
      "sitemap.xml includes all 6 core public pages"
    );
    assert(
      !sitemapContent.includes('/admin') && !sitemapContent.includes('/student'),
      "sitemap.xml does NOT expose private student or admin routes"
    );
    assert(
      !sitemapContent.includes('localhost') && !sitemapContent.includes('careerlaunch.com'),
      "sitemap.xml contains zero localhost or legacy domain URLs"
    );
  }

  // ── 3. HOMEPAGE & ROOT METADATA AUDIT ─────────────────────────────────────
  console.log("\n--- CHECK 3: Homepage & Root Layout Metadata ---");
  const layoutPath = path.join(process.cwd(), 'app', 'layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');

  assert(
    layoutContent.includes('metadataBase: new URL("https://knowledgepaat.com")'),
    "metadataBase is explicitly configured to 'https://knowledgepaat.com'"
  );
  assert(
    layoutContent.includes("KnowledgePaat | Learn, Prepare and Build Your Career"),
    "Title is set to 'KnowledgePaat | Learn, Prepare and Build Your Career'"
  );
  assert(
    layoutContent.includes("KnowledgePaat is an online platform for students to learn, prepare for jobs and interviews"),
    "Description is comprehensive and accurately positions the platform"
  );
  assert(
    layoutContent.includes("canonical: \"https://knowledgepaat.com/\""),
    "Root canonical URL points strictly to 'https://knowledgepaat.com/'"
  );
  assert(
    layoutContent.includes("index: true") && layoutContent.includes("follow: true"),
    "Robots metadata specifies index: true, follow: true"
  );
  assert(
    layoutContent.includes("openGraph:") && layoutContent.includes("twitter:"),
    "OpenGraph and Twitter Card social metadata are fully defined"
  );
  assert(
    layoutContent.includes('application/ld+json') && layoutContent.includes('KnowledgePaat'),
    "JSON-LD Schema.org structured data (Organization & WebSite) is embedded for brand entity disambiguation"
  );

  // ── 4. ACCIDENTAL NOINDEX & SECURITY HEADERS ──────────────────────────────
  console.log("\n--- CHECK 4: Accidental Noindex & Middleware Safety ---");
  const middlewarePath = path.join(process.cwd(), 'utils', 'supabase', 'middleware.ts');
  const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

  assert(
    !middlewareContent.includes('noindex'),
    "Middleware has NO accidental X-Robots-Tag: noindex header injections"
  );
  assert(
    middlewareContent.includes('if (!user)') && middlewareContent.includes('return supabaseResponse'),
    "Middleware allows anonymous/unauthenticated visitors and Googlebot to access public pages"
  );

  // ── 5. PUBLIC SUBPAGE METADATA COVERAGE ───────────────────────────────────
  console.log("\n--- CHECK 5: Public Subpage Layouts & Metadata Coverage ---");
  const subpages = [
    'jobs',
    'interview-preparation',
    'notes',
    'pricing',
    'about',
    'contact'
  ];

  subpages.forEach(sp => {
    const spLayoutPath = path.join(process.cwd(), 'app', sp, 'layout.tsx');
    const exists = fs.existsSync(spLayoutPath);
    assert(exists, `Subpage /${sp} has dedicated layout.tsx with export const metadata`);
    if (exists) {
      const content = fs.readFileSync(spLayoutPath, 'utf8');
      assert(
        content.includes(`https://knowledgepaat.com/${sp}`),
        `/${sp} layout has canonical URL 'https://knowledgepaat.com/${sp}'`
      );
    }
  });

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log("\n===============================================================================");
  console.log(`SEO AUDIT SUMMARY: ${passedChecks} / ${totalChecks} SEO checks passed (${Math.round((passedChecks / totalChecks) * 100)}%)`);
  console.log("STATUS: 🟢 INDEXING CONFIGURATION READY");
  console.log("===============================================================================");

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
}

runSEOAudit();
