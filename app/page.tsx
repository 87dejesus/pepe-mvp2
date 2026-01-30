import Link from 'next/link';

export default function Home() {
  return (
    <main className="h-screen flex flex-col justify-between bg-[#fdfcee] bg-[radial-gradient(#00000022_1px,transparent_1px)] bg-[length:20px_20px] text-black font-sans uppercase italic px-6 py-4 overflow-hidden">
      
      {/* 1. TOPO: LOGO */}
      <div className="flex justify-center shrink-0">
        <div className="w-16 bg-white border-4 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
           <img src="/brand/icon.png" alt="Logo" className="w-full h-auto" />
        </div>
      </div>

      {/* 2. BALÃO 1 */}
      <div className="relative bg-white border-[5px] border-black p-3 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md mx-auto z-10 shrink-0">
        <p className="font-black text-[12px] sm:text-sm leading-tight text-center">
          "NYC rentals don't give you time to think. Pepe helps you weigh trade-offs in seconds."
        </p>
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-b-[5px] border-r-[5px] border-black rotate-45"></div>
      </div>

      {/* 3. PEPE (TAMANHO AJUSTADO) */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-2">
        <img 
          src="/brand/pepe-ny.jpeg" 
          alt="Pepe" 
          className="max-h-[35vh] w-auto border-[6px] border-black rounded-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transform -rotate-1"
        />
      </div>

      {/* 4. BALÃO 2 */}
      <div className="relative bg-white border-[5px] border-black p-3 rounded-2xl shadow-[-6px_6px_0px_0px_rgba(0,0,0,1)] max-w-md mx-auto z-10 shrink-0">
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-t-[5px] border-l-[5px] border-black rotate-45"></div>
        <p className="font-black text-[12px] sm:text-sm leading-tight text-center">
          "Pepe aligns your non-negotiables with market reality. Move with clarity, not panic."
        </p>
      </div>

      {/* 5. BOTÃO FINAL */}
      <div className="pt-4 pb-2 shrink-0">
        <Link 
          href="/flow"
          className="block w-full max-w-md mx-auto bg-[#00A651] border-[5px] border-black text-white text-center font-black text-xl py-4 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          DECIDE NOW!
        </Link>
      </div>

    </main>
  );
}