// کلاس مدیریت احراز هویت بیومتریک
class BiometricAuth {
    constructor() {
        this.storageKey = 'biometric_credentials';
        this.historyKey = 'biometric_history';
        this.settingsKey = 'biometric_settings';
        this.maxHistory = 50;
        
        this.defaultSettings = {
            autoLogin: true,
            requireConfirmation: false,
            vibration: true,
            sound: true,
            timeout: 30, // ثانیه
            sensitivity: 'medium',
            devices: []
        };
        
        this.init();
    }
    
    init() {
        // بارگذاری تنظیمات
        this.settings = this.loadSettings();
        
        // بارگذاری اعتبارنامه‌ها
        this.credentials = this.loadCredentials();
        
        // تنظیم WebAuthn
        this.initWebAuthn();
        
        console.log('✅ سیستم بیومتریک آماده است');
    }
    
    // =====================
    // WebAuthn Configuration
    // =====================
    
    initWebAuthn() {
        // بررسی پشتیبانی مرورگر
        if (!this.isWebAuthnSupported()) {
            console.warn('⚠️ WebAuthn در این مرورگر پشتیبانی نمی‌شود');
            return false;
        }
        
        // بررسی اینکه آیا Windows Hello / Face ID در دسترس است
        this.checkPlatformAuthenticator();
        
        return true;
    }
    
    isWebAuthnSupported() {
        return window.PublicKeyCredential &&
               typeof PublicKeyCredential === 'function' &&
               typeof navigator.credentials?.create === 'function' &&
               typeof navigator.credentials?.get === 'function';
    }
    
    async checkPlatformAuthenticator() {
        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            console.log(`🔍 احراز هویت پلتفرمی در دسترس: ${available ? '✅ بله' : '❌ خیر'}`);
            return available;
        } catch (error) {
            console.error('خطا در بررسی احراز هویت پلتفرمی:', error);
            return false;
        }
    }
    
    // =====================
    // Registration (ثبت نام)
    // =====================
    
    async register(username, displayName = 'کاربر دیکشنری') {
        try {
            // 1. درخواست challenge از سرور (شبیه‌سازی)
            const challenge = this.generateChallenge();
            
            // 2. ایجاد credential با WebAuthn
            const publicKeyCredentialCreationOptions = {
                challenge: challenge,
                rp: {
                    name: "Elias Dictionary",
                    id: window.location.hostname
                },
                user: {
                    id: this.strToBin(username),
                    name: username,
                    displayName: displayName
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 },  // ES256
                    { type: "public-key", alg: -257 } // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // استفاده از Face ID / Windows Hello
                    requireResidentKey: true,
                    userVerification: "required"
                },
                timeout: 60000,
                attestation: "direct"
            };
            
            // 3. ایجاد credential جدید
            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions
            });
            
            // 4. ذخیره credential
            await this.saveCredential(credential, username);
            
            // 5. ذخیره در تنظیمات
            this.addDevice({
                id: this.binToStr(credential.rawId),
                name: 'دستگاه اصلی',
                type: this.getAuthenticatorType(credential),
                registeredAt: new Date().toISOString(),
                lastUsed: new Date().toISOString()
            });
            
            // 6. ثبت در تاریخچه
            this.addToHistory({
                type: 'registration',
                success: true,
                timestamp: new Date().toISOString(),
                device: 'دستگاه اصلی',
                username: username
            });
            
            return {
                success: true,
                message: 'Face ID با موفقیت ثبت شد!',
                credentialId: this.binToStr(credential.rawId)
            };
            
        } catch (error) {
            console.error('خطا در ثبت Face ID:', error);
            
            // ثبت در تاریخچه
            this.addToHistory({
                type: 'registration',
                success: false,
                timestamp: new Date().toISOString(),
                error: this.getErrorMessage(error),
                username: username
            });
            
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    // =====================
    // Authentication (ورود)
    // =====================
    
    async authenticate(username) {
        try {
            // 1. دریافت credential ذخیره شده
            const credentialData = this.credentials[username];
            if (!credentialData) {
                throw new Error('هیچ اعتبارنامه‌ای یافت نشد');
            }
            
            // 2. درخواست challenge از سرور (شبیه‌سازی)
            const challenge = this.generateChallenge();
            
            // 3. گزینه‌های احراز هویت
            const publicKeyCredentialRequestOptions = {
                challenge: challenge,
                timeout: 45000,
                rpId: window.location.hostname,
                allowCredentials: [{
                    type: "public-key",
                    id: this.strToBin(credentialData.credentialId),
                    transports: ["internal"]
                }],
                userVerification: "required"
            };
            
            // 4. درخواست احراز هویت
            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions
            });
            
            // 5. تأیید assertion (در واقعیت باید به سرور ارسال شود)
            const isValid = await this.verifyAssertion(assertion, credentialData);
            
            if (isValid) {
                // 6. به‌روزرسانی استفاده
                this.updateCredentialUsage(username);
                
                // 7. ثبت در تاریخچه
                this.addToHistory({
                    type: 'login',
                    success: true,
                    timestamp: new Date().toISOString(),
                    device: this.getCurrentDeviceName(),
                    username: username,
                    method: 'face'
                });
                
                // 8. فیدبک‌های حسی
                this.provideFeedback('success');
                
                return {
                    success: true,
                    message: 'احراز هویت موفق!',
                    username: username,
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error('احراز هویت ناموفق');
            }
            
        } catch (error) {
            console.error('خطا در احراز هویت:', error);
            
            // ثبت در تاریخچه
            this.addToHistory({
                type: 'login',
                success: false,
                timestamp: new Date().toISOString(),
                error: this.getErrorMessage(error),
                username: username,
                method: 'face'
            });
            
            // فیدبک خطا
            this.provideFeedback('error');
            
            return {
                success: false,
                message: this.getErrorMessage(error)
            };
        }
    }
    
    // =====================
    // Utility Methods
    // =====================
    
    generateChallenge() {
        const array = new Uint8Array(32);
        window.crypto.getRandomValues(array);
        return array;
    }
    
   // در biometric-auth.js این کد را جایگزین کنید:

