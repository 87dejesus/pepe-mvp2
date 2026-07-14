import { getPostBySlug, getAllSlugs } from "../../../lib/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

const SERIF = "var(--font-caslon), Georgia, serif";

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} | The Steady One`,
    description: post.description,
    keywords: post.tags.join(", "),
    authors: [{ name: "Heed at The Steady One" }],
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date, url: `https://thesteadyone.com/blog/${post.slug}`, siteName: "The Steady One" },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
    alternates: { canonical: `https://thesteadyone.com/blog/${post.slug}` },
  };
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^# (.+)$/gm, '<h1 style="font-family:var(--font-caslon),Georgia,serif;font-size:32px;font-weight:400;color:#fff;margin:0 0 24px;line-height:1.15">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:var(--font-caslon),Georgia,serif;font-size:24px;font-weight:400;color:#fff;margin:40px 0 14px;line-height:1.25">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:600;color:#fff;margin:28px 0 10px;line-height:1.3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#fff">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#00A651;text-decoration:underline;text-underline-offset:3px" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;padding-left:4px">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:8px;padding-left:4px">$1</li>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.14);margin:40px 0" />')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul style="margin:16px 0 20px 20px;line-height:1.7;color:rgba(255,255,255,0.75)">${m}</ul>`);

  const lines = html.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const isBlock = t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<li") || t.startsWith("<hr") || t.startsWith("</");
    result.push(isBlock ? t : `<p style="font-size:16px;line-height:1.75;color:rgba(255,255,255,0.78);margin:0 0 18px">${t}</p>`);
  }
  return result.join("\n");
}

// Extract Q/A pairs from the post's "## Common questions" section so every
// post with an FAQ automatically ships FAQPage JSON-LD for answer engines.
// Questions are the ### headings; the answer is the text until the next
// heading (or the closing italic CTA line).
function extractFaq(md: string): { q: string; a: string }[] {
  const section = md.split(/^## Common questions$/m)[1];
  if (!section) return [];
  const pairs: { q: string; a: string }[] = [];
  const re = /^### (.+)$\n([\s\S]*?)(?=^### |^## |^\*Know your|\s*$(?![\s\S]))/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const q = m[1].trim();
    const a = m[2].replace(/\*\*/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim();
    if (q && a) pairs.push({ q, a });
  }
  return pairs;
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Person", name: "Heed at The Steady One" },
    publisher: { "@type": "Organization", name: "The Steady One", url: "https://thesteadyone.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://thesteadyone.com/blog/${post.slug}` },
    keywords: post.tags.join(", "),
  };

  const faq = extractFaq(post.content);
  const faqJsonLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <div style={{ minHeight: "100dvh", background: "#0A2540" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
          <Link href="/blog" style={{ display: "inline-block", marginBottom: 40, fontSize: 11, color: "rgba(255,255,255,.45)", textDecoration: "none", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>← All guides</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>{formatDate(post.date)}</span>
            <span style={{ color: "rgba(255,255,255,.2)" }}>·</span>
            <span style={{ fontSize: 11, color: "#00A651", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{post.author}</span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 400, color: "#fff", margin: "0 0 22px", lineHeight: 1.12 }}>{post.title}</h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 40 }}>
            {post.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", padding: "3px 10px", borderRadius: 20 }}>{tag}</span>
            ))}
          </div>
          <article dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
          <div style={{ marginTop: 64, padding: 32, background: "#071b30", border: "1px solid rgba(255,255,255,.14)", borderRadius: 18, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#00A651", letterSpacing: ".14em", textTransform: "uppercase", margin: "0 0 12px" }}>The Steady One</p>
            <p style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, color: "#fff", margin: "0 0 10px", lineHeight: 1.25 }}>Stop scrolling. Start deciding.</p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", margin: "0 0 24px", lineHeight: 1.6 }}>NYC apartments checked against your lines. No broker. No FOMO.</p>
            <Link href="/" style={{ display: "inline-block", background: "#00A651", color: "#fff", fontWeight: 700, fontSize: 14, padding: "13px 28px", borderRadius: 11, textDecoration: "none" }}>Try The Steady One →</Link>
          </div>
        </div>
      </div>
    </>
  );
}
