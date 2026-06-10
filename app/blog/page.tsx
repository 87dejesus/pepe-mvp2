"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PostMeta = {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
};

const SERIF = "var(--font-caslon), Georgia, serif";

export default function BlogPage() {
  const [posts, setPosts] = useState<PostMeta[]>([]);

  useEffect(() => {
    fetch("/api/blog/posts")
      .then((r) => r.json())
      .then(setPosts)
      .catch(() => {});
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0A2540" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 80px" }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 32, fontSize: 11, color: "rgba(255,255,255,.45)", textDecoration: "none", letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>
          ← The Steady One
        </Link>
        <h1 style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 400, color: "#fff", margin: "0 0 12px", lineHeight: 1.12 }}>
          NYC Rental Guides
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,.6)", margin: 0, lineHeight: 1.6 }}>
          Real talk about apartment hunting in New York City, from pressure to decision to lease.
        </p>

        <div style={{ marginTop: 14 }}>
          {posts.length === 0 && <p style={{ color: "rgba(255,255,255,.4)", fontSize: 15, marginTop: 24 }}>Loading posts…</p>}
          {posts.map((post, i) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
              <article style={{ padding: "28px 0", borderBottom: i < posts.length - 1 ? "1px solid rgba(255,255,255,.10)" : "none", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>{formatDate(post.date)}</span>
                  <span style={{ color: "rgba(255,255,255,.2)" }}>·</span>
                  <span style={{ fontSize: 11, color: "#00A651", fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase" }}>{post.author}</span>
                </div>
                <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, color: "#fff", margin: "0 0 9px", lineHeight: 1.2 }}>{post.title}</h2>
                <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.6)", margin: "0 0 13px", lineHeight: 1.6 }}>{post.description}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", padding: "3px 10px", borderRadius: 20 }}>{tag}</span>
                  ))}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
