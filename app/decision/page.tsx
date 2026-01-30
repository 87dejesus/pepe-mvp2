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
    <main className="min-h-screen bg-[#fdfcee] bg-[radial-gradient(#00000022_1px,transparent_1px)] bg-[length:20px_20px] flex flex-col items-center px-4 py-6">
      {/* Card do Apartamento - Estilo Neobrutalista */}
      <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {/* Container da Imagem com Preço Absoluto */}
        <div className="relative">
          {item?.images?.[0] ? (
            <img
              src={item.images[0]}
              alt={item?.neighborhood || 'Listing'}
              className="w-full h-72 object-cover border-b-4 border-black"
            />
          ) : (
            <div className="w-full h-72 bg-gray-200 flex items-center justify-center italic font-black text-gray-500 border-b-4 border-black">
              No Image
            </div>
          )}
          {/* Preço - Box Verde no Canto Superior Direito da Imagem */}
          <div className="absolute top-3 right-3 bg-[#00A651] border-4 border-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <span className="text-white font-black text-xl">${item?.price?.toLocaleString()}</span>
          </div>
        </div>

        {/* Info do Apartamento */}
        <div className="p-5 pb-28">
          {/* Bairro - Negrito, Itálico, Caixa Alta */}
          <h2 className="text-2xl font-black italic uppercase tracking-tight">
            {item?.neighborhood || 'NYC'}
          </h2>

          {/* Badges de Quartos e Banheiros */}
          <div className="flex gap-2 mt-3">
            <span className="bg-white border-2 border-black px-3 py-1 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {item?.bedrooms} Bed
            </span>
            <span className="bg-white border-2 border-black px-3 py-1 font-bold text-sm uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {item?.bathrooms} Bath
            </span>
          </div>

          {/* Descricao */}
          {item?.description && (
            <p className="mt-5 text-sm font-medium leading-relaxed border-t-4 border-black pt-4">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Botao NEXT LISTING - Verde Neobrutalista */}
      <div className="fixed bottom-6 w-full max-w-md px-4 z-[999]">
        <button
          onClick={handleNext}
          className="w-full bg-[#00A651] text-white text-xl font-black italic uppercase py-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
        >
          NEXT LISTING →
        </button>
      </div>
    </main>
  );
}
