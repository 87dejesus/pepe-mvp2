import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Match Quiz',
  description:
    'Answer 7 questions about borough, budget, bedrooms, pets, and timing. We match you with NYC listings that actually fit.',
  alternates: { canonical: 'https://thesteadyone.com/flow' },
  openGraph: {
    title: 'Match Quiz | The Steady One',
    description:
      'Answer 7 questions and get NYC apartment listings matched to your real criteria.',
    url: 'https://thesteadyone.com/flow',
    type: 'website',
  },
};

export default function FlowLayout({ children }: { children: React.ReactNode }) {
  return children;
}
