'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DecisionPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase.from('listings').select('*').eq('status', 'Active');
      if (data) setListings(data);
      setLoading(false);
    }
    fetchListings();
  }, []);

  const handleNext = () => {
    if (currentIndex < listings.length - 1) setCurrentIndex(prev => prev + 1);
    else setCurrentIndex(0);
  };

  if (loading) return <div className="p-10 text-center font-bold">Pepe is fetching deals...</div>;

  const item = listings[currentIndex];

  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center">
      <div className="w-full max-w-md bg-white border-b-4 border-black shadow-lg">
        {item?.images?.[0] ? (
          <img src={item.images[0]} className="w-full h-80 object-cover border-b-4 border-black" />
        ) : (
          <div className="w-full h-80 bg-gray-200 flex items-center justify-center italic font-bold">No Image</div>
        )}
        <div className="p-6 pb-24">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">{item?.neighborhood || 'NYC'}</h2>
          <p className="font-black text-2xl text-[#00A651] mt-1">${item?.price}</p>
          <div className="flex gap-2 mt-2 font-bold text-sm uppercase">
             <span className="bg-gray-200 px-2 py-1 border border-black">{item?.bedrooms} Bed</span>
             <span className="bg-gray-200 px-2 py-1 border border-black">{item?.bathrooms} Bath</span>
          </div>
          <p className="mt-6 text-base font-bold leading-tight border-t-2 border-black pt-4">{item?.description}</p>
        </div>
      </div>

      <div className="fixed bottom-6 w-full max-w-md px-6 z-[999]">
        <button
          onClick={handleNext}
          className="w-full bg-black text-white text-2xl font-black py-5 rounded-2xl border-b-8 border-gray-800 shadow-2xl active:border-b-0 active:translate-y-2 transition-all"
        >
          NEXT LISTING →
        </button>
      </div>
    </main>
  );
}
