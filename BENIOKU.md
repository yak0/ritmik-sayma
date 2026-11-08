# 🎈 Ritmik Sayma Macerası

2'şer, 3'er, 4'er … 9'ar ritmik saymayı **100'e kadar** oyunlarla **öğreten ve tekrar ettiren** tablet oyunu.
Müzikler, sesler ve Türkçe sesli okuma oyunun içinde üretilir; internetten dosya indirmez.

---

## 📲 iPad'e kalıcı kurulum (önerilen, Mac gerekmez)

Oyun internette yayında: **https://yak0.github.io/ritmik-sayma/**

1. iPad'de **Safari** ile yukarıdaki adresi açın.
2. Paylaş ⬆️ → **Ana Ekrana Ekle** → **Ekle**.
3. Ana ekrandaki **Ritmik Sayma** simgesine dokunup oyunu **bir kez internete bağlıyken** açın
   (birkaç saniye bekleyin; oyun tüm dosyalarını iPad'e kaydeder).
4. Bundan sonra oyun **internetsiz ve Mac olmadan** da açılır, tam ekran çalışır.

- Yıldızlar ve ilerleme iPad'de saklanır; ana ekran uygulamaları Safari'nin veri silme kuralından muaftır.
- Oyun güncellenirse, iPad internete bağlıyken açıldığında yeni sürümü arka planda indirir
  ve bir sonraki açılışta gösterir.
- Not: Safari'de oynanan ilerleme ile ana ekran simgesindeki ilerleme ayrı tutulur; oyunu hep simgeden açın.

---

## 🚀 Ev ağından açma (Mac sunucusu ile, alternatif)

1. **Mac'te** bu klasördeki **`Baslat.command`** dosyasına çift tıklayın.
   - Bir Terminal penceresi açılır ve tabletinize yazacağınız adresi gösterir.
   - Tarayıcıda QR kodlu bir **bağlantı sayfası** da açılır.
   - Mac “Python gelen bağlantıları kabul etsin mi?” diye sorarsa **İzin Ver** deyin.
2. **Tablet** Mac ile **aynı Wi-Fi ağında** olsun. Tabletin kamerasıyla QR kodu okutun
   ya da tarayıcıya Terminal'de yazan adresi yazın, örneğin: `http://192.168.1.25:8000`
3. Açılan ekranda **“Başlamak için dokun”** deyin. Oyun tam ekrana geçer.

### 📲 Uygulama gibi açmak için (önerilir)
- **iPad (Safari):** Paylaş ⬆️ → **Ana Ekrana Ekle**. Artık ana ekrandaki simgeden açılır ve
  tarayıcı çubukları olmadan tam ekran çalışır.
- **Android (Chrome):** ⋮ menü → **Ana ekrana ekle**. Ana menüdeki ⛶ düğmesiyle tam ekrana geçilir.

> 💡 Mac'in IP adresi değişirse ana ekrandaki kısayol açılmayabilir. Terminal'de ayrıca
> `http://Mac-adi.local:8000` gibi isimli bir adres de yazar; o adres IP değişse de çalışır.

Oyunu kapatmak için Terminal penceresinde **Ctrl + C** yapın ya da pencereyi kapatın.
(Windows bilgisayarda `baslat.bat` aynı işi yapar; Python 3 kurulu olmalıdır.)

---

## 🎮 Oyunlar

Her sayı (2–9) için 8 oyunluk bir yol vardır; hepsi **100'e kadar** sayar (2'şer → 100, 3'er → 99, 6'şar → 96 …). Her oyun 1–3 yıldız verir.

