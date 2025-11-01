

// app.js
document.addEventListener('DOMContentLoaded', function() {
  // =====================
  // Initialize Dictionary App
  // =====================
  class GermanDictionary {
    constructor() {
   this.dbName = 'GermanPersianDictionary';
      this.dbVersion = 2;
      this.db = null;
      this.currentWord = null;
      this.favorites = new Set();
      this.init();
      this.tempVerbData = null;
      window.addEventListener('resize', () => {
  this.handleResponsive();
});
      
    }
    
    handleResponsive() {
  const sidebar = document.querySelector('.sidebar');
  const menuItems = document.querySelectorAll('.menu-item');
  
  if (window.innerWidth < 1200) {
    // حالت موبایل و تبلت
    if (sidebar) {
      sidebar.style.flexDirection = 'row';
      sidebar.style.flexWrap = 'wrap';
      sidebar.style.justifyContent = 'center';
    }
    
    menuItems.forEach(item => {
      item.style.margin = '2px';
    });
  } else {
    // حالت دسکتاپ
    if (sidebar) {
      sidebar.style.flexDirection = 'column';
      sidebar.style.flexWrap = 'nowrap';
    }
    
    menuItems.forEach(item => {
      item.style.margin = '';
    });
  }
}
    // =====================
    // Database Initialization
    // =====================
      async init() {
      await this.initDB();
      await this.loadFavorites();
      this.setupEventListeners();
      this.renderWordList();
      this.updateStats();
        this.loadCustomization();
         this.setupSidebarQuickSearch();
      // Enable service worker for PWA
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('Service Worker registered', reg))
          .catch(err => console.log('Service Worker registration failed', err));
      }
    }

    initDB() {
    return new Promise((resolve, reject) => {
        // تغییر version از 2 به 3
        const request = indexedDB.open(this.dbName, 3);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            
                  if (oldVersion < 4) {
                if (!db.objectStoreNames.contains('music')) {
                    const musicStore = db.createObjectStore('music', { keyPath: 'id', autoIncrement: true });
                    musicStore.createIndex('name', 'name', { unique: false });
                    musicStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                    console.log('✅ Object Store موسیقی ایجاد شد');
                }
            }
        
            // Object Storeهای قبلی (همون‌ها رو نگه دار)
            if (!db.objectStoreNames.contains('words')) {
                const store = db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
                store.createIndex('german', 'german', { unique: true });
                store.createIndex('gender', 'gender', { unique: false });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('favorites')) {
                db.createObjectStore('favorites', { keyPath: 'wordId' });
            }
            
           if (!db.objectStoreNames.contains('examples')) {
    const exStore = db.createObjectStore('examples', { keyPath: 'id', autoIncrement: true });
    exStore.createIndex('wordId', 'wordId', { unique: false });
    console.log('✅ Object Store examples ایجاد شد');
}
            
            if (!db.objectStoreNames.contains('practiceHistory')) {
                const phStore = db.createObjectStore('practiceHistory', { keyPath: 'id', autoIncrement: true });
                phStore.createIndex('wordId', 'wordId', { unique: false });
                phStore.createIndex('date', 'date', { unique: false });
            }
        };
        
        request.onsuccess = (event) => {
            this.db = event.target.result;
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };
    });
}
async addWord(wordData) {
  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction(['words'], 'readwrite');
    const store = transaction.objectStore('words');
    
    // Add createdAt timestamp
    wordData.createdAt = new Date().toISOString();
    
    const request = store.add(wordData);
    
    request.onsuccess = async () => {
      const wordId = request.result;
      
      // ذخیره مثال اگر وجود دارد
      const exampleGerman = document.getElementById('example').value.trim();
      const examplePersian = document.getElementById('example-translation').value.trim();
      
      if (exampleGerman && examplePersian) {
        try {
          await this.addExample(wordId, {
            german: exampleGerman,
            persian: examplePersian
          });
          console.log('✅ مثال نیز ذخیره شد');
        } catch (error) {
          console.error('خطا در ذخیره مثال:', error);
        }
      }
      
      this.showToast('لغت با موفقیت اضافه شد', 'success');
      this.renderWordList();
      this.updateStats();
      
      // پاک کردن فرم
      this.clearAddWordForm();
      
      resolve(wordId);
    };
    
    request.onerror = (event) => {
      console.error('Error adding word:', event.target.error);
      this.showToast('خطا در ذخیره لغت', 'error');
      reject(event.target.error);
    };
  });
}

// متد برای پاک کردن فرم
clearAddWordForm() {
  document.getElementById('german-word').value = '';
  document.getElementById('persian-meaning').value = '';
  document.getElementById('example').value = '';
  document.getElementById('example-translation').value = '';
  document.getElementById('verb-present').value = '';
  document.getElementById('verb-past').value = '';
  document.getElementById('verb-perfect').value = '';
  
  // ریست کردن انتخاب جنسیت
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // مخفی کردن فرم افعال
  document.querySelector('.verb-forms').style.display = 'none';
}
    async getWord(id) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['words'], 'readonly');
        const store = transaction.objectStore('words');
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }
    async getWordsByRange(start, end) {
  const allWords = await this.getAllWords();
  // مرتب کردن لغات بر اساس تاریخ ایجاد (جدیدترین اول)
  const sortedWords = allWords.sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt) // تغییر به a - b
  );
   const startIndex = Math.max(0, start - 1);
  const endIndex = Math.min(sortedWords.length, end);
  
  return sortedWords.slice(startIndex, endIndex);
}
    async searchWords(query) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['words'], 'readonly');
        const store = transaction.objectStore('words');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const words = request.result.filter(word => 
            word.german.toLowerCase().startsWith(query.toLowerCase()) || 
            word.persian.toLowerCase().includes(query.toLowerCase())
          );
          resolve(words);
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }
    // این متدها را به کلاس GermanDictionary اضافه کنید

// =====================
// Sidebar Quick Search
// =====================
setupSidebarQuickSearch() {
  const sidebarSearchInput = document.getElementById('sidebar-quick-search');
  const sidebarSearchTrigger = document.getElementById('sidebar-search-trigger');
  
  if (!sidebarSearchInput) return;
  
  let searchTimeout;
  
  // جستجوی زنده با تایپ
  sidebarSearchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (query) {
        this.performSidebarQuickSearch(query);
      }
    }, 500);
  });
  
  // جستجو با کلیک دکمه
  sidebarSearchTrigger.addEventListener('click', () => {
    const query = sidebarSearchInput.value.trim();
    if (query) {
      this.performSidebarQuickSearch(query);
    }
  });
  
  // جستجو با Enter
  sidebarSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = sidebarSearchInput.value.trim();
      if (query) {
        this.performSidebarQuickSearch(query);
      }
    }
  });
}

async performSidebarQuickSearch(query) {
  if (!query.trim()) return;
  
  try {
    // استفاده از متد جستجوی اصلی
    const results = await this.searchWords(query);
    
    if (results.length > 0) {
      // نمایش اولین نتیجه در بخش جستجو
      this.renderWordDetails(results[0]);
      
      // تغییر به بخش جستجو
      this.showSection('search-section');
      
      // هایلایت منوی جستجو
      document.querySelectorAll('.menu-item').forEach(menuItem => {
        menuItem.classList.remove('active');
      });
      document.querySelector('.menu-item[data-section="search"]').classList.add('active');
      
      // پاک کردن فیلد جستجو
      document.getElementById('sidebar-quick-search').value = '';
      
    } else {
      // اگر نتیجه‌ای نبود، پیام نشان بده
      this.showToast('هیچ نتیجه‌ای یافت نشد', 'info');
    }
    
  } catch (error) {
    console.error('Error in sidebar quick search:', error);
    this.showToast('خطا در جستجو', 'error');
  }
}
async getAllWords() {
  return new Promise((resolve, reject) => {
    // بررسی اینکه دیتابیس آماده است
    if (!this.db) {
      console.warn('Database not ready, returning empty array');
      resolve([]);
      return;
    }

    try {
      const transaction = this.db.transaction(['words'], 'readonly');
      const store = transaction.objectStore('words');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => {
        console.error('Error in getAllWords:', event.target.error);
        resolve([]); // بازگرداندن آرایه خالی به جای reject
      };
    } catch (error) {
      console.error('Error in getAllWords:', error);
      resolve([]);
    }
  });
}
    async deleteWord(id) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['words'], 'readwrite');
        const store = transaction.objectStore('words');
        const request = store.delete(id);
        
        request.onsuccess = () => {
          this.showToast('لغت با موفقیت حذف شد', 'success');
          this.renderWordList();
          this.updateStats();
          resolve();
        };
        
        request.onerror = (event) => {
          this.showToast('خطا در حذف لغت', 'error');
          reject(event.target.error);
        };
      });
    }

    // =====================
    // Favorites Management
    // =====================
    async loadFavorites() {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['favorites'], 'readonly');
        const store = transaction.objectStore('favorites');
        const request = store.getAll();
        
        request.onsuccess = () => {
          this.favorites = new Set(request.result.map(item => item.wordId));
          resolve();
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }

    async toggleFavorite(wordId) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        
        if (this.favorites.has(wordId)) {
          const request = store.delete(wordId);
          
          request.onsuccess = () => {
            this.favorites.delete(wordId);
            this.showToast('از علاقه‌مندی‌ها حذف شد', 'info');
            resolve(false);
          };
          
          request.onerror = (event) => reject(event.target.error);
        } else {
          const request = store.add({ wordId });
          
          request.onsuccess = () => {
            this.favorites.add(wordId);
            this.showToast('به علاقه‌مندی‌ها اضافه شد', 'success');
            resolve(true);
          };
          
          request.onerror = (event) => reject(event.target.error);
        }
      });
    }

    // =====================
    // Examples Management
    // =====================
// =====================
// Examples Management - اصلاح شده
// =====================
async addExample(wordId, exampleData) {
    return new Promise((resolve, reject) => {
        console.log('📝 در حال اضافه کردن مثال برای لغت:', wordId, exampleData);
        
        if (!this.db) {
            reject(new Error('دیتابیس در دسترس نیست'));
            return;
        }

        const transaction = this.db.transaction(['examples'], 'readwrite');
        const store = transaction.objectStore('examples');
        
        const exampleToAdd = {
            wordId: wordId,
            german: exampleData.german,
            persian: exampleData.persian,
            createdAt: new Date().toISOString()
        };
        
        console.log('📦 داده‌های مثال برای ذخیره:', exampleToAdd);
        
        const request = store.add(exampleToAdd);
        
        request.onsuccess = () => {
            console.log('✅ مثال با موفقیت اضافه شد. ID:', request.result);
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            console.error('❌ خطا در اضافه کردن مثال:', event.target.error);
            reject(event.target.error);
        };
    });
}
 async getExamplesForWord(wordId) {
    return new Promise((resolve, reject) => {
        console.log('🔍 دریافت مثال‌ها برای لغت:', wordId); // دیباگ
        
        if (!this.db) {
            console.warn('دیتابیس در دسترس نیست');
            resolve([]);
            return;
        }

        const transaction = this.db.transaction(['examples'], 'readonly');
        const store = transaction.objectStore('examples');
        const index = store.index('wordId');
        const request = index.getAll(wordId);
        
        request.onsuccess = () => {
            console.log('📚 تعداد مثال‌های دریافت شده:', request.result.length); // دیباگ
            console.log('مثال‌ها:', request.result); // دیباگ
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            console.error('❌ خطا در دریافت مثال‌ها:', event.target.error); // دیباگ
            reject(event.target.error);
        };
    });
}
    // =====================
    // Practice System
    // =====================
    async recordPractice(wordId, correct) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['practiceHistory'], 'readwrite');
        const store = transaction.objectStore('practiceHistory');
        
        const record = {
          wordId,
          correct,
          date: new Date().toISOString()
        };
        
        const request = store.add(record);
        
        request.onsuccess = () => {
          this.updateStats();
          resolve();
        };
        
        request.onerror = (event) => reject(event.target.error);
      });
    }
  async saveWord() {
  try {
    // ... کدهای قبلی بدون تغییر ...
    
    await this.addWord(wordData);
    this.showToast('لغت جدید با موفقیت ثبت شد', 'success');
    
    // پاک کردن فرم و تنظیم مجدد
    document.getElementById('german-word').value = '';
    document.getElementById('persian-meaning').value = '';
    document.querySelectorAll('.gender-btn').forEach(btn => btn.classList.remove('active'));
    
    // فوکوس خودکار به فیلد آلمانی + تغییر زبان کیبورد
    setTimeout(() => {
      const germanInput = document.getElementById('german-word');
      germanInput.focus();
      
      // تغییر زبان کیبورد به آلمانی (فقط در مرورگرهای پشتیبانی کننده)
      if ('virtualKeyboard' in navigator) {
        navigator.virtualKeyboard.setInputMode('de');
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error saving word:', error);
    return false;
  }
  
}
    async getPracticeHistory(wordId) {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['practiceHistory'], 'readonly');
        const store = transaction.objectStore('practiceHistory');
        const index = store.index('wordId');
        const request = index.getAll(wordId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }

    // =====================
// Music Management
// =====================

// دریافت همه موسیقی‌ها از IndexedDB
getAllMusic() {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            resolve([]);
            return;
        }

        const transaction = this.db.transaction(['music'], 'readonly');
        const store = transaction.objectStore('music');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// دریافت موسیقی بر اساس ID
getMusicById(musicId) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('دیتابیس در دسترس نیست'));
            return;
        }

        const transaction = this.db.transaction(['music'], 'readonly');
        const store = transaction.objectStore('music');
        const request = store.get(musicId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ذخیره موسیقی در IndexedDB
saveMusicToStorage(musicData) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('دیتابیس در دسترس نیست'));
            return;
        }

        const transaction = this.db.transaction(['music'], 'readwrite');
        const store = transaction.objectStore('music');
        
        // اضافه کردن timestamp
        musicData.id = Date.now();
        musicData.uploadDate = new Date().toISOString();
        
        const request = store.add(musicData);
        
        request.onsuccess = () => {
            this.showToast(`"${musicData.name}" با موفقیت آپلود شد`, 'success');
            this.renderUploadedMusicList();
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            this.showToast('خطا در ذخیره موسیقی', 'error');
            reject(event.target.error);
        };
    });
}

// حذف موسیقی
deleteMusicById(musicId) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('دیتابیس در دسترس نیست'));
            return;
        }

        const transaction = this.db.transaction(['music'], 'readwrite');
        const store = transaction.objectStore('music');
        const request = store.delete(musicId);
        
        request.onsuccess = () => {
            this.showToast('موسیقی حذف شد', 'info');
            this.renderUploadedMusicList();
            resolve();
        };
        
        request.onerror = (event) => {
            this.showToast('خطا در حذف موسیقی', 'error');
            reject(event.target.error);
        };
    });
}
handleMusicUpload(files) {
    if (!files || files.length === 0) return;

    const audioFile = Array.from(files).find(file => file.type.startsWith('audio/'));
    const imageFile = Array.from(files).find(file => file.type.startsWith('image/'));

    if (!audioFile) {
        this.showToast('لطفاً یک فایل صوتی انتخاب کنید', 'error');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        const musicData = {
            name: audioFile.name.replace(/\.[^/.]+$/, ""),
            audioData: e.target.result,
            audioType: audioFile.type,
            audioSize: audioFile.size,
            uploadDate: new Date().toISOString()
        };

        // اگر عکس هم آپلود شده، ذخیره کن
        if (imageFile) {
            try {
                const imageData = await this.readFileAsDataURL(imageFile);
                musicData.imageData = imageData;
                musicData.imageType = imageFile.type;
            } catch (error) {
                console.error('خطا در خواندن عکس:', error);
            }
        }

        await this.saveMusicToStorage(musicData);
    };
    
    reader.onerror = () => {
        this.showToast('خطا در خواندن فایل', 'error');
    };
    
    reader.readAsDataURL(audioFile);
}
// متد کمکی برای خواندن فایل عکس
readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

