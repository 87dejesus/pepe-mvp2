import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NYC Rental Guides',
  description:
    'Real talk about apartment hunting in New York City: from pressure to decision to lease. No fluff, no urgency tactics.',
  alternates: { canonical: 'https://thesteadyone.com/blog' },
  openGraph: {
    title: 'NYC Rental Guides | The Steady One',
    description:
      'Real talk about apartment hunting in New York City: from pressure to decision to lease.',
    url: 'https://thesteadyone.com/blog',
    type: 'website',
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
