
// تابع برای بررسی و رفع مشکل چهار بخش در موبایل
function fixMobileSections() {
    // اگر در حالت موبایل هستیم
    if (window.innerWidth <= 992) {
        // بررسی و رفع مشکل هر چهار بخش
        ['settings', 'practice', 'flashcards', 'quiz'].forEach(section => {
            const sectionElement = document.getElementById(`${section}-section`);
            if (sectionElement && sectionElement.innerHTML.trim() === '') {
                loadSectionContent(section);
            }
        });
    }
}


// تابع برای بارگذاری محتوای بخش
function loadSectionContent(sectionName) {
    if (!window.dictionaryApp) {
        console.error('dictionaryApp not found');
        return;
    }
    
    switch(sectionName) {
        case 'settings':
            if (typeof window.dictionaryApp.renderSettings === 'function') {
                window.dictionaryApp.renderSettings();
            }
            break;
        case 'practice':
            if (typeof window.dictionaryApp.renderPracticeOptions === 'function') {
                window.dictionaryApp.renderPracticeOptions();
            }
            break;
        case 'flashcards':
            if (typeof window.dictionaryApp.startPracticeSession === 'function') {
                window.dictionaryApp.startPracticeSession();
            }
            break;
        case 'quiz':
            if (typeof window.dictionaryApp.startQuiz === 'function') {
                window.dictionaryApp.startQuiz();
            }
            break;
    }
}

// اضافه کردن متدهای ضروری به کلاس GermanDictionary
class GermanDictionary {
    constructor() {
        // کدهای موجود...
        
     
      window.addEventListener('resize', () => {
  this.handleResponsive();
});
        // ایجاد global reference
        window.dictionaryApp = this;
        
        // بارگذاری اولیه بخش‌ها
        this.initializeSectionsOnLoad();
    }
    
    // متد جدید برای بارگذاری اولیه بخش‌ها
    initializeSectionsOnLoad() {
        // پس از بارگذاری کامل صفحه
        setTimeout(() => {
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection) {
                const sectionName = activeSection.id.replace('-section', '');
                
                // اگر یکی از چهار بخش مشکل‌دار فعال است
                if (['settings', 'practice', 'flashcards', 'quiz'].includes(sectionName)) {
                    this.loadSectionContent(sectionName);
                }
            }
            
            // همچنین بررسی کلی برای حالت موبایل
            if (window.innerWidth <= 992) {
                fixMobileSections();
            }
        }, 100);
    }
    // این متد را به کلاس GermanDictionary اضافه کنید
setupSettingsEventListeners() {
    // حالت تاریک
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            localStorage.setItem('darkMode', e.target.checked);
            document.body.classList.toggle('dark-mode', e.target.checked);
            this.showToast('تنظیمات ذخیره شد', 'success');
        });
    }
    
    // اندازه فونت
    const fontSizeSelect = document.getElementById('font-size-select');
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => {
            localStorage.setItem('fontSize', e.target.value);
            const size = e.target.value === 'small' ? '14px' : 
                         e.target.value === 'large' ? '18px' : '16px';
            document.body.style.fontSize = size;
            this.showToast('تنظیمات ذخیره شد', 'success');
        });
    }
    
    // دکمه‌های مدیریت داده‌ها
    document.getElementById('export-data-btn')?.addEventListener('click', () => {
        this.exportData();
    });
    
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
        document.getElementById('import-file-input')?.click();
    });
    
    document.getElementById('reset-data-btn')?.addEventListener('click', () => {
        if (confirm('آیا مطمئن هستید؟ تمام داده‌های برنامه حذف خواهند شد.')) {
            this.resetData();
        }
    });
}
    // این متد را به کلاس GermanDictionary اضافه کنید
