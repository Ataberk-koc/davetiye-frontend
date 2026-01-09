'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
// Fontlar: Görseldeki yazı tipine en yakın olanlar (Sacramento veya Pinyon Script)
import { Sacramento, Montserrat } from 'next/font/google';

// 1. İsimler için o "imza" havasını veren font
const handwriting = Sacramento({ 
  subsets: ['latin'], 
  weight: '400',
  display: 'swap',
});

// 2. Buton ve küçük yazılar için temiz font
const sansFont = Montserrat({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500'],
  display: 'swap',
});

interface Invitation {
  id: number;
  groom_name: string;
  groom_surname: string;
  bride_name: string;
  bride_surname: string;
  wedding_date: string;
  image_url: string;
}

export default function Home() {
  // --- API MANTIĞI (AYNEN KORUNDU) ---
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/invitations')
      .then(r => {
        if (!r.ok) throw new Error(`API Error: ${r.status}`);
        return r.json();
      })
      .then(d => {
        const invitationsData = Array.isArray(d.data) ? d.data : [d.data];
        setInvitations(invitationsData);
      })
      .catch(err => {
        console.error('Failed to fetch:', err);
        setError(err.message);
        setInvitations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white text-gray-400">Yükleniyor...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-white text-red-400">Hata: {error}</div>;
  // --- MANTIK BİTİŞ ---

  return (
    <div className={`min-h-screen bg-[#fafafa] text-[#1a1a1a] selection:bg-black selection:text-white flex flex-col items-center justify-center relative overflow-hidden`}>
      
      {/* İsteğe bağlı: Çok hafif kağıt dokusu */}
      <div className="absolute inset-0 opacity-[0.4] pointer-events-none mix-blend-multiply" 
           style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}>
      </div>

      {invitations.map((inv) => (
        <div key={inv.id} className="relative z-10 flex flex-col items-center p-6 w-full max-w-md animate-fade-in">
          
          {/* 1. GÖRSEL: API'den Gelen Resim */}
          <div className="w-full max-w-[320px] mb-8">
            <Image 
              src={inv.image_url || "/indir.jpg"} // BURASI DEĞİŞTİ: API'den gelen resim (yoksa yedek)
              alt="Davet Resmi"
              width={320}
              height={240}
              className="w-full h-auto object-contain rounded-xl shadow-lg"
            />
          </div>

          {/* 2. İSİMLER */}
          <div className="text-center mb-10">
            <h1 className={`${handwriting.className} text-6xl text-[#222] leading-none`}>
              {inv.groom_name} <span className="text-4xl align-middle font-light">&</span> {inv.bride_name}
            </h1>
          </div>

          {/* 3. BUTON (Tam Görseldeki Gibi) */}
          <div className="relative group">
            <Link href={`/inovations/${inv.id}`}>
              <button className="flex items-center gap-3 px-8 py-3 bg-transparent border-[1.5px] border-black rounded-full hover:bg-black hover:text-white transition-all duration-300">
                {/* Zarf İkonu */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                
                <span className={`${sansFont.className} text-sm font-medium tracking-widest uppercase`}>
                  Davetiyeyi Aç
                </span>
              </button>
            </Link>

            {/* El İmleci (Görseldeki gibi sağ altta) */}
            <div className="absolute -bottom-5 -right-5 pointer-events-none animate-bounce-gentle">
              <Image 
                src="/indir.jpg" // İkon olduğu için burayı ellemedim, API'den gelen ikon varsa burayı da inv.icon_url yapabiliriz.
                alt="Click"
                width={32}
                height={32}
                className="w-8 h-8 rotate-[-15deg] opacity-90 drop-shadow-md grayscale rounded-full"
              />
            </div>
          </div>

          {/* Alt Yardımcı Yazı */}
          <p className={`${sansFont.className} mt-6 text-gray-400 text-[10px] tracking-[0.2em] uppercase`}>
            Butona Tıklayınız
          </p>

        </div>
      ))}

      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 1.2s ease-out forwards; opacity: 0; transform: translateY(20px); }
        .animate-bounce-gentle { animation: bounce 2s infinite; }
        @keyframes fadeIn { to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}