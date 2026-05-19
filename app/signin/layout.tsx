import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to The Steady One.',
  alternates: { canonical: 'https://thesteadyone.com/signin' },
  robots: { index: false, follow: true },
};

export default function SigninLayout({ children }: { children: React.ReactNode }) {
  return children;
}
