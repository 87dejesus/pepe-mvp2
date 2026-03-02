export interface StoragePartner {
  id: string;
  name: string;
  tagline: string;
  description: string;
  cta: string;
  url: string;           // must be an exact https://<ALLOWED_HOSTS> URL
  badge: string;
  accentColor: string;   // used for badge background
  category: 'storage' | 'financial';
}

export const STORAGE_PARTNERS: StoragePartner[] = [
  {
    id: 'extraspace',
    name: 'Extra Space Storage',
    tagline: 'Units near you, move-in ready',
    description:
      'Climate-controlled units across all five boroughs. Reserve online in minutes — no truck needed to get started.',
    cta: 'Find a Unit Near You',
    url: 'https://extraspace.com',
    badge: 'STORAGE',
    accentColor: '#E84B2A',
    category: 'storage',
  },
  {
    id: 'clutter',
    name: 'Clutter',
    tagline: 'They pick it up. You relax.',
    description:
      'Valet storage built for NYC apartments. Schedule a pickup, they pack and store everything, deliver back when you need it.',
    cta: 'Get a Free Quote',
    url: 'https://clutter.com',
    badge: 'VALET',
    accentColor: '#6C5CE7',
    category: 'storage',
  },
  {
    id: 'rhino',
    name: 'Rhino',
    tagline: 'Skip the security deposit',
    description:
      "Replace your cash security deposit with affordable insurance. Keep thousands in your pocket for first month's rent.",
    cta: 'Save Your Deposit',
    url: 'https://rhino.com',
    badge: 'SAVE CASH',
    accentColor: '#00A651',
    category: 'financial',
  },
  {
    id: 'theguarantee',
    name: 'The Guarantee',
    tagline: 'No co-signer. No problem.',
    description:
      "Can't meet the 40x income rule? The Guarantee acts as your guarantor so you can sign a lease — trusted by 500+ NYC landlords.",
    cta: 'Check Eligibility',
    url: 'https://theguarantee.com',
    badge: 'GUARANTOR',
    accentColor: '#1E3A8A',
    category: 'financial',
  },
];