// ذخیره موسیقی در IndexedDB
async saveMusicToStorage(musicData) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
            reject(new Error('دیتابیس در دسترس نیست'));
            return;
        }

        const transaction = this.db.transaction(['music'], 'readwrite');
        const store = transaction.objectStore('music');
        
        // اضافه کردن ID و timestamp
        musicData.id = Date.now();
        
        const request = store.add(musicData);
        
        request.onsuccess = () => {
            this.showToast(`"${musicData.name}" با موفقیت آپلود شد`, 'success');
            this.renderUploadedMusicList();
            resolve(request.result);
        };
        
        request.onerror = (event) => {
            this.showToast('خطا در ذخیره موسیقی', 'error');
            reject(event.target.error);
        };
    });
}
async renderUploadedMusicList() {
    const container = document.getElementById('uploaded-music-list');
    if (!container) return;
    
    try {
        const musicList = await this.getAllMusic();
        
        if (musicList.length === 0) {
            container.innerHTML = `
                <div class="empty-music-list">
                    <i class="fas fa-music"></i>
                    <p>هنوز موسیقی آپلود نکرده‌اید</p>
                </div>
            `;
            return;
        }
        
        // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
        musicList.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        container.innerHTML = musicList.map((music) => `
            <div class="music-item" data-id="${music.id}">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div class="music-cover">
                        ${music.imageData ? 
                            `<img src="${music.imageData}" alt="${music.name}" class="music-cover-image">` :
                            `<i class="fas fa-music default-cover-icon"></i>`
                        }
                    </div>
                    <div class="music-info">
                        <div class="music-name">${music.name}</div>
                        <div class="music-details">
                            ${this.formatFileSize(music.audioSize)} • 
                            ${new Date(music.uploadDate).toLocaleDateString('fa-IR')}
                        </div>
                    </div>
                </div>
                <div class="music-actions">
                    <button class="music-btn play-uploaded-music" data-id="${music.id}">
                        <i class="fas fa-play"></i> پخش
                    </button>
                    <button class="music-btn delete delete-music" data-id="${music.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.setupMusicEventListeners();
        
    } catch (error) {
        console.error('خطا در نمایش لیست موسیقی:', error);
        container.innerHTML = `
            <div class="empty-music-list">
                <i class="fas fa-exclamation-triangle"></i>
                <p>خطا در بارگذاری موسیقی‌ها</p>
            </div>
        `;
    }
}
async playUploadedMusic(musicId) {
    try {
        const music = await this.getMusicById(musicId);
        
        if (!music) {
            this.showToast('موسیقی پیدا نشد', 'error');
            return;
        }

        // توقف موسیقی قبلی
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
        }

        // ایجاد پلیر جدید
        this.audioPlayer = new Audio();
        this.audioPlayer.src = music.audioData;
        
        // تنظیم حجم
        const volumeSlider = document.getElementById('music-volume');
        if (volumeSlider) {
            this.audioPlayer.volume = volumeSlider.value / 100;
        }


        
        await this.audioPlayer.play();
        this.showToast(`در حال پخش: ${music.name}`, 'success');
        this.updateMusicButtons(true);
        
    } catch (error) {
        console.error('خطا در پخش:', error);
        this.showToast('خطا در پخش موسیقی', 'error');
    }
}

// متد جدید برای نمایش پلیر
showMusicPlayer(music) {
    // اگر پلیر از قبل وجود دارد، آن را حذف کن
    const existingPlayer = document.getElementById('music-player');
    if (existingPlayer) {
        existingPlayer.remove();
    }

    const playerHtml = `
        <div id="music-player" class="music-player">
            <div class="player-header">
                <h4>در حال پخش</h4>
                <button class="close-player" id="close-player">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="player-content">
                <div class="album-art">
                    ${music.imageData ? 
                        `<img src="${music.imageData}" alt="${music.name}" class="album-image">` :
                        `<div class="default-album-art">
                            <i class="fas fa-music"></i>
                        </div>`
                    }
                </div>
                <div class="track-info">
                    <h3 class="track-name">${music.name}</h3>
                    <div class="progress-bar">
                        <div class="progress" id="music-progress"></div>
                    </div>
                    <div class="player-controls">
                        <button class="control-btn" id="prev-btn">
                            <i class="fas fa-step-backward"></i>
                        </button>
                        <button class="control-btn play-pause" id="play-pause-btn">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="control-btn" id="next-btn">
                            <i class="fas fa-step-forward"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', playerHtml);
    
    // event listeners برای پلیر
    this.setupPlayerEventListeners();
}

setupPlayerEventListeners() {
    document.getElementById('close-player')?.addEventListener('click', () => {
        document.getElementById('music-player').remove();
        if (this.audioPlayer) {
            this.audioPlayer.pause();
        }
    });

    document.getElementById('play-pause-btn')?.addEventListener('click', () => {
        if (this.audioPlayer.paused) {
            this.audioPlayer.play();
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            this.audioPlayer.pause();
            document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        }
    });
}
// پخش موسیقی زمینه
playBackgroundMusic() {
    const selectedMusic = document.getElementById('background-music').value;
    
    if (selectedMusic === 'none') {
        this.showToast('لطفاً یک موسیقی انتخاب کنید', 'warning');
        return;
    }

    if (!this.audioPlayer) {
        this.audioPlayer = new Audio();
        this.audioPlayer.loop = true;
    }

    const musicUrls = {
        calm: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        focus: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        classical: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    };

    if (selectedMusic in musicUrls) {
        this.audioPlayer.src = musicUrls[selectedMusic];
        this.audioPlayer.play().then(() => {
            this.showToast('موسیقی در حال پخش است', 'success');
            this.updateMusicButtons(true);
        }).catch(error => {
            this.showToast('خطا در پخش موسیقی', 'error');
        });
    }
}

// توقف موسیقی
stopBackgroundMusic() {
    if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;
        this.updateMusicButtons(false);
        this.showToast('موسیقی متوقف شد', 'info');
    }
}

// تنظیم حجم صدا
setMusicVolume(volume) {
    if (this.audioPlayer) {
        this.audioPlayer.volume = volume / 100;
    }
    // آپدیت نمایش حجم
    const volumeValue = document.getElementById('volume-value');
    if (volumeValue) {
        volumeValue.textContent = `${volume}%`;
    }
}

// تغییر موسیقی زمینه
changeBackgroundMusic(type) {
    if (this.audioPlayer && !this.audioPlayer.paused) {
        this.stopBackgroundMusic();
        setTimeout(() => this.playBackgroundMusic(), 100);
    }
}

// فرمت کردن سایز فایل
formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// آپدیت وضعیت دکمه‌های موسیقی
updateMusicButtons(isPlaying) {
    const playBtn = document.getElementById('play-music-btn');
    const stopBtn = document.getElementById('stop-music-btn');
    
    if (playBtn) {
        playBtn.innerHTML = isPlaying ? '⏸ مکث' : '▶ پخش موسیقی';
    }
    
    if (stopBtn) {
        stopBtn.style.display = 'inline-block';
    }
}

// تنظیم event listeners برای موسیقی
setupMusicEventListeners() {
    const container = document.getElementById('uploaded-music-list');
    if (!container) return;

    // دکمه‌های پخش
    container.querySelectorAll('.play-uploaded-music').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const musicId = parseInt(e.target.closest('.play-uploaded-music').getAttribute('data-id'));
            this.playUploadedMusic(musicId);
        });
    });

    // دکمه‌های حذف
    container.querySelectorAll('.delete-music').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const musicId = parseInt(e.target.closest('.delete-music').getAttribute('data-id'));
            if (confirm('آیا از حذف این موسیقی مطمئن هستید؟')) {
                this.deleteMusicById(musicId);
            }
        });
    });
}

async startListeningPractice(wordIds = null, range = null) {
    console.log('شروع تمرین شنیداری', { wordIds, range });
    
    let wordsToPractice;
    
    if (range) {
        wordsToPractice = await this.getWordsByRange(range.start, range.end);
    } else if (!wordIds) {
        const allWords = await this.getAllWords();
        wordsToPractice = this.shuffleArray([...allWords]).slice(0, 10);
    } else {
        const words = await Promise.all(wordIds.map(id => this.getWord(id)));
        wordsToPractice = this.shuffleArray(words);
    }

    if (wordsToPractice.length === 0) {
        this.showToast('لغتی برای تمرین وجود ندارد', 'error');
        return;
    }

    this.listeningSession = {
        words: wordsToPractice,
        currentIndex: 0,
        score: 0,
        attempts: 0
    };

    console.log('تعداد لغات برای تمرین:', wordsToPractice.length);
    this.showListeningExercise();
}
playWordForExercise(word) {
    this.speakWord(word, 'de-DE');
}

// متد برای نمایش فیدبک
showExerciseFeedback(message, type) {
    const feedbackHtml = `
        <div class="feedback-message feedback-${type}">
            ${message}
        </div>
    `;
    
    const exerciseContent = document.querySelector('.exercise-content');
    if (exerciseContent) {
        exerciseContent.insertAdjacentHTML('afterbegin', feedbackHtml);
    }
}
showListeningExercise() {
    if (this.listeningSession.currentIndex >= this.listeningSession.words.length) {
        this.showListeningResults();
        return;
    }

    const word = this.listeningSession.words[this.listeningSession.currentIndex];
    
    document.getElementById('practice-section').innerHTML = `
        <div class="listening-exercise">
            <div class="exercise-header">
                <h2 class="exercise-title">🎧 تمرین شنیداری</h2>
                <p class="exercise-instructions">به تلفظ گوش دهید و لغت آلمانی را حدس بزنید</p>
            </div>

            <div class="voice-controls">
                <button class="voice-btn play" id="play-pronunciation-btn">
                    <i class="fas fa-play"></i> پخش تلفظ
                </button>
                <button class="voice-btn replay" id="replay-pronunciation-btn">
                    <i class="fas fa-redo"></i> تکرار
                </button>
            </div>

            <div class="exercise-content">
                <input type="text" 
                       class="answer-input" 
                       id="listening-answer" 
                       placeholder="لغت آلمانی را اینجا تایپ کنید...">
                
                <div class="action-buttons">
                    <button class="btn btn-success" id="check-listening-answer-btn">
                        بررسی پاسخ
                    </button>
                    <button class="btn btn-outline" id="skip-listening-btn">
                        رد کردن
                    </button>
                </div>

                <div class="progress-indicator">
                    ${this.listeningSession.words.map((_, index) => `
                        <div class="progress-dot ${index === this.listeningSession.currentIndex ? 'active' : ''} 
                            ${index < this.listeningSession.currentIndex ? 
                                (this.listeningSession.words[index].userCorrect ? 'correct' : 'incorrect') : ''}">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // اضافه کردن event listeners
    this.setupListeningExerciseEventListeners(word);
}
setupListeningExerciseEventListeners(word) {
    let isProcessing = false;
    
    // اول صدا را پخش کن
    this.playWordForExercise(word.german);
    
    const checkAnswer = () => {
        if (isProcessing) return;
        isProcessing = true;
        
        this.checkListeningAnswer();
        
        setTimeout(() => {
            isProcessing = false;
        }, 1200);
    };

    const skipExercise = () => {
        if (isProcessing) return;
        this.skipListeningExercise();
    };

    // پخش تلفظ
    document.getElementById('play-pronunciation-btn')?.addEventListener('click', () => {
        this.playWordForExercise(word.german);
    });
    
    // تکرار تلفظ
    document.getElementById('replay-pronunciation-btn')?.addEventListener('click', () => {
        this.playWordForExercise(word.german);
    });
    
    // بررسی پاسخ
    document.getElementById('check-listening-answer-btn')?.addEventListener('click', checkAnswer);
    
    // رد کردن
    document.getElementById('skip-listening-btn')?.addEventListener('click', skipExercise);
    
    // Enter key برای فیلد پاسخ
    document.getElementById('listening-answer')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        }
    });

    setTimeout(() => {
        document.getElementById('listening-answer').focus();
    }, 500);
}
async checkListeningAnswer() {
    const userAnswer = document.getElementById('listening-answer')?.value.trim();
    const currentWord = this.listeningSession.words[this.listeningSession.currentIndex];
    
    if (!userAnswer) {
        this.showToast('لطفاً پاسخ خود را وارد کنید', 'warning');
        return;
    }
     const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrectAnswer = currentWord.german.toLowerCase().trim();

    this.listeningSession.attempts++;
    const isCorrect = userAnswer.toLowerCase() === currentWord.german.toLowerCase();
    
    // ذخیره نتیجه برای نمایش در نمودار پیشرفت
    currentWord.userCorrect = isCorrect;
    
    if (isCorrect) {
        this.listeningSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ پاسخ صحیح! آفرین', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback(`❌ پاسخ صحیح: ${currentWord.german}`, 'incorrect');
    }

    // رفتن به سوال بعدی بعد از 2 ثانیه
    setTimeout(() => {
        this.listeningSession.currentIndex++;
        this.showListeningExercise();
    }, 1200);
}

skipListeningExercise() {
    this.listeningSession.currentIndex++;
    this.showListeningExercise();
}

async checkListeningAnswer() {
    const userAnswer = document.getElementById('listening-answer').value.trim();
    const currentWord = this.listeningSession.words[this.listeningSession.currentIndex];
    
    if (!userAnswer) {
        this.showToast('لطفاً پاسخ خود را وارد کنید', 'warning');
        return;
    }

    this.listeningSession.attempts++;
    const isCorrect = userAnswer.toLowerCase() === currentWord.german.toLowerCase();
    
    // ذخیره نتیجه برای نمایش در نمودار پیشرفت
    currentWord.userCorrect = isCorrect;
    
    if (isCorrect) {
        this.listeningSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ پاسخ صحیح! آفرین', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback(`❌ پاسخ صحیح: ${currentWord.german}`, 'incorrect');
    }

    // رفتن به سوال بعدی بعد از 2 ثانیه
    setTimeout(() => {
        this.listeningSession.currentIndex++;
        this.showListeningExercise();
    }, 2000);
}

