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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <div style={{ marginBottom: 48 }}>
        <Link href="/" style={{ display: "inline-block", marginBottom: 32, fontSize: 13, color: "#6b7280", textDecoration: "none", letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 500 }}>
          ← The Steady One
        </Link>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: "#0f1e2d", margin: "0 0 12px", lineHeight: 1.15 }}>
          NYC Rental Guides
        </h1>
        <p style={{ fontSize: 17, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
          Real talk about apartment hunting in New York City — from pressure to decision to lease.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {posts.length === 0 && <p style={{ color: "#9ca3af", fontSize: 15 }}>Loading posts…</p>}
        {posts.map((post, i) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
            <article style={{ padding: "32px 0", borderBottom: i < posts.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none", cursor: "pointer" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>{formatDate(post.date)}</span>
                <span style={{ color: "#e5e7eb" }}>·</span>
                <span style={{ fontSize: 12, color: "#d4a017", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>{post.author}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f1e2d", margin: "0 0 10px", lineHeight: 1.25 }}>{post.title}</h2>
              <p style={{ fontSize: 15, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.6 }}>{post.description}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {post.tags.slice(0, 3).map((tag) => (
                  <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", background: "rgba(0,0,0,0.04)", padding: "3px 10px", borderRadius: 20 }}>{tag}</span>
                ))}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
