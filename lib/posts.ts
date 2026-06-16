import fs from "fs";
import path from "path";

export type PostMeta = {
  title: string;
  slug: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
};

export type Post = PostMeta & {
  content: string;
};

const POSTS_DIR = path.join(process.cwd(), "content/posts");

function parseFrontmatter(raw: string): { meta: PostMeta; content: string } {
  // Normalize CRLF to LF so the regex works regardless of how Git checked
  // the file out (Windows worktrees can produce CRLF).
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Invalid frontmatter");

  const frontmatter = match[1];
  const content = match[2].trim();

  const meta: Record<string, unknown> = {};
  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (value.startsWith("[")) {
      meta[key] = value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""));
    } else {
      meta[key] = value.replace(/^"|"$/g, "");
    }
  }

  return { meta: meta as PostMeta, content };
}

// Scheduling: a post is published once its `date` (YYYY-MM-DD) is today or
// earlier. Future-dated posts stay hidden until their day, which lets us queue
// posts ahead of time. Compared as ISO date strings to stay timezone-stable.
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isPublished(date: string): boolean {
  return date <= todayISO();
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
      const { meta } = parseFrontmatter(raw);
      return meta;
    })
    .filter((meta) => isPublished(meta.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const { meta, content } = parseFrontmatter(raw);
  if (!isPublished(meta.date)) return null;
  return { ...meta, content };
}

export function getAllSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), "utf-8");
      const { meta } = parseFrontmatter(raw);
      return { slug: f.replace(/\.md$/, ""), date: meta.date };
    })
    .filter((x) => isPublished(x.date))
    .map((x) => x.slug);
}