skipListeningExercise() {
    this.listeningSession.currentIndex++;
    this.showListeningExercise();
}
showListeningResults() {
    const accuracy = Math.round((this.listeningSession.score / this.listeningSession.words.length) * 100);
    
    document.getElementById('practice-section').innerHTML = `
        <div class="word-card text-center">
            <h3>نتایج تمرین شنیداری</h3>
            
            <div class="results-summary">
                <div class="result-circle" style="background: conic-gradient(#27ae60 0% ${accuracy}%, #e9ecef ${accuracy}% 100%);">
                    <div class="result-circle-inner">
                        <span>${accuracy}%</span>
                    </div>
                </div>
                
                <div class="results-stats">
                    <div class="result-stat">
                        <span>تعداد سوالات:</span>
                        <strong>${this.listeningSession.words.length}</strong>
                    </div>
                    <div class="result-stat">
                        <span>پاسخ‌های صحیح:</span>
                        <strong>${this.listeningSession.score}</strong>
                    </div>
                    <div class="result-stat">
                        <span>تعداد تلاش‌ها:</span>
                        <strong>${this.listeningSession.attempts}</strong>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" id="restart-listening-btn">تمرین مجدد</button>
                <button class="btn btn-outline" id="back-to-menu-listening-btn">بازگشت به منو</button>
            </div>
        </div>
    `;
    
    // اضافه کردن event listeners
    document.getElementById('restart-listening-btn')?.addEventListener('click', () => {
        this.startListeningPractice();
    });
    
    document.getElementById('back-to-menu-listening-btn')?.addEventListener('click', () => {
        this.renderPracticeOptions();
    });
}

showExerciseFeedback(message, type) {
    const feedbackHtml = `
        <div class="feedback-message feedback-${type}">
            ${message}
        </div>
    `;
    
    const exerciseContent = document.querySelector('.exercise-content');
    exerciseContent.insertAdjacentHTML('afterbegin', feedbackHtml);
}

async startWritingPractice(wordIds = null, range = null) {
    let wordsToPractice;
    
    if (range) {
        wordsToPractice = await this.getWordsByRange(range.start, range.end);
    } else if (!wordIds) {
        const allWords = await this.getAllWords();
        wordsToPractice = this.shuffleArray([...allWords]).slice(0, 8);
    } else {
        const words = await Promise.all(wordIds.map(id => this.getWord(id)));
        wordsToPractice = this.shuffleArray(words);
    }

    if (wordsToPractice.length === 0) {
        this.showToast('لغتی برای تمرین وجود ندارد', 'error');
        return;
    }

    this.writingSession = {
        words: wordsToPractice,
        currentIndex: 0,
        score: 0
    };

    this.showWritingExercise();
    this.showSection('practice-section');
}
showWritingExercise() {
    if (this.writingSession.currentIndex >= this.writingSession.words.length) {
        this.showWritingResults();
        return;
    }

    const word = this.writingSession.words[this.writingSession.currentIndex];
    
    document.getElementById('practice-section').innerHTML = `
        <div class="writing-exercise">
            <div class="exercise-header">
                <h2 class="exercise-title">⌨️ تمرین نگارش</h2>
                <p class="exercise-instructions">معنی فارسی را به آلمانی تایپ کنید</p>
            </div>

            <div class="exercise-content">
                <div class="word-to-translate">
                    <h3>${word.persian}</h3>
                    ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                </div>

                <input type="text" 
                       class="answer-input" 
                       id="writing-answer" 
                       placeholder="ترجمه آلمانی را اینجا تایپ کنید...">
                
                <div class="action-buttons">
                    <button class="btn btn-success" id="check-writing-answer-btn">
                        بررسی پاسخ
                    </button>
                    <button class="btn btn-outline" id="show-writing-hint-btn">
                        راهنمایی
                    </button>
                </div>

                <div class="progress-indicator">
                    ${this.writingSession.words.map((_, index) => `
                        <div class="progress-dot ${index === this.writingSession.currentIndex ? 'active' : ''} 
                            ${index < this.writingSession.currentIndex ? 
                                (this.writingSession.words[index].userCorrect ? 'correct' : 'incorrect') : ''}">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // اضافه کردن event listeners
    this.setupWritingExerciseEventListeners(word);
}
setupWritingExerciseEventListeners(word) {
    let isProcessing = false;
    
    const checkAnswer = () => {
        if (isProcessing) return;
        isProcessing = true;
        this.checkWritingAnswer();
        
        setTimeout(() => {
            isProcessing = false;
        }, 1500);
    };

    // بررسی پاسخ
    document.getElementById('check-writing-answer-btn')?.addEventListener('click', checkAnswer);
    
    // راهنمایی
    document.getElementById('show-writing-hint-btn')?.addEventListener('click', () => {
        this.showWritingHint();
    });
    
    // Enter key برای فیلد پاسخ
    document.getElementById('writing-answer')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        }
    });

    setTimeout(() => {
        document.getElementById('writing-answer').focus();
    }, 500);
}

async checkWritingAnswer() {
    const userAnswer = document.getElementById('writing-answer')?.value.trim();
    const currentWord = this.writingSession.words[this.writingSession.currentIndex];
    
    if (!userAnswer) {
        this.showToast('لطفاً پاسخ خود را وارد کنید', 'warning');
        return;
    }
    const normalizedUserAnswer = userAnswer.toLowerCase().trim();
    const normalizedCorrectAnswer = currentWord.german.toLowerCase().trim();

    const isCorrect = userAnswer.toLowerCase() === currentWord.german.toLowerCase();
    currentWord.userCorrect = isCorrect;
    
    if (isCorrect) {
        this.writingSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ تبریک! درست تایپ کردید', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback(`❌ صحیح: ${currentWord.german}`, 'incorrect');
    }

    setTimeout(() => {
        this.writingSession.currentIndex++;
        this.showWritingExercise();
    }, 1200);
}
async checkWritingAnswer() {
    const userAnswer = document.getElementById('writing-answer').value.trim();
    const currentWord = this.writingSession.words[this.writingSession.currentIndex];
    
    if (!userAnswer) {
        this.showToast('لطفاً پاسخ خود را وارد کنید', 'warning');
        return;
    }

    const isCorrect = userAnswer.toLowerCase() === currentWord.german.toLowerCase();
    currentWord.userCorrect = isCorrect;
    
    if (isCorrect) {
        this.writingSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ تبریک! درست تایپ کردید', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback(`❌ صحیح: ${currentWord.german}`, 'incorrect');
    }

    setTimeout(() => {
        this.writingSession.currentIndex++;
        this.showWritingExercise();
    }, 2000);
}

showWritingHint() {
    const currentWord = this.writingSession.words[this.writingSession.currentIndex];
    const hint = currentWord.german.substring(0, 2) + '...';
    this.showToast(`راهنمایی: ${hint}`, 'info');
}
// این متدها رو به کلاس GermanDictionary اضافه کن (بعد از متد showWritingHint)
showWritingResults() {
    const accuracy = Math.round((this.writingSession.score / this.writingSession.words.length) * 100);
    
    document.getElementById('practice-section').innerHTML = `
        <div class="word-card text-center">
            <h3>نتایج تمرین نگارش</h3>
            
            <div class="results-summary">
                <div class="result-circle" style="background: conic-gradient(#27ae60 0% ${accuracy}%, #e9ecef ${accuracy}% 100%);">
                    <div class="result-circle-inner">
                        <span>${accuracy}%</span>
                    </div>
                </div>
                
                <div class="results-stats">
                    <div class="result-stat">
                        <span>تعداد سوالات:</span>
                        <strong>${this.writingSession.words.length}</strong>
                    </div>
                    <div class="result-stat">
                        <span>پاسخ‌های صحیح:</span>
                        <strong>${this.writingSession.score}</strong>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" id="restart-writing-btn">تمرین مجدد</button>
                <button class="btn btn-outline" id="back-to-menu-writing-btn">بازگشت به منو</button>
            </div>
        </div>
    `;
    
    // اضافه کردن event listeners
    document.getElementById('restart-writing-btn')?.addEventListener('click', () => {
        this.startWritingPractice();
    });
    
    document.getElementById('back-to-menu-writing-btn')?.addEventListener('click', () => {
        this.renderPracticeOptions();
    });
}


// متد تمرین جمله‌سازی
async startSpeakingPractice(wordIds = null, range = null) {
    let wordsToPractice;
    
    if (range) {
        wordsToPractice = await this.getWordsByRange(range.start, range.end);
    } else if (!wordIds) {
        const allWords = await this.getAllWords();
        wordsToPractice = this.shuffleArray([...allWords]).slice(0, 6);
    } else {
        const words = await Promise.all(wordIds.map(id => this.getWord(id)));
        wordsToPractice = this.shuffleArray(words);
    }

    if (wordsToPractice.length === 0) {
        this.showToast('لغتی برای تمرین وجود ندارد', 'error');
        return;
    }

    this.speakingSession = {
        words: wordsToPractice,
        currentIndex: 0,
        score: 0
    };

    this.showSpeakingExercise();
    this.showSection('practice-section');
}
showSpeakingExercise() {
    if (this.speakingSession.currentIndex >= this.speakingSession.words.length) {
        this.showSpeakingResults();
        return;
    }

    const word = this.speakingSession.words[this.speakingSession.currentIndex];
    
    document.getElementById('practice-section').innerHTML = `
        <div class="speaking-exercise">
            <div class="exercise-header">
                <h2 class="exercise-title">💬 تمرین جمله‌سازی</h2>
                <p class="exercise-instructions">با لغت داده شده یک جمله بسازید</p>
            </div>

            <div class="exercise-content">
                <div class="word-to-use">
                    <h3>لغت: <span class="highlight-word">${word.german}</span></h3>
                    <p>معنی: ${word.persian}</p>
                </div>

                <div class="sentence-builder">
                    <textarea 
                        class="sentence-input" 
                        id="sentence-answer" 
                        placeholder="جمله خود را به آلمانی بنویسید..."
                        rows="3"></textarea>
                    
                    <div class="sentence-tips">
                        <small>💡 نکته: سعی کنید از صرف فعل صحیح استفاده کنید</small>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-success" id="check-sentence-answer-btn">
                        بررسی جمله
                    </button>
                    <button class="btn btn-outline" id="show-sentence-example-btn">
                        مشاهده مثال
                    </button>
                </div>

                <div class="progress-indicator">
                    ${this.speakingSession.words.map((_, index) => `
                        <div class="progress-dot ${index === this.speakingSession.currentIndex ? 'active' : ''} 
                            ${index < this.speakingSession.currentIndex ? 
                                (this.speakingSession.words[index].userCorrect ? 'correct' : 'incorrect') : ''}">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // اضافه کردن event listeners
    this.setupSpeakingExerciseEventListeners(word);
}
setupSpeakingExerciseEventListeners(word) {
    let isProcessing = false;
    
    const checkAnswer = () => {
        if (isProcessing) return;
        isProcessing = true;
        this.checkSentenceAnswer();
        
        setTimeout(() => {
            isProcessing = false;
        }, 2000);
    };

    // بررسی جمله
    document.getElementById('check-sentence-answer-btn')?.addEventListener('click', checkAnswer);
    
    // مشاهده مثال
    document.getElementById('show-sentence-example-btn')?.addEventListener('click', () => {
        this.showSentenceExample();
    });
    
    // Enter key برای textarea (Ctrl+Enter برای ارسال)
    document.getElementById('sentence-answer')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            checkAnswer();
        }
    });

    // Enter ساده فقط برای خط جدید
    document.getElementById('sentence-answer')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey) {
            // اجازه می‌دهیم Enter کار معمول خود را انجام دهد (ایجاد خط جدید)
            return;
        }
    });

    setTimeout(() => {
        document.getElementById('sentence-answer').focus();
    }, 500);
}
showSpeakingExercise() {
    if (this.speakingSession.currentIndex >= this.speakingSession.words.length) {
        this.showSpeakingResults();
        return;
    }

    const word = this.speakingSession.words[this.speakingSession.currentIndex];
    
    document.getElementById('practice-section').innerHTML = `
        <div class="speaking-exercise">
            <div class="exercise-header">
                <h2 class="exercise-title">💬 تمرین جمله‌سازی</h2>
                <p class="exercise-instructions">با لغت داده شده یک جمله بسازید</p>
            </div>

            <div class="exercise-content">
                <div class="word-to-use">
                    <h3>لغت: <span class="highlight-word">${word.german}</span></h3>
                    <p>معنی: ${word.persian}</p>
                </div>

                <div class="sentence-builder">
                    <textarea 
                        class="sentence-input" 
                        id="sentence-answer" 
                        placeholder="جمله خود را به آلمانی بنویسید..."
                        rows="3"></textarea>
                    
                    <div class="sentence-tips">
                        <small>💡 نکته: سعی کنید از صرف فعل صحیح استفاده کنید</small>
                    </div>
                </div>
                
                <div class="action-buttons">
                    <button class="btn btn-success" id="check-sentence-answer-btn">
                        بررسی جمله
                    </button>
                    <button class="btn btn-outline" id="show-sentence-example-btn">
                        مشاهده مثال
                    </button>
                </div>

                <div class="progress-indicator">
                    ${this.speakingSession.words.map((_, index) => `
                        <div class="progress-dot ${index === this.speakingSession.currentIndex ? 'active' : ''} 
                            ${index < this.speakingSession.currentIndex ? 
                                (this.speakingSession.words[index].userCorrect ? 'correct' : 'incorrect') : ''}">
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    // اضافه کردن event listeners
    this.setupSpeakingExerciseEventListeners(word);
}

// متد جدید برای تنظیم event listeners تمرین جمله‌سازی
setupSpeakingExerciseEventListeners(word) {
    // بررسی جمله
    document.getElementById('check-sentence-answer-btn')?.addEventListener('click', () => {
        this.checkSentenceAnswer();
    });
    
    // مشاهده مثال
    document.getElementById('show-sentence-example-btn')?.addEventListener('click', () => {
        this.showSentenceExample();
    });
    
    // Enter key برای textarea (Ctrl+Enter برای ارسال)
    document.getElementById('sentence-answer')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            this.checkSentenceAnswer();
        }
    });

    setTimeout(() => {
        document.getElementById('sentence-answer').focus();
    }, 500);
}

async checkSentenceAnswer() {
    const userSentence = document.getElementById('sentence-answer')?.value.trim();
    const currentWord = this.speakingSession.words[this.speakingSession.currentIndex];
    
    if (!userSentence) {
        this.showToast('لطفاً جمله خود را بنویسید', 'warning');
        return;
    }
 const normalizedUserSentence = userSentence.toLowerCase();
    const normalizedCorrectWord = currentWord.german.toLowerCase();
    // بررسی ساده - فقط وجود لغت در جمله
    const containsWord = userSentence.toLowerCase().includes(currentWord.german.toLowerCase());
    currentWord.userCorrect = containsWord;
    
    if (containsWord) {
        this.speakingSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ جمله شما صحیح است! آفرین', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback('❌ لغت در جمله استفاده نشده است', 'incorrect');
    }

    setTimeout(() => {
        this.speakingSession.currentIndex++;
        this.showSpeakingExercise();
    }, 1200);
}
async checkSentenceAnswer() {
    const userSentence = document.getElementById('sentence-answer').value.trim();
    const currentWord = this.speakingSession.words[this.speakingSession.currentIndex];
    
    if (!userSentence) {
        this.showToast('لطفاً جمله خود را بنویسید', 'warning');
        return;
    }

    // بررسی ساده - فقط وجود لغت در جمله
    const containsWord = userSentence.toLowerCase().includes(currentWord.german.toLowerCase());
    currentWord.userCorrect = containsWord;
    
    if (containsWord) {
        this.speakingSession.score++;
        await this.recordPractice(currentWord.id, true);
        this.showExerciseFeedback('✅ جمله شما صحیح است! آفرین', 'correct');
    } else {
        await this.recordPractice(currentWord.id, false);
        this.showExerciseFeedback('❌ لغت در جمله استفاده نشده است', 'incorrect');
    }

    setTimeout(() => {
        this.speakingSession.currentIndex++;
        this.showSpeakingExercise();
    }, 3000);
}

