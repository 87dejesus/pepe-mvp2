export interface LowCreditPartner {
  id: string;
  name: string;
  benefit: string;       // short one-liner shown under the name
  description: string;
  url: string;           // must match an ALLOWED_HOSTS entry exactly
  badge: string;
  accentColor: string;
}

export const LOW_CREDIT_PARTNERS: LowCreditPartner[] = [
  {
    id: 'theguarantee',
    name: 'The Guarantee',
    benefit: 'Lease guarantor for NYC renters',
    description:
      "Don't meet the 40x income rule or have weak credit? The Guarantee vouches for you so landlords say yes. Trusted by hundreds of NYC property managers.",
    url: 'https://theguarantee.com',
    badge: 'GUARANTOR',
    accentColor: '#1E3A8A',
  },
  {
    id: 'theguarantors',
    name: 'The Guarantors',
    benefit: 'International & low-income applicants welcome',
    description:
      'No US credit history? Self-employed? New to the country? The Guarantors covers you so you can rent without a US co-signer or proof of 40x income.',
    url: 'https://theguarantors.com',
    badge: 'NO CO-SIGNER',
    accentColor: '#7C3AED',
  },
  {
    id: 'rhino',
    name: 'Rhino',
    benefit: 'Replace your security deposit with insurance',
    description:
      "Low credit blocking your move? Swap the lump-sum deposit for a small monthly insurance premium — landlords accept it and you keep your cash.",
    url: 'https://rhino.com',
    badge: 'SAVE CASH',
    accentColor: '#00A651',
  },
  {
    id: 'leaselock',
    name: 'LeaseLock',
    benefit: 'Zero deposit. Instant approval.',
    description:
      "LeaseLock eliminates the security deposit entirely. Renters pay nothing upfront beyond first month's rent — and landlords are still protected.",
    url: 'https://leaselock.com',
    badge: 'ZERO DEPOSIT',
    accentColor: '#DC2626',
  },
];
