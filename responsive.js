
// مدیریت حالت‌های برنامه
const appState = {
  words: [],
  favorites: [],
  currentView: 'search'
};

// نمایش بخش‌های مختلف
function showSection(sectionId) {
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${sectionId}-section`).classList.add('active');
  appState.currentView = sectionId;
}

// افزودن لغت جدید
function addNewWord() {
  const germanWord = document.getElementById('german-word').value;
  const persianMeaning = document.getElementById('persian-meaning').value;
  
  if(germanWord && persianMeaning) {
    const newWord = {
      id: Date.now(),
      german: germanWord,
      persian: persianMeaning,
      isFavorite: false
    };
    
    appState.words.push(newWord);
    alert(`لغت "${germanWord}" با موفقیت اضافه شد!`);
    document.getElementById('add-word-form').reset();
    showSection('search');
  } else {
    alert('لطفاً هر دو فیلد را پر کنید!');
  }
}

// مدیریت منوی موبایل
document.addEventListener('DOMContentLoaded', function() {
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenuContainer = document.getElementById('mobileMenuContainer');
  
  // رویدادهای کلیک
  mobileMenuBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    mobileMenuContainer.classList.toggle('active');
  });
  
  document.addEventListener('click', () => mobileMenuContainer.classList.remove('active'));
  mobileMenuContainer.addEventListener('click', e => e.stopPropagation());
  
  // مدیریت کلیک منو
  document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(item => {
    item.addEventListener('click', function() {
      const section = this.getAttribute('data-section');
      showSection(section);
      mobileMenuContainer.classList.remove('active');
    });
  });
  
  // ثبت لغت جدید
  document.getElementById('save-word-btn').addEventListener('click', addNewWord);
  
  // نمایش بخش پیش‌فرض
  showSection('search');
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


// مقداردهی اولیه تمرین
function initPracticeSection() {
  const isMobile = window.innerWidth <= 768;
  const practiceSection = document.getElementById('practice-section');
  
  if (!practiceSection) return;

  // مدیریت رویدادها
  document.querySelectorAll('.practice-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.practice-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // تغییر layout بر اساس سایز صفحه
  if (isMobile) {
    practiceSection.classList.add('mobile-view');
  } else {
    practiceSection.classList.add('desktop-view');
  }
}

// اجرا در لود اولیه و تغییر سایز
window.addEventListener('load', initPracticeSection);
window.addEventListener('resize', initPracticeSection);

