'use strict';
// ─── Hikâye sistemi: "MEGA KAMPANYA HİÇ BİTMEZ" ──────────────
// Sonsuz modun iç hikâyesi: depo, hiç bitmeyen bir kampanya döngüsüne
// sıkışmıştır — müşteriler bu yüzden hiç bitmez. Kayıp günlük sayfaları
// (kaset) toplanır, Albüm'de okunur. Kalıcılık: localStorage 'rs_story'.

const STORY_PAGES = [
  { id: 'p01', title: 'GÜNLÜK 1: İLK GÜN',        txt: 'Yeni depo müdürü olarak ilk günüm. Her şey normal görünüyor. Raflar dolu, kahve makinesi bozuk. Klasik.' },
  { id: 'p02', title: 'GÜNLÜK 2: KAMPANYA',       txt: 'Yönetim "MEGA KAMPANYA" başlattı. Her şey yüzde 99 indirimli. Pazarlama dahiyane olduğunu söylüyor. Ben emin değilim.' },
  { id: 'p03', title: 'GÜNLÜK 3: KALABALIK',      txt: 'Müşteriler gelmeye başladı. Çok geldiler. ÇOK. Kapıları kapattık, camdan girdiler. Güvenlik istifa etti.' },
  { id: 'p04', title: 'GÜNLÜK 4: TUHAFLIK',       txt: 'Kampanyanın bitiş tarihini sisteme girmeye çalıştık. Sistem tarihi reddediyor. BT "tarih alanı bozulmuş" diyor. Nasıl yani?' },
  { id: 'p05', title: 'GÜNLÜK 5: DÖNGÜ',          txt: 'Bugün salıydı. Dün de salıydı. Yarın da salı olacakmış gibi bir his var. Vardiya çizelgesi hep aynı sayfada açılıyor.' },
  { id: 'p06', title: 'GÜNLÜK 6: MESAİ',          txt: 'Paydos zilini çaldık. Kimse gitmedi. Zil tekrar çaldı. "FAZLA MESAİ BAŞLADI" diye anons geçti. Ben anons yapmadım.' },
  { id: 'p07', title: 'GÜNLÜK 7: TOPTANCI',       txt: 'Bir adam geldi, her şeyi "toptan" almak istiyor. Reyonları, rafları, personeli. Gülümsemesi hiç düşmüyor. Ondan korkuyoruz.' },
  { id: 'p08', title: 'GÜNLÜK 8: KARABORSA',      txt: 'İndirimli ürünleri kapıp dışarıda üç katına satan biri türedi. Depoda kendi fiyat etiketleri var. Etiket makinesi de onda.' },
  { id: 'p09', title: 'GÜNLÜK 9: MÜDÜR',          txt: 'Bölge müdürü teftişe geldi. KPI tablosuna baktı, tablo alev aldı. "Performans" dedi sadece. Sonra bir daha gitmedi.' },
  { id: 'p10', title: 'GÜNLÜK 10: RAKİP',         txt: 'Rakip site CEO\'su depomuzu satın almaya çalışıyor. Teklifi: 49 lira. Kampanyadan etkilenmiş olmalı.' },
  { id: 'p11', title: 'GÜNLÜK 11: PATRON',        txt: 'Büyük Patron\'u gören yok ama herkes ondan bahsediyor. Kapısında "TOPLANTIDA" yazıyor. Üç aydır.' },
  { id: 'p12', title: 'GÜNLÜK 12: ROBOT',         txt: 'Temizlik robotu tuhaf davranıyor. Aynı köşeyi 400 kez sildi. Belki o da döngüde. Belki hepimiz oyuz.' },
  { id: 'p13', title: 'GÜNLÜK 13: SORU',          txt: 'Bir stajyer "kampanya ne zaman bitecek?" diye sordu. Hoparlörler bir saat boyunca güldü. Stajyer artık soru sormuyor.' },
  { id: 'p14', title: 'GÜNLÜK 14: KOLİLER',       txt: 'Koliler kendi kendine dolmaya başladı. İçlerinden bazen para, bazen kahve, bir keresinde canlı bir drone çıktı. Kimse şaşırmıyor artık.' },
  { id: 'p15', title: 'GÜNLÜK 15: EKİP',          txt: 'Altı kişi kaldık: güreşçi, şoför, şarkıcı, soru makinesi, muhasebeci, depocu. Tuhaf bir ekip. Ama depo onların sayesinde ayakta.' },
  { id: 'p16', title: 'GÜNLÜK 16: SAYAÇ',         txt: 'Sistemde bir sayaç buldum: "KAMPANYA GÜNÜ: 4749". Dört bin yedi yüz kırk dokuz. Salı günü sayısı da aynı.' },
  { id: 'p17', title: 'GÜNLÜK 17: ÇIKIŞ',         txt: 'Eski bir teknisyen "acil çıkış" kapısından bahsetti. Ofis bölgesinde, kasaların arkasındaymış. Ertesi gün teknisyen yoktu. Kasa vardı.' },
  { id: 'p18', title: 'GÜNLÜK 18: İZLENİYORUZ',   txt: 'Depo bizi izliyor. Nasıl dövüştüğümüzü öğreniyor. Yakın dövüşenlere kaçan, uzaktan vurana forklift yollayan "uzmanlar" gönderiyor.' },
  { id: 'p19', title: 'GÜNLÜK 19: TEORİ',         txt: 'Teorim şu: kampanya bitmiyor çünkü İNDİRİM SONSUZ DÖNGÜYE GİRDİ. Yüzde 99 indirimin üstüne yüzde 99 daha... Matematik bozuldu.' },
  { id: 'p20', title: 'GÜNLÜK 20: UMUT',          txt: 'Yine de her sabah (salı) kalkıyoruz, önlüğü giyiyoruz, müşterileri karşılıyoruz. Çünkü biz Robotsepeti ekibiyiz. Dayanmak bizim işimiz.' },
  { id: 'p21', title: 'GÜNLÜK 21: SKOR',          txt: 'Duvara bir tablo astık: kim ne kadar dayandı. Artık tek ölçü bu. Kazanmak yok, sadece daha uzun dayanmak var. Ve bu yeterli.' },
  { id: 'p22', title: 'GÜNLÜK 22: SES',           txt: 'Gece (yani koyu salı) hoparlörden bir ses geldi: "Kampanyamıza gösterdiğiniz ilgiye teşekkürler." Kimse konuşmamıştı. Kimse.' },
  { id: 'p23', title: 'GÜNLÜK 23: SON NOT',       txt: 'Bu benim son notum. Yerime gelecek kişiye: kahve makinesi hala bozuk. Müşteriler hiç bitmez. Ekibe güven. Ve sakın... kampanyayı iptal etmeye çalışma.' },
  { id: 'p24', title: 'GÜNLÜK 24: ???',           txt: 'Sayfanın çoğu okunmuyor. Sadece şu seçiliyor: "...çıkışı buldum. Ama dışarısı da depoymuş. Hep depoymuş. HEPSİ DEPO..."' }
];

