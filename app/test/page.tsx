import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Test',
  robots: { index: false, follow: false },
};

export default function TestPage() {
  return <div>Hello</div>;
}
