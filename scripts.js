

// app.js
document.addEventListener('DOMContentLoaded', function() {
  // =====================
  // Initialize Dictionary App
  // =====================
  class GermanDictionary {
   constructor() {
    this.dbName = 'GermanPersianDictionary';
    this.dbVersion = 3;
    this.db = null;
    this.currentWord = null;
    this.favorites = new Set();
    this.translateDirection = 'de-fa';
    this.isVoiceInputActive = false;
    this.voiceRecognition = null;
    this.voiceTimerInterval = null;
    this.voiceStartTime = null;
    this.currentVoiceSettings = {
        speed: 1,
        pitch: 1,
        volume: 0.8,
        language: 'fa-IR',
        autoPlay: true
    };
    this.scrollCheckInterval = null;
    this.scrollState = {
        isAtBottom: true,
        isUserScrolling: false,
        lastScrollTop: 0,
        scrollTimeout: null
    };
    this.isAITyping = false;
    this.isUserScrollingManually = false;
    
    // فقط یک بار init را صدا بزن
    this.init();
    
    window.addEventListener('resize', () => {
        this.handleResponsive();
        setTimeout(() => {
            // هیچ کاری لازم نیست
        }, 500);
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
          this.setupScrollManagement();
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
 setupScrollManagement() {
    console.log('🔄 تنظیم مدیریت اسکرول...');
    
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    // حذف event listeners قبلی برای جلوگیری از duplicate
    chatHistory.removeEventListener('scroll', this.handleScroll.bind(this));
    
    // اضافه کردن event listener جدید
    chatHistory.addEventListener('scroll', this.handleScroll.bind(this));
    
    // تابع برای چک کردن و اسکرول اتوماتیک
    const checkAndScroll = () => {
        if (!this.scrollState.isUserScrolling && this.scrollState.isAtBottom) {
            this.scrollToBottom();
        }
    };
    
    // چک کردن دوره‌ای - فقط اگر از قبل تنظیم نشده
    if (!this.scrollCheckInterval) {
        this.scrollCheckInterval = setInterval(checkAndScroll, 300);
    }
    
    console.log('✅ مدیریت اسکرول تنظیم شد');
}

// متد جداگانه برای handle scroll
handleScroll() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const scrollTop = chatHistory.scrollTop;
    const scrollHeight = chatHistory.scrollHeight;
    const clientHeight = chatHistory.clientHeight;
    
    // بررسی اینکه آیا کاربر در پایین است
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    this.scrollState.isAtBottom = distanceFromBottom < 100; // آستانه 100px
    this.scrollState.lastScrollTop = scrollTop;
    
    // اگر کاربر اسکرول کرد، تایمر را ریست کن
    if (this.scrollState.scrollTimeout) {
        clearTimeout(this.scrollState.scrollTimeout);
    }
    
    // علامت گذاری که کاربر در حال اسکرول است
    this.scrollState.isUserScrolling = true;
    
    // بعد از 1.5 ثانیه اگر اسکرول نکرد، فرض کن کارش تمام شده
    this.scrollState.scrollTimeout = setTimeout(() => {
        this.scrollState.isUserScrolling = false;
    }, 1500);
}
async addMessageToHistory(sender, message, options = {}) {
    const { skipScroll = false, isTyping = false } = options;
    const chatHistory = document.getElementById('chat-history');
    
    if (!chatHistory) {
        console.error('❌ تاریخچه چت یافت نشد!');
        return;
    }
    
    const messageId = isTyping ? 'typing-indicator' : `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // فرمت‌بندی پیام با دکمه‌ها
    let formattedMessage = this.formatMessage(message);
    
    // اضافه کردن دکمه‌های هدایت به پیام‌های AI
    let quickActionsHtml = '';
    if (sender === 'ai' && !isTyping) {
        quickActionsHtml = this.getQuickActionButtons(message);
    }
    
    const messageHtml = `
        <div class="ai-message ${sender}-message" id="${messageId}">
            <div class="message-content">
                <div class="message-text">${formattedMessage}</div>
                ${quickActionsHtml}
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    // تنظیم event listeners برای دکمه‌ها
    if (sender === 'ai' && !isTyping && quickActionsHtml) {
        setTimeout(() => {
            this.setupQuickActionButtons(messageId);
        }, 100);
    }
    
    // اسکرول
    if (!skipScroll) {
        setTimeout(() => {
            this.scrollToBottom();
        }, 50);
    }
    
    console.log(`📨 پیام ${sender} اضافه شد`);
    return messageId;
}
    
    checkScrollPosition(container) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        // محاسبه موقعیت فعلی
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const isActuallyAtBottom = distanceFromBottom < 50;
        
        // اگر کاربر در حال اسکرول نیست و پیام جدید AI در حال نمایش است
        if (!this.scrollState.isUserScrolling && this.isAITyping) {
            // همیشه به پایین اسکرول کن
            container.scrollTop = scrollHeight;
            this.scrollState.isAtBottom = true;
        }
        
        // اگر کاربر قبلاً پایین بوده و پیام جدید AI آمده
        if (this.scrollState.isAtBottom && !this.isUserScrollingManually) {
            // به پایین اسکرول کن
            container.scrollTop = scrollHeight;
        }
    }
    
    // متد کمکی برای شروع تایپ AI
    startAITyping() {
        this.isAITyping = true;
        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            // به پایین اسکرول کن
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }
    }
    
    // متد کمکی برای پایان تایپ AI
    stopAITyping() {
        this.isAITyping = false;
    }
    
    // متد جدید برای اضافه کردن پیام با مدیریت اسکرول
    async addMessageWithScrollManagement(sender, message, options = {}) {
        const { shouldAutoScroll = true, isTyping = false } = options;
        
        // ذخیره وضعیت فعلی اسکرول
        const chatHistory = document.getElementById('chat-history');
        const wasAtBottom = this.scrollState.isAtBottom;
        
        // اضافه کردن پیام
        await this.addMessageToHistory(sender, message);
        
        // اگر AI در حال تایپ است یا کاربر پایین بوده، اسکرول کن
        if ((isTyping || wasAtBottom || shouldAutoScroll) && !this.scrollState.isUserScrolling) {
            setTimeout(() => {
                if (chatHistory) {
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                    this.scrollState.isAtBottom = true;
                }
            }, 100);
        }
    }
    
  async typeMessageGradually(text) {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messageId = `ai-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const messageHtml = `
        <div class="ai-message ai-response" id="${messageId}">
            <div class="message-content">
                <div class="message-text"></div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    const messageElement = document.getElementById(messageId);
    const textElement = messageElement.querySelector('.message-text');
    
    // 🔴 سرعت را 10 برابر کنید (از 50ms به 5ms)
    const typingSpeed = 5; // میلی‌ثانیه
    
    // روش سریع: متن را بلوک‌های بزرگ‌تر نمایش بده
    const words = text.split(' ');
    let displayedText = '';
    
    return new Promise((resolve) => {
        const typeInterval = setInterval(() => {
            if (words.length > 0) {
                // هر بار 3 کلمه نمایش بده
                const chunkSize = Math.min(3, words.length);
                const chunk = words.splice(0, chunkSize).join(' ');
                displayedText += (displayedText ? ' ' : '') + chunk;
                textElement.innerHTML = this.formatMessage(displayedText);
                
                // اسکرول
                chatHistory.scrollTop = chatHistory.scrollHeight;
            } else {
                clearInterval(typeInterval);
                resolve();
            }
        }, typingSpeed);
    });
}
async addMessageInstantly(sender, message) {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messageId = `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const safeMessage = this.escapeHtml(message);
    const formattedMessage = this.formatMessage(safeMessage);
    
    // نمایش بلافاصله اما با انیمیشن fade in
    const messageHtml = `
        <div class="ai-message ${sender}-message" id="${messageId}" style="opacity: 0; transform: translateY(10px);">
            <div class="message-content">
                <div class="message-text">${formattedMessage}</div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    // انیمیشن fade in سریع
    setTimeout(() => {
        const element = document.getElementById(messageId);
        if (element) {
            element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }
    }, 10);
    
    // اسکرول فوری
    this.scrollToBottom();
    
    return messageId;
}
// در کلاس GermanDictionary در app.js، بخش AI Chat را به صورت زیر به‌روزرسانی کنید:

// =====================
// AI CHAT MANAGEMENT - COMPLETE REWRITE
// =====================

// متد renderAIChat کاملاً بازنویسی شده
renderAIChat() {
    console.log('🎯 رندر بخش AI Chat با استایل جدید...');
    
    // اطمینان از اینکه بخش AI Chat وجود دارد
    const aiSection = document.getElementById('ai-chat-section');
    if (!aiSection) {
        console.error('❌ بخش AI Chat یافت نشد!');
        return;
    }
    
    // پاک کردن و رندر مجدد با استایل جدید
    aiSection.innerHTML = '';
    aiSection.innerHTML = `
        <div class="ai-chat-container">
            <!-- هدر اصلی با همه دکمه‌ها -->
            <div class="ai-chat-header">
                <div class="header-left">
                    <div class="ai-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="header-info">
                        <h3 class="ai-title">دستیار هوش مصنوعی آلمانی</h3>
                        <p class="ai-subtitle">آموزش گرامر، واژگان و مکالمه آلمانی</p>
                    </div>
                </div>
                
                <div class="header-actions">
                    <!-- دکمه تنظیمات صدا -->
                    <button class="header-btn voice-settings-btn" id="voice-settings-btn" title="تنظیمات صدا">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    
                    <!-- دکمه تغییر تم -->
                    <button class="header-btn theme-toggle-btn" id="ai-theme-toggle" title="تغییر تم">
                        <i class="fas fa-moon"></i>
                    </button>
                    <!-- دکمه تاریخچه چت -->
<button class="header-btn chat-history-btn" id="chat-history-btn" title="تاریخچه چت‌ها">
    <i class="fas fa-history"></i>
</button>
                    <!-- دکمه چت جدید -->
                    <button class="header-btn new-chat-btn" id="new-chat-btn" title="چت جدید">
                        <i class="fas fa-plus"></i>
                    </button>
                    
                    <!-- دکمه پاک کردن تاریخچه -->
                    <button class="header-btn delete-btn" id="clear-chat-history" title="پاک کردن چت">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>

            <!-- بخش اصلی چت -->
            <div class="ai-chat-main">
                <!-- تاریخچه چت -->
                <div class="chat-messages-container" id="chat-history">
                    // در welcome message داخل renderAIChat():
<div class="welcome-message">
    <div class="message ai-message">
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-text">
                <h4>🤖 دستیار هوش مصنوعی آلمانی</h4>
                <p>سرویس هوش مصنوعی فعلاً در دسترس نیست</p>
                
                <p>اما می‌توانید از بخش‌های کامل برنامه استفاده کنید:</p>
                
                <div class="quick-action-buttons">
                    <button class="quick-action-btn" data-action="dictionary">
                        <i class="fas fa-search"></i>
                        جستجوی لغات
                    </button>
                    <button class="quick-action-btn" data-action="translate">
                        <i class="fas fa-language"></i>
                        مترجم متن
                    </button>
                    <button class="quick-action-btn" data-action="practice">
                        <i class="fas fa-brain"></i>
                        تمرین آموزشی
                    </button>
                    <button class="quick-action-btn" data-action="word-list">
                        <i class="fas fa-list"></i>
                        همه لغات
                    </button>
                </div>
                
                <div class="welcome-tip" style="margin-top: 15px;">
                    <i class="fas fa-info-circle"></i>
                    هر سوالی دارید بپرسید، شما را راهنمایی می‌کنم
                </div>
            </div>
            <div class="message-time">همین الان</div>
        </div>
    </div>
</div>
                </div>

                <!-- پیشنهادات سریع با دکمه‌های صوتی -->
                <div class="quick-actions-section">
                    <div class="section-title">
                        <i class="fas fa-bolt"></i>
                        <span>سوالات سریع</span>
                    </div>
                    
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn" data-question="چگونه افعال آلمانی را صرف کنم؟">
                            <div class="action-icon">
                                <i class="fas fa-language"></i>
                            </div>
                            <div class="action-text">
                                <span>صرف فعل</span>
                                <small>آموزش کامل</small>
                            </div>
                            <button class="voice-action-btn" data-question="چگونه افعال آلمانی را صرف کنم؟">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </button>
                        
                        <button class="quick-action-btn" data-question="تفاوت der, die, das چیست؟">
                            <div class="action-icon">
                                <i class="fas fa-venus-mars"></i>
                            </div>
                            <div class="action-text">
                                <span>جنسیت اسم‌ها</span>
                                <small>der, die, das</small>
                            </div>
                            <button class="voice-action-btn" data-question="تفاوت der, die, das چیست؟">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </button>
                        
                        <button class="quick-action-btn" data-question="جمله‌سازی آلمانی آموزش بده">
                            <div class="action-icon">
                                <i class="fas fa-comment-alt"></i>
                            </div>
                            <div class="action-text">
                                <span>جمله‌سازی</span>
                                <small>آموزش قدم به قدم</small>
                            </div>
                            <button class="voice-action-btn" data-question="جمله‌سازی آلمانی آموزش بده">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </button>
                        
                        <button class="quick-action-btn" data-question="تلفظ صحیح کلمات آلمانی">
                            <div class="action-icon">
                                <i class="fas fa-volume-up"></i>
                            </div>
                            <div class="action-text">
                                <span>تلفظ</span>
                                <small>لهجه آلمانی</small>
                            </div>
                            <button class="voice-action-btn" data-question="تلفظ صحیح کلمات آلمانی">
                                <i class="fas fa-microphone"></i>
                            </button>
                        </button>
                    </div>
                </div>

                <!-- بخش ورودی - با همه دکمه‌های صوتی -->
                <div class="chat-input-section">
                    <!-- انتخاب مدل -->
                    <div class="model-selection-row">
                        <div class="model-label">
                            <i class="fas fa-brain"></i>
                            <span>مدل هوش مصنوعی:</span>
                        </div>
                        <div class="model-select-wrapper">
     <select id="ai-model-select" class="model-select">
        <option value="liara-gpt-3.5-turbo" selected>🤖 Liara AI (GPT-3.5 Turbo)</option>
        <option value="fallback">📚 پاسخ‌های داخلی</option>
    </select>
                            <div class="model-info-icon" title="اطلاعات مدل">
                                <i class="fas fa-info-circle"></i>
                            </div>
                        </div>
                        <div class="model-status">
                            <span class="status-indicator online"></span>
                            <span class="status-text">آنلاین</span>
                        </div>
                    </div>

                    <!-- دکمه‌های کنترل صدا -->
                    <div class="voice-controls-row">
                        <div class="voice-controls-label">
                            <i class="fas fa-microphone-alt"></i>
                            <span>کنترل‌های صوتی:</span>
                        </div>
                        <div class="voice-controls-buttons">
                            <button class="voice-control-btn" id="start-voice-chat" title="شروع گفتگوی صوتی">
                                <i class="fas fa-microphone"></i>
                                <span>شروع گفتگو</span>
                            </button>
                            <button class="voice-control-btn" id="stop-voice-chat" title="توقف گفتگوی صوتی" disabled>
                                <i class="fas fa-stop-circle"></i>
                                <span>توقف</span>
                            </button>
                            <button class="voice-control-btn" id="play-response" title="پخش پاسخ">
                                <i class="fas fa-play-circle"></i>
                                <span>پخش پاسخ</span>
                            </button>
                            <button class="voice-control-btn" id="voice-settings" title="تنظیمات صدا">
                                <i class="fas fa-cog"></i>
                                <span>تنظیمات</span>
                            </button>
                        </div>
                        <div class="voice-status">
                            <div class="voice-level-indicator">
                                <div class="level-bar"></div>
                                <div class="level-bar"></div>
                                <div class="level-bar"></div>
                                <div class="level-bar"></div>
                                <div class="level-bar"></div>
                            </div>
                            <span class="status-text">آماده</span>
                        </div>
                    </div>

                    <!-- ورودی متن اصلی -->
                    <div class="main-input-area">
                        <div class="input-wrapper">
                            <div class="input-actions-left">
                                <button class="input-action-btn" id="attach-file-btn" title="افزودن فایل">
                                    <i class="fas fa-paperclip"></i>
                                </button>
                               
                                <button class="input-action-btn voice-input-btn" id="voice-input-toggle" title="ورودی صوتی">
                                    <i class="fas fa-microphone"></i>
                                </button>
                            </div>
                            
                            <textarea 
                                id="ai-chat-input" 
                                class="chat-input-textarea" 
                                placeholder="سوال خود را درباره زبان آلمانی بنویسید یا از گفتگوی صوتی استفاده کنید... (Enter برای ارسال، Shift+Enter برای خط جدید)"
                                rows="3"
                                autocomplete="off"
                                spellcheck="false"
                            ></textarea>
                            
                            <div class="input-actions-right">
                                <button class="input-action-btn" id="clear-input-btn" title="پاک کردن متن">
                                    <i class="fas fa-times"></i>
                                </button>
                                <button class="send-message-btn" id="send-ai-message" title="ارسال پیام">
                                    <i class="fas fa-paper-plane"></i>
                                    <span>ارسال</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- نمایش وضعیت ورودی صوتی -->
                        <div class="voice-input-status" id="voice-input-status" style="display: none;">
                            <div class="voice-status-content">
                                <div class="voice-pulse-animation">
                                    <div class="pulse-circle"></div>
                                    <i class="fas fa-microphone"></i>
                                </div>
                                <div class="voice-status-text">
                                    <span class="status-message">در حال گوش دادن... صحبت کنید</span>
                                    <span class="timer">00:00</span>
                                </div>
                                <button class="stop-voice-btn" id="stop-voice-input">
                                    <i class="fas fa-stop"></i>
                                </button>
                            </div>
                            <div class="voice-waveform">
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                                <div class="wave-bar"></div>
                            </div>
                        </div>
                        
                        <!-- راهنمایی‌های پایین -->
                        <div class="input-hints">
                            <div class="hint-item">
                                <i class="fas fa-keyboard"></i>
                                <span>می‌توانید متن را تایپ کنید</span>
                            </div>
                            <div class="hint-item">
                                <i class="fas fa-microphone"></i>
                                <span>یا از گفتگوی صوتی استفاده کنید</span>
                            </div>
                            <div class="hint-item">
                                <i class="fas fa-volume-up"></i>
                                <span>پاسخ‌ها قابل پخش صوتی هستند</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- پنل تنظیمات صوتی (مخفی) -->
            <div class="voice-settings-panel" id="voice-settings-panel" style="display: none;">
                <div class="settings-header">
                    <h4><i class="fas fa-cog"></i> تنظیمات صوتی</h4>
                    <button class="close-settings-btn" id="close-voice-settings">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="settings-content">
                    <div class="setting-item">
                        <label for="voice-speed">
                            <i class="fas fa-tachometer-alt"></i>
                            <span>سرعت گفتار:</span>
                        </label>
                        <input type="range" id="voice-speed" min="0.5" max="2" step="0.1" value="1">
                        <span class="value-display" id="speed-value">1.0x</span>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-pitch">
                            <i class="fas fa-sliders-h"></i>
                            <span>زیر و بمی صدا:</span>
                        </label>
                        <input type="range" id="voice-pitch" min="0.5" max="2" step="0.1" value="1">
                        <span class="value-display" id="pitch-value">1.0</span>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-volume">
                            <i class="fas fa-volume-up"></i>
                            <span>بلندی صدا:</span>
                        </label>
                        <input type="range" id="voice-volume" min="0" max="1" step="0.1" value="0.8">
                        <span class="value-display" id="volume-value">80%</span>
                    </div>
                    
                    <div class="setting-item">
                        <label for="voice-language">
                            <i class="fas fa-globe"></i>
                            <span>زبان گفتار:</span>
                        </label>
                        <select id="voice-language">
                            <option value="de-DE">آلمانی (آلمان)</option>
                            <option value="de-AT">آلمانی (اتریش)</option>
                            <option value="de-CH">آلمانی (سوئیس)</option>
                            <option value="en-US">انگلیسی (آمریکا)</option>
                            <option value="fa-IR">فارسی (ایران)</option>
                        </select>
                    </div>
                    
                    <div class="setting-item">
                        <label>
                            <i class="fas fa-robot"></i>
                            <span>صدای پاسخ‌ها:</span>
                        </label>
                        <div class="toggle-switch">
                            <input type="checkbox" id="auto-play-response" checked>
                            <label for="auto-play-response" class="toggle-slider"></label>
                            <span class="toggle-label">پخش خودکار پاسخ‌ها</span>
                        </div>
                    </div>
                    
                    <div class="settings-actions">
                        <button class="settings-btn save-btn" id="save-voice-settings">
                            <i class="fas fa-save"></i>
                            ذخیره تنظیمات
                        </button>
                        <button class="settings-btn test-btn" id="test-voice-settings">
                            <i class="fas fa-play"></i>
                            تست صدا
                        </button>
                        <button class="settings-btn reset-btn" id="reset-voice-settings">
                            <i class="fas fa-redo"></i>
                            بازنشانی
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // تنظیم event listeners جدید
    this.setupNewAIChatEventListeners();
      this.restoreAIChatState();

        setTimeout(() => {
        this.setupScrollManagement();
    }, 500);
   
    
    console.log('✅ بخش AI Chat با استایل جدید با موفقیت رندر شد');
}

// تنظیم event listeners جدید برای AI Chat
setupNewAIChatEventListeners() {
    console.log('🔧 تنظیم event listeners جدید برای AI Chat...');
    
    // ارسال پیام با دکمه
    const sendBtn = document.getElementById('send-ai-message');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            console.log('🔼 کلیک روی دکمه ارسال');
            this.sendAIMessage();
        });
    }
    
    // ارسال پیام با Enter (بدون Shift)
    const chatInput = document.getElementById('ai-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                console.log('⌨️ فشردن Enter برای ارسال');
                this.sendAIMessage();
            }
        });
        
        // تنظیم ارتفاع خودکار
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // دکمه‌های تنظیمات صدا
    document.getElementById('voice-settings-btn')?.addEventListener('click', () => {
        this.toggleVoiceSettingsPanel();
    });
    
    document.getElementById('voice-settings')?.addEventListener('click', () => {
        this.toggleVoiceSettingsPanel();
    });
    
    document.getElementById('close-voice-settings')?.addEventListener('click', () => {
        this.toggleVoiceSettingsPanel();
    });
    
    // دکمه پاک کردن تاریخچه
    document.getElementById('clear-chat-history')?.addEventListener('click', () => {
        this.clearChatHistory();
    });
     document.getElementById('chat-history-btn')?.addEventListener('click', () => {
        this.showChatHistoryModal();
    });
    // دکمه چت جدید
    document.getElementById('new-chat-btn')?.addEventListener('click', () => {
        this.newChat();
    });
    
    // دکمه تغییر تم
    document.getElementById('ai-theme-toggle')?.addEventListener('click', () => {
        this.toggleAITheme();
    });
    
    // دکمه‌های ورودی صوتی
    document.getElementById('voice-input-toggle')?.addEventListener('click', () => {
        this.toggleVoiceInput();
    });
    
    document.getElementById('stop-voice-input')?.addEventListener('click', () => {
        this.stopVoiceInput();
    });
    
    // دکمه‌های کنترل صدا
    document.getElementById('start-voice-chat')?.addEventListener('click', () => {
        this.startVoiceChat();
    });
    
    document.getElementById('stop-voice-chat')?.addEventListener('click', () => {
        this.stopVoiceChat();
    });
    
    document.getElementById('play-response')?.addEventListener('click', () => {
        this.playLastResponse();
    });
    
    // دکمه پاک کردن متن
    document.getElementById('clear-input-btn')?.addEventListener('click', () => {
        this.clearAIChatInput();
    });
    
    // پیشنهادات سریع
    document.querySelectorAll('.quick-action-btn').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const question = item.getAttribute('data-question');
            console.log('💡 انتخاب پیشنهاد سریع:', question);
            if (chatInput) {
                chatInput.value = question;
                chatInput.focus();
                this.sendAIMessage();
            }
        });
    });
    
    // دکمه‌های صوتی در پیشنهادات سریع
    document.querySelectorAll('.voice-action-btn').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const question = item.getAttribute('data-question');
            console.log('🎤 استفاده از گفتگوی صوتی برای سوال:', question);
            this.askQuestionWithVoice(question);
        });
    });
    
    // تغییر مدل
    const modelSelect = document.getElementById('ai-model-select');
    if (modelSelect) {
        // بارگذاری مدل ذخیره شده
        const savedModel = localStorage.getItem('aiModel') || 'deepseek-chat';
        modelSelect.value = savedModel;
        
        modelSelect.addEventListener('change', (e) => {
            localStorage.setItem('aiModel', e.target.value);
            console.log('🔄 تغییر مدل به:', e.target.value);
            this.showToast(`مدل به ${e.target.value} تغییر کرد`, 'info');
        });
    }
    
    // تنظیمات اسلایدرهای صدا
    this.setupVoiceSettings();
    
    console.log('✅ event listeners جدید تنظیم شدند');
}

// متدهای جدید برای مدیریت صدا
setupVoiceSettings() {
    // سرعت گفتار
    const voiceSpeed = document.getElementById('voice-speed');
    const speedValue = document.getElementById('speed-value');
    
    if (voiceSpeed && speedValue) {
        voiceSpeed.addEventListener('input', (e) => {
            const value = e.target.value;
            speedValue.textContent = `${value}x`;
        });
    }
    
    // زیر و بمی صدا
    const voicePitch = document.getElementById('voice-pitch');
    const pitchValue = document.getElementById('pitch-value');
    
    if (voicePitch && pitchValue) {
        voicePitch.addEventListener('input', (e) => {
            const value = e.target.value;
            pitchValue.textContent = value;
        });
    }
    
    // بلندی صدا
    const voiceVolume = document.getElementById('voice-volume');
    const volumeValue = document.getElementById('volume-value');
    
    if (voiceVolume && volumeValue) {
        voiceVolume.addEventListener('input', (e) => {
            const value = e.target.value;
            volumeValue.textContent = `${Math.round(value * 100)}%`;
        });
    }
    
    // ذخیره تنظیمات
    document.getElementById('save-voice-settings')?.addEventListener('click', () => {
        this.saveVoiceSettings();
    });
    
    // تست صدا
    document.getElementById('test-voice-settings')?.addEventListener('click', () => {
        this.testVoiceSettings();
    });
    
    // بازنشانی تنظیمات
    document.getElementById('reset-voice-settings')?.addEventListener('click', () => {
        this.resetVoiceSettings();
    });
}

// متدهای کمکی جدید برای AI Chat
toggleVoiceSettingsPanel() {
    const panel = document.getElementById('voice-settings-panel');
    if (panel) {
        const isVisible = panel.style.display !== 'none';
        panel.style.display = isVisible ? 'none' : 'block';
    }
}

newChat() {
    if (confirm('آیا می‌خواهید چت جدید شروع کنید؟ تاریخچه فعلی ذخیره خواهد شد.')) {
        this.saveChatHistory();
        document.getElementById('chat-history').innerHTML = `
            <div class="welcome-message">
                <div class="message ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            <h4>👋 سلام! چت جدید شروع شد</h4>
                            <p>می‌توانید هر سوالی درباره زبان آلمانی از من بپرسید.</p>
                        </div>
                        <div class="message-time">همین الان</div>
                    </div>
                </div>
            </div>
        `;
        this.showToast('چت جدید شروع شد', 'success');
    }
}

toggleAITheme() {
    const body = document.body;
    const currentTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
        body.classList.add('dark-mode');
        document.getElementById('ai-theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        body.classList.remove('dark-mode');
        document.getElementById('ai-theme-toggle').innerHTML = '<i class="fas fa-moon"></i>';
    }
    
    localStorage.setItem('aiTheme', newTheme);
    this.showToast(`تم به ${newTheme === 'dark' ? 'تاریک' : 'روشن'} تغییر کرد`, 'info');
}

toggleVoiceInput() {
    const voiceStatus = document.getElementById('voice-input-status');
    const voiceBtn = document.getElementById('voice-input-toggle');
    
    if (!this.isVoiceInputActive) {
        // شروع ورودی صوتی
        this.startVoiceRecognition();
        voiceStatus.style.display = 'block';
        voiceBtn.classList.add('active');
        voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        this.isVoiceInputActive = true;
    } else {
        // توقف ورودی صوتی
        this.stopVoiceInput();
    }
}

startVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();
        
        this.voiceRecognition.lang = 'fa-IR';
        this.voiceRecognition.interimResults = false;
        this.voiceRecognition.continuous = false;
        
        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const chatInput = document.getElementById('ai-chat-input');
            chatInput.value = transcript;
            chatInput.focus();
            this.showToast('متن شناسایی شد', 'success');
        };
        
        this.voiceRecognition.onerror = (event) => {
            console.error('خطای تشخیص صدا:', event.error);
            this.showToast(`خطا در تشخیص صدا: ${event.error}`, 'error');
            this.stopVoiceInput();
        };
        
        this.voiceRecognition.onend = () => {
            this.stopVoiceInput();
        };
        
        this.voiceRecognition.start();
        this.startVoiceTimer();
        
    } else {
        this.showToast('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند', 'error');
    }
}

startVoiceTimer() {
    this.voiceStartTime = Date.now();
    this.voiceTimerInterval = setInterval(() => {
        const elapsed = Date.now() - this.voiceStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        
        const timerElement = document.querySelector('.timer');
        if (timerElement) {
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        }
        
        // شبیه‌سازی حرکت موج صدا
        const waveBars = document.querySelectorAll('.wave-bar');
        waveBars.forEach((bar, index) => {
            const randomHeight = Math.floor(Math.random() * 20) + 5;
            bar.style.height = `${randomHeight}px`;
        });
    }, 100);
}

stopVoiceInput() {
    if (this.voiceRecognition) {
        this.voiceRecognition.stop();
    }
    
    if (this.voiceTimerInterval) {
        clearInterval(this.voiceTimerInterval);
        this.voiceTimerInterval = null;
    }
    
    const voiceStatus = document.getElementById('voice-input-status');
    const voiceBtn = document.getElementById('voice-input-toggle');
    
    voiceStatus.style.display = 'none';
    voiceBtn.classList.remove('active');
    voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    this.isVoiceInputActive = false;
}

clearAIChatInput() {
    const chatInput = document.getElementById('ai-chat-input');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    chatInput.focus();
    this.showToast('متن پاک شد', 'info');
}

startVoiceChat() {
    this.showToast('گفتگوی صوتی شروع شد', 'info');
    // اینجا می‌توانید منطق گفتگوی صوتی کامل را پیاده‌سازی کنید
}

stopVoiceChat() {
    this.showToast('گفتگوی صوتی متوقف شد', 'info');
}

playLastResponse() {
    const lastMessage = document.querySelector('#chat-history .ai-message:last-child .message-text');
    if (lastMessage) {
        const text = lastMessage.textContent;
        this.speakText(text);
        this.showToast('در حال پخش پاسخ...', 'info');
    } else {
        this.showToast('پاسخی برای پخش یافت نشد', 'warning');
    }
}

askQuestionWithVoice(question) {
    // ابتدا سوال را در چت نمایش دهید
    this.addMessageToHistory('user', question);
    
    // سپس با صدای خودتان سوال را بپرسید (اختیاری)
    this.speakText(question);
    
    // بعد از پرسیدن سوال، پاسخ را دریافت کنید
    setTimeout(() => {
        this.getAIResponse(question).then(response => {
            this.addMessageToHistory('ai', response);
        });
    }, 1000);
}

speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        
    const lang = localStorage.getItem('voice-language') || 'fa-IR';
    const speed = parseFloat(localStorage.getItem('voice-speed') || '1');
    const pitch = parseFloat(localStorage.getItem('voice-pitch') || '1');
    const volume = parseFloat(localStorage.getItem('voice-volume') || '0.8');
    
    utterance.lang = lang;
    utterance.rate = speed;
    utterance.pitch = pitch;
    utterance.volume = volume;
    
    window.speechSynthesis.speak(utterance);
    }
}

saveVoiceSettings() {
    const speed = document.getElementById('voice-speed').value;
    const pitch = document.getElementById('voice-pitch').value;
    const volume = document.getElementById('voice-volume').value;
    const language = document.getElementById('voice-language').value;
    const autoPlay = document.getElementById('auto-play-response').checked;
    
    localStorage.setItem('voice-speed', speed);
    localStorage.setItem('voice-pitch', pitch);
    localStorage.setItem('voice-volume', volume);
    localStorage.setItem('voice-language', language);
    localStorage.setItem('auto-play-response', autoPlay);
    
    this.showToast('تنظیمات صدا ذخیره شد', 'success');
    this.toggleVoiceSettingsPanel();
}

testVoiceSettings() {
    const testText = "این یک تست صدا برای تنظیمات شماست. آیا می‌توانید این متن را واضح بشنوید؟";
    this.speakText(testText);
}

resetVoiceSettings() {
    document.getElementById('voice-speed').value = 1;
    document.getElementById('pitch-value').textContent = '1.0x';
    
    document.getElementById('voice-pitch').value = 1;
    document.getElementById('pitch-value').textContent = '1.0';
    
    document.getElementById('voice-volume').value = 0.8;
    document.getElementById('volume-value').textContent = '80%';
    
    document.getElementById('voice-language').value = 'fa-IR';
    document.getElementById('auto-play-response').checked = true;
    
    this.showToast('تنظیمات صدا بازنشانی شد', 'info');
    this.setupScrollManagement();
}

async sendAIMessage() {
    console.log('🚀 ارسال پیام AI (نسخه ساده)');
    
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('send-ai-message');
    
    if (!input || !sendBtn) {
        console.error('❌ المان‌های ورودی یافت نشدند');
        return;
    }
    
    const message = input.value.trim();
    
    if (!message) {
        this.showToast('لطفاً پیام خود را وارد کنید', 'warning');
        return;
    }
    
    console.log('📝 متن پیام کاربر:', message);
    
    // غیرفعال کردن دکمه ارسال
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // پاک کردن ورودی
    input.value = '';
    input.style.height = 'auto';
    
    // اضافه کردن پیام کاربر
    this.addMessageToHistory('user', message);
    
    try {
        // نمایش نشانگر در حال تایپ (برای تأخیر طبیعی)
        this.showTypingIndicator();
        
        // تأخیر مصنوعی برای طبیعی‌تر شدن
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // حذف نشانگر تایپ
        this.removeTypingIndicator();
        
        // نمایش پاسخ ثابت
        const response = await this.getAIResponse(message);
        await this.addMessageToHistory('ai', response);
        
        // ذخیره تاریخچه
        this.saveChatHistory();
        
    } catch (error) {
        console.error('❌ خطا:', error);
        this.removeTypingIndicator();
        this.addMessageToHistory('ai', 'خطا در پردازش درخواست. لطفاً دوباره تلاش کنید.');
    } finally {
        // فعال کردن دکمه ارسال
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>ارسال</span>';
        console.log('✅ ارسال پیام تکمیل شد');
    }
}
getRefererDomain() {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // دامنه‌های مختلف
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${window.location.port || 3000}`;
    } else if (hostname.includes('github.io')) {
        return 'https://elias-hussaini.github.io';
    } else if (hostname.includes('vercel.app')) {
        return 'https://your-app.vercel.app';
    } else if (hostname.includes('netlify.app')) {
        return 'https://your-app.netlify.app';
    } else {
        return window.location.origin;
    }
}

// این متد را به کلاس اضافه کنید
async testAllModels() {
    const models = [
        'deepseek-chat',
        'openai/gpt-3.5-turbo',
        'anthropic/claude-3-haiku',
        'meta-llama/llama-3.3-70b-instruct'
    ];
    
    for (const model of models) {
        try {
            console.log(`🔍 تست مدل: ${model}`);
            const testResponse = await this.testModelConnection(model);
            console.log(`✅ ${model}: کار می‌کند`);
        } catch (error) {
            console.log(`❌ ${model}: خطا - ${error.message}`);
        }
    }
}

async testModelConnection(model) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY',
            'HTTP-Referer': window.location.origin
        },
        body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'سلام' }],
            max_tokens: 10
        })
    });
    
    if (!response.ok) throw new Error(`Status: ${response.status}`);
    return true;
}

