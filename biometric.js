// مدیریت رابط کاربری بیومتریک
class BiometricUI {
    constructor() {
        this.auth = window.biometricAuth;
        this.currentMode = 'idle';
        this.autoLoginTimer = null;
        this.scanAnimationInterval = null;
        
        this.init();
    }
    
    init() {
        // بارگذاری اولیه
        this.checkBiometricStatus();
        
        // اضافه کردن event listeners
        this.setupEventListeners();
        
        // بررسی ورود خودکار
        this.checkAutoLogin();
        
        console.log('✅ رابط کاربری بیومتریک آماده است');
    }
    
    // =====================
    // Status & Detection
    // =====================
    
    async checkBiometricStatus() {
        const statusElement = document.getElementById('biometric-status');
        if (!statusElement) return;
        
        const isSupported = this.auth.isWebAuthnSupported();
        const hasPlatformAuth = await this.auth.checkPlatformAuthenticator();
        const isRegistered = this.auth.isRegistered('default_user');
        
        let statusHTML = '';
        
        if (!isSupported) {
            statusHTML = `
                <div class="status-indicator error">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="status-info">
                    <h4>پشتیبانی نشده</h4>
                    <p class="status-text">مرورگر شما از Face ID پشتیبانی نمی‌کند</p>
                    <small class="status-desc">لطفاً از Chrome, Edge, یا Safari استفاده کنید</small>
                </div>
            `;
        } else if (!hasPlatformAuth) {
            statusHTML = `
                <div class="status-indicator warning">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="status-info">
                    <h4>Face ID فعال نیست</h4>
                    <p class="status-text">سیستم تشخیص صورت روی دستگاه شما پیکربندی نشده</p>
                    <small class="status-desc">لطفاً Windows Hello یا Face ID را تنظیم کنید</small>
                </div>
            `;
        } else if (!isRegistered) {
            statusHTML = `
                <div class="status-indicator info">
                    <i class="fas fa-fingerprint"></i>
                </div>
                <div class="status-info">
                    <h4>آماده تنظیم</h4>
                    <p class="status-text">می‌توانید Face ID را فعال کنید</p>
                    <small class="status-desc">برای فعال‌سازی روی دکمه پایین کلیک کنید</small>
                </div>
            `;
        } else {
            statusHTML = `
                <div class="status-indicator success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="status-info">
                    <h4>Face ID فعال</h4>
                    <p class="status-text">ورود با تشخیص صورت آماده است</p>
                    <small class="status-desc">آخرین ورود: ${this.formatLastLogin()}</small>
                </div>
            `;
        }
        
        statusElement.innerHTML = statusHTML;
    }
    
    formatLastLogin() {
        const lastLogin = this.auth.getLastLogin('default_user');
        if (!lastLogin) return 'تاکنون ورود نکرده‌اید';
        
        const now = new Date();
        const diff = now - lastLogin;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (hours < 1) return 'چند دقیقه پیش';
        if (hours < 24) return `${hours} ساعت پیش`;
        
        const days = Math.floor(hours / 24);
        return `${days} روز پیش`;
    }
    
    // =====================
    // Registration Flow
    // =====================
    
    async startRegistration() {
        try {
            // نمایش انیمیشن
            this.showScanAnimation('در حال تنظیم Face ID...');
            
            // درخواست مجوز از کاربر
            const username = 'user_' + Date.now();
            const displayName = prompt('لطفاً نام خود را وارد کنید:', 'کاربر دیکشنری') || 'کاربر دیکشنری';
            
            // شروع ثبت‌نام
            const result = await this.auth.register(username, displayName);
            
            if (result.success) {
                this.showSuccessMessage('✅ Face ID با موفقیت ثبت شد!');
                this.updateUIAfterRegistration();
                
                // تست خودکار
                setTimeout(() => {
                    this.startLogin();
                }, 1500);
            } else {
                this.showErrorMessage(result.message);
            }
            
        } catch (error) {
            console.error('خطا در ثبت‌نام:', error);
            this.showErrorMessage('خطا در تنظیم Face ID');
        } finally {
            this.hideScanAnimation();
        }
    }
    