strToBin(str) {
    try {
        // اطمینان از اینکه رشته Base64 معتبر است
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const padding = '='.repeat((4 - (base64.length % 4)) % 4);
        const base64WithPadding = base64 + padding;
        
        return Uint8Array.from(atob(base64WithPadding), c => c.charCodeAt(0));
    } catch (error) {
        console.error('خطا در تبدیل رشته به باینری:', error);
        throw new Error('رشته ورودی معتبر نیست');
    }
}

binToStr(bin) {
    try {
        const byteArray = new Uint8Array(bin);
        let binary = '';
        for (let i = 0; i < byteArray.length; i++) {
            binary += String.fromCharCode(byteArray[i]);
        }
        
        const base64 = btoa(binary);
        // تبدیل به URL-safe base64
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (error) {
        console.error('خطا در تبدیل باینری به رشته:', error);
        throw new Error('داده باینری معتبر نیست');
    }
}
    getCurrentDeviceName() {
        const ua = navigator.userAgent;
        if (ua.includes('Mac')) return 'Mac (Face ID/Touch ID)';
        if (ua.includes('Windows')) return 'Windows (Windows Hello)';
        if (ua.includes('iPhone')) return 'iPhone (Face ID)';
        if (ua.includes('iPad')) return 'iPad (Face ID)';
        return 'دستگاه فعلی';
    }
    
    getErrorMessage(error) {
        switch(error.name) {
            case 'NotAllowedError':
                return 'درخواست توسط کاربر لغو شد';
            case 'SecurityError':
                return 'برای استفاده از Face ID نیاز به HTTPS است';
            case 'NotSupportedError':
                return 'مرورگر شما از Face ID پشتیبانی نمی‌کند';
            case 'InvalidStateError':
                return 'این دستگاه قبلاً ثبت شده است';
            case 'UnknownError':
                return 'خطای ناشناخته در تشخیص صورت';
            default:
                return error.message || 'خطا در تشخیص بیومتریک';
        }
    }
    
    // =====================
    // Storage Management
    // =====================
    
    async saveCredential(credential, username) {
        const credentialData = {
            credentialId: this.binToStr(credential.rawId),
            publicKey: this.binToStr(credential.response.getPublicKey()),
            algorithm: credential.response.getPublicKeyAlgorithm(),
            counter: credential.response.getAuthenticatorData().signCount,
            registeredAt: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            usageCount: 0
        };
        
        this.credentials[username] = credentialData;
        localStorage.setItem(this.storageKey, JSON.stringify(this.credentials));
    }
    
    loadCredentials() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }
    
    updateCredentialUsage(username) {
        if (this.credentials[username]) {
            this.credentials[username].lastUsed = new Date().toISOString();
            this.credentials[username].usageCount = (this.credentials[username].usageCount || 0) + 1;
            localStorage.setItem(this.storageKey, JSON.stringify(this.credentials));
        }
    }
    
    // =====================
    // History Management
    // =====================
    
    addToHistory(entry) {
        let history = this.loadHistory();
        
        history.unshift({
            id: Date.now(),
            ...entry
        });
        
        // محدود کردن تعداد رکوردها
        if (history.length > this.maxHistory) {
            history = history.slice(0, this.maxHistory);
        }
        
        localStorage.setItem(this.historyKey, JSON.stringify(history));
        
        // انتشار event برای به‌روزرسانی UI
        this.dispatchHistoryUpdate();
    }
    
    loadHistory() {
        try {
            const data = localStorage.getItem(this.historyKey);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }
    
    clearHistory() {
        localStorage.removeItem(this.historyKey);
        this.dispatchHistoryUpdate();
    }
    
    dispatchHistoryUpdate() {
        window.dispatchEvent(new CustomEvent('biometricHistoryUpdated'));
    }
    
    // =====================
    // Settings Management
    // =====================
    
    loadSettings() {
        try {
            const data = localStorage.getItem(this.settingsKey);
            return data ? JSON.parse(data) : this.defaultSettings;
        } catch {
            return this.defaultSettings;
        }
    }
    
    saveSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
        
        // انتشار event برای به‌روزرسانی UI
        window.dispatchEvent(new CustomEvent('biometricSettingsUpdated'));
    }
    
    addDevice(device) {
        if (!this.settings.devices) {
            this.settings.devices = [];
        }
        
        this.settings.devices.push(device);
        this.saveSettings(this.settings);
    }
    
    removeDevice(deviceId) {
        if (this.settings.devices) {
            this.settings.devices = this.settings.devices.filter(d => d.id !== deviceId);
            this.saveSettings(this.settings);
        }
    }
    
    // =====================
    // Feedback System
    // =====================
    
    provideFeedback(type) {
        // لرزش
        if (this.settings.vibration && navigator.vibrate) {
            if (type === 'success') {
                navigator.vibrate([100, 50, 100]);
            } else {
                navigator.vibrate([200, 100, 200, 100, 200]);
            }
        }
        
        // صدا
        if (this.settings.sound) {
            this.playSound(type);
        }
    }
    
    playSound(type) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        if (type === 'success') {
            // صدای موفقیت
            this.playSuccessTone(audioContext);
        } else {
            // صدای خطا
            this.playErrorTone(audioContext);
        }
    }
    
    playSuccessTone(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
        oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    playErrorTone(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(349.23, audioContext.currentTime); // F4
        oscillator.frequency.setValueAtTime(293.66, audioContext.currentTime + 0.1); // D4
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // =====================
    // Verification (شبیه‌سازی)
    // =====================
    
    async verifyAssertion(assertion, storedCredential) {
        // در واقعیت این بخش باید در سرور انجام شود
        // اینجا فقط شبیه‌سازی می‌کنیم
        
        // شبیه‌سازی تأخیر شبکه
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // بررسی ساده (در واقعیت باید signature تأیید شود)
        return assertion && storedCredential;
    }
    
    // =====================
    // Status Check
    // =====================
    
    isRegistered(username) {
        return !!this.credentials[username];
    }
    
    getRegistrationCount() {
        return Object.keys(this.credentials).length;
    }
    
    getLastLogin(username) {
        const history = this.loadHistory();
        const login = history.find(h => 
            h.type === 'login' && 
            h.success && 
            h.username === username
        );
        return login ? new Date(login.timestamp) : null;
    }
}

// ایجاد نمونه سراسری
window.biometricAuth = new BiometricAuth();