// تایپ تدریجی پیام
async typeMessageGradually(text) {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messageId = `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // ایجاد عنصر پیام خالی
    const messageHtml = `
        <div class="ai-message ai-response" id="${messageId}">
            <div class="message-content">
                <div class="message-text"></div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    const messageElement = document.getElementById(messageId);
    const textElement = messageElement.querySelector('.message-text');
    
    // تایپ تدریجی
    let displayedText = '';
    const words = text.split(' ');
    let wordIndex = 0;
    
    return new Promise((resolve) => {
        const typeInterval = setInterval(() => {
            if (wordIndex < words.length) {
                displayedText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
                textElement.innerHTML = this.formatMessage(displayedText);
                wordIndex++;
                
                // اسکرول به پایین
                chatHistory.scrollTop = chatHistory.scrollHeight;
            } else {
                clearInterval(typeInterval);
                resolve();
            }
        }, 10000000000000000); // سرعت تایپ
    });
}
showTypingIndicator() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    // حذف نشانگر قبلی اگر وجود دارد
    this.removeTypingIndicator();
    
    const typingHtml = `
        <div class="ai-message ai-response" id="typing-indicator">
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                    <div class="typing-text">در حال نوشتن...</div>
                </div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', typingHtml);
    
    // اسکرول به پایین
    this.scrollToBottom();
    console.log('⌨️ نمایش نشانگر تایپ');
}

// متد بهبود یافته برای حذف نشانگر
removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
        console.log('🗑️ حذف نشانگر تایپ');
    }
}
scrollToBottom() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    // ذخیره موقعیت فعلی
    const currentScroll = chatHistory.scrollTop;
    
    // محاسبه ارتفاع کل
    const scrollHeight = chatHistory.scrollHeight;
    const clientHeight = chatHistory.clientHeight;
    
    // اگر نزدیک پایین نیستیم، اسکرول کنیم
    const distanceFromBottom = scrollHeight - (currentScroll + clientHeight);
    
    if (distanceFromBottom > 50) { // فقط اگر فاصله داریم
        // استفاده از smooth scroll
        chatHistory.scrollTo({
            top: scrollHeight,
            behavior: 'smooth'
        });
        
        // آپدیت وضعیت
        this.scrollState.isAtBottom = true;
        this.scrollState.lastScrollTop = scrollHeight;
        
        console.log('⬇️ اسکرول به پایین انجام شد');
    }
}
// این متد را به کلاس اضافه کنید
autoSaveChat() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    // بررسی کن که آیا چت جدیدی است یا خیر
    const messages = chatHistory.querySelectorAll('.ai-message, .user-message');
    if (messages.length === 0) return; // اگر پیامی نیست، ذخیره نکن
    
    // ذخیره در localStorage با کلید خاص برای چت جاری
    localStorage.setItem('currentAutoSavedChat', chatHistory.innerHTML);
    localStorage.setItem('lastAutoSaveTime', Date.now());
    
    // همچنین به لیست تاریخچه هم اضافه کن (هر 5 پیام یکبار)
    if (messages.length % 5 === 0) {
        this.saveToChatSessions();
    }
    
    console.log('💾 چت به صورت خودکار ذخیره شد');
}

// ذخیره در لیست چت‌ها
saveToChatSessions() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const messages = chatHistory.querySelectorAll('.ai-message, .user-message');
    if (messages.length < 3) return; // اگر کمتر از 3 پیام است، ذخیره نکن
    
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    
    // بررسی کن که آیا این چت قبلاً ذخیره شده
    const existingIndex = sessions.findIndex(s => 
        s.content === chatHistory.innerHTML
    );
    
    if (existingIndex === -1) {
        const newSession = {
            id: Date.now(),
            name: `چت ${new Date().toLocaleTimeString('fa-IR')}`,
            content: chatHistory.innerHTML,
            date: new Date().toISOString(),
            autoSaved: true
        };
        
        // اضافه به ابتدای لیست
        sessions.unshift(newSession);
        
        // فقط 10 چت آخر را نگه دار
        localStorage.setItem('chatSessions', JSON.stringify(sessions.slice(0, 10)));
    }
}
async addMessageToHistory(sender, message, options = {}) {
    const { skipScroll = false, isTyping = false } = options;
    const chatHistory = document.getElementById('chat-history');
    
    if (!chatHistory) {
        console.error('❌ تاریخچه چت یافت نشد!');
        return;
    }
    
    const messageId = isTyping ? 'typing-indicator' : `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // جلوگیری از XSS
    const safeMessage = this.escapeHtml(message);
    const formattedMessage = this.formatMessage(safeMessage);
    
    // اگر پیام تایپینگ است، قبلی را حذف کن
    if (isTyping) {
        const existingTyping = document.getElementById('typing-indicator');
        if (existingTyping) {
            existingTyping.remove();
        }
    }
    
    const messageHtml = `
        <div class="ai-message ${sender}-message" id="${messageId}">
            <div class="message-content">
                <div class="message-text">${formattedMessage}</div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    // اگر skipScroll نبود و کاربر در پایین است، اسکرول کن
    if (!skipScroll) {
        setTimeout(() => {
            const currentDistance = chatHistory.scrollHeight - (chatHistory.scrollTop + chatHistory.clientHeight);
            
            // اگر کاربر در پایین است یا کمتر از 200px فاصله دارد
            if (this.scrollState.isAtBottom || currentDistance < 200) {
                this.scrollToBottom();
            }
        }, 50);
    }
    
    console.log(`📨 پیام ${sender} اضافه شد`);
    return messageId;
}

// پاک کردن تاریخچه چت
clearChatHistory() {
    if (confirm('آیا از پاک کردن تاریخچه چت مطمئن هستید؟')) {
        localStorage.removeItem('aiChatHistory');
        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            chatHistory.innerHTML = `
                <div class="ai-welcome-message">
                    <div class="ai-message ai-response">
                        <div class="message-content">
                            <p>سلام! من دستیار هوش مصنوعی شما برای یادگیری زبان آلمانی هستم. می‌توانید هر سوالی در مورد گرامر، واژگان، تلفظ یا تمرین زبان آلمانی از من بپرسید.</p>
                            <div class="message-time">همین الان</div>
                        </div>
                    </div>
                </div>
            `;
        }
        this.showToast('تاریخچه چت پاک شد', 'success');
        console.log('🗑️ تاریخچه چت پاک شد');
    }
}

// ذخیره تاریخچه چت
saveChatHistory() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
        localStorage.setItem('aiChatHistory', chatHistory.innerHTML);
        console.log('💾 تاریخچه چت ذخیره شد');
    }
}

// بارگذاری تاریخچه چت
loadChatHistory() {
    const savedHistory = localStorage.getItem('aiChatHistory');
    if (savedHistory) {
        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            chatHistory.innerHTML = savedHistory;
            // اسکرول به پایین
            setTimeout(() => {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }, 100);
        }
        console.log('📂 تاریخچه چت بارگذاری شد');
    }
}

// متدهای کمکی
formatMessage(text) {
    return text.replace(/\n/g, '<br>');
}

escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
async sendAIMessage() {
    console.log('🚀 ارسال پیام به Liara AI...');
    
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('send-ai-message');
    
    if (!input || !sendBtn) {
        console.error('❌ المان‌های ورودی یافت نشدند');
        return;
    }
    
    const message = input.value.trim();
    
    if (!message) {
        this.showToast('لطفاً پیام خود را وارد کنید', 'warning');
        return;
    }
    
    console.log('📝 متن پیام:', message);
    
    // غیرفعال کردن دکمه ارسال
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // پاک کردن ورودی
    input.value = '';
    input.style.height = 'auto';
    
    // اضافه کردن پیام کاربر
    this.addMessageToHistory('user', message);
    
    try {
        // نمایش نشانگر در حال تایپ
        this.showTypingIndicator();
        
        // دریافت پاسخ از Liara AI
        console.log('🌐 درخواست به Liara AI...');
        const response = await this.getAIResponse(message);
        console.log('✅ دریافت پاسخ از Liara AI');
        
        // حذف نشانگر تایپ
        this.removeTypingIndicator();
        
        // نمایش پاسخ
        await this.addMessageToHistory('ai', response);
        
        // ذخیره تاریخچه
        this.saveChatHistory();
        
        // پخش خودکار پاسخ (اگر تنظیم شده باشد)
        if (this.currentVoiceSettings.autoPlay) {
            setTimeout(() => this.speakText(response), 500);
        }
        
    } catch (error) {
        console.error('❌ خطا در AI Chat:', error);
        this.removeTypingIndicator();
        this.addMessageToHistory('ai', 'متأسفانه در دریافت پاسخ خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
        this.showToast('خطا در ارتباط با سرور هوش مصنوعی', 'error');
    } finally {
        // فعال کردن دکمه ارسال
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>ارسال</span>';
        console.log('✅ ارسال پیام تکمیل شد');
    }
}
async typeMessageGradually(text) {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    this.isAITyping = true;
    
    const messageId = `ai-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // ایجاد عنصر پیام
    const messageHtml = `
        <div class="ai-message ai-response" id="${messageId}">
            <div class="message-content">
                <div class="message-text"></div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    const messageElement = document.getElementById(messageId);
    const textElement = messageElement.querySelector('.message-text');
    
    // تایپ تدریجی
    let displayedText = '';
    const words = text.split(' ');
    let wordIndex = 0;
    
    return new Promise((resolve) => {
        const typeInterval = setInterval(() => {
            if (wordIndex < words.length) {
                displayedText += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
                textElement.innerHTML = this.formatMessage(displayedText);
                wordIndex++;
                
                // هر 3 کلمه یک بار چک کن برای اسکرول
                if (wordIndex % 3 === 0 || wordIndex === words.length) {
                    this.checkAndAutoScroll();
                }
            } else {
                clearInterval(typeInterval);
                this.isAITyping = false;
                // یک بار در انتها اسکرول کن
                setTimeout(() => this.scrollToBottom(), 100);
                resolve();
            }
        }, 100); // سرعت منطقی‌تر
    });
}

// متد کمکی برای چک کردن و اسکرول اتوماتیک
checkAndAutoScroll() {
    if (!this.scrollState.isUserScrolling) {
        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            const currentDistance = chatHistory.scrollHeight - 
                                  (chatHistory.scrollTop + chatHistory.clientHeight);
            
            // اگر نزدیک پایین هستیم، اسکرول کن
            if (currentDistance < 300) {
                this.scrollToBottom();
            }
        }
    }
}
// اضافه کردن پیام با تایپ تدریجی
async addMessageWithTyping(sender, message) {
    const chatHistory = document.getElementById('chat-history');
    const messageId = `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const messageElement = document.createElement('div');
    messageElement.className = `ai-message ${sender}-message`;
    messageElement.id = messageId;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = time;
    
    messageContent.appendChild(messageText);
    messageContent.appendChild(messageTime);
    messageElement.appendChild(messageContent);
    chatHistory.appendChild(messageElement);
    
    // تایپ تدریجی
    let index = 0;
    const typingSpeed = 15; // میلی‌ثانیه بین هر حرف
    
    return new Promise((resolve) => {
        const typeWriter = () => {
            if (index < message.length) {
                const char = message.charAt(index);
                const span = document.createElement('span');
                span.textContent = char;
                span.style.animation = `fadeIn 0.1s`;
                messageText.appendChild(span);
                index++;
                
                // اسکرول به پایین
                chatHistory.scrollTop = chatHistory.scrollHeight;
                
                // ادامه تایپ
                setTimeout(typeWriter, typingSpeed);
            } else {
                resolve();
            }
        };
        
        typeWriter();
    });
}
addMessageToHistory(sender, message) {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const time = new Date().toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const messageClass = sender === 'user' ? 'user-message' : 'ai-message';
    
    const messageHtml = `
        <div class="message ${messageClass}">
            <div class="message-content">
                <div class="message-text">${message}</div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    // اسکرول به پایین
    setTimeout(() => {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 100);
}
async sendAIMessage() {
    console.log('🚀 ارسال سریع پیام...');
    
    const input = document.getElementById('ai-chat-input');
    const sendBtn = document.getElementById('send-ai-message');
    
    if (!input || !sendBtn) return;
    
    const message = input.value.trim();
    
    if (!message) {
        this.showToast('لطفاً پیام خود را وارد کنید', 'warning');
        return;
    }
    
    // غیرفعال کردن دکمه
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // پاک کردن ورودی سریع
    input.value = '';
    input.style.height = 'auto';
    
    // 🔴 نمایش فوری پیام کاربر (بدون تایپ)
    this.addMessageInstantly('user', message);
    
    try {
        // نشانگر تایپ سریع (1 ثانیه)
        this.showTypingIndicator();
        
        // دریافت پاسخ از API
        console.log('🌐 دریافت پاسخ...');
        const response = await this.getAIResponse(message);
        
        // حذف نشانگر تایپ
        this.removeTypingIndicator();
        
        // 🔴 نمایش فوری پاسخ AI (بدون تایپ تدریجی)
        this.addMessageInstantly('ai', response);
        
        // ذخیره تاریخچه
        this.saveChatHistory();
        
        
        
    } catch (error) {
        console.error('❌ خطا:', error);
        this.removeTypingIndicator();
        this.addMessageInstantly('ai', 'متأسفانه در دریافت پاسخ خطایی رخ داده است. لطفاً دوباره تلاش کنید.');
        this.showToast('خطا در ارتباط', 'error');
    } finally {
        // فعال کردن دکمه
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i><span>ارسال</span>';
    }
}
async getAIResponse(message) {
    console.log('🚀 درخواست AI - پاسخ با دکمه‌های هدایت');
    
    const lowerMessage = message.toLowerCase();
    
    // پاسخ‌های هوشمند با توجه به سوال کاربر
    if (lowerMessage.includes('سلام') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
        return this.getGreetingResponse();
    } else if (lowerMessage.includes('لغت') || lowerMessage.includes('کلمه') || lowerMessage.includes('واژه')) {
        return this.getDictionaryResponse();
    } else if (lowerMessage.includes('ترجمه') || lowerMessage.includes('ترجمه کن')) {
        return this.getTranslationResponse();
    } else if (lowerMessage.includes('تمرین') || lowerMessage.includes('تست') || lowerMessage.includes('آزمون')) {
        return this.getPracticeResponse();
    } else if (lowerMessage.includes('گرامر') || lowerMessage.includes('دستور')) {
        return this.getGrammarResponse();
    } else if (lowerMessage.includes('تلفظ') || lowerMessage.includes('لهجه')) {
        return this.getPronunciationResponse();
    } else {
        return this.getDefaultResponse(message);
    }
}

// پاسخ به سلام
getGreetingResponse() {
    return `👋 سلام! خوش آمدید!

من دستیار آموزش زبان آلمانی هستم که توسط الیاس حسینی ساخته شده ام. متأسفانه سرویس گفتگوی هوش مصنوعی فعلاً در دسترس نیست، اما می‌توانم شما را به بخش‌های مفید برنامه هدایت کنم:

🔽 **برای شروع، روی یکی از دکمه‌های زیر کلیک کنید:**`;
}

// پاسخ برای لغات
getDictionaryResponse() {
    return `📚 **برای جستجوی لغات آلمانی:**

می‌توانید:
1. در دیکشنری جستجو کنید
2. لغات جدید اضافه کنید
3. لغات مورد علاقه را ذخیره کنید

🔽 **دکمه‌های سریع:**`;
}

// پاسخ برای ترجمه
getTranslationResponse() {
    return `🌐 **برای ترجمه متن:**

با مترجم داخلی می‌توانید:
• متن آلمانی به فارسی ترجمه کنید
• متن فارسی به آلمانی ترجمه کنید
• ترجمه‌ها را در دیکشنری ذخیره کنید

🔽 **دکمه‌های سریع:**`;
}

// پاسخ برای تمرین
getPracticeResponse() {
    return `🎯 **برای تمرین و تست:**

انواع تمرین‌های موجود:
• فلش کارت 📇
• تمرین شنیداری 🎧
• تمرین نوشتاری ⌨️
• جمله‌سازی 💬

🔽 **دکمه‌های سریع:**`;
}

// پاسخ پیش‌فرض
getDefaultResponse(message) {
    return `سوال شما: "${message}"

🤖 **دستیار هوش مصنوعی آلمانی**

متأسفانه سرویس کامل هوش مصنوعی فعلاً در دسترس نیست. اما می‌توانید از بخش‌های قدرتمند زیر استفاده کنید:

🔽 **برای پاسخ به سوال شما، پیشنهاد می‌کنم:**`;
}
async getAIResponseFallback(message) {
    console.log('🔄 استفاده از جایگزین...');
    
    // استفاده از توکن Liara که ارائه کردید
    const liaraToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiI2OTJlOGIwYjhiMGI4ODA5MTAwZTJkMTQiLCJ0eXBlIjoiYWlfa2V5IiwiaWF0IjoxNzY0NjU3OTMxfQ.JkEtCwwWbcY7ICrR4t82eyTWQYwx-f2sak8hz-RX3RI';
    const liaraEndpoint = 'https://ai.liara.ir/api/692e8a55f60ce2d780f70535/v1/chat/completions';
    
    try {
        const response = await fetch(liaraEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${liaraToken}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful German language teaching assistant. Respond in Persian.'
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }
        
        // اگر Liara هم کار نکرد، از پاسخ‌های داخلی استفاده کن
        return this.getInternalResponse(message);
        
    } catch (error) {
        console.error('❌ خطای Liara:', error);
        return this.getInternalResponse(message);
    }
}
/// خط 2814 را با این کد جایگزین کنید:
async tryDeepSeek(message, systemPrompt) {
    // استفاده از توکن معتبر DeepSeek
    const apiKey = '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'; // یا توکن جدیدتر
    
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
                stream: false
            })
        });

        console.log('📡 DeepSeek وضعیت:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ پاسخ DeepSeek دریافت شد');
            return data.choices[0].message.content;
        } else {
            const errorText = await response.text();
            console.error('❌ DeepSeek خطا:', errorText);
            
            if (response.status === 401) {
                console.error('❌ DeepSeek API Key نیاز به بررسی دارد');
            }
            
            return null;
        }
        
    } catch (error) {
        console.error('❌ خطای شبکه DeepSeek:', error);
        return null;
    }
}

// متد کمکی برای OpenRouter GPT-3.5 Turbo
async tryOpenRouterGPT35(message, systemPrompt) {
    const apiKey = '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';
    
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'German Dictionary'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                max_tokens: 1000,
                temperature: 0.7,
                stream: false
            })
        });

        console.log('📡 OpenRouter GPT-3.5 وضعیت:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ پاسخ OpenRouter GPT-3.5 دریافت شد');
            return data.choices[0].message.content;
        } else {
            const errorText = await response.text();
            console.error('❌ OpenRouter خطا:', errorText);
            
            // اگر خطای 402 (نیاز به پرداخت) بود
            if (response.status === 402) {
                console.error('💰 OpenRouter نیاز به شارژ حساب دارد');
            }
            
            return null;
        }
        
    } catch (error) {
        console.error('❌ خطای شبکه OpenRouter:', error);
        return null;
    }
}

// پاسخ پیش‌فرض اگر هیچ API کار نکرد
getFallbackResponse(message) {
    console.log('🔄 استفاده از پاسخ پیش‌فرض...');
    
    // پاسخ‌های از پیش تعریف شده برای زبان آلمانی
    const predefinedResponses = {
        'سلام': `سلام! 👋 من دستیار هوش مصنوعی آموزش زبان آلمانی هستم که توسط الیاس حسینی ساخته شده‌ام.

چطور می‌تونم در یادگیری زبان آلمانی به شما کمک کنم؟

می‌تونید در مورد:
• گرامر آلمانی
• واژگان جدید
• تلفظ و لهجه
• تمرین‌های یادگیری
• جمله‌سازی و مکالمه

از من سوال بپرسید.`,
        
        'گرامر': `گرامر زبان آلمانی شامل بخش‌های مهم زیر است:

📘 **جنسیت اسامی:**
• der (مذکر) - مانند: der Mann (مرد)
• die (مونث) - مانند: die Frau (زن)
• das (خنثی) - مانند: das Kind (کودک)

📘 **حالت‌های چهارگانه:**
1. Nominativ (فاعلی) - Wer? (چه کسی؟)
2. Akkusativ (مفعولی) - Wen? (چه کسی را؟)
3. Dativ (مفعول با حرف اضافه) - Wem? (به چه کسی؟)
4. Genitiv (ملکی) - Wessen? (مال چه کسی؟)

📘 **صرف فعل:**
• Ich lerne (من یاد می‌گیرم)
• Du lernst (تو یاد می‌گیری)
• Er/sie/es lernt (او یاد می‌گیرد)

سوال خاصی درباره گرامر دارید؟`,
        
        'لغت': `برخی لغات پرکاربرد آلمانی:

🏠 **خانه و خانواده:**
• Haus (خانه)
• Familie (خانواده)
• Mutter (مادر)
• Vater (پدر)

📚 **آموزش:**
• lernen (یادگیری)
• Schule (مدرسه)
• Buch (کتاب)
• Lehrer (معلم)

🍽️ **غذا و نوشیدنی:**
• Wasser (آب)
• Brot (نان)
• Kaffee (قهوه)
• Essen (غذا)

💬 **مکالمه:**
• Hallo (سلام)
• Danke (ممنون)
• Bitte (لطفاً)
• Entschuldigung (ببخشید)

چه نوع لغاتی نیاز دارید؟`,
        
        'جمله': `جمله‌های ساده و کاربردی آلمانی:

👋 **سلام و احوالپرسی:**
• Guten Morgen! (صبح بخیر!)
• Wie geht es dir? (حالت چطوره؟)
• Mir geht es gut, danke. (خوبم، ممنون)

❓ **سوالات رایج:**
• Woher kommst du? (اهل کجایی؟)
• Was machst du? (چه کار می‌کنی؟)
• Sprechen Sie Englisch? (آیا انگلیسی صحبت می‌کنید؟)

🗣️ **جملات کاربردی:**
• Ich verstehe nicht. (من نمی‌فهمم.)
• Können Sie das wiederholen? (می‌توانید تکرار کنید؟)
• Ich lerne Deutsch. (من آلمانی یاد می‌گیرم.)

💡 **نکته:** سعی کنید روزانه 3-5 جمله جدید تمرین کنید.`,
        
        'تلفظ': `تلفظ آلمانی - نکات مهم:

🔊 **حروف خاص آلمانی:**
• ä - تلفظ مانند "e" در "مادر"
• ö - تلفظ مانند "eu" در فرانسوی
• ü - لب‌ها را گرد کنید و بگویید "ی"
• ß - مانند "ss" تلفظ می‌شود

🔊 **تلفظ صحیح:**
• ch - مانند "خ" فارسی (Buch - بوخ)
• r - غلتانی، پشت گلو (rot - روت)
• v - مانند "ف" (Vater - فاتر)
• w - مانند "و" (Wasser - واسر)

🎯 **تمرین:** با صدای بلند تکرار کنید تا لهجه شما بهبود یابد.`
    };
    
    // بررسی اگر سوال مشابه پاسخ‌های از پیش تعریف شده است
    const lowerMessage = message.toLowerCase();
    
    for (const [key, response] of Object.entries(predefinedResponses)) {
        if (lowerMessage.includes(key.toLowerCase())) {
            return response;
        }
    }
    
    // پاسخ عمومی
    return `سوال شما: "${message}"

👋 سلام! من دستیار هوش مصنوعی آموزش زبان آلمانی هستم که توسط الیاس حسینی توسعه داده شده‌ام.

متأسفانه در حال حاضر سرویس‌های هوش مصنوعی خارجی در دسترس نیستند.

🌟 **می‌توانید از این بخش‌ها استفاده کنید:**
1. 📖 **دیکشنری:** جستجوی لغات آلمانی
2. 🔍 **مترجم:** ترجمه متن آلمانی به فارسی و برعکس
3. 🎯 **تمرین:** تمرین‌های مختلف برای یادگیری
4. 📊 **آمار:** پیگیری پیشرفت خود

💡 **پیشنهاد:** سوال خود را در بخش مربوطه مطرح کنید یا از مترجم داخلی استفاده نمایید.

به زودی سرویس هوش مصنوعی بازمی‌گردد!`;
}

// متد تست اتصال
async testAIConnection() {
    console.log('🔍 تست اتصال به AI...');
    
    // نمایش وضعیت دامنه
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    console.log('📍 موقعیت فعلی:', `${protocol}//${hostname}`);
    
    // تست ساده
    const testMessage = "سلام! لطفاً یک جمله ساده آلمانی با ترجمه فارسی بگو.";
    
    try {
        this.showToast('در حال تست اتصال به AI...', 'info');
        const response = await this.getAIResponse(testMessage);
        console.log('✅ تست موفقیت‌آمیز بود:', response);
        this.showToast('اتصال به AI موفق بود!', 'success');
        return true;
    } catch (error) {
        console.error('❌ تست شکست خورد:', error);
        this.showToast(`خطا در اتصال: ${error.message}`, 'error');
        return false;
    }
}
async addMessageToHistory(sender, message, options = {}) {
    const { skipScroll = false, isTyping = false } = options;
    const chatHistory = document.getElementById('chat-history');
    
    if (!chatHistory) {
        console.error('❌ تاریخچه چت یافت نشد!');
        return;
    }
    
    const messageId = isTyping ? 'typing-indicator' : `message-${Date.now()}`;
    const time = new Date().toLocaleTimeString('fa-IR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // فرمت‌بندی پیام با دکمه‌ها
    let formattedMessage = this.formatMessage(message);
    
    // اضافه کردن دکمه‌های هدایت به پیام‌های AI
    if (sender === 'ai' && !isTyping) {
        formattedMessage += this.getQuickActionButtons(message);
    }
    
    const messageHtml = `
        <div class="ai-message ${sender}-message" id="${messageId}">
            <div class="message-content">
                <div class="message-text">${formattedMessage}</div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    chatHistory.insertAdjacentHTML('beforeend', messageHtml);
    
    // تنظیم event listeners برای دکمه‌ها
    if (sender === 'ai' && !isTyping) {
        setTimeout(() => {
            this.setupQuickActionButtons(messageId);
        }, 100);
    }
    
    // اسکرول
    if (!skipScroll) {
        setTimeout(() => {
            this.scrollToBottom();
        }, 50);
    }
    
    console.log(`📨 پیام ${sender} اضافه شد`);
    return messageId;
}

getQuickActionButtons(message) {
    const lowerMessage = message.toLowerCase();
    
    let buttons = '';
    
    // تشخیص نوع پیام و ایجاد دکمه‌های مناسب
    if (lowerMessage.includes('سلام') || lowerMessage.includes('خوش آمدید')) {
        buttons = `
            <div class="quick-action-buttons">
                <button class="quick-action-btn" data-action="dictionary" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                    <i class="fas fa-search"></i>
                    <span>جستجوی لغات</span>
                </button>
                <button class="quick-action-btn" data-action="translate" style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);">
                    <i class="fas fa-language"></i>
                    <span>مترجم</span>
                </button>
                <button class="quick-action-btn" data-action="practice" style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);">
                    <i class="fas fa-brain"></i>
                    <span>تمرین</span>
                </button>
                <button class="quick-action-btn" data-action="stats" style="background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);">
                    <i class="fas fa-chart-line"></i>
                    <span>آمار</span>
                </button>
            </div>
        `;
    } else if (lowerMessage.includes('لغت') || lowerMessage.includes('دیکشنری')) {
        buttons = `
            <div class="quick-action-buttons">
                <button class="quick-action-btn" data-action="search">
                    <i class="fas fa-search"></i>
                    <span>جستجوی لغت</span>
                </button>
                <button class="quick-action-btn" data-action="add-word">
                    <i class="fas fa-plus"></i>
                    <span>اضافه کردن لغت</span>
                </button>
                <button class="quick-action-btn" data-action="word-list">
                    <i class="fas fa-list"></i>
                    <span>مشاهده همه لغات</span>
                </button>
                <button class="quick-action-btn" data-action="favorites">
                    <i class="fas fa-star"></i>
                    <span>علاقه‌مندی‌ها</span>
                </button>
            </div>
        `;
    } else if (lowerMessage.includes('ترجمه')) {
        buttons = `
            <div class="quick-action-buttons">
                <button class="quick-action-btn" data-action="translate-de-fa">
                    <i class="fas fa-arrow-right"></i>
                    <span>آلمانی به فارسی</span>
                </button>
                <button class="quick-action-btn" data-action="translate-fa-de">
                    <i class="fas fa-arrow-left"></i>
                    <span>فارسی به آلمانی</span>
                </button>
                <button class="quick-action-btn" data-action="translate-save">
                    <i class="fas fa-save"></i>
                    <span>ذخیره ترجمه</span>
                </button>
            </div>
        `;
    } else {
        // دکمه‌های پیش‌فرض
        buttons = `
            <div class="quick-action-buttons">
                <button class="quick-action-btn" data-action="dictionary">
                    <i class="fas fa-search"></i>
                    <span>جستجوی لغت</span>
                </button>
                <button class="quick-action-btn" data-action="translate">
                    <i class="fas fa-language"></i>
                    <span>مترجم</span>
                </button>
                <button class="quick-action-btn" data-action="practice">
                    <i class="fas fa-brain"></i>
                    <span>تمرین</span>
                </button>
                <button class="quick-action-btn" data-action="help">
                    <i class="fas fa-question-circle"></i>
                    <span>راهنما</span>
                </button>
            </div>
        `;
    }
    
    return buttons;
}

setupQuickActionButtons(messageId) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) {
        console.error('❌ پیام یافت نشد:', messageId);
        return;
    }
    
    const buttons = messageElement.querySelectorAll('.quick-action-btn');
    if (buttons.length === 0) {
        console.warn('⚠️ هیچ دکمه‌ای در پیام یافت نشد');
        return;
    }
    
    console.log('🔘 تنظیم event listeners برای', buttons.length, 'دکمه');
    
    buttons.forEach(btn => {
        // حذف event listener قبلی برای جلوگیری از duplicate
        btn.replaceWith(btn.cloneNode(true));
    });
    
    // دوباره انتخاب کن
    messageElement.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const action = btn.getAttribute('data-action');
            console.log('🔘 کلیک روی دکمه سریع:', action);
            
            // اضافه کردن انیمیشن کلیک
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 150);
            
            this.handleQuickAction(action);
        });
    });
}

// مدیریت کلیک روی دکمه‌های سریع
handleQuickAction(action) {
    console.log(`🔘 کلیک روی دکمه سریع: ${action}`);
    
    switch(action) {
        case 'dictionary':
        case 'search':
            this.showSection('search-section');
            this.showToast('به بخش جستجوی لغات منتقل شدید', 'info');
            break;
            
        case 'translate':
        case 'translate-de-fa':
            this.showSection('translate-section');
            this.translateDirection = 'de-fa';
            this.updateTranslateUI();
            this.showToast('به بخش مترجم (آلمانی به فارسی) منتقل شدید', 'info');
            break;
            
        case 'translate-fa-de':
            this.showSection('translate-section');
            this.translateDirection = 'fa-de';
            this.updateTranslateUI();
            this.showToast('به بخش مترجم (فارسی به آلمانی) منتقل شدید', 'info');
            break;
            
        case 'practice':
        case 'practice-flashcards':
            this.showSection('practice-section');
            this.renderPracticeOptions();
            this.showToast('به بخش تمرین منتقل شدید', 'info');
            break;
            
        case 'practice-listening':
            this.showSection('practice-section');
            this.startListeningPractice();
            this.showToast('تمرین شنیداری شروع شد', 'success');
            break;
            
        case 'practice-writing':
            this.showSection('practice-section');
            this.startWritingPractice();
            this.showToast('تمرین نوشتاری شروع شد', 'success');
            break;
            
        case 'word-list':
            this.showSection('word-list-section');
            this.renderWordList();
            this.showToast('به بخش لیست لغات منتقل شدید', 'info');
            break;
            
        case 'add-word':
            this.showSection('add-word-section');
            this.showToast('به بخش اضافه کردن لغت منتقل شدید', 'info');
            break;
            
        case 'favorites':
            this.showSection('favorites-section');
            this.renderFavorites();
            this.showToast('به بخش علاقه‌مندی‌ها منتقل شدید', 'info');
            break;
            
        case 'stats':
            this.showSection('progress-section');
            this.updateStats();
            this.showToast('به بخش آمار و پیشرفت منتقل شدید', 'info');
            break;
            
        case 'help':
            this.showToast('برای راهنمایی بیشتر، از منوی سمت راست استفاده کنید', 'info');
            break;
            
        default:
            console.log('⚠️ اکشن ناشناخته:', action);
    }
    
    // آپدیت منوی فعال
    document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(item => {
        item.classList.remove('active');
    });
}
// متد getChatHistoryForAPI() را اینگونه تغییر دهید:
getChatHistoryForAPI() {
    const messages = [];
    const messageElements = document.querySelectorAll('#chat-history .ai-message, #chat-history .user-message');
    
    // همه پیام‌ها را برمی‌گرداند (بدون محدودیت)
    messageElements.forEach(element => {
        // حذف پیام‌های سیستمی و خوش‌آمدگویی
        const isSystemMessage = element.classList.contains('welcome-message') || 
                                element.classList.contains('ai-welcome-message');
        if (isSystemMessage) return;
        
        const isUser = element.classList.contains('user-message');
        const messageText = element.querySelector('.message-text')?.textContent || '';
        
        if (messageText.trim() && 
            !messageText.includes('در حال پردازش') && 
            !messageText.includes('سلام! من')) {
            messages.push({
                role: isUser ? 'user' : 'assistant',
                content: messageText
            });
        }
    });
    
    console.log('📜 تاریخچه چت برای API:', messages.length, 'پیام');
    return messages; // همه پیام‌ها را بفرست
}

saveChatHistory() {
    const chatHistory = document.getElementById('chat-history').innerHTML;
    localStorage.setItem('aiChatHistory', chatHistory);
}

loadChatHistory() {
    const savedHistory = localStorage.getItem('aiChatHistory');
    if (savedHistory) {
        document.getElementById('chat-history').innerHTML = savedHistory;
        // اسکرول به پایین
        setTimeout(() => {
            const chatHistory = document.getElementById('chat-history');
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 100);
    }
}

clearChatHistory() {
    if (confirm('آیا از پاک کردن تاریخچه چت مطمئن هستید؟')) {
        localStorage.removeItem('aiChatHistory');
        document.getElementById('chat-history').innerHTML = `
            <div class="chat-message ai-message">
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-text">
                        سلام! من  الیاس هستم . می‌توانید هر سوالی در مورد گرامر، واژگان، تلفظ یا تمرین زبان آلمانی از من بپرسید.
                    </div>
                    <div class="message-time">
                        همین حالا
                    </div>
                </div>
            </div>
        `;
        this.showToast('تاریخچه چت پاک شد', 'success');
    }
}

getTemperatureLabel(value) {
    const num = parseFloat(value);
    if (num <= 0.3) return `پایین (${num})`;
    if (num <= 0.7) return `متوسط (${num})`;
    return `بالا (${num})`;
}

startVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'fa-IR';
        recognition.interimResults = false;
        recognition.continuous = false;
        
        // نمایش وضعیت
        this.showToast('در حال گوش دادن... صحبت کنید', 'info');
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('ai-chat-input').value = transcript;
            this.showToast('متن شناسایی شد', 'success');
        };
        
        recognition.onerror = (event) => {
            console.error('خطای تشخیص صدا:', event.error);
            this.showToast(`خطا در تشخیص صدا: ${event.error}`, 'error');
        };
        
        recognition.onend = () => {
            console.log('تشخیص صدا پایان یافت');
        };
        
        recognition.start();
        
    } else {
        this.showToast('مرورگر شما از تشخیص گفتار پشتیبانی نمی‌کند', 'error');
    }
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
/// این متد کامل را جایگزین متد قبلی setupTranslateEventListeners کنید
setupTranslateEventListeners() {
    let debounceTimer;
    
    // تغییر جهت ترجمه
    document.querySelectorAll('.direction-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const newDirection = e.currentTarget.getAttribute('data-direction');
            
            // اگر جهت تغییر نکرده، کاری نکن
            if (this.translateDirection === newDirection) return;
            
            this.translateDirection = newDirection;
            
            // آپدیت وضعیت دکمه‌ها
            document.querySelectorAll('.direction-option').forEach(opt => {
                opt.classList.remove('active');
            });
            e.currentTarget.classList.add('active');
            
            // 🔴 این خط مهم را اضافه کنید:
            this.updateTranslateUI();
            
            // پاک کردن فیلدها
            document.getElementById('translate-input').value = '';
            document.getElementById('translate-result').innerHTML = `
                <div class="empty-result">
                    <div class="empty-icon">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <p>نتیجه ترجمه اینجا نمایش داده می‌شود</p>
                    <small>متن را در باکس بالا وارد کنید</small>
                </div>
            `;
            
            // پاک کردن پیشنهادات
            document.getElementById('suggestions-list').innerHTML = '';
            
            // فوکوس روی فیلد ورودی
            setTimeout(() => {
                document.getElementById('translate-input').focus();
            }, 100);
        });
    });
    
    // ترجمه اتوماتیک با تایپ کردن
    document.getElementById('translate-input')?.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const text = e.target.value.trim();
        
        if (!text) {
            document.getElementById('translate-result').innerHTML = `
                <div class="empty-result">
                    <div class="empty-icon">
                        <i class="fas fa-exchange-alt"></i>
                    </div>
                    <p>نتیجه ترجمه اینجا نمایش داده می‌شود</p>
                    <small>متن را در باکس بالا وارد کنید</small>
                </div>
            `;
            document.getElementById('suggestions-list').innerHTML = '';
            return;
        }
        
        // نمایش در حال ترجمه
        document.getElementById('translate-result').innerHTML = `
            <div class="loading-translation">
                <div class="spinner"></div>
                <p>در حال ترجمه...</p>
            </div>
        `;
        
        // جستجوی پیشنهادی
        this.showSuggestions(text);
        
        // ترجمه اصلی با تاخیر
        debounceTimer = setTimeout(async () => {
            await this.performAutoTranslation(text);
        }, 600);
    });
    
    // دکمه پاک کردن
    document.getElementById('clear-input')?.addEventListener('click', () => {
        document.getElementById('translate-input').value = '';
        document.getElementById('translate-input').focus();
        document.getElementById('translate-result').innerHTML = `
            <div class="empty-result">
                <div class="empty-icon">
                    <i class="fas fa-exchange-alt"></i>
                </div>
                <p>نتیجه ترجمه اینجا نمایش داده می‌شود</p>
                <small>متن را در باکس بالا وارد کنید</small>
            </div>
        `;
        document.getElementById('suggestions-list').innerHTML = '';
    });
    
    // تلفظ متن ورودی
    document.getElementById('speak-input')?.addEventListener('click', () => {
        const text = document.getElementById('translate-input').value.trim();
        if (text) {
            const lang = this.translateDirection === 'de-fa' ? 'de-DE' : 'fa-IR';
            this.speakWord(text, lang);
        }
    });
    
    // تلفظ ترجمه
    document.getElementById('speak-output')?.addEventListener('click', () => {
        const resultDiv = document.getElementById('translate-result');
        const text = resultDiv.textContent
            .replace('نتیجه ترجمه اینجا نمایش داده می‌شود', '')
            .replace('متن را در باکس بالا وارد کنید', '')
            .replace('در حال ترجمه...', '')
            .trim();
        
        if (text) {
            const lang = this.translateDirection === 'de-fa' ? 'fa-IR' : 'de-DE';
            this.speakWord(text, lang);
        }
    });
    
    // کپی ترجمه
    document.getElementById('copy-result')?.addEventListener('click', async () => {
        const resultDiv = document.getElementById('translate-result');
        const text = resultDiv.textContent
            .replace('نتیجه ترجمه اینجا نمایش داده می‌شود', '')
            .replace('متن را در باکس بالا وارد کنید', '')
            .replace('در حال ترجمه...', '')
            .trim();
        
        if (text) {
            try {
                await navigator.clipboard.writeText(text);
                this.showToast('✅ ترجمه با موفقیت کپی شد', 'success');
            } catch (error) {
                this.showToast('❌ خطا در کپی کردن ترجمه', 'error');
            }
        } else {
            this.showToast('⚠️ متنی برای کپی کردن وجود ندارد', 'warning');
        }
    });
    
    // ذخیره در دیکشنری - این خط را حتماً اضافه کنید
    document.getElementById('save-translation')?.addEventListener('click', () => {
        this.saveTranslationAsWord();
    });
    
    // فوکوس خودکار روی فیلد ورودی
    setTimeout(() => {
        const inputField = document.getElementById('translate-input');
        if (inputField) {
            inputField.focus();
        }
    }, 200);
}
// این متد را جایگزین متد قبلی کنید
async searchInDatabase(text, language) {
    try {
        const words = await this.getAllWords();
        const searchText = text.toLowerCase().trim();
        
        if (language === 'german') {
            // جستجوی آلمانی به فارسی
            const foundWord = words.find(word => 
                word.german.toLowerCase() === searchText ||
                word.german.toLowerCase().startsWith(searchText) ||
                word.german.toLowerCase().includes(searchText)
            );
            
            return foundWord ? foundWord.persian : null;
            
        } else if (language === 'persian') {
            // جستجوی فارسی به آلمانی
            const foundWord = words.find(word => 
                word.persian.toLowerCase() === searchText ||
                word.persian.toLowerCase().includes(searchText) ||
                word.persian.toLowerCase().startsWith(searchText)
            );
            
            return foundWord ? foundWord.german : null;
        }
        
        return null;
    } catch (error) {
        console.error('Error in searchInDatabase:', error);
        return null;
    }
}
// این متد جدید را به کلاس اضافه کنید
updateTranslateUI() {
    const isGermanToPersian = this.translateDirection === 'de-fa';
    
    // آپدیت labelهای ورودی
    const inputLabel = document.getElementById('input-label');
    const inputTitle = document.getElementById('input-title');
    const inputField = document.getElementById('translate-input');
    const inputHint = document.getElementById('input-hint');
    
    const outputLabel = document.getElementById('output-label');
    const outputTitle = document.getElementById('output-title');
    
    if (isGermanToPersian) {
        inputTitle.textContent = 'متن آلمانی:';
        inputField.placeholder = 'متن آلمانی خود را وارد کنید...';
        inputField.dir = 'ltr';
        inputHint.textContent = 'ترجمه به صورت خودکار انجام می‌شود';
        
        outputTitle.textContent = 'ترجمه فارسی:';
    } else {
        inputTitle.textContent = 'متن فارسی:';
        inputField.placeholder = 'متن فارسی خود را وارد کنید...';
        inputField.dir = 'rtl';
        inputHint.textContent = 'ترجمه به صورت خودکار انجام می‌شود';
        
        outputTitle.textContent = 'ترجمه آلمانی:';
    }
}
async performAutoTranslation(text) {
    const resultDiv = document.getElementById('translate-result');
    
    // نمایش وضعیت در حال ترجمه
    resultDiv.innerHTML = `
        <div class="loading-translation">
            <div class="spinner"></div>
            <p>در حال ترجمه آنلاین...</p>
            <small>لطفاً صبر کنید</small>
        </div>
    `;
    
    try {
        let translatedText = null;
        
        // اول در دیتابیس محلی جستجو می‌کنیم
        const sourceLanguage = this.translateDirection === 'de-fa' ? 'german' : 'persian';
        const localResult = await this.searchInDatabase(text, sourceLanguage);
        
        if (localResult) {
            // اگر در دیتابیس محلی پیدا شد
            translatedText = localResult;
            resultDiv.innerHTML = `
                <div class="translated-text">
                    <div class="result-text">
                        <p style="font-size: 18px; font-weight: 500; color: #27ae60;">${translatedText}</p>
                    </div>
                    <div class="translation-success">
                        <i class="fas fa-database"></i>
                        <small>ترجمه از دیتابیس داخلی</small>
                    </div>
                </div>
            `;
        } else {
            // اگر در دیتابیس محلی پیدا نشد، از API آنلاین استفاده می‌کنیم
            translatedText = await this.translateTextOnline(text, this.translateDirection);
            
            if (translatedText) {
                resultDiv.innerHTML = `
                    <div class="translated-text">
                        <div class="original-text">
                            <small>متن اصلی:</small>
                            <p>${text}</p>
                        </div>
                        <div class="separator">
                            <i class="fas fa-arrow-down"></i>
                        </div>
                        <div class="result-text">
                            <small>ترجمه:</small>
                            <p style="font-size: 18px; font-weight: 500; color: #3498db;">${translatedText}</p>
                        </div>
                        <div class="translation-success">
                            <i class="fas fa-globe"></i>
                            <small>ترجمه آنلاین</small>
                        </div>
                    </div>
                `;
                
              
                
                // اضافه کردن event listener برای ذخیره
                document.getElementById('save-online-translation-btn')?.addEventListener('click', () => {
                    this.saveOnlineTranslation(text, translatedText);
                });
                
            } else {
                // اگر ترجمه آنلاین هم موفق نبود
                resultDiv.innerHTML = `
                    <div class="not-found-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>ترجمه یافت نشد</p>
                        <small>مشکلی در ارتباط با سرور ترجمه پیش آمده</small>
                        <br>
                        <small>مطمئن شوید به اینترنت متصل هستید</small>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error('Auto translation error:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>خطا در ترجمه</p>
                <small>${error.message || 'مشکلی در پردازش پیش آمده'}</small>
                <br>
                <button class="btn btn-sm btn-outline mt-2" onclick="location.reload()">
                    <i class="fas fa-redo"></i> تلاش مجدد
                </button>
            </div>
        `;
    }
}

// متد جدید برای ذخیره ترجمه آنلاین
async saveOnlineTranslation(german, persian) {
    // نمایش فرم ذخیره
    document.getElementById('add-word-section').innerHTML = `
        <h2>ذخیره ترجمه آنلاین</h2>
        <div class="word-card">
            <div class="form-group">
                <label for="save-german-word">لغت آلمانی:</label>
                <input type="text" id="save-german-word" class="form-control" value="${german}">
            </div>
            <div class="form-group">
                <label for="save-persian-meaning">معنی فارسی:</label>
                <input type="text" id="save-persian-meaning" class="form-control" value="${persian}">
            </div>
            <div class="form-group">
                <label>جنسیت:</label>
                <div class="gender-options">
                    <button class="gender-btn masculine" data-gender="masculine">مذکر (der)</button>
                    <button class="gender-btn feminine" data-gender="feminine">مونث (die)</button>
                    <button class="gender-btn neuter" data-gender="neuter">خنثی (das)</button>
                    <button class="gender-btn none active" data-gender="none">بدون جنسیت</button>
                </div>
            </div>
            <div class="form-group">
                <label for="save-word-type">نوع کلمه:</label>
                <select id="save-word-type" class="form-control">
                    <option value="noun">اسم</option>
                    <option value="verb">فعل</option>
                    <option value="adjective">صفت</option>
                    <option value="adverb">قید</option>
                    <option value="other" selected>سایر</option>
                </select>
            </div>
            <div class="action-buttons">
                <button class="btn btn-primary" id="save-online-word-btn">ذخیره لغت</button>
                <button class="btn btn-outline" id="cancel-save-btn">انصراف</button>
            </div>
        </div>
    `;
    
    // تنظیم event listeners برای دکمه‌های جنسیت
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');
        });
    });
    
    // ذخیره لغت
    document.getElementById('save-online-word-btn').addEventListener('click', async () => {
        const german = document.getElementById('save-german-word').value.trim();
        const persian = document.getElementById('save-persian-meaning').value.trim();
        const gender = document.querySelector('.gender-btn.active')?.getAttribute('data-gender') || null;
        const type = document.getElementById('save-word-type').value;
        
        if (!german || !persian) {
            this.showToast('لطفاً هر دو فیلد را پر کنید', 'error');
            return;
        }
        
        const wordData = {
            german,
            persian,
            gender,
            type
        };
        
        await this.addWord(wordData);
        this.showToast('لغت با موفقیت به دیتابیس اضافه شد', 'success');
        
        // بازگشت به بخش ترجمه
        this.renderTranslate();
    });
    
    document.getElementById('cancel-save-btn').addEventListener('click', () => {
        this.renderTranslate();
    });
    
    // رفتن به بخش افزودن لغت
    this.showSection('add-word-section');
}
// این متد را به کلاس اضافه کنید
setupOnlineStatus() {
    // بررسی وضعیت اتصال
    const updateOnlineStatus = () => {
        const isOnline = navigator.onLine;
        const statusElement = document.getElementById('online-status');
        
        if (statusElement) {
            statusElement.className = `online-status ${isOnline ? 'online' : 'offline'}`;
            statusElement.innerHTML = `
                <i class="fas fa-${isOnline ? 'wifi' : 'exclamation-triangle'}"></i>
                ${isOnline ? 'آنلاین - ترجمه فعال' : 'آفلاین - فقط دیتابیس محلی'}
            `;
        }
    };
    
    // ایجاد المان وضعیت
    const statusElement = document.createElement('div');
    statusElement.id = 'online-status';
    document.getElementById('translate-section')?.appendChild(statusElement);
    
    // آپدیت اولیه
    updateOnlineStatus();
    
    // گوش دادن به تغییرات وضعیت
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
}
async saveTranslationAsWord() {
    const inputText = document.getElementById('translate-input').value.trim();
    const resultDiv = document.getElementById('translate-result');
    
    if (!inputText) {
        this.showToast('لطفاً ابتدا متنی را ترجمه کنید', 'warning');
        return;
    }
    
    // استخراج ترجمه از نتیجه
    let translationText = '';
    const resultElements = resultDiv.querySelectorAll('p');
    
    for (const element of resultElements) {
        const text = element.textContent.trim();
        if (text && 
            !text.includes('نتیجه ترجمه') && 
            !text.includes('متن را در باکس') && 
            !text.includes('در حال ترجمه') &&
            text !== inputText) {
            translationText = text;
            break;
        }
    }
    
    if (!translationText) {
        this.showToast('ترجمه‌ای برای ذخیره کردن وجود ندارد', 'warning');
        return;
    }
    
    // تعیین جهت ترجمه
    let german, persian;
    if (this.translateDirection === 'de-fa') {
        german = inputText;
        persian = translationText;
    } else {
        german = translationText;
        persian = inputText;
    }
    
    // پاکسازی متن
    german = german.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
    persian = persian.replace(/["']/g, '').replace(/\s+/g, ' ').trim();
    
    // نمایش فرم ذخیره
    this.showSaveTranslationForm(german, persian);
}

async showSaveTranslationForm(german, persian) {
    document.getElementById('add-word-section').innerHTML = `
        <h2 class="mb-4">ذخیره ترجمه در دیکشنری</h2>
        <div class="word-card">
            <div class="form-group">
                <label for="save-german-word">لغت آلمانی:</label>
                <input type="text" id="save-german-word" class="form-control" value="${german}">
            </div>
            
            <div class="form-group">
                <label for="save-persian-meaning">معنی فارسی:</label>
                <input type="text" id="save-persian-meaning" class="form-control" value="${persian}">
            </div>
            
            <div class="form-group">
                <label>نوع کلمه:</label>
                <select id="save-word-type" class="form-control">
                    <option value="noun">اسم</option>
                    <option value="verb">فعل</option>
                    <option value="adjective">صفت</option>
                    <option value="adverb">قید</option>
                    <option value="other" selected>سایر</option>
                </select>
            </div>
            
            <div class="form-group gender-section" id="gender-section" style="display: none;">
                <label>جنسیت (برای اسم‌ها):</label>
                <div class="gender-options">
                    <button type="button" class="gender-btn masculine" data-gender="masculine">مذکر (der)</button>
                    <button type="button" class="gender-btn feminine" data-gender="feminine">مونث (die)</button>
                    <button type="button" class="gender-btn neuter" data-gender="neuter">خنثی (das)</button>
                </div>
            </div>
            
            <div class="verb-forms-section" id="verb-forms-section" style="display: none;">
                <label>صرف فعل (اختیاری):</label>
                <div class="verb-form-row">
                    <div class="form-group">
                        <label for="save-verb-present">حال ساده</label>
                        <input type="text" id="save-verb-present" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="save-verb-past">گذشته</label>
                        <input type="text" id="save-verb-past" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="save-verb-perfect">گذشته کامل</label>
                        <input type="text" id="save-verb-perfect" class="form-control">
                    </div>
                </div>
            </div>
            
            <div class="action-buttons mt-4">
                <button class="btn btn-primary" id="save-translation-word-btn">
                    <i class="fas fa-save"></i> ذخیره در دیکشنری
                </button>
                <button class="btn btn-outline" id="cancel-save-translation-btn">
                    <i class="fas fa-times"></i> انصراف
                </button>
            </div>
        </div>
    `;
    
    // تنظیم event listeners
    this.setupSaveTranslationFormEvents();
    
    // نمایش بخش
    this.showSection('add-word-section');
    document.querySelector('.menu-item[data-section="add-word"]').classList.add('active');
}

setupSaveTranslationFormEvents() {
    // تغییر نوع کلمه
    document.getElementById('save-word-type').addEventListener('change', (e) => {
        const type = e.target.value;
        const genderSection = document.getElementById('gender-section');
        const verbSection = document.getElementById('verb-forms-section');
        
        if (type === 'noun') {
            genderSection.style.display = 'block';
            verbSection.style.display = 'none';
        } else if (type === 'verb') {
            genderSection.style.display = 'none';
            verbSection.style.display = 'block';
        } else {
            genderSection.style.display = 'none';
            verbSection.style.display = 'none';
        }
    });
    
    // دکمه‌های جنسیت
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // دکمه ذخیره
    document.getElementById('save-translation-word-btn').addEventListener('click', async () => {
        const german = document.getElementById('save-german-word').value.trim();
        const persian = document.getElementById('save-persian-meaning').value.trim();
        const type = document.getElementById('save-word-type').value;
        
        if (!german || !persian) {
            this.showToast('لطفاً هر دو فیلد لغت و معنی را پر کنید', 'error');
            return;
        }
        
        const wordData = {
            german,
            persian,
            type
        };
        
        // اضافه کردن جنسیت برای اسم‌ها
        if (type === 'noun') {
            const activeGender = document.querySelector('.gender-btn.active');
            if (activeGender) {
                wordData.gender = activeGender.getAttribute('data-gender');
            }
        }
        
        // اضافه کردن صرف فعل برای فعل‌ها
        if (type === 'verb') {
            const present = document.getElementById('save-verb-present').value.trim();
            const past = document.getElementById('save-verb-past').value.trim();
            const perfect = document.getElementById('save-verb-perfect').value.trim();
            
            if (present || past || perfect) {
                wordData.verbForms = { present, past, perfect };
            }
        }
        
        try {
            await this.addWord(wordData);
            this.showToast('لغت با موفقیت در دیکشنری ذخیره شد', 'success');
            this.renderTranslate();
            this.showSection('translate-section');
        } catch (error) {
            this.showToast('خطا در ذخیره لغت', 'error');
        }
    });
    
    // دکمه انصراف
    document.getElementById('cancel-save-translation-btn').addEventListener('click', () => {
        this.renderTranslate();
        this.showSection('translate-section');
    });
}
// این متد جدید را به کلاس اضافه کنید
async translateTextOnline(text, direction) {
    let sourceLang, targetLang;
    
    if (direction === 'de-fa') {
        sourceLang = 'de';
        targetLang = 'fa';
    } else {
        sourceLang = 'fa';
        targetLang = 'de';
    }
    
    // اول سعی می‌کنیم از Google Translate استفاده کنیم
    let translatedText = await this.translateTextGoogle(text, sourceLang, targetLang);
    
    // اگر Google Translate کار نکرد، از MyMemory استفاده می‌کنیم
    if (!translatedText) {
        translatedText = await this.translateTextMyMemory(text, sourceLang, targetLang);
    }
    
    // اگر MyMemory هم کار نکرد، از LibreTranslate استفاده می‌کنیم
    if (!translatedText) {
        translatedText = await this.translateTextLibre(text, sourceLang, targetLang);
    }
    
    return translatedText;
}

// متد Google Translate
async translateTextGoogle(text, sourceLang, targetLang) {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Google Translate returns a nested array
        if (data && data[0] && data[0][0] && data[0][0][0]) {
            return data[0][0][0];
        }
        return null;
    } catch (error) {
        console.log('Google Translate failed, trying next API...');
        return null;
    }
}

// متد MyMemory
async translateTextMyMemory(text, sourceLang, targetLang) {
    try {
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.responseData && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
        return null;
    } catch (error) {
        console.log('MyMemory failed, trying next API...');
        return null;
    }
}

// متد LibreTranslate
async translateTextLibre(text, sourceLang, targetLang) {
    try {
        // سعی می‌کنیم از چند سرور مختلف LibreTranslate استفاده کنیم
        const servers = [
            'https://libretranslate.com',
            'https://translate.argosopentech.com',
            'https://libretranslate.de'
        ];
        
        for (const server of servers) {
            try {
                const url = `${server}/translate`;
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        q: text,
                        source: sourceLang,
                        target: targetLang,
                        format: 'text',
                        api_key: '' // اگر API key داشتید اینجا وارد کنید
                    })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.translatedText) {
                        return data.translatedText;
                    }
                }
            } catch (serverError) {
                console.log(`Server ${server} failed, trying next...`);
                continue;
            }
        }
        
        return null;
    } catch (error) {
        console.log('All LibreTranslate servers failed');
        return null;
    }
}
async showSuggestions(germanText) {
    const suggestionsDiv = document.getElementById('suggestions-list');
    
    if (!germanText || germanText.length < 2) {
        suggestionsDiv.innerHTML = '';
        return;
    }
    
    try {
        const words = await this.getAllWords();
        const searchText = germanText.toLowerCase();
        
        // جستجوی کلمات مشابه
        const suggestions = words
            .filter(word => 
                word.german.toLowerCase().startsWith(searchText) ||
                word.german.toLowerCase().includes(searchText) ||
                word.persian.toLowerCase().includes(searchText)
            )
            .slice(0, 5); // محدودیت 5 پیشنهاد
        
        if (suggestions.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-suggestions">پیشنهادی یافت نشد</div>';
            return;
        }
        
        suggestionsDiv.innerHTML = suggestions.map(word => `
            <div class="suggestion-item" data-german="${word.german}">
                <div class="suggestion-content">
                    <div class="suggestion-german">${word.german}</div>
                    <div class="suggestion-persian">${word.persian}</div>
                    ${word.gender ? `<span class="word-gender-badge ${word.gender}">${this.getGenderSymbol(word.gender)}</span>` : ''}
                    ${word.type ? `<span class="word-type-badge">${this.getTypeLabel(word.type)}</span>` : ''}
                </div>
                <div class="suggestion-action">
                    <button class="btn btn-sm btn-outline use-suggestion-btn">
                        <i class="fas fa-check"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // اضافه کردن event listener به پیشنهادها
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.use-suggestion-btn')) {
                    const germanWord = item.getAttribute('data-german');
                    document.getElementById('translate-input').value = germanWord;
                    this.performAutoTranslation(germanWord);
                }
            });
        });
        
        // دکمه استفاده از پیشنهاد
        document.querySelectorAll('.use-suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const germanWord = btn.closest('.suggestion-item').getAttribute('data-german');
                document.getElementById('translate-input').value = germanWord;
                this.performAutoTranslation(germanWord);
            });
        });
        
    } catch (error) {
        console.error('Error showing suggestions:', error);
        suggestionsDiv.innerHTML = '<div class="no-suggestions">خطا در بارگذاری پیشنهادات</div>';
    }
}
// این متد را جایگزین هر دو متد addWord قبلی کنید (هم در خط 281 و هم در خط 1010):