    updateUIAfterRegistration() {
        // به‌روزرسانی وضعیت
        this.checkBiometricStatus();
        
        // نمایش دکمه تست
        const testBtn = document.getElementById('test-biometric-btn');
        const disableBtn = document.getElementById('disable-biometric-btn');
        const settings = document.getElementById('biometric-settings');
        const history = document.getElementById('login-history');
        
        if (testBtn) testBtn.style.display = 'inline-block';
        if (disableBtn) disableBtn.style.display = 'inline-block';
        if (settings) settings.style.display = 'block';
        if (history) history.style.display = 'block';
        
        // به‌روزرسانی تاریخچه
        this.renderHistory();
    }
    
    // =====================
    // Login Flow
    // =====================
    
    async startLogin(username = 'default_user') {
        try {
            // نمایش انیمیشن
            this.showScanAnimation('در حال تشخیص صورت...');
            
            // شروع احراز هویت
            const result = await this.auth.authenticate(username);
            
            if (result.success) {
                this.showSuccessMessage('✅ تشخیص موفق! در حال ورود...');
                
                // تأخیر برای نمایش پیام
                setTimeout(() => {
                    this.completeLogin(result);
                }, 1000);
                
            } else {
                this.showErrorMessage(result.message);
                
                // نمایش گزینه جایگزین
                setTimeout(() => {
                    this.showAlternativeLogin();
                }, 2000);
            }
            
        } catch (error) {
            console.error('خطا در ورود:', error);
            this.showErrorMessage('خطا در تشخیص صورت');
        } finally {
            this.hideScanAnimation();
        }
    }
    
    completeLogin(loginData) {
        // مخفی کردن صفحه ورود
        this.hideLoginScreen();
        
        // نمایش پیام خوش‌آمدگویی
        this.showWelcomeMessage(loginData.username);
        
        // به‌روزرسانی تاریخچه
        this.renderHistory();
        
        // ذخیره session
        this.createSession(loginData);
    }
    
