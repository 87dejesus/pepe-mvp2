export const dynamic = "force-dynamic";

import { Suspense } from "react";
import DecisionClient from "./DecisionClient";

export default function DecisionPage() {
  return (
    <Suspense>
      <DecisionClient />
    </Suspense>
  );
}