showSentenceExample() {
    const currentWord = this.speakingSession.words[this.speakingSession.currentIndex];
    const examples = [
        `Ich verwende "${currentWord.german}" in einem Satz.`,
        `Das Wort "${currentWord.german}" ist sehr nützlich.`,
        `Kannst du "${currentWord.german}" erklären?`
    ];
    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    this.showToast(`مثال: ${randomExample}`, 'info');
}

showSpeakingResults() {
    const accuracy = Math.round((this.speakingSession.score / this.speakingSession.words.length) * 100);
    
    document.getElementById('practice-section').innerHTML = `
        <div class="word-card text-center">
            <h3>نتایج تمرین جمله‌سازی</h3>
            
            <div class="results-summary">
                <div class="result-circle" style="background: conic-gradient(#27ae60 0% ${accuracy}%, #e9ecef ${accuracy}% 100%);">
                    <div class="result-circle-inner">
                        <span>${accuracy}%</span>
                    </div>
                </div>
                
                <div class="results-stats">
                    <div class="result-stat">
                        <span>تعداد لغات:</span>
                        <strong>${this.speakingSession.words.length}</strong>
                    </div>
                    <div class="result-stat">
                        <span>جملات صحیح:</span>
                        <strong>${this.speakingSession.score}</strong>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="btn btn-primary" id="restart-speaking-btn">تمرین مجدد</button>
                <button class="btn btn-outline" id="back-to-menu-speaking-btn">بازگشت به منو</button>
            </div>
        </div>
    `;
    
    // اضافه کردن event listeners
    document.getElementById('restart-speaking-btn')?.addEventListener('click', () => {
        this.startSpeakingPractice();
    });
    
    document.getElementById('back-to-menu-speaking-btn')?.addEventListener('click', () => {
        this.renderPracticeOptions();
    });
}

async renderWordList(filter = 'all') {
  const words = await this.getAllWords();
  const wordListContainer = document.getElementById('word-list-section');
  
  if (!wordListContainer) return;
  
  let filteredWords = words;
  
  if (filter === 'favorites') {
    filteredWords = words.filter(word => this.favorites.has(word.id));
  } else if (filter === 'nouns') {
    filteredWords = words.filter(word => word.type === 'noun');
  } else if (filter === 'verbs') {
    filteredWords = words.filter(word => word.type === 'verb');
  }
  
  // مرتب‌سازی filteredWords بر اساس createdAt برای نمایش شماره درست در فیلترها
  filteredWords = filteredWords.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  wordListContainer.innerHTML = `
    <h2>لیست لغات (${filteredWords.length})</h2>
    <div class="filter-buttons mb-3">
      <button class="btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}" data-filter="all">همه</button>
      <button class="btn btn-sm ${filter === 'favorites' ? 'btn-primary' : 'btn-outline'}" data-filter="favorites">علاقه‌مندی‌ها</button>
      <button class="btn btn-sm ${filter === 'nouns' ? 'btn-primary' : 'btn-outline'}" data-filter="nouns">اسم‌ها</button>
      <button class="btn btn-sm ${filter === 'verbs' ? 'btn-primary' : 'btn-outline'}" data-filter="verbs">فعل‌ها</button>
    </div>
    <div class="word-list">
      ${filteredWords.map((word, index) => {
        // محاسبه شماره بر اساس ترتیب در لیست فیلتر شده (برای سادگی و عملکرد بهتر)
        // اگر می‌خواهید شماره کلی از همه کلمات باشد، از کد قبلی استفاده کنید اما توجه کنید که در فیلترها شماره‌ها ممکن است پرش داشته باشند
        const displayNumber = index + 1;  // شماره در لیست فعلی
        
        // اگر می‌خواهید شماره جهانی:
        // const sortedAllWords = words.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        // const globalNumber = sortedAllWords.findIndex(w => w.id === word.id) + 1;
        // سپس از globalNumber استفاده کنید (اما در فیلترها شماره‌ها متوالی نخواهند بود)
        
        return `
          <div class="word-list-item" data-id="${word.id}">
            <div class="word-number">${displayNumber}</div>
            <div class="word-content">
              <div class="word-list-item-header">
                <div>
                  <span class="word-list-item-title">${word.german}</span>
                  ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                  ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
                </div>
                <i class="fas fa-star favorite-icon ${this.favorites.has(word.id) ? 'active' : ''} ${localStorage.getItem('iconStyle') || 'default'}-icon" data-id="${word.id}"></i>
              </div>
              <div class="word-list-item-meaning">${word.persian}</div>
              <div class="word-list-item-actions">
                <button class="btn btn-sm btn-outline view-word" data-id="${word.id}">مشاهده</button>
                <button class="btn btn-sm btn-outline practice-word" data-id="${word.id}">تمرین</button>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  
  // بقیه کد ایونت‌لیسنرها بدون تغییر باقی می‌ماند...
  // Add event listeners to the rendered elements
  document.querySelectorAll('.favorite-icon').forEach(icon => {
    icon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wordId = parseInt(icon.getAttribute('data-id'));
      await this.toggleFavorite(wordId);
      icon.classList.toggle('active');
    });
  });
  
  document.querySelectorAll('.view-word').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wordId = parseInt(btn.getAttribute('data-id'));
      const word = await this.getWord(wordId);
      this.renderWordDetails(word);
      this.showSection('search-section');
    });
  });
  
  document.querySelectorAll('.practice-word').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wordId = parseInt(btn.getAttribute('data-id'));
      this.startPracticeSession([wordId]);
    });
  });
  
  document.querySelectorAll('.filter-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');
      this.renderWordList(filter);
    });
  });
}
    async renderSearchResults(query) {
    const results = await this.searchWords(query);
    
    if (results.length === 0) {
        this.showToast('هیچ نتیجه‌ای یافت نشد', 'info');
        return;
    }

    document.getElementById('search-section').innerHTML = `
        <div class="search-box">
            <input type="text" id="search-input" placeholder="لغت آلمانی یا فارسی را جستجو کنید..." value="${query}">
            <button id="search-btn"><i class="fas fa-search"></i></button>
        </div>
        
        <h3>نتایج جستجو برای "${query}" (${results.length} مورد)</h3>
        
        <div class="word-list">
            ${results.map(word => `
                <div class="word-list-item" data-id="${word.id}">
                    <div class="word-list-item-header">
                        <div>
                            <span class="word-list-item-title">${word.german}</span>
                            ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                            ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
                        </div>
                        <i class="fas fa-star favorite-icon ${this.favorites.has(word.id) ? 'active' : ''}" data-id="${word.id}"></i>
                    </div>
                    <div class="word-list-item-meaning">${word.persian}</div>
                    <div class="word-list-item-actions">
                        <button class="btn btn-sm btn-outline view-word" data-id="${word.id}">مشاهده جزئیات</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Add event listeners
    document.querySelectorAll('.view-word').forEach(btn => {
        btn.addEventListener('click', async () => {
            const wordId = parseInt(btn.getAttribute('data-id'));
            const word = await this.getWord(wordId);
            this.renderWordDetails(word);
        });
    });

    document.querySelectorAll('.favorite-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordId = parseInt(icon.getAttribute('data-id'));
            await this.toggleFavorite(wordId);
            icon.classList.toggle('active');
        });
    });

    this.setupSearchEventListeners();
    this.setupWordListEventListeners();
}
    async renderWordDetails(word) {
      this.currentWord = word;
      const examples = await this.getExamplesForWord(word.id);
      const practiceHistory = await this.getPracticeHistory(word.id);
      
      const successRate = practiceHistory.length > 0 
        ? Math.round((practiceHistory.filter(h => h.correct).length / practiceHistory.length)) * 100 
        : 0;
      
      document.getElementById('search-section').innerHTML = `
        <div class="search-box">
          <input type="text" id="search-input" placeholder="لغت آلمانی یا فارسی را جستجو کنید...">
          <button id="search-btn"><i class="fas fa-search"></i></button>
        </div>
        <div class="word-card">
          <div class="word-header">
            <div>
              <span class="word-title">${word.german}</span>
              ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderLabel(word.gender)}</span>` : ''}
              ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
              ${word.verbForms ? `<span class="word-type">صرف فعل</span>` : ''}
            </div>
            <div class="word-actions">
              <i class="fas fa-star favorite-icon ${this.favorites.has(word.id) ? 'active' : ''}" data-id="${word.id}"></i>
              <i class="fas fa-volume-up pronunciation-icon" data-word="${word.german}"></i>
            </div>
          </div>
          <div class="word-meaning">
            <p><strong>معنی:</strong> ${word.persian}</p>
          </div>
          
          ${word.verbForms ? `
            <div class="verb-forms">
              <div class="verb-form-row">
                <div>
                  <div class="verb-form-label">حال ساده</div>
                  <input type="text" class="form-control" value="${word.verbForms.present || ''}" readonly>
                </div>
                <div>
                  <div class="verb-form-label">گذشته</div>
                  <input type="text" class="form-control" value="${word.verbForms.past || ''}" readonly>
                </div>
                <div>
                  <div class="verb-form-label">گذشته کامل</div>
                  <input type="text" class="form-control" value="${word.verbForms.perfect || ''}" readonly>
                </div>
              </div>
            </div>
          ` : ''}
          
          <div class="tab-container">
            <div class="tab active" data-tab="examples">مثال‌ها (${examples.length})</div>
            <div class="tab" data-tab="practice">تمرین (${practiceHistory.length})</div>
            <div class="tab" data-tab="stats">آمار (${successRate}%)</div>
          </div>
          
          <div class="tab-content active" id="examples-content">
            ${examples.length > 0 ? examples.map(ex => `
              <div class="example">
                <div class="example-header">
                  <strong>مثال:</strong>
                  <div>
                    <i class="fas fa-volume-up pronunciation-icon" data-word="${ex.german}"></i>
                  </div>
                </div>
                <p class="example-text">${ex.german}</p>
                <p class="example-translation">${ex.persian}</p>
              </div>
            `).join('') : '<p class="text-center py-3">مثالی ثبت نشده است</p>'}
            
            <div class="add-example-form mt-3">
              <h4>افزودن مثال جدید</h4>
              <div class="form-group">
                <label for="new-example-german">مثال (آلمانی):</label>
                <textarea id="new-example-german" class="form-control" rows="2"></textarea>
              </div>
              <div class="form-group">
                <label for="new-example-persian">ترجمه (فارسی):</label>
                <textarea id="new-example-persian" class="form-control" rows="2"></textarea>
              </div>
              <button class="btn btn-primary" id="add-example-btn">افزودن مثال</button>
            </div>
          </div>
          
          <div class="tab-content" id="practice-content">
            ${practiceHistory.length > 0 ? `
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${successRate}%"></div>
              </div>
              <p class="text-center my-2">میزان موفقیت: ${successRate}%</p>
              
              <div class="practice-history">
                ${practiceHistory.slice(0, 10).map(record => `
                  <div class="practice-record ${record.correct ? 'correct' : 'incorrect'}">
                    <span>${new Date(record.date).toLocaleString('fa-IR')}</span>
                    <span>${record.correct ? '✅ صحیح' : '❌ نادرست'}</span>
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-center py-3">تاریخچه‌ای برای تمرین این لغت وجود ندارد</p>'}
            
            <div class="action-buttons">
              <button class="btn btn-primary" id="practice-now-btn">تمرین الآن</button>
            </div>
          </div>
          
          <div class="tab-content" id="stats-content">
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-title">تعداد تمرین‌ها</div>
                <div class="stat-value">${practiceHistory.length}</div>
              </div>
              <div class="stat-card">
                <div class="stat-title">میزان موفقیت</div>
                <div class="stat-value">${successRate}%</div>
              </div>
              <div class="stat-card">
                <div class="stat-title">آخرین تمرین</div>
                <div class="stat-value">${practiceHistory.length > 0 
                  ? new Date(practiceHistory[0].date).toLocaleDateString('fa-IR') 
                  : '--'}</div>
              </div>
            </div>
          </div>
          
          <div class="action-buttons">
            <button class="btn btn-outline" id="edit-word-btn">ویرایش لغت</button>
            <button class="btn btn-danger" id="delete-word-btn">حذف لغت</button>
          </div>
        </div>
      `;
      
      // Add event listeners
      document.querySelector('.favorite-icon').addEventListener('click', async () => {
        const wordId = word.id;
        await this.toggleFavorite(wordId);
        document.querySelector('.favorite-icon').classList.toggle('active');
      });
      
     document.getElementById('add-example-btn')?.addEventListener('click', async () => {
    const german = document.getElementById('new-example-german').value.trim();
    const persian = document.getElementById('new-example-persian').value.trim();
    
        if (german && persian) {
          await this.addExample(word.id, { german, persian });
          document.getElementById('new-example-german').value = '';
          document.getElementById('new-example-persian').value = '';
        } else {
          this.showToast('لطفاً هر دو فیلد را پر کنید', 'error');
        }
      });
      
      document.getElementById('practice-now-btn')?.addEventListener('click', () => {
        this.startPracticeSession([word.id]);
      });
      
      document.getElementById('edit-word-btn')?.addEventListener('click', () => {
        this.showEditWordForm(word);
      });
      
      document.getElementById('delete-word-btn')?.addEventListener('click', async () => {
        if (confirm('آیا از حذف این لغت مطمئن هستید؟')) {
          await this.deleteWord(word.id);
          this.showSection('word-list-section');
        }
      });
      
      // Setup tabs
      this.setupTabs();
      
      // Setup pronunciation buttons
      this.setupPronunciationButtons();
      this.setupSearchEventListeners();
    }
    setupSearchEventListeners() {
    // Search functionality
   document.getElementById('search-btn')?.addEventListener('click', () => {
    const query = document.getElementById('search-input').value.trim();
    if (query) {
        this.renderSearchResults(query);
    }
});

document.getElementById('search-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const query = document.getElementById('search-input').value.trim();
        if (query) {
            this.renderSearchResults(query);
        }
    }
});
    
    document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('search-btn').click();
        }
    });
}
    showEditWordForm(word) {
      document.getElementById('add-word-section').innerHTML = `
        <h2>ویرایش لغت</h2>
        <div class="word-card">
          <div class="form-group">
            <label for="edit-german-word">لغت آلمانی:</label>
            <input type="text" id="edit-german-word" class="form-control" value="${word.german}">
          </div>
          <div class="form-group">
            <label for="edit-persian-meaning">معنی فارسی:</label>
            <input type="text" id="edit-persian-meaning" class="form-control" value="${word.persian}">
          </div>
          <div class="form-group">
            <label>جنسیت:</label>
            <div class="gender-options">
              <button class="gender-btn masculine ${word.gender === 'masculine' ? 'active' : ''}" data-gender="masculine">مذکر (der)</button>
              <button class="gender-btn feminine ${word.gender === 'feminine' ? 'active' : ''}" data-gender="feminine">مونث (die)</button>
              <button class="gender-btn neuter ${word.gender === 'neuter' ? 'active' : ''}" data-gender="neuter">خنثی (das)</button>
              <button class="gender-btn none ${!word.gender ? 'active' : ''}" data-gender="none">بدون جنسیت</button>
            </div>
          </div>
          <div class="form-group">
            <label for="edit-word-type">نوع کلمه:</label>
            <select id="edit-word-type" class="form-control">
              <option value="noun" ${word.type === 'noun' ? 'selected' : ''}>اسم</option>
              <option value="verb" ${word.type === 'verb' ? 'selected' : ''}>فعل</option>
              <option value="adjective" ${word.type === 'adjective' ? 'selected' : ''}>صفت</option>
              <option value="adverb" ${word.type === 'adverb' ? 'selected' : ''}>قید</option>
              <option value="other" ${word.type === 'other' || !word.type ? 'selected' : ''}>سایر</option>
            </select>
          </div>
          
          ${word.type === 'verb' ? `
            <div class="form-group verb-forms">
              <label>صرف فعل:</label>
              <div class="verb-form-row">
                <div>
                  <div class="verb-form-label">حال ساده</div>
                  <input type="text" id="edit-verb-present" class="form-control" value="${word.verbForms?.present || ''}">
                </div>
                <div>
                  <div class="verb-form-label">گذشته</div>
                  <input type="text" id="edit-verb-past" class="form-control" value="${word.verbForms?.past || ''}">
                </div>
                <div>
                  <div class="verb-form-label">گذشته کامل</div>
                  <input type="text" id="edit-verb-perfect" class="form-control" value="${word.verbForms?.perfect || ''}">
                </div>
              </div>
            </div>
          ` : ''}
          
          <div class="action-buttons">
            <button class="btn btn-primary" id="save-edit-btn">ذخیره تغییرات</button>
            <button class="btn btn-outline" id="cancel-edit-btn">انصراف</button>
          </div>
        </div>
      `;
      
      // Show verb forms if verb is selected
      document.getElementById('edit-word-type').addEventListener('change', function() {
        const verbFormsDiv = document.querySelector('.verb-forms');
        if (this.value === 'verb') {
          verbFormsDiv.style.display = 'block';
        } else {
          verbFormsDiv.style.display = 'none';
        }
      });
      
      // Save edited word
      document.getElementById('save-edit-btn').addEventListener('click', async () => {
        const german = document.getElementById('edit-german-word').value;
        const persian = document.getElementById('edit-persian-meaning').value;
        const gender = document.querySelector('.gender-btn.active')?.getAttribute('data-gender') || null;
        const type = document.getElementById('edit-word-type').value;
        
        const updatedWord = {
          ...word,
          german,
          persian,
          gender,
          type
        };
        
        if (type === 'verb') {
          updatedWord.verbForms = {
            present: document.getElementById('edit-verb-present').value,
            past: document.getElementById('edit-verb-past').value,
            perfect: document.getElementById('edit-verb-perfect').value
          };
        } else {
          updatedWord.verbForms = null;
        }
        
        const transaction = this.db.transaction(['words'], 'readwrite');
        const store = transaction.objectStore('words');
        const request = store.put(updatedWord);
        
        request.onsuccess = () => {
          this.showToast('لغت با موفقیت ویرایش شد', 'success');
          this.renderWordDetails(updatedWord);
          this.showSection('search-section');
        };
        
        request.onerror = () => {
          this.showToast('خطا در ویرایش لغت', 'error');
        };
      });
      
      document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        this.showSection('search-section');
      });
      
      this.showSection('add-word-section');
    }

  async startPracticeSession(wordIds = null, range = null) {
    let wordsToPractice;
    
    if (range) {
        wordsToPractice = await this.getWordsByRange(range.start, range.end);
    } else if (!wordIds) {
        const allWords = await this.getAllWords();
        wordsToPractice = this.shuffleArray([...allWords]);
    } else {
        const words = await Promise.all(wordIds.map(id => this.getWord(id)));
        wordsToPractice = this.shuffleArray(words);
    }

    console.log('🚀 شروع تمرین فلش کارت:', {
        totalWords: wordsToPractice.length,
        words: wordsToPractice.map(w => w.german)
    });

    this.practiceSession = {
        words: wordsToPractice,
        currentIndex: 0,
        correct: 0,
        incorrect: 0
    };
    
    this.showNextPracticeWord();
    this.showSection('practice-section');
}
async showNextPracticeWord() {
    console.log('🔍 فلش کارت - وضعیت:', {
        currentIndex: this.practiceSession.currentIndex,
        totalWords: this.practiceSession.words.length
    });

    // بررسی کنیم آیا به انتها رسیده‌ایم
    if (this.practiceSession.currentIndex >= this.practiceSession.words.length) {
        console.log('🎯 نمایش نتایج نهایی');
        this.showPracticeResults();
        return;
    }

    const word = this.practiceSession.words[this.practiceSession.currentIndex];
    console.log('📖 نمایش لغت:', word.german);

    const showGermanFirst = Math.random() > 0.5;
    
    document.getElementById('practice-section').innerHTML = `
        <div class="flashcard" id="practice-flashcard">
            <div class="flashcard-inner">
                <div class="flashcard-front">
                    <div class="flashcard-word">
                        ${showGermanFirst ? word.german : word.persian}
                    </div>
                    ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                    ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
                    <div class="flashcard-actions">
                        <button class="btn btn-outline" id="flip-card-btn">نمایش پاسخ</button>
                    </div>
                </div>
                <div class="flashcard-back">
                    <div class="flashcard-word">
                        ${showGermanFirst ? word.persian : word.german}
                    </div>
                    ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                    ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
                    
                    ${word.verbForms ? `
                        <div class="verb-forms mt-3">
                            <div class="verb-form-row">
                                <div>
                                    <div class="verb-form-label">حال ساده</div>
                                    <input type="text" class="form-control" value="${word.verbForms.present || ''}" readonly>
                                </div>
                                <div>
                                    <div class="verb-form-label">گذشته</div>
                                    <input type="text" class="form-control" value="${word.verbForms.past || ''}" readonly>
                                </div>
                                <div>
                                    <div class="verb-form-label">گذشته کامل</div>
                                    <input type="text" class="form-control" value="${word.verbForms.perfect || ''}" readonly>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="flashcard-actions">
                        <button class="btn btn-success" id="correct-btn">بلدم ✅</button>
                        <button class="btn btn-danger" id="incorrect-btn">نبلدم ❌</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${(this.practiceSession.currentIndex / this.practiceSession.words.length) * 100}%"></div>
        </div>
        <p class="text-center mt-2">
            ${this.practiceSession.currentIndex + 1} از ${this.practiceSession.words.length}
        </p>
    `;

    // تنظیم event listeners
    this.setupFlashcardEventListeners();
}
setupFlashcardEventListeners() {
    console.log('🔧 تنظیم event listeners فلش کارت...');

    // دکمه چرخش
    const flipBtn = document.getElementById('flip-card-btn');
    if (flipBtn) {
        flipBtn.onclick = () => {
            console.log('🔄 چرخش فلش کارت');
            document.getElementById('practice-flashcard').classList.add('flipped');
        };
    }

    // دکمه بلدم
    const correctBtn = document.getElementById('correct-btn');
    if (correctBtn) {
        correctBtn.onclick = () => {
            console.log('✅ پاسخ صحیح - رفتن به لغت بعدی');
            this.handleFlashcardAnswer(true);
        };
    }

    // دکمه نبلدم
    const incorrectBtn = document.getElementById('incorrect-btn');
    if (incorrectBtn) {
        incorrectBtn.onclick = () => {
            console.log('❌ پاسخ نادرست - رفتن به لغت بعدی');
            this.handleFlashcardAnswer(false);
        };
    }
    
    console.log('✅ event listeners فلش کارت تنظیم شد');
}
async handleFlashcardAnswer(isCorrect) {
    const currentIndex = this.practiceSession.currentIndex;
    
    // مطمئن شویم ایندکس معتبر است
    if (currentIndex >= this.practiceSession.words.length) {
        console.log('⚠️ ایندکس نامعتبر - نمایش نتایج');
        this.showPracticeResults();
        return;
    }
    
    const word = this.practiceSession.words[currentIndex];
    
    console.log(`📊 ثبت پاسخ برای لغت ${currentIndex + 1}: ${word.german} - ${isCorrect ? 'صحیح' : 'نادرست'}`);
    
    await this.recordPractice(word.id, isCorrect);
    
    if (isCorrect) {
        this.practiceSession.correct++;
    } else {
        this.practiceSession.incorrect++;
    }
    
    // افزایش ایندکس و نمایش لغت بعدی
    this.practiceSession.currentIndex++;
    this.showNextPracticeWord();
}
    showPracticeResults() {
    const totalWords = this.practiceSession.words.length;
    const correctAnswers = this.practiceSession.correct;
    const incorrectAnswers = this.practiceSession.incorrect;
    const accuracy = totalWords > 0 ? Math.round((correctAnswers / totalWords) * 100) : 0;
    
    console.log('📊 نمایش نتایج تمرین:', {
        totalWords,
        correctAnswers,
        incorrectAnswers,
        accuracy
    });
    
    document.getElementById('practice-section').innerHTML = `
        <div class="word-card text-center">
            <h3>نتایج تمرین</h3>
            <div class="stats-grid my-4">
                <div class="stat-card">
                    <div class="stat-title">تعداد لغات</div>
                    <div class="stat-value">${totalWords}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">پاسخ صحیح</div>
                    <div class="stat-value">${correctAnswers}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">پاسخ نادرست</div>
                    <div class="stat-value">${incorrectAnswers}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-title">میزان دقت</div>
                    <div class="stat-value">${accuracy}%</div>
                </div>
            </div>
            
            <div class="action-buttons">
                <button class="btn btn-primary" id="practice-again-btn">تمرین مجدد</button>
                <button class="btn btn-outline" id="back-to-menu-btn">بازگشت به منو</button>
            </div>
        </div>
    `;
    
    // اضافه کردن event listeners برای دکمه‌ها
    document.getElementById('practice-again-btn')?.addEventListener('click', () => {
        this.startPracticeSession();
    });
    
    document.getElementById('back-to-menu-btn')?.addEventListener('click', () => {
        this.renderPracticeOptions();
    });
}
    // =====================
    // Quiz System
    // =====================
    async renderPracticeOptions() {
  const totalWords = (await this.getAllWords()).length;
  
  document.getElementById('practice-section').innerHTML = `
    <div class="word-card">
      <h3>تنظیمات تمرین</h3>
      
      <div class="form-group">
        <label>محدوده لغات:</label>
        <div class="range-selector">
          <div class="range-inputs">
            <input type="number" id="range-start" min="1" max="${totalWords}" 
                   placeholder="شروع" class="form-control">
            <span>تا</span>
            <input type="number" id="range-end" min="1" max="${totalWords}" 
                   placeholder="پایان" class="form-control">
          </div>
          <small class="text-muted">برای تمرین از همه لغات، فیلدها را خالی بگذارید</small>
        </div>
      </div>
      
      <div class="form-group">
        <label>نوع تمرین:</label>
        <select id="practice-type" class="form-control">
          <option value="flashcards">فلش کارت</option>
          <option value="quiz">آزمون چندگزینه‌ای</option>
          <option value="writing">تمرین نوشتاری</option>
        </select>
      </div>
      
      <div class="action-buttons">
        <button class="btn btn-primary" id="start-practice-btn">شروع تمرین</button>
      </div>
    </div>

    <div class="word-card">
      <h3>تمرین‌های پیشرفته</h3>
      
      <div class="practice-options-grid">
        <div class="practice-option-card">
          <div class="practice-icon">
            <i class="fas fa-headphones"></i>
          </div>
          <h4>تمرین شنیداری</h4>
          <p>گوش دادن به تلفظ و تشخیص لغت</p>
          <button class="btn btn-primary start-listening-btn">
            شروع
          </button>
        </div>

        <div class="practice-option-card">
          <div class="practice-icon">
            <i class="fas fa-keyboard"></i>
          </div>
          <h4>تمرین نگارش</h4>
          <p>تایپ کردن صحیح لغات آلمانی</p>
          <button class="btn btn-primary start-writing-btn">
            شروع
          </button>
        </div>

        <div class="practice-option-card">
          <div class="practice-icon">
            <i class="fas fa-comments"></i>
          </div>
          <h4>تمرین جمله‌سازی</h4>
          <p>ساخت جمله با لغات یادگرفته</p>
          <button class="btn btn-primary start-speaking-btn">
            شروع
          </button>
        </div>
      </div>
    </div>
  `;
  
  // اضافه کردن event listeners برای دکمه‌های تمرین پیشرفته
  this.setupAdvancedPracticeButtons();
  
  // event listener برای تمرین معمولی
  document.getElementById('start-practice-btn').addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start').value);
    const end = parseInt(document.getElementById('range-end').value);
    const practiceType = document.getElementById('practice-type').value;
    
    let range = null;
    if (start && end) {
      if (start >= end) {
        this.showToast('محدوده شروع باید کوچکتر از پایان باشد', 'error');
        return;
      }
      range = { start, end };
    }
    
    if (practiceType === 'flashcards') {
      this.startPracticeSession(null, range);
    } else if (practiceType === 'quiz') {
      this.startQuiz(null, range);
    } else {
      this.startWritingPractice(null, range);
    }
  });
}

