import { getPostBySlug, getAllSlugs } from "../../../lib/posts";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

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
    authors: [{ name: "Heed — The Steady One" }],
    openGraph: { title: post.title, description: post.description, type: "article", publishedTime: post.date, url: `https://thesteadyone.com/blog/${post.slug}`, siteName: "The Steady One" },
    twitter: { card: "summary_large_image", title: post.title, description: post.description },
    alternates: { canonical: `https://thesteadyone.com/blog/${post.slug}` },
  };
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^# (.+)$/gm, '<h1 style="font-size:32px;font-weight:800;color:#0f1e2d;margin:0 0 24px;line-height:1.15">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;color:#0f1e2d;margin:40px 0 14px;line-height:1.25">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:600;color:#0f1e2d;margin:28px 0 10px;line-height:1.3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;color:#0f1e2d">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#1a2b3c;text-decoration:underline;text-underline-offset:3px" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.+)$/gm, '<li style="margin-bottom:6px;padding-left:4px">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:8px;padding-left:4px">$1</li>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid rgba(0,0,0,0.1);margin:40px 0" />')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\n?)+/g, (m) => `<ul style="margin:16px 0 20px 20px;line-height:1.7;color:#374151">${m}</ul>`);

  const lines = html.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    const isBlock = t.startsWith("<h") || t.startsWith("<ul") || t.startsWith("<li") || t.startsWith("<hr") || t.startsWith("</");
    result.push(isBlock ? t : `<p style="font-size:16px;line-height:1.75;color:#374151;margin:0 0 18px">${t}</p>`);
  }
  return result.join("\n");
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
    author: { "@type": "Person", name: "Heed — The Steady One" },
    publisher: { "@type": "Organization", name: "The Steady One", url: "https://thesteadyone.com" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://thesteadyone.com/blog/${post.slug}` },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
        <Link href="/blog" style={{ display: "inline-block", marginBottom: 40, fontSize: 13, color: "#6b7280", textDecoration: "none", letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 500 }}>← All guides</Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>{formatDate(post.date)}</span>
          <span style={{ color: "#e5e7eb" }}>·</span>
          <span style={{ fontSize: 12, color: "#d4a017", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{post.author}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 40 }}>
          {post.tags.map((tag) => (
            <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", background: "rgba(0,0,0,0.04)", padding: "3px 10px", borderRadius: 20 }}>{tag}</span>
          ))}
        </div>
        <article dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />
        <div style={{ marginTop: 64, padding: 32, background: "#0f1e2d", borderRadius: 16, textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#d4a017", letterSpacing: ".1em", textTransform: "uppercase", margin: "0 0 12px" }}>The Steady One</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: "#f5f0e8", margin: "0 0 10px", lineHeight: 1.3 }}>Stop scrolling. Start deciding.</p>
          <p style={{ fontSize: 14, color: "rgba(245,240,232,0.6)", margin: "0 0 24px", lineHeight: 1.6 }}>Curated NYC apartments with real pressure context. No broker. No FOMO.</p>
          <a href="/" style={{ display: "inline-block", background: "#d4a017", color: "#0f1e2d", fontWeight: 700, fontSize: 14, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>Try The Steady One →</a>
        </div>
      </div>
    </>
  );
}