async addWord(wordData) {
  return new Promise((resolve, reject) => {
    // بررسی داده‌ها
    if (!wordData.german || !wordData.persian) {
      reject(new Error('لغت و معنی الزامی هستند'));
      return;
    }
    
    // باز کردن تراکنش
    const transaction = this.db.transaction(['words'], 'readwrite');
    const store = transaction.objectStore('words');
    
    // بررسی تکراری نبودن لغت
    const index = store.index('german');
    const checkRequest = index.get(wordData.german.toLowerCase());
    
    checkRequest.onsuccess = async () => {
      if (checkRequest.result) {
        reject(new Error('این لغت قبلاً در دیکشنری وجود دارد'));
        return;
      }
      
      // اضافه کردن تاریخ
      wordData.createdAt = new Date().toISOString();
      
      // ذخیره لغت
      const addRequest = store.add(wordData);
      
      addRequest.onsuccess = async () => {
        const wordId = addRequest.result;
        
        console.log('🔍 بررسی ذخیره مثال برای لغت جدید:', wordId);
        
        // ذخیره مثال اگر وجود دارد - بررسی همه منابع ممکن
        let exampleGerman = '';
        let examplePersian = '';
        
        // 1. بررسی فرم اصلی اضافه کردن لغت
        const exampleInput = document.getElementById('example');
        const exampleTranslationInput = document.getElementById('example-translation');
        
        if (exampleInput && exampleTranslationInput) {
          exampleGerman = exampleInput.value.trim();
          examplePersian = exampleTranslationInput.value.trim();
        }
        
        // 2. بررسی اگر از ترجمه ذخیره می‌شود (این مهم است!)
        const saveGermanWord = document.getElementById('save-german-word');
        const savePersianMeaning = document.getElementById('save-persian-meaning');
        
        // 3. بررسی اگر از فرم ویرایش استفاده می‌شود
        const newExampleGerman = document.getElementById('new-example-german');
        const newExamplePersian = document.getElementById('new-example-persian');
        
        // اولویت: فرم اصلی > فرم ذخیره ترجمه > فرم ویرایش
        if (exampleGerman && examplePersian) {
          // استفاده از مثال فرم اصلی
        } else if (saveGermanWord && savePersianMeaning) {
          // اگر از ترجمه ذخیره می‌شود، معمولاً مثال جداگانه ندارد
          exampleGerman = '';
          examplePersian = '';
        } else if (newExampleGerman && newExamplePersian) {
          exampleGerman = newExampleGerman.value.trim();
          examplePersian = newExamplePersian.value.trim();
        }
        
        console.log('📝 مثال برای ذخیره:', { exampleGerman, examplePersian });
        
        if (exampleGerman && examplePersian) {
          try {
            await this.addExample(wordId, {
              german: exampleGerman,
              persian: examplePersian
            });
            console.log('✅ مثال با موفقیت ذخیره شد');
          } catch (error) {
            console.error('❌ خطا در ذخیره مثال:', error);
          }
        } else {
          console.log('⚠️ هیچ مثالی برای ذخیره وجود ندارد');
        }
        
        this.showToast('لغت با موفقیت اضافه شد', 'success');
        this.renderWordList();
        this.updateStats();
        
        // پاک کردن فرم (فقط اگر از فرم اصلی اضافه شده)
        if (exampleInput && exampleTranslationInput) {
          this.clearAddWordForm();
        }
        
        resolve(wordId);
      };
      
      addRequest.onerror = (event) => {
        console.error('Error adding word:', event.target.error);
        reject(new Error('خطا در ذخیره لغت'));
      };
    };
    
    checkRequest.onerror = (event) => {
      reject(new Error('خطا در بررسی لغت تکراری'));
    };
  });
}
// این متد را به کلاس GermanDictionary اضافه کنید
async performTranslation() {
    const inputText = document.getElementById('translate-input').value.trim();
    
    if (!inputText) {
        this.showToast('لطفاً متن را وارد کنید', 'warning');
        return;
    }
    
    // نمایش اسپینر
    const resultDiv = document.getElementById('translate-result');
    resultDiv.innerHTML = `
        <div class="loading-translation">
            <div class="spinner"></div>
            <p>در حال ترجمه...</p>
        </div>
    `;
    
    try {
        // استفاده از API رایگان Google Translate
        const translatedText = await this.translateText(inputText, this.translateDirection);
        
        resultDiv.innerHTML = `
            <div class="translated-text">
                <div class="original-text">
                    <small>متن اصلی:</small>
                    <p>${inputText}</p>
                </div>
                <div class="separator">
                    <i class="fas fa-arrow-down"></i>
                </div>
                <div class="result-text">
                    <small>ترجمه:</small>
                    <p>${translatedText}</p>
                </div>
            </div>
        `;
        
        this.showToast('ترجمه با موفقیت انجام شد', 'success');
        
    } catch (error) {
        console.error('Translation error:', error);
        resultDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <p>خطا در ترجمه. لطفاً دوباره تلاش کنید.</p>
                <small>${error.message || 'اتصال اینترنت خود را بررسی کنید'}</small>
            </div>
        `;
        this.showToast('خطا در ترجمه', 'error');
    }
}
// این متد را به کلاس GermanDictionary اضافه کنید
async translateText(text, direction) {
    // استفاده از API رایگان (مثال: MyMemory)
    const sourceLang = direction === 'de-en' ? 'de' : 'en';
    const targetLang = direction === 'de-en' ? 'en' : 'de';
    
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('خطا در ارتباط با سرور ترجمه');
    }
    
    const data = await response.json();
    
    if (data.responseStatus !== 200 || !data.responseData) {
        throw new Error('خطا در پردازش ترجمه');
    }
    
    return data.responseData.translatedText;
}
setupScrollManagement() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    // رویداد اسکرول
    chatHistory.addEventListener('scroll', () => {
        const scrollTop = chatHistory.scrollTop;
        const scrollHeight = chatHistory.scrollHeight;
        const clientHeight = chatHistory.clientHeight;
        
        // بررسی اینکه آیا کاربر در پایین است
        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        this.scrollState.isAtBottom = distanceFromBottom < 50;
        this.scrollState.lastScrollTop = scrollTop;
        
        // اگر کاربر اسکرول کرد، تایمر را ریست کن
        if (this.scrollState.scrollTimeout) {
            clearTimeout(this.scrollState.scrollTimeout);
        }
        
        // علامت گذاری که کاربر در حال اسکرول است
        this.scrollState.isUserScrolling = true;
        
        // بعد از 1.5 ثانیه اگر اسکرول نکرد، فرض کن کارش تمام شده
        this.scrollState.scrollTimeout = setTimeout(() => {
            this.scrollState.isUserScrolling = false;
        }, 1500);
    });
    
    // تابع برای چک کردن و اسکرول اتوماتیک
    const checkAndScroll = () => {
        if (!this.scrollState.isUserScrolling && this.scrollState.isAtBottom) {
            this.scrollToBottom();
        }
    };
    
    // چک کردن دوره‌ای
    setInterval(checkAndScroll, 300);
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
    const german = document.getElementById('german-word').value.trim();
    const persian = document.getElementById('persian-meaning').value.trim();
    const gender = document.querySelector('.gender-btn.active')?.getAttribute('data-gender') || null;
    const type = document.getElementById('word-type').value;
    
    if (!german || !persian) {
      this.showToast('لطفاً هر دو فیلد لغت و معنی را پر کنید', 'error');
      return false;
    }
    
    const wordData = {
      german,
      persian,
      gender,
      type
    };
    
    // اضافه کردن صرف فعل اگر فعل است
    if (type === 'verb') {
      const present = document.getElementById('verb-present')?.value.trim() || '';
      const past = document.getElementById('verb-past')?.value.trim() || '';
      const perfect = document.getElementById('verb-perfect')?.value.trim() || '';
      
      if (present || past || perfect) {
        wordData.verbForms = { present, past, perfect };
      }
    }
    
    // استفاده از متد addWord که مثال‌ها را هم ذخیره می‌کند
    await this.addWord(wordData);
    
    // پاک کردن فیلدهای مثال هم در clearAddWordForm انجام می‌شود
    this.clearAddWordForm();
    
    // فوکوس خودکار به فیلد آلمانی
    setTimeout(() => {
      const germanInput = document.getElementById('german-word');
      if (germanInput) {
        germanInput.focus();
      }
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error saving word:', error);
    this.showToast(error.message || 'خطا در ذخیره لغت', 'error');
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
showChatHistoryModal() {
    // دریافت چت‌های ذخیره شده
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    
    let sessionsHTML = '';
    if (sessions.length > 0) {
        sessionsHTML = sessions.map(session => `
            <div class="chat-session-item" data-id="${session.id}">
                <div class="chat-session-info">
                    <div class="chat-session-name">
                        <i class="fas fa-comments"></i>
                        ${session.name}
                    </div>
                    <div class="chat-session-date">
                        <i class="far fa-calendar"></i>
                        ${new Date(session.date).toLocaleString('fa-IR')}
                    </div>
                </div>
                <div class="chat-session-actions">
                    <button class="chat-session-btn load" data-id="${session.id}">
                        <i class="fas fa-play"></i> بارگذاری
                    </button>
                    <button class="chat-session-btn delete" data-id="${session.id}">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </div>
        `).join('');
    } else {
        sessionsHTML = `
            <div class="no-history">
                <i class="far fa-comments"></i>
                <p>هنوز چتی ذخیره نشده است</p>
                <small>چت‌های خود را ذخیره کنید تا بعداً بتوانید آنها را ببینید</small>
            </div>
        `;
    }
    
    const modalHtml = `
        <div class="modal-overlay" id="chat-history-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-history"></i> تاریخچه چت‌ها</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="chat-sessions-list">
                        ${sessionsHTML}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" id="save-current-chat">
                        <i class="fas fa-save"></i> ذخیره این چت
                    </button>
                    <button class="btn btn-outline" id="close-history-modal">
                        <i class="fas fa-times"></i> بستن
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // مدیریت event listeners
    this.setupChatHistoryModalEvents();
}
setupChatHistoryModalEvents() {
    // بستن مودال
    document.querySelector('#chat-history-modal .close-modal')?.addEventListener('click', () => {
        document.getElementById('chat-history-modal').remove();
    });
    
    document.getElementById('close-history-modal')?.addEventListener('click', () => {
        document.getElementById('chat-history-modal').remove();
    });
    
    // ذخیره چت فعلی
    document.getElementById('save-current-chat')?.addEventListener('click', () => {
        this.saveChatSession();
        document.getElementById('chat-history-modal').remove();
        this.showToast('چت فعلی ذخیره شد', 'success');
        // نمایش مجدد مودال با لیست به‌روزشده
        setTimeout(() => this.showChatHistoryModal(), 300);
    });
    
    // بارگذاری چت
    document.querySelectorAll('.chat-session-btn.load').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.target.closest('.chat-session-btn').getAttribute('data-id');
            this.loadChatSession(sessionId);
        });
    });
    
    // حذف چت
    document.querySelectorAll('.chat-session-btn.delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sessionId = e.target.closest('.chat-session-btn').getAttribute('data-id');
            this.deleteChatSession(sessionId);
        });
    });
}