// متد جدید برای تنظیم event listeners تمرین‌های پیشرفته
setupAdvancedPracticeButtons() {
  // تمرین شنیداری
  document.querySelector('.start-listening-btn')?.addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start')?.value);
    const end = parseInt(document.getElementById('range-end')?.value);
    
    let range = null;
    if (start && end) {
      range = { start, end };
    }
    
    this.startListeningPractice(null, range);
  });
  
  // تمرین نگارش
  document.querySelector('.start-writing-btn')?.addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start')?.value);
    const end = parseInt(document.getElementById('range-end')?.value);
    
    let range = null;
    if (start && end) {
      range = { start, end };
    }
    
    this.startWritingPractice(null, range);
  });
  
  // تمرین جمله‌سازی
  document.querySelector('.start-speaking-btn')?.addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start')?.value);
    const end = parseInt(document.getElementById('range-end')?.value);
    
    let range = null;
    if (start && end) {
      range = { start, end };
    }
    
    this.startSpeakingPractice(null, range);
  });
}
async startQuiz(wordIds = null, range = null) {
  let words;
  
  if (range) {
    words = await this.getWordsByRange(range.start, range.end);
  } else if (!wordIds) {
    words = await this.getAllWords();
  } else {
    words = await Promise.all(wordIds.map(id => this.getWord(id)));
  }
  
  if (words.length < 4) {
    this.showToast('حداقل به ۴ لغت برای شروع آزمون نیاز دارید', 'error');
    return;
  }
  
  this.quizSession = {
    words: this.shuffleArray([...words]),
    currentIndex: 0,
    score: 0,
    questions: []
  };
  
  this.prepareNextQuizQuestion();
  this.showSection('quiz-section');
}

    prepareNextQuizQuestion() {
  if (this.quizSession.currentIndex >= 10 || 
      this.quizSession.currentIndex >= this.quizSession.words.length) {
    this.showQuizResults();
    return;
  }
  
  const correctWord = this.quizSession.words[this.quizSession.currentIndex];
  
  // Randomly decide question type (50/50 chance)
  const questionType = Math.random() > 0.5 ? 'meaning' : 'word';
  
  // Prepare 3 random wrong answers
  const wrongAnswers = [];
  const usedIndices = new Set([this.quizSession.currentIndex]);
  
  while (wrongAnswers.length < 3 && usedIndices.size < this.quizSession.words.length) {
    const randomIndex = Math.floor(Math.random() * this.quizSession.words.length);
    if (!usedIndices.has(randomIndex)) {
      wrongAnswers.push(
        questionType === 'meaning' 
          ? this.quizSession.words[randomIndex].persian // برای سوالات معنی، گزینه‌های نادرست فارسی
          : this.quizSession.words[randomIndex].german  // برای سوالات معادل آلمانی، گزینه‌های نادرست آلمانی
      );
      usedIndices.add(randomIndex);
    }
  }
  
  // تعیین پاسخ صحیح بر اساس نوع سوال
  const correctAnswer = questionType === 'meaning' 
    ? correctWord.persian 
    : correctWord.german;
  
  // Combine and shuffle options
  const options = this.shuffleArray([
    correctAnswer,
    ...wrongAnswers
  ]);
  
  const question = {
    word: correctWord,
    questionType,
    options,
    correctAnswer,
    userAnswer: null,
    isCorrect: null
  };
  
  this.quizSession.questions.push(question);
  this.renderQuizQuestion(question);
}

    renderQuizQuestion(question) {
      document.getElementById('quiz-section').innerHTML = `
        <div class="word-card">
          <div class="quiz-question">
            ${question.questionType === 'meaning' 
              ? `معنی لغت <strong>${question.word.german}</strong> چیست؟`
              : `کدام گزینه معادل آلمانی <strong>${question.word.persian}</strong> است؟`}
          </div>
          
          <div class="quiz-options">
            ${question.options.map((option, index) => `
              <div class="quiz-option" data-index="${index}">
                ${String.fromCharCode(1776 + index)}. ${option}
              </div>
            `).join('')}
          </div>
          
          <div class="quiz-feedback ${question.isCorrect ? 'correct' : 'incorrect'}" 
               style="display: ${question.userAnswer !== null ? 'block' : 'none'}">
            ${question.isCorrect 
              ? '✅ پاسخ شما صحیح است!' 
              : `❌ پاسخ صحیح: ${question.correctAnswer}`}
          </div>
          
          <div class="quiz-nav">
            <button class="btn btn-outline" id="quiz-skip-btn" 
                    ${question.userAnswer !== null ? 'disabled' : ''}>رد کردن</button>
            <div>
              سوال ${this.quizSession.currentIndex + 1} از ${Math.min(10, this.quizSession.words.length)}
            </div>
            <button class="btn btn-primary" id="quiz-next-btn" 
                    ${question.userAnswer === null ? 'disabled' : ''}>
              ${this.quizSession.currentIndex + 1 >= Math.min(10, this.quizSession.words.length) 
                ? 'مشاهده نتایج' 
                : 'بعدی'}
            </button>
          </div>
        </div>
      `;
      
      // Add event listeners
      document.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', () => {
          if (question.userAnswer !== null) return;
          
          const selectedIndex = parseInt(option.getAttribute('data-index'));
          const selectedAnswer = question.options[selectedIndex];
          
          question.userAnswer = selectedAnswer;
          question.isCorrect = selectedAnswer === question.correctAnswer;
          
          if (question.isCorrect) {
            this.quizSession.score++;
          }
          
          // Highlight selected option
          document.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
          });
          
          option.classList.add('selected');
          option.classList.add(question.isCorrect ? 'correct' : 'incorrect');
          
          // Show feedback
          document.querySelector('.quiz-feedback').style.display = 'block';
          
          // Enable next button
          document.getElementById('quiz-next-btn').disabled = false;
        });
      });
      
      document.getElementById('quiz-skip-btn').addEventListener('click', () => {
        this.quizSession.currentIndex++;
        this.prepareNextQuizQuestion();
      });
      
      document.getElementById('quiz-next-btn').addEventListener('click', () => {
        this.quizSession.currentIndex++;
        this.prepareNextQuizQuestion();
      });
    }

    showQuizResults() {
      const scorePercentage = Math.round((this.quizSession.score / this.quizSession.questions.length) * 100);
      
      document.getElementById('quiz-section').innerHTML = `
        <div class="word-card text-center">
          <h3>نتایج آزمون</h3>
          
          <div class="progress-circle mx-auto my-4" style="background: conic-gradient(
            #2ecc71 0% ${scorePercentage}%, 
            #e74c3c ${scorePercentage}% 100%
          );">
            <div class="progress-circle-inner">
              <span>${scorePercentage}%</span>
            </div>
          </div>
          
          <p class="my-3">
            شما ${this.quizSession.score} از ${this.quizSession.questions.length} سوال را صحیح پاسخ دادید
          </p>
          
          <div class="quiz-results-details">
            ${this.quizSession.questions.map((q, i) => `
              <div class="quiz-result-item ${q.isCorrect ? 'correct' : 'incorrect'}">
                <div class="quiz-result-question">
                  <span>سوال ${i + 1}:</span>
                  ${q.questionType === 'meaning' 
                    ? `معنی <strong>${q.word.german}</strong>` 
                    : `معادل آلمانی <strong>${q.word.persian}</strong>`}
                </div>
                <div class="quiz-result-answer">
                  ${q.isCorrect ? '✅' : '❌'} پاسخ شما: ${q.userAnswer || '--'}
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="action-buttons mt-4">
            <button class="btn btn-primary" id="quiz-restart-btn">شروع آزمون جدید</button>
            <button class="btn btn-outline" id="quiz-back-btn">بازگشت به منو</button>
          </div>
        </div>
      `;
      
      document.getElementById('quiz-restart-btn').addEventListener('click', () => {
        this.startQuiz();
      });
      
      document.getElementById('quiz-back-btn').addEventListener('click', () => {
        this.showSection('word-list-section');
      });
    }

    // =====================
    // Stats & Reports
    // =====================
   async updateStats() {
    const words = await this.getAllWords();
    const practiceHistory = await this.getAllPracticeHistory();
    
    const totalWords = words.length;
    const totalFavorites = this.favorites.size;
    const totalPractice = practiceHistory.length;
    const correctPractice = practiceHistory.filter(h => h.correct).length;
    const accuracy = totalPractice > 0 ? Math.round((correctPractice / totalPractice) * 100) : 0;
    
    // تصادفی کردن ۱۰ لغت اخیر
    const recentWords = this.shuffleArray([...words]).slice(0, 10);
    
    document.getElementById('progress-section').innerHTML = `
        <h2>آمار و پیشرفت</h2>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-title">تعداد لغات</div>
                <div class="stat-value">${totalWords}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">علاقه‌مندی‌ها</div>
                <div class="stat-value">${totalFavorites}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">تمرین‌ها</div>
                <div class="stat-value">${totalPractice}</div>
            </div>
            <div class="stat-card">
                <div class="stat-title">میزان دقت</div>
                <div class="stat-value">${accuracy}%</div>
            </div>
        </div>
        
        <div class="word-card mt-4">
            <h3 class="mb-3">۱۰ لغت تصادفی</h3>
            <div class="word-list">
                ${recentWords.map(word => `
                    <div class="word-list-item" data-id="${word.id}">
                        <div class="word-list-item-header">
                            <div>
                                <span class="word-list-item-title">${word.german}</span>
                                ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                            </div>
                            <i class="fas fa-star favorite-icon ${this.favorites.has(word.id) ? 'active' : ''}" data-id="${word.id}"></i>
                        </div>
                        <div class="word-list-item-meaning">${word.persian}</div>
                        <div class="word-list-item-actions">
                            <button class="btn btn-sm btn-outline view-word" data-id="${word.id}">مشاهده</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add event listeners
    document.querySelectorAll('.favorite-icon').forEach(icon => {
        icon.addEventListener('click', async (e) => {
            e.stopPropagation();
            const wordId = parseInt(icon.getAttribute('data-id'));
            await this.toggleFavorite(wordId);
            icon.classList.toggle('active');
            this.updateStats(); // بروزرسانی پس از تغییر علاقه‌مندی
        });
    });
    
    document.querySelectorAll('.view-word').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const wordId = parseInt(btn.getAttribute('data-id'));
            const word = await this.getWord(wordId);
            this.renderWordDetails(word);
            this.showSection('search-section');
        });
    });
}
// این متد را به کلاس GermanDictionary اضافه کنید:
// این متد را به کلاس GermanDictionary اضافه کنید:

// متد برای تنظیم event listeners لیست لغات
setupWordListEventListeners() {
  document.querySelectorAll('.favorite-icon').forEach(icon => {
    icon.addEventListener('click', async (e) => {
      e.stopPropagation();
      const wordId = parseInt(icon.getAttribute('data-id'));
      await this.toggleFavorite(wordId);
      icon.classList.toggle('active');
      
      // اگر در بخش علاقه‌مندی‌ها هستیم، لیست را به‌روزرسانی کنیم
      if (document.getElementById('favorites-section').classList.contains('active')) {
        this.renderFavorites();
      }
    });
  });
  
  document.querySelectorAll('.view-word').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wordId = parseInt(btn.getAttribute('data-id'));
      const word = await this.getWord(wordId);
      this.renderWordDetails(word);
      this.showSection('search-section');
    });
  });
  
  document.querySelectorAll('.practice-word').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const wordId = parseInt(btn.getAttribute('data-id'));
      this.startPracticeSession([wordId]);
    });
  });
}
setupMusicUploadEventListeners() {
    const uploadArea = document.getElementById('music-upload-area');
    const musicUpload = document.getElementById('music-upload');
    
    if (uploadArea && musicUpload) {
        // کلیک روی area
        uploadArea.addEventListener('click', () => {
            musicUpload.click();
        });
        
        // تغییر فایل‌ها
        musicUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleMusicUpload(e.target.files);
            }
        });
        
        // drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.handleMusicUpload(e.dataTransfer.files);
            }
        });
    }

    // بقیه دکمه‌های موسیقی
    document.getElementById('play-music-btn')?.addEventListener('click', () => {
        this.playBackgroundMusic();
    });

    document.getElementById('stop-music-btn')?.addEventListener('click', () => {
        this.stopBackgroundMusic();
    });

    document.getElementById('music-volume')?.addEventListener('input', (e) => {
        this.setMusicVolume(e.target.value);
    });

    document.getElementById('background-music')?.addEventListener('change', (e) => {
        this.changeBackgroundMusic(e.target.value);
    });

    // نمایش لیست موسیقی‌ها
    this.renderUploadedMusicList();
}
// متد برای بارگذاری محتوای بخش علاقه‌مندی‌ها
async renderFavorites() {
  const words = await this.getAllWords();
  const favoriteWords = words.filter(word => this.favorites.has(word.id));
  
  document.getElementById('favorites-section').innerHTML = `
    <h2>لغات مورد علاقه (${favoriteWords.length})</h2>
    
    ${favoriteWords.length > 0 ? `
      <div class="word-list">
        ${favoriteWords.map(word => `
          <div class="word-list-item" data-id="${word.id}">
            <div class="word-list-item-header">
              <div>
                <span class="word-list-item-title">${word.german}</span>
                ${word.gender ? `<span class="word-gender ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                ${word.type ? `<span class="word-type">${this.getTypeLabel(word.type)}</span>` : ''}
              </div>
              <i class="fas fa-star favorite-icon active" data-id="${word.id}"></i>
            </div>
            <div class="word-list-item-meaning">${word.persian}</div>
            <div class="word-list-item-actions">
              <button class="btn btn-sm btn-outline view-word" data-id="${word.id}">مشاهده</button>
              <button class="btn btn-sm btn-outline practice-word" data-id="${word.id}">تمرین</button>
            </div>
          </div>
        `).join('')}
      </div>
    ` : `
      <div class="word-card text-center">
        <p>هیچ لغتی به علاقه‌مندی‌ها اضافه نشده است</p>
      </div>
    `}
  `;
  
  // Add event listeners to the rendered elements
  this.setupWordListEventListeners();
}
    async getAllPracticeHistory() {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(['practiceHistory'], 'readonly');
        const store = transaction.objectStore('practiceHistory');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    }

 renderSettings() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    document.getElementById('settings-section').innerHTML = `
        <h2>تنظیمات</h2>
        
        <div class="word-card">
            <h3 class="mb-3">ظاهر برنامه</h3>
            
            <div class="form-group">
                <label>حالت تاریک:</label>
                <label class="switch">
                    <input type="checkbox" id="dark-mode-toggle" ${isDarkMode ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
            </div>
            
            <div class="form-group">
                <label for="font-size-select">اندازه فونت:</label>
                <select id="font-size-select" class="form-control">
                    <option value="small">کوچک</option>
                    <option value="medium" selected>متوسط</option>
                    <option value="large">بزرگ</option>
                </select>
            </div>
        </div>
        
        <div class="word-card mt-4">
            <h3 class="mb-3">مدیریت داده‌ها</h3>
            
            <div class="action-buttons">
                <button class="btn btn-outline" id="export-data-btn">صدور داده‌ها</button>
                <button class="btn btn-outline" id="import-data-btn">ورود داده‌ها</button>
                <button class="btn btn-outline" id="export-german-words-btn">ذخیره لغات آلمانی</button>
                <button class="btn btn-danger" id="reset-data-btn">بازنشانی برنامه</button>
            </div>
        </div>

         <div class="word-card mt-4">
        <h3 class="mb-3">🎵 مدیریت موسیقی</h3>
        
        <div class="form-group">
            <label>آپلود موسیقی و عکس:</label>
            <div class="upload-area" id="music-upload-area">
                <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: var(--primary); margin-bottom: 10px;"></i>
                <p>فایل‌های خود را اینجا رها کنید یا برای انتخاب کلیک کنید</p>
                <input type="file" id="music-upload" accept="audio/*,image/*" multiple 
                       style="display: none">
            </div>
            <div id="uploaded-music-list" class="mt-3"></div>
        </div>

        <div class="form-group">
            <label>موسیقی زمینه:</label>
            <select id="background-music" class="form-control">
                <option value="none">🎵 موسیقی آپلود شده</option>
                <option value="calm">🌊 آرامش بخش</option>
                <option value="focus">🎯 تمرکز</option>
                <option value="classical">🎻 کلاسیک</option>
            </select>
        </div>

        <div class="form-group">
            <label>صدای موسیقی: <span id="volume-value">50%</span></label>
            <input type="range" id="music-volume" min="0" max="100" value="50" class="form-control">
        </div>

        <div class="action-buttons" style="display: flex; gap: 10px;">
            <button class="btn btn-primary" id="play-music-btn" style="flex: 1;">▶ پخش موسیقی</button>
            <button class="btn btn-outline" id="stop-music-btn" style="flex: 1;">⏹ توقف</button>
        </div>
    </div>



        <div class="word-card mt-4">
    <h3 class="mb-3">🎨 شخصی‌سازی پیشرفته</h3>
    
    <div class="form-group">
        <label>پوسته رنگی:</label>
        <div class="theme-selector">
            <div class="theme-options">
                <div class="theme-option ${localStorage.getItem('theme') === 'blue' ? 'active' : ''}" data-theme="blue">
                    <div class="theme-preview blue-theme"></div>
                    <span>آبی</span>
                </div>
                <div class="theme-option ${localStorage.getItem('theme') === 'green' ? 'active' : ''}" data-theme="green">
                    <div class="theme-preview green-theme"></div>
                    <span>سبز</span>
                </div>
                <div class="theme-option ${localStorage.getItem('theme') === 'purple' ? 'active' : ''}" data-theme="purple">
                    <div class="theme-preview purple-theme"></div>
                    <span>بنفش</span>
                </div>
                <div class="theme-option ${localStorage.getItem('theme') === 'orange' ? 'active' : ''}" data-theme="orange">
                    <div class="theme-preview orange-theme"></div>
                    <span>نارنجی</span>
                </div>
            </div>
        </div>
    </div>

    <div class="form-group">
        <label>سبک آیکون‌ها:</label>
        <div class="icon-style-selector">
            <div class="icon-style-option ${localStorage.getItem('iconStyle') === 'default' ? 'active' : ''}" data-style="default">
                <i class="fas fa-star"></i>
                <span>پیش‌فرض</span>
            </div>
            <div class="icon-style-option ${localStorage.getItem('iconStyle') === 'modern' ? 'active' : ''}" data-style="modern">
                <i class="fas fa-star modern-icon"></i>
                <span>مدرن</span>
            </div>
            <div class="icon-style-option ${localStorage.getItem('iconStyle') === 'minimal' ? 'active' : ''}" data-style="minimal">
                <i class="fas fa-star minimal-icon"></i>
                <span>مینیمال</span>
            </div>
        </div>
    </div>

    <div class="form-group">
        <label>چیدمان صفحات:</label>
        <select id="layout-style" class="form-control">
            <option value="default" ${localStorage.getItem('layout') === 'default' ? 'selected' : ''}>پیش‌فرض</option>
            <option value="compact" ${localStorage.getItem('layout') === 'compact' ? 'selected' : ''}>فشرده</option>
            <option value="spacious" ${localStorage.getItem('layout') === 'spacious' ? 'selected' : ''}>باز</option>
        </select>
    </div>
<div class="form-group">
    <label>رنگ سفارشی:</label>
    <div class="color-picker-container">
        <div class="color-preview" id="color-preview"></div>
        
        <div class="rgb-controls">
            <label>قرمز:</label>
            <div>
                <input type="range" id="color-red" min="0" max="255" value="102" class="form-control">
                <div class="rgb-value" id="red-value">102</div>
            </div>
        </div>
        
        <div class="rgb-controls">
            <label>سبز:</label>
            <div>
                <input type="range" id="color-green" min="0" max="255" value="126" class="form-control">
                <div class="rgb-value" id="green-value">126</div>
            </div>
        </div>
        
        <div class="rgb-controls">
            <label>آبی:</label>
            <div>
                <input type="range" id="color-blue" min="0" max="255" value="234" class="form-control">
                <div class="rgb-value" id="blue-value">234</div>
            </div>
        </div>
        
        <div class="color-presets">
            <div class="color-preset" style="background: #667eea;" data-color="#667eea"></div>
            <div class="color-preset" style="background: #4CAF50;" data-color="#4CAF50"></div>
            <div class="color-preset" style="background: #9c27b0;" data-color="#9c27b0"></div>
            <div class="color-preset" style="background: #ff9800;" data-color="#ff9800"></div>
            <div class="color-preset" style="background: #f44336;" data-color="#f44336"></div>
            <div class="color-preset" style="background: #2196F3;" data-color="#2196F3"></div>
            <div class="color-preset" style="background: #00BCD4;" data-color="#00BCD4"></div>
            <div class="color-preset" style="background: #8BC34A;" data-color="#8BC34A"></div>
            <div class="color-preset" style="background: #FFC107;" data-color="#FFC107"></div>
            <div class="color-preset" style="background: #795548;" data-color="#795548"></div>
            <div class="color-preset" style="background: #607D8B;" data-color="#607D8B"></div>
            <div class="color-preset" style="background: #E91E63;" data-color="#E91E63"></div>
        </div>
         <br>
        <button class="btn btn-outline btn-sm mt-2" id="apply-custom-color">
       
            <i class="fas fa-palette"></i> اعمال رنگ سفارشی
        </button>
    </div>
</div>
    <div class="action-buttons">
        <button class="btn btn-outline" id="reset-customization-btn">بازنشانی تنظیمات</button>
    </div>
</div>

    `;
    
    // بقیه event listeners تنظیمات...
    document.getElementById('dark-mode-toggle').addEventListener('change', (e) => {
        localStorage.setItem('darkMode', e.target.checked);
        document.body.classList.toggle('dark-mode', e.target.checked);
    });
    
    document.getElementById('font-size-select').addEventListener('change', (e) => {
        document.body.style.fontSize = e.target.value === 'small' ? '14px' : 
                                      e.target.value === 'large' ? '18px' : '16px';
    });
    
    document.getElementById('export-data-btn').addEventListener('click', () => {
        this.exportData();
    });
    
    document.getElementById('import-data-btn').addEventListener('click', () => {
        document.getElementById('import-file-input')?.click();
    });
    
    document.getElementById('export-german-words-btn').addEventListener('click', () => {
        this.exportGermanWordsToTxt();
    });
    
    document.getElementById('reset-data-btn').addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید؟ تمام داده‌های برنامه حذف خواهند شد.')) {
            this.resetData();
        }
    });

    // ایجاد hidden file input برای ایمپورت
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'import-file-input';
    fileInput.style.display = 'none';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', (e) => {
        this.importData(e.target.files[0]);
    });
    document.body.appendChild(fileInput);

    // تنظیم event listeners برای موسیقی
    
    this.setupCustomizationEventListeners();
    this.setupColorPickerEventListeners();
    
    this.setupMusicUploadEventListeners();
    
}
// مدیریت RGB Color Picker
setupColorPickerEventListeners() {
    const redSlider = document.getElementById('color-red');
    const greenSlider = document.getElementById('color-green');
    const blueSlider = document.getElementById('color-blue');
    const colorPreview = document.getElementById('color-preview');
    const applyBtn = document.getElementById('apply-custom-color');

    // آپدیت پیش‌نمایش رنگ
    const updateColorPreview = () => {
        const red = redSlider.value;
        const green = greenSlider.value;
        const blue = blueSlider.value;
        const color = `rgb(${red}, ${green}, ${blue})`;
        
        colorPreview.style.background = color;
        
        // آپدیت مقادیر
        document.getElementById('red-value').textContent = red;
        document.getElementById('green-value').textContent = green;
        document.getElementById('blue-value').textContent = blue;
    };

    // event listeners برای اسلایدرها
    [redSlider, greenSlider, blueSlider].forEach(slider => {
        slider.addEventListener('input', updateColorPreview);
    });

    // اعمال رنگ سفارشی
    applyBtn?.addEventListener('click', () => {
        const red = redSlider.value;
        const green = greenSlider.value;
        const blue = blueSlider.value;
        this.applyCustomColor(red, green, blue);
    });

    // preset colors
    document.querySelectorAll('.color-preset').forEach(preset => {
        preset.addEventListener('click', (e) => {
            const color = e.target.getAttribute('data-color');
            this.applyHexColor(color);
        });
    });

    // بارگذاری رنگ ذخیره شده
    this.loadCustomColor();
}

