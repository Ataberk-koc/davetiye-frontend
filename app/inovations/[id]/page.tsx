'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
// Fontlar: Görseldeki o ince el yazısını yakalamak için "Alex Brush" ve modern yazılar için "Montserrat"
import { Alex_Brush, Montserrat, Cormorant_Garamond } from 'next/font/google';

// --- FONTLAR ---
// İsimler için imza fontu (Görseldekine en yakını)
const signatureFont = Alex_Brush({ subsets: ['latin'], weight: '400', display: 'swap' });
// DÜĞÜN / KINA başlıkları için tırnaklı, ciddi font
const serifFont = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' });
// Adres ve detaylar için temiz font
const sansFont = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600'], display: 'swap' });

// --- TİP TANIMLAMALARI ---
interface Invitation {
  id: number;
  groom_name: string;
  groom_surname: string;
  bride_name: string;
  bride_surname: string;
  wedding_date: string;
  event_type?: string;
  location?: string;
  description?: string | null;
  image_url: string;
}

export default function InvitationDetail() {
  const params = useParams();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Müzik
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // RSVP Formu
  const [showRSVP, setShowRSVP] = useState(false); // Form başta gizli olsun, temiz görünsün
  const [attendance, setAttendance] = useState<'coming' | 'not-coming' | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  // Konuk Anı Albümü
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<{ id: string; src: string; caption: string }[]>([]);
  const [albumCaption, setAlbumCaption] = useState<string>("");
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isUploadingAlbum, setIsUploadingAlbum] = useState(false);

  // --- API ---
  useEffect(() => {
    fetch(`http://localhost:8000/api/invitations/${params.id}`)
      .then(r => r.json())
      .then(d => {
        const data = Array.isArray(d.data) ? d.data[0] : d.data;
        setInvitation(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  // --- MÜZİK OTOMATİK BAŞLATMA ---
  useEffect(() => {
    const playMusic = async () => {
      if (audioRef.current) {
        try {
          audioRef.current.muted = true;
          await audioRef.current.play();
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.muted = false;
              setIsPlaying(true);
            }
          }, 1000);
        } catch { console.log("Otomatik oynatma engellendi"); }
      }
    };
    playMusic();
  }, []);

  // Gün ismini bulma (Örn: Cumartesi)
  const getDayName = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { weekday: 'long' });
  };

  const getFormattedDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getFormattedTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // Konuk Anı Albümü - Bildirim gösterme
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Konuk Anı Albümü - Dosya seçme
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      const file = files[0];
      // Dosya boyutu kontrolü (5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Dosya boyutu 5MB\'yi aşamaz!', 'error');
        return;
      }
      // Resim formatı kontrolü
      if (!file.type.startsWith('image/')) {
        showNotification('Lütfen bir resim dosyası seçiniz!', 'error');
        return;
      }
      // Dosyayı base64 olarak oku
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAlbumPhotos(prev => [...prev, {
          id: Date.now().toString(),
          src: result,
          caption: albumCaption
        }]);
        showNotification('Resim başarıyla eklendi!', 'success');
        setAlbumCaption('');
        // Input'u sıfırla
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Konuk Anı Albümü - Gönder
  const handleAlbumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (albumPhotos.length === 0) {
      showNotification('Lütfen en az bir resim ekleyiniz!', 'error');
      return;
    }

    setIsUploadingAlbum(true);
    
    try {
      // API'ye gönder
      const response = await fetch(`http://localhost:8000/api/invitations/${params.id}/moments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photos: albumPhotos.map(photo => ({
            image_data: photo.src,
            caption: photo.caption
          }))
        })
      });

      if (response.ok) {
        showNotification('Fotoğraflar başarıyla paylaşıldı! 📸', 'success');
        // Başarıda fotoları temizleme
        setTimeout(() => {
          setAlbumPhotos([]);
          setAlbumCaption('');
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.message || errorData?.error || 'Bir hata oluştu. Lütfen tekrar deneyiniz.';
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Album gönderme hatası:', error);
      showNotification('Bağlantı hatası. Lütfen tekrar deneyiniz.', 'error');
    } finally {
      setIsUploadingAlbum(false);
    }
  };

  // Resim silme
  const removePhoto = (id: string) => {
    setAlbumPhotos(prev => prev.filter(photo => photo.id !== id));
    showNotification('Resim kaldırıldı', 'success');
  };

  // RSVP Formu Gönder
  const handleRSVPSubmit = async () => {
    if (!attendance) {
      showNotification('Lütfen katılım durumunuzu seçiniz!', 'error');
      return;
    }

    if (attendance === 'coming' && !guestCount) {
      showNotification('Lütfen kişi sayısını belirtiniz!', 'error');
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/invitations/${params.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendance,
          guest_count: attendance === 'coming' ? guestCount : 0,
          message
        })
      });

      if (response.ok) {
        showNotification(`Katılım durumunuz başarıyla kaydedildi! 🎉`, 'success');
        // Formu temizle
        setTimeout(() => {
          setShowRSVP(false);
          setAttendance(null);
          setGuestCount(null);
          setMessage('');
        }, 1500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.message || errorData?.error || 'Bir hata oluştu. Lütfen tekrar deneyiniz.';
        showNotification(errorMessage, 'error');
      }
    } catch (error) {
      console.error('RSVP gönderme hatası:', error);
      showNotification('Bağlantı hatası. Lütfen tekrar deneyiniz.', 'error');
    }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!invitation) return null;

  return (
    <div className={`min-h-screen bg-white text-black relative selection:bg-black selection:text-white pb-20`}>
      
      {/* Bildirim */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-down ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Müzik Butonu (Sağ Alt - Minimal) */}
      <div className="fixed bottom-8 right-8 z-50">
        <audio ref={audioRef} src="/düğün-muziği.mp3" loop autoPlay muted />
      </div>

      {/* --- ANA KAĞIT ALANI --- */}
      {/* Max-width ve padding ile kağıt sınırlarını belirliyoruz */}
      <div className="max-w-4xl mx-auto px-6 pt-16 md:pt-24 flex flex-col items-center text-center">
        
        {/* 1. İSİMLER (Görseldeki gibi devasa ve eğik) */}
        {/* İsimlerin hafif sola ve sağa yatık duruşu için transform kullanabiliriz ama font zaten eğik */}
        <div className="mb-8 relative w-full">
           <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-8">
              <h1 className={`${signatureFont.className} text-7xl md:text-9xl leading-none transform -rotate-6 md:translate-y-4`}>
                {invitation.bride_name}
              </h1>
              <span className={`${signatureFont.className} text-5xl md:text-7xl text-gray-400 mt-4`}>&</span>
              <h1 className={`${signatureFont.className} text-7xl md:text-9xl leading-none transform rotate-3 md:-translate-y-2.5`}>
                {invitation.groom_name}
              </h1>
           </div>
        </div>

        {/* 2. ORTA GÖRSEL (KALP) */}
        <div className="w-64 md:w-80 mx-auto my-6 animate-fade-in">
           <Image 
             src="/indir.jpg" 
             alt="Davet Resmi" 
             width={320}
             height={240}
             className="w-full h-auto rounded-xl shadow-lg"
             priority
           />
        </div>

        {/* 3. AİLE İSİMLERİ (Görseldeki gibi yanlarda) */}
        <div className="w-full flex justify-between px-4 md:px-20 mb-12 animate-fade-in opacity-0" style={{ animationDelay: '0.3s' }}>
           <div className="text-center">
              <p className={`${sansFont.className} text-xs font-bold uppercase tracking-widest mb-1`}>Gelin Ailesi</p>
              <p className={`${serifFont.className} text-lg`}>Ailesi</p>
           </div>
           <div className="text-center">
              <p className={`${sansFont.className} text-xs font-bold uppercase tracking-widest mb-1`}>Damat Ailesi</p>
              <p className={`${serifFont.className} text-lg`}>Ailesi</p>
           </div>
        </div>

        {/* 4. ETKİNLİK DETAYLARI (Görseldeki 2'li Kolon Yapısı) */}
        {/* Burayı senin görselindeki gibi "KINA-DÜĞÜN" ve "DÜĞÜN" olarak ayırıyorum. 
            Veri tek olduğu için tasarımı göstermek adına tek kolonu ortalıyorum 
            ama yapıyı 'grid' olarak kuruyorum. */}
        
        <div className="w-full grid md:grid-cols-2 gap-12 md:gap-24 mb-16 animate-slide-up opacity-0" style={{ animationDelay: '0.5s' }}>
           


           {/* SAĞ KOLON (ANA DÜĞÜN - ORTADA GÖZÜKSÜN DİYE md:col-span-2 yapabiliriz ama orijinali bozmuyorum) */}
           {/* Tek etkinlik olduğu için mobilde tam orta, masaüstünde sağda veya ortada duralım */}
           <div className="md:col-span-2 text-center">
              <h3 className={`${sansFont.className} font-bold text-2xl uppercase tracking-[0.2em] mb-3`}>
                {invitation.event_type || "DÜĞÜN"}
              </h3>
              
              <div className="flex justify-center items-center gap-2 mb-2">
                 <p className={`${sansFont.className} font-bold text-xl tracking-widest`}>
                    {getFormattedDate(invitation.wedding_date)}
                 </p>
              </div>

              <p className={`${sansFont.className} text-base mb-4 tracking-wide`}>
                Saat: {getFormattedTime(invitation.wedding_date)}
                {/* Eğer yemek saati vs varsa buraya eklenebilir */}
              </p>

              {/* El Yazısı Gün İsmi */}
              <p className={`${signatureFont.className} text-5xl md:text-6xl mb-6 mt-2 transform -rotate-2`}>
                {getDayName(invitation.wedding_date)}
              </p>

              {/* Mekan İsmi */}
              <p className={`${serifFont.className} text-2xl md:text-3xl uppercase font-bold text-gray-900 mb-2`}>
                {invitation.location || "MEKAN BİLGİSİ"}
              </p>

              {/* Adres */}
              <p className={`${sansFont.className} text-xs md:text-sm uppercase tracking-wide text-gray-600 max-w-sm mx-auto leading-relaxed`}>
                {invitation.description || "Adres detayları burada yer alacak. İstanbul / Türkiye"}
              </p>
           </div>
        </div>

        {/* 5. ALT NOT (Görseldeki en alt yazı) */}
        <div className="max-w-lg mx-auto border-t border-black/10 pt-8 mb-16 animate-fade-in opacity-0" style={{ animationDelay: '0.8s' }}>
           <p className={`${serifFont.className} text-sm italic text-gray-600`}>
             &quot;Bu mutlu günümüzde sizleri de aramızda görmekten onur duyarız.&quot;
           </p>
         
        </div>

        {/* 6. FONKSİYONEL BUTONLAR (Görseli bozmamak için en alta, temiz butonlar) */}
        <div className="w-full max-w-md mx-auto space-y-4 pb-12">
           {/* LCV Butonu */}
           <button 
             onClick={() => setShowRSVP(!showRSVP)}
             className={`w-full py-4 border border-black uppercase text-xs tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-500 ${sansFont.className}`}
           >
             {showRSVP ? 'Formu Kapat' : 'Katılım Durumu Bildir'}
           </button>

           {/* LCV Formu Açılırsa */}
           {showRSVP && (
             <div className="bg-gray-50 p-8 rounded-xl shadow animate-slide-up">
                <div className="flex justify-center gap-4 mb-6">
                   <button 
                     onClick={() => setAttendance('coming')}
                     className={`flex-1 py-3 border border-gray-300 text-xs uppercase rounded-lg transition-all duration-300 shadow-sm ${attendance === 'coming' ? 'bg-linear-to-r from-pink-400 to-yellow-300 text-white border-none scale-105' : 'bg-white'}`}
                   >
                     Geliyorum
                   </button>
                   <button 
                     onClick={() => setAttendance('not-coming')}
                     className={`flex-1 py-3 border border-gray-300 text-xs uppercase rounded-lg transition-all duration-300 shadow-sm ${attendance === 'not-coming' ? 'bg-linear-to-r from-gray-400 to-gray-700 text-white border-none scale-105' : 'bg-white'}`}
                   >
                     Gelemiyorum
                   </button>
                </div>
                {attendance === 'coming' && (
                  <div className="mb-4">
                    <label className="block text-sm mb-2">Kaç kişi geleceksiniz?</label>
                    <input type="number" min="1" max="20" value={guestCount ?? ''} onChange={e => setGuestCount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300" placeholder="Kişi sayısı" />
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm mb-2">Mesajınız (isteğe bağlı)</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-300" rows={2} placeholder="Dilek, not veya özel mesajınız..." />
                </div>
                <button 
                  type="button"
                  onClick={handleRSVPSubmit}
                  className="w-full bg-linear-to-r from-pink-400 to-yellow-300 text-white py-3 text-xs uppercase tracking-widest rounded-lg shadow hover:scale-105 transition-transform"
                >
                  Gönder
                </button>
             </div>
           )}

           {/* Anı Albümü Butonu */}
           <div className="w-full bg-white/80 border border-gray-200 rounded-xl p-6 mt-8">
             <div className="flex flex-col items-center mb-4">
               <span className="inline-block mb-2">
                 <svg width="64" height="64" fill="none" viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="32" rx="6" stroke="#222" strokeWidth="2" fill="#fff"/><path d="M16 40l8-8 8 8 8-8 8 8" stroke="#222" strokeWidth="2" fill="none"/><circle cx="24" cy="28" r="4" fill="#FFD6E0" stroke="#222" strokeWidth="2"/></svg>
               </span>
               <h2 className="text-xl font-semibold text-gray-700 mb-2">KONUK ANI ALBÜMÜ</h2>
               <p className="text-gray-500 text-sm mb-4">(Çektiğiniz selfie ve fotoğrafları burada paylaşabilirsiniz)</p>
             </div>

             {/* Resim Yükleme Formu */}
             <form onSubmit={handleAlbumSubmit} className="space-y-4">
               <label htmlFor="file-upload" className="w-full cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-gray-300 bg-white/60 rounded-lg py-8 px-4 transition hover:border-pink-300">
                 <span className="bg-pink-100 text-pink-600 rounded-full p-3 mb-2">
                   <svg width="32" height="32" fill="none" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#FFD6E0"/><path d="M16 10v8m0 0l-4-4m4 4l4-4" stroke="#E91E63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                 </span>
                 <span className="text-gray-600 text-sm">Resim yüklemek için tıklayın veya sürükleyin</span>
                 <input 
                   ref={fileInputRef}
                   id="file-upload" 
                   type="file" 
                   accept="image/*" 
                   onChange={handleFileSelect}
                   className="hidden" 
                 />
               </label>

               {/* Metin Alanı */}
               <textarea 
                 className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-100 mb-4" 
                 rows={3} 
                 placeholder="Anınızı veya mesajınızı yazın..." 
                 value={albumCaption}
                 onChange={(e) => setAlbumCaption(e.target.value)}
               />

               {/* Gönder Butonu */}
               <button 
                 type="submit"
                 disabled={isUploadingAlbum || albumPhotos.length === 0}
                 className={`w-full py-2 rounded-lg shadow transition text-white font-medium ${
                   isUploadingAlbum || albumPhotos.length === 0
                     ? 'bg-gray-400 cursor-not-allowed'
                     : 'bg-pink-500 hover:bg-pink-600'
                 }`}
               >
                 {isUploadingAlbum ? 'Gönderiliyor...' : `Gönder (${albumPhotos.length})`}
               </button>
             </form>

             {/* Önizleme - Eklenen Fotoğraflar */}
             {albumPhotos.length > 0 && (
               <div className="mt-8 border-t border-gray-200 pt-6">
                 <h3 className="text-lg font-semibold text-gray-700 mb-4">Eklenen Fotoğraflar ({albumPhotos.length})</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {albumPhotos.map((photo) => (
                     <div key={photo.id} className="relative group">
                       <div className="relative bg-gray-100 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition aspect-square">
                         <Image
                           src={photo.src}
                           alt="Fotoğraf"
                           fill
                           className="object-cover w-full h-full"
                         />
                       </div>
                       {photo.caption && (
                         <p className="text-xs text-gray-600 mt-1 truncate">{photo.caption}</p>
                       )}
                       {/* Silme Butonu */}
                       <button
                         type="button"
                         onClick={() => removePhoto(photo.id)}
                         className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition shadow-lg hover:bg-red-600"
                       >
                         <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                           <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5z"/>
                           <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 1a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-11z"/>
                         </svg>
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             )}
           </div>
        </div>

      </div>

      <style jsx global>{`
        .animate-spin-slow { animation: spin 8s linear infinite; }
        .animate-fade-in { animation: fadeIn 1.5s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}