// Karakter replikleri: koşu içinde konuşma balonu (Game.speech)
const CHAR_LINES = {
  ahmet: {
    start: ['Minder yok ama müşteri çok. Olsun.', 'Bugün de sırtı yere gelmeyen benim.', 'BT uzmanıyım ama önce şunları bir sıfırlayayım.'],
    mid: ['Bunlar bitmiyor... İYİ. Isınıyordum zaten.', 'Fazla mesai mi? Fazla ANTRENMAN.'],
    low: ['Sayılıyor mu bu? Sayılmaz. Devam.', 'Daha yeni başlıyorum...'],
    death: 'Minder... sonunda... yumuşakmış...'
  },
  ali: {
    start: ['Depara girdim, el freni bende.', 'Bu vardiyayı da tek seferde teslim ederim.', 'Müşteri mi? Trafik gibi, arasından süzülürsün.'],
    mid: ['Vites yükseltiyorum, sıkı durun.', 'Teslimat rotası: HER YER.'],
    low: ['Lastik bitti... yedek var mı?', 'Motor ısındı, biraz yavaşlayalım...'],
    death: 'Kontak... kapandı...'
  },
  bekir: {
    start: ['Bu depo benim sahnem.', 'Ses check: BİR, İKİ... MÜŞTERİ.', 'Bugünkü konser kapalı gişe.'],
    mid: ['Nakarat geliyor, herkes sussun!', 'Bu tempo... tam benlik.'],
    low: ['Ses telleri... zorlanıyor...', 'Son şarkı olmasın bu...'],
    death: 'Mikrofon... düştü...'
  },
  can: {
    start: ['Sorularım var. ÇOK sorularım var.', 'Bu kampanya bilimsel olarak imkansız. Kanıtlayacağım.', 'Neden? Nasıl? Kim? NİYE?'],
    mid: ['Cevap alamıyorum ama sormaya devam!', 'İlginç... müşteri yoğunluğu artıyor. NEDEN?'],
    low: ['Son sorum... bu muydu?', 'Cevabı bilen var mı...'],
    death: 'En büyük soru... cevapsız... kaldı...'
  },
  erkan: {
    start: ['Hesap her zaman tutar. Bugün de tutacak.', 'Gider: sıfır. Gelir: göreceğiz.', 'KDV dahil herkesi devireceğim.'],
    mid: ['Bilanço lehimize dönüyor.', 'Bu çeyrek rekor kırıyoruz.'],
    low: ['Zarar... yazıyorum...', 'Kasada açık var...'],
    death: 'Son bakiye... eksi...'
  },
  berker: {
    start: ['Depo benim evim. Kimse evimi dağıtamaz.', 'Koliler hazır, bant çalışıyor. Gel bakalım.', 'Paketleme rekoru bugün kırılır.'],
    mid: ['Sevkiyat tam gaz devam!', 'Raflar sağlam, ben sağlamım.'],
    low: ['Palet... ağır geldi...', 'Biraz nefes... sonra devam...'],
    death: 'Son koli... teslim... edildi...'
  }
};