// اعمال رنگ سفارشی
applyCustomColor(red, green, blue) {
    const color = `rgb(${red}, ${green}, ${blue})`;
    const hex = this.rgbToHex(red, green, blue);
    
    // اعمال رنگ به متغیرهای CSS
    document.documentElement.style.setProperty('--primary', color);
    document.documentElement.style.setProperty('--primary-dark', this.darkenColor(red, green, blue, 20));
    
    // ذخیره در localStorage
    localStorage.setItem('customColor', JSON.stringify({ red, green, blue }));
    localStorage.setItem('theme', 'custom');
    
    this.showToast('رنگ سفارشی اعمال شد', 'success');
    this.applyTheme('custom');
}

// اعمال رنگ HEX
applyHexColor(hex) {
    const rgb = this.hexToRgb(hex);
    if (rgb) {
        document.getElementById('color-red').value = rgb.r;
        document.getElementById('color-green').value = rgb.g;
        document.getElementById('color-blue').value = rgb.b;
        this.updateColorPreview();
        this.applyCustomColor(rgb.r, rgb.g, rgb.b);
    }
}

// تبدیل RGB به HEX
rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (parseInt(r) << 16) + (parseInt(g) << 8) + parseInt(b)).toString(16).slice(1);
}

// تبدیل HEX به RGB
hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// تیره کردن رنگ
darkenColor(r, g, b, percent) {
    const factor = 1 - (percent / 100);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
}

