'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Alex_Brush, Montserrat, Cormorant_Garamond } from 'next/font/google';

// --- FONTLAR ---
const signatureFont = Alex_Brush({ subsets: ['latin'], weight: '400', display: 'swap' });
const serifFont = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap' });
const sansFont = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600'], display: 'swap' });

// --- TİP TANIMLAMALARI ---
interface Invitation {
  id: number;
  groom_name: string;
  groom_surname: string;
  bride_name: string;
  bride_surname: string;
  wedding_date: string; // Tarih ve Saat bilgisini içerir
  event_type?: string;
  location?: string;
  description?: string | null;
  image_url: string; 
}

interface Moment {
  id: number;
  image_url: string | null;
  caption?: string | null;
  created_at?: string;
}

export default function InvitationDetail() {
  const params = useParams();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Müzik
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // RSVP Formu
  const [showRSVP, setShowRSVP] = useState(false);
  const [attendance, setAttendance] = useState<'coming' | 'not-coming' | null>(null);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  // Anı Defteri
  const [showMemories, setShowMemories] = useState(false);

  // Konuk Anı Albümü
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<{ id: string; src: string }[]>([]);
  const [momentMessage, setMomentMessage] = useState<string>("");
  const [uploadedMoments, setUploadedMoments] = useState<Moment[]>([]);
  
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

  const fetchMoments = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/invitations/${params.id}/moments`);
      if (res.ok) {
        const data = await res.json();
        const momentsData = data.data || data; 
        if (Array.isArray(momentsData)) setUploadedMoments(momentsData);
      }
    } catch (error) {
      console.error("Albüm hatası:", error);
    }
  };

  useEffect(() => { if (params.id) fetchMoments(); }, [params.id]);

  // --- MÜZİK ---
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

  // --- YARDIMCI FONKSİYONLAR ---
  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  const getDayName = (d: string) => new Date(d).toLocaleDateString('tr-TR', { weekday: 'long' });
  const getFormattedDate = (d: string) => new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Saat formatlama fonksiyonu
  const getFormattedTime = (d: string) => new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // --- ANI PAYLAŞIM ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) return showNotification('Boyut 5MB\'ı aşamaz!', 'error');
        if (!file.type.startsWith('image/')) return showNotification('Sadece resim dosyası!', 'error');
        const reader = new FileReader();
        reader.onload = (ev) => {
          setSelectedPhotos(prev => [...prev, { id: Date.now().toString() + Math.random(), src: ev.target?.result as string }]);
        };
        reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => setSelectedPhotos(prev => prev.filter(p => p.id !== id));

  const handleMomentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPhotos.length === 0 && !momentMessage.trim()) {
      showNotification('Lütfen bir fotoğraf seçin veya bir mesaj yazın.', 'error');
      return;
    }
    setIsUploadingAlbum(true);
    try {
      let payload;
      if (selectedPhotos.length > 0) {
        payload = {
          photos: selectedPhotos.map(photo => ({
            image_data: photo.src,
            caption: momentMessage 
          }))
        };
      } else {
         showNotification('Şimdilik en az 1 fotoğraf yüklemelisiniz.', 'error');
         setIsUploadingAlbum(false);
         return; 
      }

      const response = await fetch(`http://localhost:8000/api/invitations/${params.id}/moments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showNotification('Paylaşımınız gönderildi! ✨', 'success');
        fetchMoments();
        setTimeout(() => { setSelectedPhotos([]); setMomentMessage(""); }, 1000);
      } else {
        const err = await response.json();
        showNotification(err.message || 'Hata oluştu', 'error');
      }
    } catch { showNotification('Bağlantı hatası', 'error'); } 
    finally { setIsUploadingAlbum(false); }
  };

  // --- RSVP ---
  const handleRSVPSubmit = async () => {
    if (!attendance) return showNotification('Katılım durumu seçiniz', 'error');
    if (attendance === 'coming' && !guestCount) return showNotification('Kişi sayısı giriniz', 'error');
    try {
        const res = await fetch(`http://localhost:8000/api/invitations/${params.id}/rsvp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ attendance, guest_count: attendance === 'coming' ? guestCount : 0, message })
        });
        if (res.ok) {
            showNotification('Kaydedildi! Teşekkürler.', 'success');
            setTimeout(() => { setShowRSVP(false); setAttendance(null); setGuestCount(null); setMessage(''); }, 1500);
        } else { showNotification('Bir hata oluştu', 'error'); }
    } catch { showNotification('Bağlantı hatası', 'error'); }
  };

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400">Yükleniyor...</div>;
  if (!invitation) return null;

  return (
    <div className={`min-h-screen bg-white text-black relative selection:bg-black selection:text-white pb-20`}>
      {/* Bildirim */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium animate-slide-down ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>{notification.message}</div>
      )}
      <div className="fixed bottom-8 right-8 z-50"><audio ref={audioRef} src="/düğün-muziği.mp3" loop autoPlay muted /></div>

      <div className="max-w-4xl mx-auto px-6 pt-16 md:pt-24 flex flex-col items-center text-center">
        
        {/* İSİMLER */}
        <div className="mb-8 relative w-full">
           <div className="flex flex-col md:flex-row justify-center items-center gap-2 md:gap-8">
              <h1 className={`${signatureFont.className} text-7xl md:text-9xl leading-none transform -rotate-6 md:translate-y-4`}>{invitation.bride_name}</h1>
              <span className={`${signatureFont.className} text-5xl md:text-7xl text-gray-400 mt-4`}>&</span>
              <h1 className={`${signatureFont.className} text-7xl md:text-9xl leading-none transform rotate-3 md:-translate-y-2.5`}>{invitation.groom_name}</h1>
           </div>
        </div>

        {/* ORTA GÖRSEL (API'den Gelen) */}
        <div className="w-64 md:w-80 mx-auto my-6 animate-fade-in">
           {invitation.image_url ? (
             <Image 
               src={invitation.image_url} 
               alt="Davet Resmi" 
               width={320} 
               height={400} 
               className="w-full h-auto rounded-xl shadow-lg object-cover" 
               priority 
             />
           ) : (
             <Image src="/indir.jpg" alt="Yedek" width={320} height={240} className="w-full h-auto rounded-xl shadow-lg" />
           )}
        </div>

        {/* --- ETKİNLİK DETAYLARI (SAAT EKLENDİ) --- */}
        <div className="w-full text-center mb-16 animate-slide-up opacity-0" style={{ animationDelay: '0.5s' }}>
            {/* Başlık (Düğün/Nişan vs) */}
            <h3 className={`${sansFont.className} font-bold text-2xl uppercase tracking-[0.2em] mb-3`}>
              {invitation.event_type || "DÜĞÜN"}
            </h3>
            
            {/* Tarih */}
            <p className={`${sansFont.className} font-bold text-xl tracking-widest`}>
              {getFormattedDate(invitation.wedding_date)}
            </p>

            {/* YENİ EKLENEN SAAT ALANI */}
            <div className="flex justify-center items-center gap-2 mt-2 mb-1">
               <span className={`${sansFont.className} text-sm font-medium uppercase tracking-widest text-gray-500`}>Saat</span>
               <span className={`${sansFont.className} text-lg font-semibold tracking-wide text-gray-800`}>
                 {getFormattedTime(invitation.wedding_date)}
               </span>
            </div>

            {/* Gün İsmi (El Yazısı) */}
            <p className={`${signatureFont.className} text-5xl md:text-6xl my-4 transform -rotate-2`}>
              {getDayName(invitation.wedding_date)}
            </p>

            {/* Mekan */}
            <p className={`${serifFont.className} text-2xl md:text-3xl uppercase font-bold text-gray-900`}>
              {invitation.location || "MEKAN BİLGİSİ"}
            </p>
        </div>

        {/* BUTONLAR (Aynı) */}
        <div className="w-full max-w-md mx-auto space-y-4 pb-12">
           
           <button onClick={() => setShowRSVP(!showRSVP)} className={`w-full py-4 border border-black uppercase text-xs tracking-[0.2em] hover:bg-black hover:text-white transition-all duration-500 ${sansFont.className}`}>
             {showRSVP ? 'Formu Kapat' : 'Katılım Durumu Bildir'}
           </button>

           {showRSVP && (
             <div className="bg-gray-50 p-8 rounded-xl shadow animate-slide-up">
                <div className="flex justify-center gap-4 mb-6">
                   <button onClick={() => setAttendance('coming')} className={`flex-1 py-3 border text-xs uppercase rounded-lg transition-all ${attendance === 'coming' ? 'bg-pink-400 text-white' : 'bg-white'}`}>Geliyorum</button>
                   <button onClick={() => setAttendance('not-coming')} className={`flex-1 py-3 border text-xs uppercase rounded-lg transition-all ${attendance === 'not-coming' ? 'bg-gray-600 text-white' : 'bg-white'}`}>Gelemiyorum</button>
                </div>
                {attendance === 'coming' && <input type="number" min="1" value={guestCount ?? ''} onChange={e => setGuestCount(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg mb-4" placeholder="Kişi Sayısı" />}
                <textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-4" rows={2} placeholder="Mesajınız..." />
                <button type="button" onClick={handleRSVPSubmit} className="w-full bg-pink-400 text-white py-3 text-xs uppercase tracking-widest rounded-lg">Gönder</button>
             </div>
           )}

           <button 
             onClick={() => setShowMemories(!showMemories)}
             className={`w-full py-4 border border-pink-300 text-pink-500 uppercase text-xs tracking-[0.2em] hover:bg-pink-500 hover:text-white transition-all duration-500 ${sansFont.className}`}
           >
             {showMemories ? 'Anı Defterini Kapat' : 'Anı Defterini Aç'}
           </button>

           {showMemories && (
             <div className="bg-white border border-gray-100 rounded-xl p-6 mt-4 shadow-sm animate-slide-up">
               <div className="flex flex-col items-center mb-6">
                 <h2 className={`${serifFont.className} text-2xl italic text-gray-800`}>Anı Defteri</h2>
                 <p className="text-gray-400 text-xs mt-1">Fotoğraf veya güzel bir not bırakın</p>
               </div>

               <form onSubmit={handleMomentSubmit} className="space-y-4">
                 <div className="relative">
                   <textarea 
                     value={momentMessage}
                     onChange={(e) => setMomentMessage(e.target.value)}
                     className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-pink-300 resize-none outline-none placeholder:text-gray-400 min-h-[100px]"
                     placeholder="Çiftimize bir not bırakın..." 
                   />
                   <div className="absolute bottom-3 right-3 text-gray-400">✏️</div>
                 </div>

                 {selectedPhotos.length > 0 && (
                   <div className="flex gap-2 overflow-x-auto pb-2">
                     {selectedPhotos.map(photo => (
                       <div key={photo.id} className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden group">
                         <Image src={photo.src} alt="Seçilen" fill className="object-cover" />
                         <button type="button" onClick={() => removePhoto(photo.id)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">✕</button>
                       </div>
                     ))}
                   </div>
                 )}

                 <div className="flex items-center gap-3">
                   <label className="cursor-pointer flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full hover:bg-pink-50 hover:text-pink-500 transition text-gray-500">
                     <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                   </label>

                   <button 
                     type="submit" 
                     disabled={isUploadingAlbum}
                     className="flex-1 bg-pink-500 text-white py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-pink-600 transition disabled:opacity-50"
                   >
                     {isUploadingAlbum ? 'Paylaşılıyor...' : 'Paylaş'}
                   </button>
                 </div>
               </form>

               <div className="mt-12 space-y-8">
                 {uploadedMoments.map((moment) => (
                   <div key={moment.id} className="flex flex-col bg-white">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-xs">❤️</div>
                        <span className="text-xs text-gray-400">{moment.created_at || "Az önce"}</span>
                      </div>
                      {moment.image_url && (
                        <div className="relative w-full aspect-[4/5] rounded-xl overflow-hidden mb-4 shadow-sm">
                           <Image src={moment.image_url} alt="Anı" fill className="object-cover" />
                        </div>
                      )}
                      {moment.caption && (
                        <div className={`${moment.image_url ? 'px-1' : 'bg-gray-50 p-6 rounded-xl border border-gray-100 text-center'}`}>
                          <p className={`${moment.image_url ? 'text-sm text-gray-800' : 'text-lg font-serif italic text-gray-700'}`}>
                             {moment.image_url ? <span className="font-semibold mr-2">Bir Anı:</span> : <span className="text-4xl text-pink-200 block mb-2">“</span>}
                             {moment.caption}
                          </p>
                        </div>
                      )}
                      <div className="h-px bg-gray-100 mt-8 w-full"></div>
                   </div>
                 ))}
               </div>
             </div>
           )}

        </div>
      </div>
      <style jsx global>{`
        .animate-fade-in { animation: fadeIn 1.5s ease-out forwards; }
        .animate-slide-up { animation: slideUp 1s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.5s ease-out forwards; }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}