    createSession(loginData) {
        const session = {
            username: loginData.username,
            loginTime: new Date().toISOString(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 ساعت
            method: 'biometric'
        };
        
        localStorage.setItem('user_session', JSON.stringify(session));
        
        // انتشار event
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: session }));
    }
    
    showAlternativeLogin() {
        const container = document.getElementById('biometric-login-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="login-mode active">
                <div class="login-welcome">
                    <h2>ورود جایگزین</h2>
                    <p>Face ID ناموفق بود. لطفاً روش دیگری انتخاب کنید:</p>
                </div>
                
                <div class="device-cards">
                    <div class="device-card" data-method="password">
                        <div class="device-icon">
                            <i class="fas fa-key"></i>
                        </div>
                        <div class="device-info">
                            <h4>ورود با رمز عبور</h4>
                            <p>استفاده از رمز عبور اصلی</p>
                        </div>
                    </div>
                    
                    <div class="device-card" data-method="pin">
                        <div class="device-icon">
                            <i class="fas fa-mobile-alt"></i>
                        </div>
                        <div class="device-info">
                            <h4>ورود با PIN</h4>
                            <p>کد ۶ رقمی شخصی</p>
                        </div>
                    </div>
                    
                    <div class="device-card" data-method="backup">
                        <div class="device-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <div class="device-info">
                            <h4>کد بازیابی</h4>
                            <p>استفاده از کد ۱۲ رقمی</p>
                        </div>
                    </div>
                </div>
                
                <div class="biometric-buttons">
                    <button class="biometric-btn secondary" id="retry-face-id">
                        <i class="fas fa-redo"></i>
                        تلاش مجدد Face ID
                    </button>
                </div>
            </div>
        `;
        
        // اضافه کردن event listeners
        document.querySelectorAll('.device-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const method = e.currentTarget.dataset.method;
                this.handleAlternativeLogin(method);
            });
        });
        
        document.getElementById('retry-face-id').addEventListener('click', () => {
            this.startLogin();
        });
    }
    
    handleAlternativeLogin(method) {
        switch(method) {
            case 'password':
                this.showPasswordLogin();
                break;
            case 'pin':
                this.showPinLogin();
                break;
            case 'backup':
                this.showBackupCodeLogin();
                break;
        }
    }
    
    showPasswordLogin() {
        const password = prompt('لطفاً رمز عبور حساب خود را وارد کنید:');
        if (password === '123456') { // در واقعیت باید از سرور بررسی شود
            this.completeLogin({
                username: 'default_user',
                method: 'password'
            });
        } else {
            alert('رمز عبور نامعتبر است');
        }
    }
    
    // =====================
    // Login Screen
    // =====================
    
    showLoginScreen() {
        const overlay = document.getElementById('biometric-login-overlay');
        const container = document.getElementById('biometric-login-container');
        
        if (!overlay || !container) return;
        
        // نمایش overlay
        overlay.style.display = 'flex';
        
        // ایجاد محتوای صفحه ورود
        container.innerHTML = this.createLoginScreen();
        
        // شروع شمارش معکوس برای ورود خودکار
        if (this.auth.settings.autoLogin) {
            this.startAutoLoginTimer();
        }
    }
    
    createLoginScreen() {
        const isRegistered = this.auth.isRegistered('default_user');
        
        if (!isRegistered) {
            return `
                <div class="login-mode active">
                    <div class="login-welcome">
                        <h2>🔒 ورود امن به دیکشنری</h2>
                        <p>برای تجربه بهتر و امنیت بیشتر، Face ID را فعال کنید</p>
                    </div>
                    
                    <div class="face-scan-section">
                        <div class="face-outline">
                            <div class="face-circle">
                                <div class="face-features">
                                    <div class="eye left"></div>
                                    <div class="eye right"></div>
                                    <div class="mouth"></div>
                                </div>
                            </div>
                            <div class="scan-laser"></div>
                            <div class="light-rays">
                                <div class="ray ray-1"></div>
                                <div class="ray ray-2"></div>
                                <div class="ray ray-3"></div>
                                <div class="ray ray-4"></div>
                                <div class="ray ray-5"></div>
                                <div class="ray ray-6"></div>
                            </div>
                        </div>
                        <div class="scan-status" id="scan-status">
                        آماده تنظیم Face ID
                    </div>
                </div>
                
                <div class="login-guide">
                    <h4><i class="fas fa-info-circle"></i> چرا Face ID؟</h4>
                    <div class="guide-steps">
                        <div class="guide-step">
                            <div class="step-number">1</div>
                            <div class="step-text">امنیت بالا - هیچکس نمی‌تواند به حساب شما دسترسی پیدا کند</div>
                        </div>
                        <div class="guide-step">
                            <div class="step-number">2</div>
                            <div class="step-text">سرعت بیشتر - ورود فوری بدون نیاز به رمز عبور</div>
                        </div>
                        <div class="guide-step">
                            <div class="step-number">3</div>
                            <div class="step-text">راحتی - فقط به چهره شما پاسخ می‌دهد</div>
                        </div>
                    </div>
                </div>
                
                <div class="biometric-buttons">
                    <button class="biometric-btn primary" id="setup-face-id">
                        <i class="fas fa-plus-circle"></i>
                        فعال‌سازی Face ID
                    </button>
                    <button class="biometric-btn secondary" id="skip-setup">
                        <i class="fas fa-arrow-right"></i>
                        بعداً تنظیم می‌کنم
                    </button>
                </div>
                
                <div class="security-badge">
                    <i class="fas fa-shield-alt"></i>
                    امنیت بالا
                </div>
            </div>
        `;
    } else {
        return `
            <div class="login-mode active">
                <div class="login-welcome">
                    <h2>👋 خوش آمدید!</h2>
                    <p>لطفاً برای ورود به دیکشنری، Face ID خود را تأیید کنید</p>
                </div>
                
                <div class="face-scan-section">
                    <div class="face-outline">
                        <div class="face-circle">
                            <div class="face-features">
                                <div class="eye left"></div>
                                <div class="eye right"></div>
                                <div class="mouth"></div>
                            </div>
                        </div>
                        <div class="scan-laser"></div>
                        <div class="light-rays">
                            <div class="ray ray-1"></div>
                            <div class="ray ray-2"></div>
                            <div class="ray ray-3"></div>
                            <div class="ray ray-4"></div>
                            <div class="ray ray-5"></div>
                            <div class="ray ray-6"></div>
                        </div>
                    </div>
                    <div class="scan-status" id="scan-status">
                        آماده تشخیص صورت...
                    </div>
                </div>
                
                ${this.auth.settings.autoLogin ? `
                    <div class="auto-login-timer">
                        <div class="timer-text">ورود خودکار تا:</div>
                        <div class="timer-display" id="auto-login-timer">05</div>
                    </div>
                ` : ''}
                
                <div class="biometric-buttons">
                    <button class="biometric-btn primary" id="start-face-login">
                        <i class="fas fa-camera"></i>
                        شروع تشخیص صورت
                    </button>
                    <button class="biometric-btn secondary" id="other-options">
                        <i class="fas fa-ellipsis-h"></i>
                        گزینه‌های دیگر
                    </button>
                </div>
                
                <div class="login-guide">
                    <div class="guide-steps">
                        <div class="guide-step">
                            <div class="step-number"><i class="fas fa-lightbulb"></i></div>
                            <div class="step-text">مطمئن شوید که نور کافی وجود دارد و مستقیم به دوربین نگاه کنید</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

hideLoginScreen() {
    const overlay = document.getElementById('biometric-login-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    
    // پاک کردن تایمر
    this.clearAutoLoginTimer();
}

// =====================
// Auto Login Timer
// =====================

startAutoLoginTimer() {
    let seconds = 5;
    const timerElement = document.getElementById('auto-login-timer');
    
    if (!timerElement) return;
    
    this.autoLoginTimer = setInterval(() => {
        seconds--;
        timerElement.textContent = seconds.toString().padStart(2, '0');
        
        if (seconds <= 0) {
            this.clearAutoLoginTimer();
            this.startLogin();
        }
    }, 1000);
}

clearAutoLoginTimer() {
    if (this.autoLoginTimer) {
        clearInterval(this.autoLoginTimer);
        this.autoLoginTimer = null;
    }
}

checkAutoLogin() {
    // بررسی تنظیمات و نمایش صفحه ورود
    const isRegistered = this.auth.isRegistered('default_user');
    const shouldAutoShow = this.auth.settings.autoLogin;
    
    if (isRegistered && shouldAutoShow && !this.hasActiveSession()) {
        setTimeout(() => {
            this.showLoginScreen();
        }, 1000);
    }
}

hasActiveSession() {
    const session = localStorage.getItem('user_session');
    if (!session) return false;
    
    try {
        const { expiresAt } = JSON.parse(session);
        return Date.now() < expiresAt;
    } catch {
        return false;
    }
}

// =====================
// Animation Control
// =====================

showScanAnimation(text) {
    const statusElement = document.getElementById('scan-status');
    if (statusElement) {
        statusElement.textContent = text;
        statusElement.style.color = '#00d4aa';
    }
    
    // شروع انیمیشن‌های چشمک‌زن
    this.startBlinkAnimation();
}

hideScanAnimation() {
    this.stopBlinkAnimation();
}

startBlinkAnimation() {
    this.scanAnimationInterval = setInterval(() => {
        // اینجا می‌توانید انیمیشن‌های اضافی اضافه کنید
    }, 500);
}

stopBlinkAnimation() {
    if (this.scanAnimationInterval) {
        clearInterval(this.scanAnimationInterval);
        this.scanAnimationInterval = null;
    }
}

// =====================
// Message Display
// =====================

showSuccessMessage(message) {
    const statusElement = document.getElementById('scan-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = '#00d4aa';
        statusElement.classList.add('success-animation');
        
        setTimeout(() => {
            statusElement.classList.remove('success-animation');
        }, 800);
    }
    
    // نمایش toast
    this.showToast(message, 'success');
}

showErrorMessage(message) {
    const statusElement = document.getElementById('scan-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = '#ff4757';
        statusElement.classList.add('error-animation');
        
        setTimeout(() => {
            statusElement.classList.remove('error-animation');
        }, 800);
    }
    
    this.showToast(message, 'error');
}

showWelcomeMessage(username) {
    this.showToast(`خوش آمدید ${username}!`, 'success');
}

showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-times-circle' : 
                         'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// =====================
// Setup Modal
// =====================

showSetupModal() {
    const modal = document.getElementById('biometric-setup-modal');
    const content = document.getElementById('biometric-setup-content');
    
    if (!modal || !content) return;
    
    // ایجاد محتوای مودال
    content.innerHTML = this.createSetupModalContent();
    
    // نمایش مودال
    modal.style.display = 'block';
    
    // تنظیم event listeners
    this.setupModalEventListeners();
}

createSetupModalContent() {
    const isRegistered = this.auth.isRegistered('default_user');
    const history = this.auth.loadHistory();
    
    return `
        <div class="biometric-settings">
            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-title">
                        <i class="fas fa-fingerprint"></i>
                        وضعیت Face ID
                    </div>
                    <div class="setting-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" id="biometric-toggle" 
                                   ${isRegistered ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <p>استفاده از Face ID یا Windows Hello برای ورود امن</p>
            </div>
            
            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-title">
                        <i class="fas fa-robot"></i>
                        ورود خودکار
                    </div>
                    <div class="setting-toggle">
                        <label class="toggle-switch">
                            <input type="checkbox" id="auto-login-toggle" 
                                   ${this.auth.settings.autoLogin ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <p>ورود خودکار با Face ID هنگام باز کردن برنامه</p>
            </div>
            
            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-title">
                        <i class="fas fa-bell"></i>
                        فیدبک‌ها
                    </div>
                </div>
                <div class="setting-options">
                    <label class="checkbox-label">
                        <input type="checkbox" id="vibration-toggle" 
                               ${this.auth.settings.vibration ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        لرزش
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="sound-toggle" 
                               ${this.auth.settings.sound ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        صدا
                    </label>
                </div>
            </div>
            
            <div class="setting-item">
                <div class="setting-header">
                    <div class="setting-title">
                        <i class="fas fa-history"></i>
                        تاریخچه ورود (${history.length})
                    </div>
                    ${history.length > 0 ? `
                        <button class="btn btn-sm btn-outline" id="clear-history">
                            پاک کردن
                        </button>
                    ` : ''}
                </div>
                <div class="login-history">
                    <div class="history-list" id="modal-history-list">
                        ${this.renderHistoryList(history.slice(0, 5))}
                    </div>
                    ${history.length > 5 ? `
                        <button class="btn btn-link" id="show-full-history">
                            نمایش کامل تاریخچه
                        </button>
                    ` : ''}
                </div>
            </div>
            
            <div class="biometric-buttons">
                ${isRegistered ? `
                    <button class="biometric-btn primary" id="test-auth">
                        <i class="fas fa-play"></i>
                        تست Face ID
                    </button>
                    <button class="biometric-btn secondary" id="manage-devices">
                        <i class="fas fa-laptop"></i>
                        مدیریت دستگاه‌ها
                    </button>
                    <button class="biometric-btn danger" id="remove-biometric">
                        <i class="fas fa-trash"></i>
                        حذف Face ID
                    </button>
                ` : `
                    <button class="biometric-btn primary" id="setup-biometric">
                        <i class="fas fa-plus-circle"></i>
                        راه‌اندازی Face ID
                    </button>
                `}
            </div>
        </div>
    `;
}

renderHistoryList(history) {
    if (history.length === 0) {
        return '<p class="text-center">تاریخچه‌ای وجود ندارد</p>';
    }
    
    return history.map(item => `
        <div class="history-item ${item.success ? 'success' : 'failed'}">
            <div class="history-info">
                <h4>${this.getHistoryTypeText(item.type)}</h4>
                <p>${new Date(item.timestamp).toLocaleString('fa-IR')}</p>
                ${item.error ? `<small>${item.error}</small>` : ''}
            </div>
            <div class="history-status">
                ${item.success ? '✅' : '❌'}
            </div>
        </div>
    `).join('');
}

getHistoryTypeText(type) {
    const types = {
        'registration': 'ثبت‌نام',
        'login': 'ورود',
        'test': 'تست'
    };
    return types[type] || type;
}

setupModalEventListeners() {
    // بستن مودال
    document.querySelector('#biometric-setup-modal .close-modal')?.addEventListener('click', () => {
        document.getElementById('biometric-setup-modal').style.display = 'none';
    });
    
    // فعال/غیرفعال کردن بیومتریک
    document.getElementById('biometric-toggle')?.addEventListener('change', async (e) => {
        if (e.target.checked) {
            await this.startRegistration();
        } else {
            if (confirm('آیا از حذف Face ID مطمئن هستید؟')) {
                this.removeBiometric();
            } else {
                e.target.checked = true;
            }
        }
    });
    
    // سایر event listeners...
}

// =====================
// Event Listeners Setup
// =====================

setupEventListeners() {
    // تنظیم event listeners برای دکمه‌های اصلی
    document.addEventListener('click', (e) => {
        // تنظیمات بیومتریک
        if (e.target.closest('#enable-biometric-btn') || 
            e.target.closest('#setup-biometric')) {
            e.preventDefault();
            this.startRegistration();
        }
        
        // تست بیومتریک
        if (e.target.closest('#test-biometric-btn') || 
            e.target.closest('#test-auth')) {
            e.preventDefault();
            this.startLogin();
        }
        
        // غیرفعال‌سازی
        if (e.target.closest('#disable-biometric-btn') || 
            e.target.closest('#remove-biometric')) {
            e.preventDefault();
            this.removeBiometric();
        }
        
        // نمایش مودال تنظیمات
        if (e.target.closest('.biometric-settings-btn')) {
            e.preventDefault();
            this.showSetupModal();
        }
    });
    
    // گوش دادن به events
    window.addEventListener('biometricHistoryUpdated', () => {
        this.renderHistory();
    });
    
    window.addEventListener('biometricSettingsUpdated', () => {
        this.checkBiometricStatus();
    });
}

// =====================
// History Display
// =====================

renderHistory() {
    const historyList = document.getElementById('history-list');
    const modalHistoryList = document.getElementById('modal-history-list');
    
    if (!historyList && !modalHistoryList) return;
    
    const history = this.auth.loadHistory();
    const historyHTML = this.renderHistoryList(history);
    
    if (historyList) {
        historyList.innerHTML = historyHTML;
    }
    
    if (modalHistoryList) {
        modalHistoryList.innerHTML = this.renderHistoryList(history.slice(0, 5));
    }
}

// =====================
// Biometric Removal
// =====================

removeBiometric() {
    // حذف اعتبارنامه‌ها
    delete this.auth.credentials['default_user'];
    localStorage.removeItem(this.auth.storageKey);
    
    // به‌روزرسانی UI
    this.checkBiometricStatus();
    
    // پنهان کردن دکمه‌ها
    const testBtn = document.getElementById('test-biometric-btn');
    const disableBtn = document.getElementById('disable-biometric-btn');
    const settings = document.getElementById('biometric-settings');
    const history = document.getElementById('login-history');
    
    if (testBtn) testBtn.style.display = 'none';
    if (disableBtn) disableBtn.style.display = 'none';
    if (settings) settings.style.display = 'none';
    if (history) history.style.display = 'none';
    
    // نمایش پیام
    this.showToast('Face ID حذف شد', 'info');
}
}
// =====================
// Initialization
// =====================

// ایجاد نمونه و انتظار برای بارگذاری DOM
document.addEventListener('DOMContentLoaded', () => {
    window.biometricUI = new BiometricUI();
});

// اکسپورت برای استفاده در ماژول‌های دیگر
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BiometricUI;
}