// بارگذاری رنگ ذخیره شده
loadCustomColor() {
    const savedColor = localStorage.getItem('customColor');
    if (savedColor) {
        const { red, green, blue } = JSON.parse(savedColor);
        document.getElementById('color-red').value = red;
        document.getElementById('color-green').value = green;
        document.getElementById('color-blue').value = blue;
        this.updateColorPreview();
    }
}

// آپدیت پیش‌نمایش رنگ
updateColorPreview() {
    const red = document.getElementById('color-red').value;
    const green = document.getElementById('color-green').value;
    const blue = document.getElementById('color-blue').value;
    const colorPreview = document.getElementById('color-preset');
    
    if (colorPreview) {
        colorPreview.style.background = `rgb(${red}, ${green}, ${blue})`;
    }
}

// اعمال سبک آیکون به همه آیکون‌ها
applyIconStyleToAllIcons(style) {
    // حذف کلاس‌های سبک قبلی
    document.querySelectorAll('.favorite-icon, .pronunciation-icon, .menu-icon').forEach(icon => {
        icon.classList.remove('modern-icon', 'minimal-icon');
        
        // اضافه کردن سبک جدید
        if (style !== 'default') {
            icon.classList.add(style + '-icon');
        }
    });
    
    // آپدیت آیکون‌های منو
    document.querySelectorAll('.menu-item i, .mobile-menu-item i').forEach(icon => {
        const originalClass = icon.className.replace('modern-icon', '').replace('minimal-icon', '').trim();
        icon.className = originalClass;
        if (style !== 'default') {
            icon.classList.add(style + '-icon');
        }
    });
}
// مدیریت شخصی‌سازی
setupCustomizationEventListeners() {
    // انتخاب تم رنگی
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const theme = e.currentTarget.getAttribute('data-theme');
            this.applyTheme(theme);
        });
    });

    // انتخاب سبک آیکون
    document.querySelectorAll('.icon-style-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const style = e.currentTarget.getAttribute('data-style');
            this.applyIconStyle(style);
        });
    });

    // انتخاب چیدمان
    document.getElementById('layout-style')?.addEventListener('change', (e) => {
        this.applyLayout(e.target.value);
    });

    // بازنشانی تنظیمات
    document.getElementById('reset-customization-btn')?.addEventListener('click', () => {
        this.resetCustomization();
    });
}

// اعمال تم رنگی
applyTheme(theme) {
    // حذف تم‌های قبلی
    document.body.classList.remove('blue-theme', 'green-theme', 'purple-theme', 'orange-theme');
    
    // ریست کردن رنگ سفارشی اگر تم غیر از custom انتخاب شد
    if (theme !== 'custom') {
        document.documentElement.style.removeProperty('--primary');
        document.documentElement.style.removeProperty('--primary-dark');
    }
    
    // اضافه کردن تم جدید
    if (theme !== 'default') {
        document.body.classList.add(theme + '-theme');
    }
    
    // ذخیره در localStorage
    localStorage.setItem('theme', theme);
    
    // آپدیت انتخاب‌ها
    this.updateThemeSelection(theme);
    
    this.showToast('تم رنگی اعمال شد', 'success');
}
applyIconStyle(style) {
    localStorage.setItem('iconStyle', style);
    this.updateIconStyleSelection(style);
    this.applyIconStyleToAllIcons(style); // این خط رو اضافه کن
    this.showToast('سبک آیکون‌ها اعمال شد', 'success');
    // رفرش صفحه برای اعمال تغییرات
    setTimeout(() => {
        this.renderWordList();
    }, 500);
}

// اعمال چیدمان
applyLayout(layout) {
    // حذف چیدمان‌های قبلی
    document.body.classList.remove('compact-layout', 'spacious-layout');
    
    // اضافه کردن چیدمان جدید
    if (layout !== 'default') {
        document.body.classList.add(layout + '-layout');
    }
    
    localStorage.setItem('layout', layout);
    this.showToast('چیدمان اعمال شد', 'success');
}

// بازنشانی تنظیمات شخصی‌سازی
resetCustomization() {
    if (confirm('آیا از بازنشانی تنظیمات شخصی‌سازی مطمئن هستید؟')) {
        localStorage.removeItem('theme');
        localStorage.removeItem('iconStyle');
        localStorage.removeItem('layout');
        
        // بازگردانی به حالت پیش‌فرض
        document.body.classList.remove('blue-theme', 'green-theme', 'purple-theme', 'orange-theme');
        document.body.classList.remove('compact-layout', 'spacious-layout');
        
        this.showToast('تنظیمات شخصی‌سازی بازنشانی شد', 'success');
        this.renderSettings(); // رفرش صفحه تنظیمات
    }
}

// آپدیت انتخاب تم
updateThemeSelection(selectedTheme) {
    document.querySelectorAll('.theme-option').forEach(option => {
        const theme = option.getAttribute('data-theme');
        option.classList.toggle('active', theme === selectedTheme);
    });
}

// آپدیت انتخاب سبک آیکون
updateIconStyleSelection(selectedStyle) {
    document.querySelectorAll('.icon-style-option').forEach(option => {
        const style = option.getAttribute('data-style');
        option.classList.toggle('active', style === selectedStyle);
    });
}