// Depo hoparlör anonsları (75-100 sn'de bir; birkaçı hikâye kırıntısı)
const ANNOUNCEMENTS = [
  'DİKKAT: 7. reyonda ıslak zemin. Yine.',
  'Kayıp çocuk anonsu: kendini kaybeden müşteri danışmaya.',
  'MEGA KAMPANYA devam ediyor. Hep edecek.',
  'Kahve makinesi bozuktur. 4749 gündür.',
  'Bugün salı. Yarın da salı. Planlarınızı ona göre yapın.',
  'Otoparkta ışıkları açık unutulan forklift... kendi kendine gitmiş.',
  'Personel yemekhanesinde bugün: dün. Dünkü menü: yarın.',
  'Depo müdürünü gören olursa... kimse sormuyor zaten.',
  'İade kabul saatlerimiz: hiçbir zaman.',
  'Temizlik robotuna sarılmayınız. Utanıyor.',
  'Kampanyamıza gösterdiğiniz ilgiye teşekkürler. TEŞEKKÜRLER.',
  'Yıldızlı yorum bırakan müşterilere kapıda sürpriz.',
  'Mesai bitiminde zil çalmayacaktır. Zil de yoruldu.',
  'Çıkış kapısı arayanlar: ofis bölgesine bakmayın. BAKMAYIN.',
  'Bugünün çalışanı: hala ayakta kalan herkes.',
  'Sayın müşteriler, lütfen personeli ısırmayınız.'
];

const Story = {
  found: {},       // pageId -> 1
  anonsIdx: -1,

  load() {
    try { this.found = JSON.parse(localStorage.getItem('rs_story') || '{}').found || {}; }
    catch (e) { this.found = {}; }
  },

  save() {
    try { localStorage.setItem('rs_story', JSON.stringify({ found: this.found })); } catch (e) {}
  },

  countFound() {
    let n = 0;
    for (const p of STORY_PAGES) if (this.found[p.id]) n++;
    return n;
  },

  // kaset toplanınca: sıradaki kilitli sayfayı aç (hikâye sıralı ilerler)
  unlockNextPage() {
    for (const p of STORY_PAGES) {
      if (!this.found[p.id]) {
        this.found[p.id] = 1;
        this.save();
        // altın toast kuyruğunu (başarım kalıbı) yeniden kullan
        Game.achQueue.push({ name: 'GÜNLÜK SAYFASI BULUNDU', desc: p.title + ' — ALBÜM > GÜNLÜKLER' });
        return p;
      }
    }
    return null;   // hepsi bulundu
  },

  allFound() { return this.countFound() >= STORY_PAGES.length; },

  // ── karakter konuşma balonu ──
  say(txt) {
    if (!txt) return;
    Game.speech = { txt, t: 0 };
  },

  sayFrom(kind) {
    const L = CHAR_LINES[Game.player.charId];
    if (!L) return;
    const v = L[kind];
    this.say(Array.isArray(v) ? pick(v) : v);
  },

  deathLine(charId) {
    const L = CHAR_LINES[charId];
    return L ? L.death : '';
  },

  nextAnnouncement() {
    // sırayla ama başlangıcı rastgele: her koşuda farklı akış
    if (this.anonsIdx < 0) this.anonsIdx = (Math.random() * ANNOUNCEMENTS.length) | 0;
    const a = ANNOUNCEMENTS[this.anonsIdx % ANNOUNCEMENTS.length];
    this.anonsIdx++;
    return a;
  }
};