setupPracticeEventListeners() {
    document.getElementById('start-practice-btn')?.addEventListener('click', () => {
        const start = parseInt(document.getElementById('range-start').value);
        const end = parseInt(document.getElementById('range-end').value);
        const practiceType = document.getElementById('practice-type').value;
        
        if (start && end && start > end) {
            this.showToast('محدوده شروع باید کوچکتر از پایان باشد', 'error');
            return;
        }
        
        const range = start && end ? { start, end } : null;
        
        switch(practiceType) {
            case 'flashcards':
                this.startPracticeSession(null, range);
                break;
            case 'quiz':
                this.startQuiz(null, range);
                break;
            case 'writing':
                this.startWritingPractice(null, range);
                break;
        }

    });
    // این کد را به متد setupSettingsEventListeners اضافه کنید
document.getElementById('import-file-input')?.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        this.importData(e.target.files[0]);
    }
});ظ
}
    // متد برای بارگذاری محتوای بخش
    loadSectionContent(sectionName) {
        switch(sectionName) {
            case 'settings':
                this.renderSettings();
                break;
            case 'practice':
                this.renderPracticeOptions();
                break;
            case 'flashcards':
                this.startPracticeSession();
                break;
            case 'quiz':
                this.startQuiz();
                break;
        }
    }
    
    // مطمئن شوید این متدها در کلاس وجود دارند
    // این متدها را به کلاس GermanDictionary اضافه کنید:

// متد برای بارگذاری محتوای بخش تنظیمات
renderSettings() {
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  const fontSize = localStorage.getItem('fontSize') || 'medium';
  
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
          <option value="small" ${fontSize === 'small' ? 'selected' : ''}>کوچک</option>
          <option value="medium" ${fontSize === 'medium' ? 'selected' : ''}>متوسط</option>
          <option value="large" ${fontSize === 'large' ? 'selected' : ''}>بزرگ</option>
        </select>
      </div>
    </div>
    
    <div class="word-card mt-4">
      <h3 class="mb-3">مدیریت داده‌ها</h3>
      
      <div class="action-buttons">
        <button class="btn btn-outline" id="export-data-btn">صدور داده‌ها</button>
        <button class="btn btn-outline" id="import-data-btn">ورود داده‌ها</button>
        <button class="btn btn-danger" id="reset-data-btn">بازنشانی برنامه</button>
      </div>
    </div>
  `;
  
  // تنظیم event listeners برای بخش تنظیمات
  this.setupSettingsEventListeners();
}

// متد برای تنظیم event listeners بخش تنظیمات
setupSettingsEventListeners() {
  document.getElementById('dark-mode-toggle')?.addEventListener('change', (e) => {
    localStorage.setItem('darkMode', e.target.checked);
    document.body.classList.toggle('dark-mode', e.target.checked);
    this.showToast('تنظیمات ذخیره شد', 'success');
  });
  
  document.getElementById('font-size-select')?.addEventListener('change', (e) => {
    localStorage.setItem('fontSize', e.target.value);
    const size = e.target.value === 'small' ? '14px' : 
                 e.target.value === 'large' ? '18px' : '16px';
    document.body.style.fontSize = size;
    this.showToast('تنظیمات ذخیره شد', 'success');
  });
  
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    this.exportData();
  });
  
  document.getElementById('import-data-btn')?.addEventListener('click', () => {
    document.getElementById('import-file-input')?.click();
  });
  
  document.getElementById('reset-data-btn')?.addEventListener('click', () => {
    if (confirm('آیا مطمئن هستید؟ تمام داده‌های برنامه حذف خواهند شد.')) {
      this.resetData();
    }
  });
}

// متد برای بارگذاری محتوای بخش تمرین
renderPracticeOptions() {
  this.getAllWords().then(words => {
    const totalWords = words.length;
    
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
    `;
    
    // تنظیم event listeners برای بخش تمرین
    this.setupPracticeEventListeners();
  });
}

// متد برای تنظیم event listeners بخش تمرین
setupPracticeEventListeners() {
  document.getElementById('start-practice-btn')?.addEventListener('click', () => {
    const start = parseInt(document.getElementById('range-start').value);
    const end = parseInt(document.getElementById('range-end').value);
    const practiceType = document.getElementById('practice-type').value;
    
    if (start && end && start >= end) {
      this.showToast('محدوده شروع باید کوچکتر از پایان باشد', 'error');
      return;
    }
    
    const range = start && end ? {start, end} : null;
    
    if (practiceType === 'flashcards') {
      this.startPracticeSession(null, range);
    } else if (practiceType === 'quiz') {
      this.startQuiz(null, range);
    } else {
      this.showToast('این ویژگی به زودی اضافه خواهد شد', 'info');
    }
  });
}
    
    renderPracticeOptions() {
        this.getAllWords().then(words => {
            const totalWords = words.length;
            
            document.getElementById('practice-section').innerHTML = `
                <h2>تنظیمات تمرین</h2>
                <div class="word-card">
                    <div class="form-group">
                        <label>محدوده لغات (${totalWords} لغت موجود):</label>
                        <div class="range-selector">
                            <div class="range-inputs">
                                <input type="number" id="range-start" min="1" max="${totalWords}" placeholder="شروع" class="form-control">
                                <span>تا</span>
                                <input type="number" id="range-end" min="1" max="${totalWords}" placeholder="پایان" class="form-control">
                            </div>
                            <small>برای تمرین همه لغات، فیلدها را خالی بگذارید</small>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="practice-type">نوع تمرین:</label>
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
            `;
            
            // تنظیم event listeners
            this.setupPracticeEventListeners();
        });
    }
    
    // سایر متدها...
}