| # | Oyun | Ne öğretir? |
|---|------|-------------|
| 1 | 🐸 **Kurbağa Zıplıyor** | Sayı doğrusunda kurbağa *n* adım *n* adım zıplar. Önce **izle-dinle**, sonra **sıra sende**: kurbağanın konacağı taşa dokun. Yanlışta “biraz ileri / geri” ipucu, sonra adım adım birlikte sayma. Sonunda **yüzlük tabloda** sayıların oluşturduğu desen gösterilir. |
| 2 | 🎈 **Balon Patlat** | Üstteki dizide sıradaki sayı “?” ile yanıp söner. Yükselen balonlardan doğru sayıyı taşıyanı patlat! Altın ⭐ balonlar sürpriz bonus. Yanlışlarda “9 + 3 = ?” ipucu çıkar ve doğru balon parlar. |
| 3 | 🥁 **Davul Ritmi** | Okuldaki “1, 2, **ÜÇ**, 4, 5, **ALTI**” çalışması: sayılar ritimle akar, ritmik sayıya gelince ekrana dokunup **davula vurulur**. Alttaki noktalar grup içinde saymaya yardım eder. |
| 4 | 🚂 **Sayı Treni** | Vagonlardaki eksik sayıları altın paralarla tamamla. 4 tren gelir; Normal/Zor seviyede son tren **geriye doğru** sayar. |
| 5 | 🐰 **Tavşanın Yolu** | Sayı karelerinden oluşan bahçede tavşanı havuca götür: sadece sıradaki ritmik sayıya (yan yana karelerde) basılır. 3 yol: başlangıç, orta ve 100'e yakın bölüm; Normal/Zor'da son yol geriye. |
| 6 | 🃏 **Hafıza Kartları** | Kartları ezberle, sonra eşleştir: “24, 27, ?” kartı ↔ “30”; “🐸 4 zıplama (3'er)” ↔ “12”. Hem hafıza hem ritmik sayma. |
| 7 | 🧺 **Sepete Yakala** | Düşen sayılı meyvelerden sadece ritmik sayıları sepetle yakala (parmakla sepeti kaydır). Yanlış yakalanınca “13 yok, 12 ve 15 var” diye açıklar. |
| 8 | 🚀 **Aya Yolculuk** | 10 karışık soru: sıradaki sayı, eksik sayı, geriye sayma, “hangisi söylenir?”, **sepetleri sayma** (her sepette *n* nesne — çarpmaya hazırlık). Her doğru cevapta roket yükselir. |

**Ana menüdeki ekstralar**
- 🔀 **Karışık Tekrar:** Seçtiğiniz sayıları (ör. 3, 4, 6) karıştırarak Balon, Tren, Tavşan, Hafıza veya Roket oyunu.
  Öğrenilenleri tekrar etmek için ideal.
- 🔢 **Sayı Tablosu:** Yüzlük tabloda her sayının ritmik sayılarını sesli olarak parlatır; sayılara dokununca okunur.
- Sayı ekranındaki **🔊 Dinle** düğmesi o sayının 100'e kadar dizisini (ör. 0, 3, 6 … 99) sesli okur.

Oyunun ortasında üstteki **⏸️** düğmesi oyunu durdurur (çıkmak ya da devam etmek için).

---

## ⚙️ Ayarlar (⚙️ düğmesi)

- **Oyuncunun adı:** Yazarsanız oyun çocuğa adıyla seslenir (“Aferin Elif!”).
- **Müzik / Ses efektleri / Sesli okuma** aç-kapat.
- **Zorluk**
  - *Kolay:* yavaş balonlar, davulda ipucu sesi ve sarı işaretler, 3 seçenek, erken ipucu.
  - *Normal:* geri sayan tren ve roket soruları, davulda grup noktaları.
  - *Zor:* hızlı tempo, balonda geriye sayma turu, davulda nokta ipucu yok.
- **İlerlemeyi sıfırla:** Yıldızları sıfırlar (iki kez dokunmak gerekir).

İlerleme (yıldızlar) **tabletin kendisinde** saklanır.

---

## 🗣️ Sesli okuma hakkında
Oyun, tabletin kendi Türkçe sesini kullanır (iPad'de “Yelda”, Android'de Google Türkçe).
Ayarlar ekranında “✅ Türkçe ses hazır” yazmıyorsa:
- **iPad:** Ayarlar → Erişilebilirlik → Seslendirilen İçerik → Sesler → Türkçe
- **Android:** Ayarlar → Sistem → Diller → Metin okuma çıktısı → Google → Türkçe ses verisini yükle

## ❓ Sorun giderme
- **Tablet sayfayı açamıyor:** Aynı Wi-Fi'da olduğunuzdan ve Terminal penceresinin açık olduğundan
  emin olun. Mac'te Sistem Ayarları → Ağ → Güvenlik Duvarı açıksa Python'a izin verin.
- **Ses gelmiyor:** Tabletin sesini ve sessiz modunu kontrol edin; ilk dokunuştan sonra sesler başlar.
- **Port meşgul:** Sunucu otomatik olarak 8080, 8888 gibi başka bir port dener; Terminal'deki adresi kullanın.

---

### 📁 Dosyalar
```
index.html            oyun
baglan.html           QR kodlu bağlantı sayfası (Mac'te açılır)
css/style.css         tasarım
js/                   ses motoru, sesli okuma, efektler, menüler
js/games/             8 oyun (learn, balloon, rhythm, train, path, memory, catch, rocket)
sunucu.py             ev ağı sunucusu (yalnızca Python 3)
Baslat.command        Mac'te çift tıkla-başlat
baslat.bat            Windows'ta çift tıkla-başlat
```
