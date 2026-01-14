import { Suspense } from "react";
import ExitClient from "./ExitClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <ExitClient />
    </Suspense>
  );
}