// کنترل چرخش دکمه کتاب و نمایش منو
let menuOpen = false;
let rotateInterval;

// شروع چرخش کتاب هنگام لود صفحه
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  mobileMenuBtn.classList.add('rotate-book');
});

function toggleMenu() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuContainer = document.getElementById('mobileMenuContainer');
  
  if (!menuOpen) {
    // توقف چرخش هنگام باز شدن منو
    mobileMenuBtn.classList.add('rotate-book-paused');
    
    // نمایش منو
    mobileMenuContainer.classList.add('open');
    menuOpen = true;
  } else {
    // شروع مجدد چرخش هنگام بستن منو
    mobileMenuBtn.classList.remove('rotate-book-paused');
    
    // مخفی کردن منو
    mobileMenuContainer.classList.remove('open');
    menuOpen = false;
  }
}

// اضافه کردن event listener به دکمه
document.getElementById('mobileMenuBtn').addEventListener('click', toggleMenu);

// اضافه کردن event listener به آیتم‌های منو برای بستن منو پس از کلیک
document.querySelectorAll('.mobile-menu-item').forEach(item => {
  item.addEventListener('click', function() {
    // شروع مجدد چرخش
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    mobileMenuBtn.classList.remove('rotate-book-paused');
    
    // بستن منو با کمی تاخیر
    setTimeout(() => {
      toggleMenu();
    }, 300);
  });
});
























// مدیریت ستاره علاقه‌مندی‌ها
function toggleFavorite(wordElement, word) {
  const starIcon = wordElement.querySelector('.favorite-icon');
  const isFavorite = starIcon.classList.contains('active');
  
  if (isFavorite) {
    // حذف از علاقه‌مندی‌ها
    starIcon.classList.remove('active');
    removeFromFavorites(word);
  } else {
    // افزودن به علاقه‌مندی‌ها
    starIcon.classList.add('active');
    addToFavorites(word);
  }
}

// مدیریت دکمه تلفظ
function playPronunciation(word) {
  const pronunciationIcon = document.querySelector(`.pronunciation-icon[data-word="${word}"]`);
  
  // تغییر حالت دکمه به "در حال پخش"
  pronunciationIcon.classList.add('playing');
  
  // شبیه‌سازی پخش صوت (با Web Speech API)
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'de-DE';
  utterance.rate = 0.8;
  
  utterance.onend = function() {
    // بازگشت به حالت عادی پس از اتمام پخش
    pronunciationIcon.classList.remove('playing');
  };
  
  speechSynthesis.speak(utterance);
}

// نمونه استفاده در HTML:
/*
<div class="word-header">
  <div>
    <span class="word-title">Haus</span>
    <span class="word-gender neuter">das (خنثی)</span>
  </div>
  <div>
    <i class="fas fa-star favorite-icon" onclick="toggleFavorite(this, 'Haus')"></i>
    <i class="fas fa-volume-up pronunciation-icon" onclick="playPronunciation('Haus')"></i>
  </div>
</div>
*/









// بررسی وضعیت علاقه‌مندی‌ها هنگام لود صفحه
document.addEventListener('DOMContentLoaded', function() {
  const favoriteIcons = document.querySelectorAll('.favorite-icon');
  
  favoriteIcons.forEach(icon => {
    const word = icon.getAttribute('data-word');
    if (isWordInFavorites(word)) {
      icon.classList.add('active');
    }
  });
});

// تابع بررسی وجود لغت در علاقه‌مندی‌ها
function isWordInFavorites(word) {
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  return favorites.includes(word);
}