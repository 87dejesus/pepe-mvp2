import { NextResponse } from "next/server";
import { getAllPosts } from "../../../../lib/posts";

// Stay dynamic so the publish-date gate is evaluated per request. Otherwise the
// post list could be cached at build time and scheduled posts would not appear
// on their date without a redeploy.
export const dynamic = "force-dynamic";

export async function GET() {
  const posts = getAllPosts();
  return NextResponse.json(posts);
}