loadCustomization() {
    // بارگذاری تم - بدون نمایش پیام
    const theme = localStorage.getItem('theme');
    if (theme) {
        document.body.classList.remove('blue-theme', 'green-theme', 'purple-theme', 'orange-theme');
        if (theme !== 'default') {
            document.body.classList.add(theme + '-theme');
        }
    }

    // بارگذاری چیدمان - بدون نمایش پیام
    const layout = localStorage.getItem('layout');
    if (layout) {
        document.body.classList.remove('compact-layout', 'spacious-layout');
        if (layout !== 'default') {
            document.body.classList.add(layout + '-layout');
        }
    }

    // بارگذاری سبک آیکون - بدون نمایش پیام
    const iconStyle = localStorage.getItem('iconStyle');
    if (iconStyle) {
        this.applyIconStyleToAllIcons(iconStyle);
    }

    // 🔴 این بخش جدید را اضافه کنید - بارگذاری رنگ سفارشی
    const savedColor = localStorage.getItem('customColor');
    if (savedColor) {
        const { red, green, blue } = JSON.parse(savedColor);
        const color = `rgb(${red}, ${green}, ${blue})`;
        document.documentElement.style.setProperty('--primary', color);
        document.documentElement.style.setProperty('--primary-dark', this.darkenColor(red, green, blue, 20));
        
        // همچنین اسلایدرها را آپدیت کن
        if (document.getElementById('color-red')) {
            document.getElementById('color-red').value = red;
            document.getElementById('color-green').value = green;
            document.getElementById('color-blue').value = blue;
            this.updateColorPreview();
        }
    }
}
// تنظیم event listeners برای بخش موسیقی در تنظیمات
setupMusicSettingsEventListeners() {
    // دکمه آپلود
    const uploadBtn = document.getElementById('upload-music-btn');
    const musicUpload = document.getElementById('music-upload');
    
    if (uploadBtn && musicUpload) {
        uploadBtn.addEventListener('click', () => {
            musicUpload.click();
        });
        
        musicUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleMusicUpload(e.target.files[0]);
            }
        });
    }
    if (uploadArea && musicUpload) {
        // کلیک روی area
        uploadArea.addEventListener('click', () => {
            musicUpload.click();
        });
        
        // تغییر فایل‌ها
        musicUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                this.handleMusicUpload(e.target.files);
            }
        });
        
        // drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                this.handleMusicUpload(e.dataTransfer.files);
            }
        });
    }

    // بقیه دکمه‌های موسیقی
    document.getElementById('play-music-btn')?.addEventListener('click', () => {
        this.playBackgroundMusic();
    });

    document.getElementById('stop-music-btn')?.addEventListener('click', () => {
        this.stopBackgroundMusic();
    });

    document.getElementById('music-volume')?.addEventListener('input', (e) => {
        this.setMusicVolume(e.target.value);
    });

    document.getElementById('background-music')?.addEventListener('change', (e) => {
        this.changeBackgroundMusic(e.target.value);
    });

    // نمایش لیست موسیقی‌ها
    this.renderUploadedMusicList();
}

 
    async exportData() {
      const [words, favorites, examples, practiceHistory] = await Promise.all([
        this.getAllWords(),
        new Promise(resolve => {
          const transaction = this.db.transaction(['favorites'], 'readonly');
          const store = transaction.objectStore('favorites');
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
        }),
        new Promise(resolve => {
          const transaction = this.db.transaction(['examples'], 'readonly');
          const store = transaction.objectStore('examples');
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
        }),
        new Promise(resolve => {
          const transaction = this.db.transaction(['practiceHistory'], 'readonly');
          const store = transaction.objectStore('practiceHistory');
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
        })
      ]);
      
      const data = {
        words,
        favorites,
        examples,
        practiceHistory,
        exportedAt: new Date().toISOString(),
        version: 1
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `german-dictionary-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showToast('داده‌ها با موفقیت صادر شد', 'success');
    }
async exportGermanWordsToTxt() {
    try {
        const words = await this.getAllWords();
        
        if (words.length === 0) {
            this.showToast('هیچ لغتی برای ذخیره‌سازی وجود ندارد', 'info');
            return;
        }
        
        let txtContent = '';
        const sortedWords = words.sort((a, b) => a.german.localeCompare(b.german, 'de'));
        
        sortedWords.forEach(word => {
            txtContent += word.german + '\n';
        });
        
        const blob = new Blob([txtContent], { 
            type: 'text/plain; charset=utf-8' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        a.download = `german-words-${date}-${time}.txt`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`تعداد ${words.length} لغت آلمانی ذخیره شد`, 'success');
        
    } catch (error) {
        console.error('Error exporting German words:', error);
        this.showToast('خطا در ذخیره‌سازی لغات آلمانی', 'error');
    }

}
   // این متد importData جدید را جایگزین کنید
async importData(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.words || !Array.isArray(data.words)) {
      throw new Error('فرمت فایل نامعتبر است');
    }

    // 1. پاک کردن داده‌های موجود
    await this.clearAllData();

    // 2. وارد کردن داده‌های جدید
    const transaction = this.db.transaction(
      ['words', 'favorites', 'examples', 'practiceHistory'], 
      'readwrite'
    );

    // وارد کردن لغات
    const wordsStore = transaction.objectStore('words');
    for (const word of data.words) {
      wordsStore.add(word);
    }

    // وارد کردن علاقه‌مندی‌ها
    if (data.favorites && Array.isArray(data.favorites)) {
      const favoritesStore = transaction.objectStore('favorites');
      for (const favorite of data.favorites) {
        favoritesStore.add(favorite);
      }
    }

    // وارد کردن مثال‌ها
    if (data.examples && Array.isArray(data.examples)) {
      const examplesStore = transaction.objectStore('examples');
      for (const example of data.examples) {
        examplesStore.add(example);
      }
    }

    // وارد کردن تاریخچه تمرین
    if (data.practiceHistory && Array.isArray(data.practiceHistory)) {
      const practiceStore = transaction.objectStore('practiceHistory');
      for (const record of data.practiceHistory) {
        practiceStore.add(record);
      }
    }

    // منتظر اتمام تراکنش
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => reject(event.target.error);
    });

    // 3. بارگذاری مجدد داده‌ها
    await this.loadFavorites();
    
    // 4. بروزرسانی UI
    this.showToast('داده‌ها با موفقیت وارد شدند', 'success');
    this.renderWordList();
    this.updateStats();

  } catch (error) {
    console.error('Import error:', error);
    this.showToast('خطا در وارد کردن داده‌ها: ' + error.message, 'error');
  }
}

// این متد جدید را اضافه کنید
async clearAllData() {
  return new Promise((resolve, reject) => {
    const transaction = this.db.transaction(
      ['words', 'favorites', 'examples', 'practiceHistory'], 
      'readwrite'
    );

    // پاک کردن همه داده‌ها
    transaction.objectStore('words').clear();
    transaction.objectStore('favorites').clear();
    transaction.objectStore('examples').clear();
    transaction.objectStore('practiceHistory').clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = (event) => reject(event.target.error);
  });
}
    async clearDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(this.dbName);
        
        request.onsuccess = () => {
          this.db = null;
          this.favorites = new Set();
          resolve();
        };
        
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    }

    async resetData() {
      await this.clearDatabase();
      localStorage.clear();
      location.reload();
    }
    // =====================
    // Helper Methods
    // =====================
    showSection(sectionId) {
      document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(sectionId).classList.add('active');
    }

    setupTabs() {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const tabId = tab.getAttribute('data-tab');
          
          // Update active tab
          document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('active');
          });
          tab.classList.add('active');
          
          // Update active content
          document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
          });
          document.getElementById(`${tabId}-content`).classList.add('active');
        });
      });
    }

    setupPronunciationButtons() {
      document.querySelectorAll('.pronunciation-icon').forEach(btn => {
        btn.addEventListener('click', () => {
          const word = btn.getAttribute('data-word');
          this.speakWord(word, 'de-DE');
        });
      });
    }

    speakWord(text, lang) {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        window.speechSynthesis.speak(utterance);
      } else {
        this.showToast('مرورگر شما از تبدیل متن به گفتار پشتیبانی نمی‌کند', 'error');
      }
    }

    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-times-circle' : 
                         'fa-info-circle'}"></i>
        <span>${message}</span>
        <i class="fas fa-times toast-close"></i>
      `;
      
      document.body.appendChild(toast);
      
      // Auto remove after 5 seconds
      setTimeout(() => {
        toast.remove();
      }, 1500);
      
      // Close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.remove();
      });
    }

    getGenderLabel(gender) {
      return {
        masculine: 'der (مذکر)',
        feminine: 'die (مونث)',
        neuter: 'das (خنثی)'
      }[gender];
    }

    getGenderSymbol(gender) {
      return {
        masculine: 'der',
        feminine: 'die',
        neuter: 'das'
      }[gender];
    }

    getTypeLabel(type) {
      return {
        noun: 'اسم',
        verb: 'فعل',
        adjective: 'صفت',
        adverb: 'قید',
        other: 'سایر'
      }[type];
    }

    shuffleArray(array) {
      const newArray = [...array];
      for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
      }
      return newArray;
    }

    // =====================
    // Event Listeners
    // =====================
    setupEventListeners() {
      // Search functionality
      document.getElementById('search-btn')?.addEventListener('click', () => {
        const query = document.getElementById('search-input').value;
        if (query) {
          this.searchWords(query).then(results => {
            if (results.length > 0) {
              this.renderWordDetails(results[0]);
            } else {
              this.showToast('هیچ نتیجه‌ای یافت نشد', 'info');
            }
          });
        }
      });
      
      document.getElementById('search-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          document.getElementById('search-btn').click();
        }
      });
      
      // Add word form
      document.getElementById('save-word-btn')?.addEventListener('click', async () => {
        const german = document.getElementById('german-word').value;
        const persian = document.getElementById('persian-meaning').value;
        const gender = document.querySelector('.gender-btn.active')?.getAttribute('data-gender') || null;
        const type = document.getElementById('word-type').value;
        
        if (!german || !persian) {
          this.showToast('لطفاً هر دو فیلد لغت و معنی را پر کنید', 'error');
          return;
        }
        
        const wordData = {
          german,
          persian,
          gender,
          type
        };
        console.log('gender selected:', gender);
          if (type === 'verb') {
    const present = document.getElementById('verb-present')?.value.trim() || '';
    const past = document.getElementById('verb-past')?.value.trim() || '';
    const perfect = document.getElementById('verb-perfect')?.value.trim() || '';

    // فقط اگر حداقل یکی پر باشد، اضافه کن
    if (present || past || perfect) {
      wordData.verbForms = { present, past, perfect };
    }
  }
           // 🔴 این بخش جدید را اضافه کن - نمایش/مخفی کردن جنسیت و صرف فعل
    document.getElementById('word-type')?.addEventListener('change', function() {
        const verbSection = document.querySelector('.verb-forms-section');
        const genderSection = document.querySelector('.gender-section');
        
        if (this.value === 'verb') {
            verbSection.style.display = 'block';
            genderSection.style.display = 'none';
        } else if (this.value === 'noun') {
            verbSection.style.display = 'none';
            genderSection.style.display = 'block';
        } else {
            verbSection.style.display = 'none';
            genderSection.style.display = 'none';
        }
    });
    
    // 🔴 این بخش جدید را اضافه کن - مدیریت مودال صرف فعل
    document.getElementById('add-verb-conjugation-btn')?.addEventListener('click', () => {
        document.getElementById('verb-conjugation-modal').style.display = 'block';
    });
    
    document.querySelector('.close-modal')?.addEventListener('click', () => {
        document.getElementById('verb-conjugation-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-verb-btn')?.addEventListener('click', () => {
        document.getElementById('verb-conjugation-modal').style.display = 'none';
    });
    
    document.getElementById('save-verb-forms-btn')?.addEventListener('click', () => {
        this.saveVerbConjugation();
    });
  console.log(JSON.stringify(wordData, null, 2)); 
        await this.addWord(wordData);
        
        // Clear form
        document.getElementById('german-word').value = '';
        document.getElementById('persian-meaning').value = '';
        document.querySelectorAll('.gender-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        document.getElementById('verb-present').value = '';
        document.getElementById('verb-past').value = '';
        document.getElementById('verb-perfect').value = '';
      });
      // در متد setupEventListeners، بخش منو navigation را به این صورت به‌روزرسانی کنید:

// Menu navigation
document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(item => {
  item.addEventListener('click', () => {
    const sectionId = item.getAttribute('data-section') + '-section';
    
    // Special handling for some sections
    if (sectionId === 'progress-section') {
      this.updateStats();
    } else if (sectionId === 'settings-section') {
      this.renderSettings();
    } else if (sectionId === 'quiz-section') {
      this.startQuiz();
    } else if (sectionId === 'practice-section') {
      this.renderPracticeOptions();
    } else if (sectionId === 'flashcards-section') {
      this.startPracticeSession();
    } else if (sectionId === 'favorites-section') {
      this.renderFavorites();
    } else if (sectionId === 'word-list-section') {
      this.renderWordList();
    }
    
    this.showSection(sectionId);
    
    // Update active menu item
    document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(i => {
      i.classList.remove('active');
    });
    item.classList.add('active');
  });
});
      // Gender selection
      document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          document.querySelectorAll('.gender-btn').forEach(b => {
            b.classList.remove('active');
          });
          this.classList.add('active');
        });
      });
      // هایلایت جنسیت هنگام TAB
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('focus', () => {
    btn.style.outline = '2px solid #3498db';
    btn.style.transform = 'scale(1.05)';
  });
  
  btn.addEventListener('blur', () => {
    btn.style.outline = 'none';
    btn.style.transform = 'scale(1)';
  });
});
      // Show/hide verb forms based on word type
      document.getElementById('word-type')?.addEventListener('change', function() {
        const verbFormsDiv = document.querySelector('.verb-forms');
        if (this.value === 'verb') {
          verbFormsDiv.style.display = 'block';
        } else {
          verbFormsDiv.style.display = 'none';
        }
      });
      


      
      // Menu navigation
      document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
          const sectionId = item.getAttribute('data-section') + '-section';
          
          // Special handling for some sections
          if (sectionId === 'progress-section') {
            this.updateStats();
          } else if (sectionId === 'settings-section') {
            this.renderSettings();
          } else if (sectionId === 'quiz-section') {
            this.startQuiz();
          } else if (sectionId === 'practice-section') {
  this.renderPracticeOptions();
} else if (sectionId === 'flashcards-section') {
  this.startPracticeSession();
}
          
          this.showSection(sectionId);
          
          // Update active menu item
          document.querySelectorAll('.menu-item').forEach(i => {
            i.classList.remove('active');
          });
          item.classList.add('active');
        });
      });
      
      // Initialize dark mode
      if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
      }
    }
  }

  // Initialize the app
  const dictionaryApp = new GermanDictionary();
});

// در متد setupEventListeners()، بعد از بخش مربوط به فرم اضافه کردن لغت، این کد را اضافه کنید:

// فیلد آلمانی - اینتر = رفتن به فیلد فارسی
document.getElementById('german-word')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (document.getElementById('german-word').value.trim() !== '') {
      document.getElementById('persian-meaning').focus();
    }
  }
});

// فیلد فارسی - اینتر = ذخیره (یک بار فشار دادن کافی است)
document.getElementById('persian-meaning')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (document.getElementById('persian-meaning').value.trim() !== '') {
      document.getElementById('save-word-btn').click();
    }
  }
});

// هایلایت جنسیت هنگام TAB
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('focus', () => {
    btn.style.outline = '2px solid #3498db';
  });
  
  btn.addEventListener('blur', () => {
    btn.style.outline = 'none';
  });
  
  // اینتر روی جنسیت = ذخیره
  btn.addEventListener('keypress', async (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btn.click();
    await this.saveWord(); // مستقیما متد saveWord را فراخوانی کنید
  }
});
});
  
  


// تغییر در دکمه ذخیره:
document.getElementById('save-word-btn')?.addEventListener('click', async (e) => {
  e.preventDefault(); // از submit سنتی فرم جلوگیری می‌کند
  await this.saveWord();
});
// در متد setupEventListeners()، بعد از کدهای قبلی این قسمت را اضافه کنید:

// Enter key submission for gender buttons
document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('save-word-btn').click();
    }
  });
  
  // این قسمت برای focus گرفتن با کلید Tab و سپس Enter
  btn.setAttribute('tabindex', '0');
});
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuContainer = document.getElementById('mobileMenuContainer');
  
  // مدیریت کلیک دکمه منو
  mobileMenuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    mobileMenuContainer.classList.toggle('active');
  });
  
  // بستن منو با کلیک خارج از آن
  document.addEventListener('click', function() {
    if (mobileMenuContainer.classList.contains('active')) {
      mobileMenuContainer.classList.remove('active');
    }
  });
  
  // جلوگیری از بسته شدن منو هنگام کلیک روی آن
  mobileMenuContainer.addEventListener('click', function(e) {
    e.stopPropagation();
  });
  
  // تغییر بخش‌ها
  document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(item => {
    item.addEventListener('click', function() {
      const sectionId = this.getAttribute('data-section');
      showSection(sectionId);
      mobileMenuContainer.classList.remove('active');
    });
  });
  
  function showSection(sectionId) {
    // مخفی کردن همه بخش‌ها
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.remove('active');
    });
    
    // نمایش بخش انتخاب شده
    document.getElementById(`${sectionId}-section`).classList.add('active');
  }
});