// متد بارگذاری چت
loadChatSession(sessionId) {
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    const session = sessions.find(s => s.id == sessionId);
    
    if (session) {
        const chatHistory = document.getElementById('chat-history');
        if (chatHistory) {
            chatHistory.innerHTML = session.content;
            // اسکرول به پایین
            setTimeout(() => {
                chatHistory.scrollTop = chatHistory.scrollHeight;
            }, 100);
            
            // بستن مودال
            document.getElementById('chat-history-modal')?.remove();
            this.showToast('چت بارگذاری شد', 'success');
        }
    }
}

// متد حذف چت
deleteChatSession(sessionId) {
    if (confirm('آیا از حذف این چت مطمئن هستید؟')) {
        let sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
        sessions = sessions.filter(s => s.id != sessionId);
        localStorage.setItem('chatSessions', JSON.stringify(sessions));
        
        // بستن و بازگشایی مودال برای به‌روزرسانی لیست
        document.getElementById('chat-history-modal')?.remove();
        setTimeout(() => this.showChatHistoryModal(), 300);
        this.showToast('چت حذف شد', 'info');
    }
}
// همچنین این متد کمکی را اضافه کنید:
saveChatSession() {
    const chatHistory = document.getElementById('chat-history');
    if (!chatHistory) return;
    
    const sessions = JSON.parse(localStorage.getItem('chatSessions') || '[]');
    const newSession = {
        id: Date.now(),
        name: `چت ${new Date().toLocaleString('fa-IR')}`,
        content: chatHistory.innerHTML,
        date: new Date().toISOString()
    };
    
    sessions.unshift(newSession);
    localStorage.setItem('chatSessions', JSON.stringify(sessions.slice(0, 20))); // فقط 20 چت آخر
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
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
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
renderTranslate() {
    document.getElementById('translate-section').innerHTML = `
        <div class="word-card">
            <h2 class="text-center mb-4">
                <i class="fas fa-language"></i>
                مترجم آلمانی ↔ فارسی
            </h2>
            
            <div class="form-group">
                <label class="form-label">انتخاب جهت ترجمه:</label>
                <div class="direction-selector">
                    <div class="direction-option ${this.translateDirection === 'de-fa' ? 'active' : ''}" data-direction="de-fa">
                        <div class="direction-icon">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="direction-text">
                            <div class="direction-title">آلمانی به فارسی</div>
                            <div class="direction-subtitle">Deutsch → فارسی</div>
                        </div>
                        <div class="direction-check">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                    
                    <div class="direction-option ${this.translateDirection === 'fa-de' ? 'active' : ''}" data-direction="fa-de">
                        <div class="direction-icon">
                            <i class="fas fa-arrow-left"></i>
                        </div>
                        <div class="direction-text">
                            <div class="direction-title">فارسی به آلمانی</div>
                            <div class="direction-subtitle">فارسی → Deutsch</div>
                        </div>
                        <div class="direction-check">
                            <i class="fas fa-check"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label id="input-label" for="translate-input">
                    <i class="fas fa-keyboard"></i>
                    <span id="input-title">${this.translateDirection === 'de-fa' ? 'متن آلمانی:' : 'متن فارسی:'}</span>
                </label>
                <div class="input-with-clear">
                    <textarea 
                        id="translate-input" 
                        class="form-control" 
                        rows="3" 
                        placeholder="${this.translateDirection === 'de-fa' ? 'متن آلمانی خود را وارد کنید...' : 'متن فارسی خود را وارد کنید...'}"
                        dir="${this.translateDirection === 'de-fa' ? 'ltr' : 'rtl'}"
                        autofocus></textarea>
                    <button class="clear-input" id="clear-input">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <small id="input-hint" class="form-text text-muted">
                    <i class="fas fa-info-circle"></i>
                    ترجمه به صورت خودکار انجام می‌شود
                </small>
            </div>

            <div class="form-group">
                <label id="output-label">
                    <i class="fas fa-language"></i>
                    <span id="output-title">${this.translateDirection === 'de-fa' ? 'ترجمه فارسی:' : 'ترجمه آلمانی:'}</span>
                </label>
                <div id="translate-result" class="translate-result">
                    <div class="empty-result">
                        <div class="empty-icon">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <p>نتیجه ترجمه اینجا نمایش داده می‌شود</p>
                        <small>متن را در باکس بالا وارد کنید</small>
                    </div>
                </div>
            </div>

            <div class="translate-actions">
                <div class="action-group">
                    <button class="action-btn voice-btn" id="speak-input">
                        <i class="fas fa-volume-up"></i>
                        <span>تلفظ متن</span>
                    </button>
                    <button class="action-btn voice-btn" id="speak-output">
                        <i class="fas fa-volume-up"></i>
                        <span>تلفظ ترجمه</span>
                    </button>
                    <button class="action-btn copy-btn" id="copy-result">
                        <i class="fas fa-copy"></i>
                        <span>کپی ترجمه</span>
                    </button>
                </div>
                
                <div class="action-group">
                    <button class="action-btn save-btn" id="save-translation">
                        <i class="fas fa-save"></i>
                        <span>ذخیره در دیکشنری</span>
                    </button>
                </div>
            </div>
            
            <div id="translate-suggestions" class="translate-suggestions">
                <div class="suggestions-header">
                    <i class="fas fa-lightbulb"></i>
                    <span>پیشنهادات مشابه</span>
                </div>
                <div class="suggestions-list" id="suggestions-list"></div>
            </div>
        </div>
    `;
    
    this.setupTranslateEventListeners();
    this.updateTranslateUI();
    this.setupOnlineStatus();
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

    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
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
       const containsWord = normalizedUserSentence.includes(normalizedCorrectWord);
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
        
        <!-- دکمه فول اسکرین در پایین صفحه -->
        <div class="word-card mt-4">
            <div class="text-center">
                <p style="margin-bottom: 15px; color: #666;">
                    <i class="fas fa-info-circle"></i>
                    برای تجربه بهتر از حالت فول‌اسکرین استفاده کنید
                </p>
                <button class="btn btn-outline" id="fullscreen-toggle" onclick="toggleFullscreen()">
                    <i class="fas fa-expand"></i> ورود به فول‌اسکرین
                </button>
            </div>
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
          question.isCorrect = selectedAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
          
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
saveAIChatState() {
    const chatHistory = document.getElementById('chat-history');
    if (chatHistory) {
        localStorage.setItem('aiChatState', chatHistory.innerHTML);
        console.log('💾 وضعیت چت ذخیره شد');
    }
}

// بازیابی وضعیت چت AI
restoreAIChatState() {
    const savedChat = localStorage.getItem('aiChatState');
    const chatHistory = document.getElementById('chat-history');
    
    if (savedChat && chatHistory) {
        chatHistory.innerHTML = savedChat;
        // اسکرول به پایین
        setTimeout(() => {
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }, 100);
        console.log('📂 وضعیت چت بازیابی شد');
    }
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
    const newDirection = e.currentTarget.getAttribute('data-direction');
    
    // اگر جهت تغییر نکرده، کاری نکن
    if (this.translateDirection === newDirection) return;
    
    this.translateDirection = newDirection;
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
})};

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
     if (sectionId === 'ai-chat-section') {
      // فقط نمایش بده، رندر نکن اگر قبلاً لود شده
      if (!document.querySelector('#chat-history')) {
        this.renderAIChat();
      }
      this.showSection(sectionId);
    } 
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
    } else if (sectionId === 'ai-chat-section') {
      this.renderAIChat();
    } else if (sectionId === 'translate-section') {
      this.renderTranslate();
    }
    this.saveAIChatState();
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

