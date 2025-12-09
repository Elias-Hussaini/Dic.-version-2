// lessons.js - بخش درس‌ها و یادداشت‌ها
document.addEventListener('DOMContentLoaded', function() {
    console.log('📚 بخش درس‌ها در حال بارگذاری...');
    
    // کلاس مدیریت درس‌ها
    class LessonsManager {
        constructor() {
            this.dbName = 'GermanDictionaryDB';
            this.dbVersion = 4;
            this.db = null;
            this.init();
        }
        
        async init() {
            try {
                await this.initDatabase();
                this.setupEventListeners();
                console.log('✅ بخش درس‌ها آماده است');
            } catch (error) {
                console.error('❌ خطا در راه‌اندازی درس‌ها:', error);
            }
        }
        
        initDatabase() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // ایجاد object store برای درس‌ها
                    if (!db.objectStoreNames.contains('lessons')) {
                        const lessonsStore = db.createObjectStore('lessons', { 
                            keyPath: 'id', 
                            autoIncrement: true 
                        });
                        lessonsStore.createIndex('category', 'category', { unique: false });
                        lessonsStore.createIndex('important', 'important', { unique: false });
                        lessonsStore.createIndex('studied', 'studied', { unique: false });
                        console.log('✅ Object Store درس‌ها ایجاد شد');
                    }
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve();
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }
        
        setupEventListeners() {
            // وقتی بخش درس‌ها نمایش داده شد
            this.observeSectionChanges();
            
            // دکمه‌های بخش درس‌ها
            this.setupLessonButtons();
        }
        
        observeSectionChanges() {
            // مشاهده تغییرات در بخش‌ها
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const section = mutation.target;
                        if (section.id === 'lessons-section' && section.classList.contains('active')) {
                            console.log('📚 بخش درس‌ها فعال شد');
                            this.renderLessons();
                        }
                    }
                });
            });
            
            // شروع مشاهده
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(section => {
                observer.observe(section, { attributes: true });
            });
        }
        
        setupLessonButtons() {
            // دکمه افزودن درس
            document.getElementById('add-lesson-btn')?.addEventListener('click', () => {
                this.showAddLessonModal();
            });
            
            // دکمه جستجوی درس‌ها
            document.getElementById('search-lessons-btn')?.addEventListener('click', () => {
                this.searchLessons();
            });
            
            document.getElementById('search-lessons')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchLessons();
                }
            });
            
            // فیلترهای دسته‌بندی
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const filter = e.target.getAttribute('data-filter');
                    this.applyLessonFilter(filter);
                    
                    // آپدیت وضعیت دکمه‌ها
                    document.querySelectorAll('.filter-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    e.target.classList.add('active');
                });
            });
        }
        
        // =====================
        // RENDER LESSONS
        // =====================
        async renderLessons() {
            console.log('🔄 رندر درس‌ها...');
            
            try {
                const lessons = await this.getAllLessons();
                this.displayLessons(lessons);
                this.updateLessonStats(lessons);
            } catch (error) {
                console.error('خطا در رندر درس‌ها:', error);
                this.showLessonsError();
            }
        }
        
        async getAllLessons() {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    resolve([]);
                    return;
                }
                
                const transaction = this.db.transaction(['lessons'], 'readonly');
                const store = transaction.objectStore('lessons');
                const request = store.getAll();
                
                request.onsuccess = () => {
                    // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
                    const sortedLessons = request.result.sort((a, b) => 
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                    resolve(sortedLessons);
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }
        
        displayLessons(lessons) {
            const lessonsList = document.getElementById('lessons-list');
            if (!lessonsList) return;
            
            if (lessons.length === 0) {
                lessonsList.innerHTML = `
                    <div class="empty-lessons">
                        <i class="fas fa-graduation-cap"></i>
                        <h3>هنوز درسی اضافه نکرده‌اید</h3>
                        <p>اولین درس آموزشی خود را ایجاد کنید!</p>
                        <button class="btn btn-primary" id="add-first-lesson-btn">
                            <i class="fas fa-plus-circle"></i> افزودن اولین درس
                        </button>
                    </div>
                `;
                
                // اضافه کردن event listener برای دکمه
                document.getElementById('add-first-lesson-btn')?.addEventListener('click', () => {
                    this.showAddLessonModal();
                });
                return;
            }
            
            lessonsList.innerHTML = lessons.map(lesson => `
                <div class="lesson-item" data-id="${lesson.id}">
                    <div class="lesson-item-header">
                        <div class="lesson-title-wrapper">
                            <h4 class="lesson-title">${lesson.title}</h4>
                            <div class="lesson-meta">
                                <span class="lesson-category ${lesson.category}">
                                    ${this.getCategoryLabel(lesson.category)}
                                </span>
                                <span class="lesson-date">
                                    <i class="far fa-calendar"></i>
                                    ${new Date(lesson.createdAt).toLocaleDateString('fa-IR')}
                                </span>
                            </div>
                        </div>
                        <div class="lesson-actions">
                            ${lesson.important ? 
                                '<i class="fas fa-star important-icon active" title="مهم"></i>' : 
                                '<i class="far fa-star important-icon" title="علامت‌گذاری مهم"></i>'
                            }
                            ${lesson.studied ? 
                                '<i class="fas fa-check-circle studied-icon active" title="مطالعه شده"></i>' : 
                                '<i class="far fa-check-circle studied-icon" title="علامت‌گذاری مطالعه شده"></i>'
                            }
                        </div>
                    </div>
                    
                    <div class="lesson-preview">
                        ${lesson.content.substring(0, 150)}${lesson.content.length > 150 ? '...' : ''}
                    </div>
                    
                    ${lesson.tags ? `
                        <div class="lesson-tags">
                            ${lesson.tags.split(',').map(tag => `
                                <span class="lesson-tag">${tag.trim()}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="lesson-item-footer">
                        <button class="btn btn-sm btn-outline view-lesson-btn" data-id="${lesson.id}">
                            <i class="fas fa-eye"></i> مشاهده
                        </button>
                        <button class="btn btn-sm btn-outline edit-lesson-btn" data-id="${lesson.id}">
                            <i class="fas fa-edit"></i> ویرایش
                        </button>
                        <button class="btn btn-sm btn-outline practice-lesson-btn" data-id="${lesson.id}">
                            <i class="fas fa-brain"></i> تمرین
                        </button>
                    </div>
                </div>
            `).join('');
            
            // اضافه کردن event listeners به درس‌ها
            this.setupLessonItemListeners();
        }
        
        setupLessonItemListeners() {
            // مشاهده درس
            document.querySelectorAll('.view-lesson-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const lessonId = parseInt(btn.getAttribute('data-id'));
                    this.showViewLessonModal(lessonId);
                });
            });
            
            // ویرایش درس
            document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const lessonId = parseInt(btn.getAttribute('data-id'));
                    this.showEditLessonModal(lessonId);
                });
            });
            
            // تمرین درس
            document.querySelectorAll('.practice-lesson-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const lessonId = parseInt(btn.getAttribute('data-id'));
                    this.startLessonPractice(lessonId);
                });
            });
            
            // علامت‌گذاری مهم
            document.querySelectorAll('.important-icon').forEach(icon => {
                icon.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const lessonId = parseInt(icon.closest('.lesson-item').getAttribute('data-id'));
                    await this.toggleLessonImportant(lessonId);
                    this.renderLessons(); // رفرش لیست
                });
            });
            
            // علامت‌گذاری مطالعه شده
            document.querySelectorAll('.studied-icon').forEach(icon => {
                icon.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const lessonId = parseInt(icon.closest('.lesson-item').getAttribute('data-id'));
                    await this.toggleLessonStudied(lessonId);
                    this.renderLessons(); // رفرش لیست
                });
            });
        }
        
        updateLessonStats(lessons) {
            const total = lessons.length;
            const studied = lessons.filter(lesson => lesson.studied).length;
            const important = lessons.filter(lesson => lesson.important).length;
            
            document.getElementById('total-lessons').textContent = total;
            document.getElementById('studied-lessons').textContent = studied;
            document.getElementById('important-lessons').textContent = important;
        }
        
        showLessonsError() {
            const lessonsList = document.getElementById('lessons-list');
            if (!lessonsList) return;
            
            lessonsList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>خطا در بارگذاری درس‌ها</h3>
                    <p>لطفاً صفحه را رفرش کنید یا دوباره تلاش کنید.</p>
                    <button class="btn btn-outline mt-3" onclick="location.reload()">
                        <i class="fas fa-redo"></i> رفرش صفحه
                    </button>
                </div>
            `;
        }
        
        // =====================
        // SEARCH & FILTER
        // =====================
        async searchLessons() {
            const query = document.getElementById('search-lessons').value.trim();
            const lessons = await this.getAllLessons();
            
            if (!query) {
                this.displayLessons(lessons);
                return;
            }
            
            const searchTerm = query.toLowerCase();
            const filtered = lessons.filter(lesson => 
                lesson.title.toLowerCase().includes(searchTerm) ||
                lesson.content.toLowerCase().includes(searchTerm) ||
                (lesson.tags && lesson.tags.toLowerCase().includes(searchTerm)) ||
                this.getCategoryLabel(lesson.category).toLowerCase().includes(searchTerm)
            );
            
            this.displayLessons(filtered);
        }
        
        async applyLessonFilter(filter) {
            const lessons = await this.getAllLessons();
            
            if (filter === 'all') {
                this.displayLessons(lessons);
                return;
            }
            
            const filtered = lessons.filter(lesson => lesson.category === filter);
            this.displayLessons(filtered);
        }
        
        // =====================
        // MODAL MANAGEMENT
        // =====================
        showAddLessonModal() {
            this.showLessonModal('add');
        }
        
        showEditLessonModal(lessonId) {
            this.getLessonById(lessonId).then(lesson => {
                this.showLessonModal('edit', lesson);
            }).catch(error => {
                console.error('خطا در دریافت درس:', error);
                this.showToast('خطا در دریافت درس', 'error');
            });
        }
        
        showLessonModal(mode, lesson = null) {
            const modal = document.getElementById('lesson-modal');
            const modalTitle = document.getElementById('modal-title');
            
            if (mode === 'edit' && lesson) {
                modalTitle.textContent = 'ویرایش درس';
                this.fillLessonForm(lesson);
                modal.dataset.lessonId = lesson.id;
                modal.dataset.mode = 'edit';
            } else {
                modalTitle.textContent = 'افزودن درس جدید';
                this.resetLessonForm();
                modal.dataset.mode = 'add';
                delete modal.dataset.lessonId;
            }
            
            modal.style.display = 'block';
            this.setupLessonModalEvents();
            
            // فوکوس روی عنوان
            setTimeout(() => {
                document.getElementById('lesson-title').focus();
            }, 100);
        }
        
        fillLessonForm(lesson) {
            document.getElementById('lesson-title').value = lesson.title || '';
            document.getElementById('lesson-category').value = lesson.category || 'grammar';
            document.getElementById('lesson-tags').value = lesson.tags || '';
            document.getElementById('lesson-content').value = lesson.content || '';
            document.getElementById('lesson-examples').value = lesson.examples || '';
            document.getElementById('lesson-exercises').value = lesson.exercises || '';
            document.getElementById('lesson-important').checked = lesson.important || false;
            document.getElementById('lesson-studied').checked = lesson.studied || false;
        }
        
        resetLessonForm() {
            document.getElementById('lesson-form').reset();
            document.getElementById('lesson-category').value = 'grammar';
            document.getElementById('lesson-important').checked = false;
            document.getElementById('lesson-studied').checked = false;
        }
        
        setupLessonModalEvents() {
            const modal = document.getElementById('lesson-modal');
            const closeBtn = modal.querySelector('.close-modal');
            const cancelBtn = document.getElementById('cancel-lesson-btn');
            const saveBtn = document.getElementById('save-lesson-btn');
            
            // بستن مودال
            const closeModal = () => {
                modal.style.display = 'none';
            };
            
            closeBtn.addEventListener('click', closeModal);
            cancelBtn.addEventListener('click', closeModal);
            
            // کلیک خارج از مودال
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
            
            // ذخیره درس
            saveBtn.addEventListener('click', async () => {
                await this.saveLesson();
            });
            
            // Enter برای ذخیره
            document.getElementById('lesson-title')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    saveBtn.click();
                }
            });
        }
        
        async saveLesson() {
            const form = document.getElementById('lesson-form');
            
            if (!form.checkValidity()) {
                this.showToast('لطفاً فیلدهای ضروری را پر کنید', 'error');
                return;
            }
            
            const lessonData = {
                title: document.getElementById('lesson-title').value.trim(),
                category: document.getElementById('lesson-category').value,
                tags: document.getElementById('lesson-tags').value.trim(),
                content: document.getElementById('lesson-content').value.trim(),
                examples: document.getElementById('lesson-examples').value.trim(),
                exercises: document.getElementById('lesson-exercises').value.trim(),
                important: document.getElementById('lesson-important').checked,
                studied: document.getElementById('lesson-studied').checked,
                updatedAt: new Date().toISOString()
            };
            
            try {
                const modal = document.getElementById('lesson-modal');
                const mode = modal.dataset.mode;
                
                if (mode === 'edit' && modal.dataset.lessonId) {
                    // ویرایش درس موجود
                    const lessonId = parseInt(modal.dataset.lessonId);
                    const existingLesson = await this.getLessonById(lessonId);
                    
                    await this.updateLessonInDB(lessonId, {
                        ...existingLesson,
                        ...lessonData,
                        id: lessonId
                    });
                    
                    this.showToast('درس با موفقیت ویرایش شد', 'success');
                } else {
                    // افزودن درس جدید
                    lessonData.createdAt = new Date().toISOString();
                    await this.addLessonToDB(lessonData);
                    this.showToast('درس با موفقیت اضافه شد', 'success');
                }
                
                // بستن مودال و رفرش لیست
                modal.style.display = 'none';
                this.renderLessons();
                
            } catch (error) {
                console.error('خطا در ذخیره درس:', error);
                this.showToast('خطا در ذخیره درس', 'error');
            }
        }
        
        async showViewLessonModal(lessonId) {
            try {
                const lesson = await this.getLessonById(lessonId);
                const modal = document.getElementById('view-lesson-modal');
                
                // پر کردن داده‌ها
                document.getElementById('view-lesson-title').textContent = lesson.title;
                document.getElementById('view-lesson-category').textContent = this.getCategoryLabel(lesson.category);
                document.getElementById('view-lesson-date').textContent = new Date(lesson.createdAt).toLocaleDateString('fa-IR');
                
                // برچسب‌ها
                const tagsContainer = document.getElementById('view-lesson-tags');
                if (lesson.tags) {
                    tagsContainer.innerHTML = lesson.tags.split(',').map(tag => 
                        `<span class="lesson-tag">${tag.trim()}</span>`
                    ).join('');
                } else {
                    tagsContainer.innerHTML = '';
                }
                
                // محتوا
                document.getElementById('view-lesson-content').innerHTML = this.formatLessonContent(lesson.content);
                
                // مثال‌ها
                const examplesSection = document.getElementById('view-lesson-examples');
                const examplesContent = document.getElementById('examples-content');
                if (lesson.examples && lesson.examples.trim()) {
                    examplesContent.innerHTML = this.formatLessonContent(lesson.examples);
                    examplesSection.style.display = 'block';
                } else {
                    examplesSection.style.display = 'none';
                }
                
                // تمرین‌ها
                const exercisesSection = document.getElementById('view-lesson-exercises');
                const exercisesContent = document.getElementById('exercises-content');
                if (lesson.exercises && lesson.exercises.trim()) {
                    exercisesContent.innerHTML = this.formatLessonContent(lesson.exercises);
                    exercisesSection.style.display = 'block';
                } else {
                    exercisesSection.style.display = 'none';
                }
                
                // وضعیت‌ها
                document.getElementById('important-status').style.display = lesson.important ? 'block' : 'none';
                document.getElementById('studied-status').style.display = lesson.studied ? 'block' : 'none';
                
                // ذخیره ID درس
                modal.dataset.lessonId = lessonId;
                
                // تنظیم event listeners
                this.setupViewLessonModalEvents(lesson);
                
                // نمایش مودال
                modal.style.display = 'block';
                
            } catch (error) {
                console.error('خطا در نمایش درس:', error);
                this.showToast('خطا در نمایش درس', 'error');
            }
        }
        
        setupViewLessonModalEvents(lesson) {
            const modal = document.getElementById('view-lesson-modal');
            const closeBtn = modal.querySelector('.close-modal');
            const closeViewBtn = document.getElementById('close-view-btn');
            const editBtn = document.getElementById('edit-lesson-btn');
            const deleteBtn = document.getElementById('delete-lesson-btn');
            const toggleImportantBtn = document.getElementById('toggle-important-btn');
            const toggleStudiedBtn = document.getElementById('toggle-studied-btn');
            const practiceBtn = document.getElementById('practice-lesson-btn');
            
            const lessonId = parseInt(modal.dataset.lessonId);
            
            // بستن مودال
            const closeModal = () => {
                modal.style.display = 'none';
            };
            
            closeBtn.addEventListener('click', closeModal);
            closeViewBtn.addEventListener('click', closeModal);
            
            // کلیک خارج از مودال
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal();
                }
            });
            
            // ویرایش درس
            editBtn.addEventListener('click', () => {
                closeModal();
                setTimeout(() => {
                    this.showEditLessonModal(lessonId);
                }, 300);
            });
            
            // حذف درس
            deleteBtn.addEventListener('click', () => {
                if (confirm('آیا از حذف این درس مطمئن هستید؟')) {
                    this.deleteLesson(lessonId).then(() => {
                        closeModal();
                        this.renderLessons();
                    });
                }
            });
            
            // تغییر وضعیت مهم
            toggleImportantBtn.addEventListener('click', async () => {
                await this.toggleLessonImportant(lessonId);
                closeModal();
                setTimeout(() => {
                    this.showViewLessonModal(lessonId);
                }, 300);
            });
            
            // تغییر وضعیت مطالعه شده
            toggleStudiedBtn.addEventListener('click', async () => {
                await this.toggleLessonStudied(lessonId);
                closeModal();
                setTimeout(() => {
                    this.showViewLessonModal(lessonId);
                }, 300);
            });
            
            // تمرین درس
            practiceBtn.addEventListener('click', () => {
                closeModal();
                this.startLessonPractice(lessonId);
            });
            
            // آپدیت آیکون‌ها
            toggleImportantBtn.querySelector('i').className = lesson.important ? 'fas fa-star' : 'far fa-star';
            toggleStudiedBtn.querySelector('i').className = lesson.studied ? 'fas fa-check' : 'far fa-check';
        }
        
        // =====================
        // LESSON CRUD OPERATIONS
        // =====================
        async getLessonById(lessonId) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('دیتابیس در دسترس نیست'));
                    return;
                }
                
                const transaction = this.db.transaction(['lessons'], 'readonly');
                const store = transaction.objectStore('lessons');
                const request = store.get(lessonId);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        }
        
        async addLessonToDB(lessonData) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('دیتابیس در دسترس نیست'));
                    return;
                }
                
                const transaction = this.db.transaction(['lessons'], 'readwrite');
                const store = transaction.objectStore('lessons');
                const request = store.add(lessonData);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            });
        }
        
        async updateLessonInDB(lessonId, lessonData) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('دیتابیس در دسترس نیست'));
                    return;
                }
                
                const transaction = this.db.transaction(['lessons'], 'readwrite');
                const store = transaction.objectStore('lessons');
                const request = store.put(lessonData);
                
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        }
        
        async deleteLesson(lessonId) {
            return new Promise((resolve, reject) => {
                if (!this.db) {
                    reject(new Error('دیتابیس در دسترس نیست'));
                    return;
                }
                
                const transaction = this.db.transaction(['lessons'], 'readwrite');
                const store = transaction.objectStore('lessons');
                const request = store.delete(lessonId);
                
                request.onsuccess = () => resolve();
                request.onerror = (event) => reject(event.target.error);
            });
        }
        
        async toggleLessonImportant(lessonId) {
            try {
                const lesson = await this.getLessonById(lessonId);
                await this.updateLessonInDB(lessonId, {
                    ...lesson,
                    important: !lesson.important,
                    updatedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('خطا در تغییر وضعیت مهم:', error);
                throw error;
            }
        }
        
        async toggleLessonStudied(lessonId) {
            try {
                const lesson = await this.getLessonById(lessonId);
                await this.updateLessonInDB(lessonId, {
                    ...lesson,
                    studied: !lesson.studied,
                    updatedAt: new Date().toISOString()
                });
            } catch (error) {
                console.error('خطا در تغییر وضعیت مطالعه شده:', error);
                throw error;
            }
        }
        
        // =====================
        // HELPER METHODS
        // =====================
        getCategoryLabel(category) {
            const categories = {
                'grammar': 'گرامر',
                'vocabulary': 'واژگان',
                'pronunciation': 'تلفظ',
                'conversation': 'مکالمه',
                'writing': 'نگارش',
                'other': 'سایر'
            };
            
            return categories[category] || category;
        }
        
        formatLessonContent(content) {
            // جایگزینی خطوط جدید
            let formatted = content.replace(/\n/g, '<br>');
            
            // فرمت‌بندی لیست‌ها
            formatted = formatted.replace(/\* (.*?)(<br>|$)/g, '<li>$1</li>');
            
            if (formatted.includes('<li>')) {
                formatted = formatted.replace(/(<li>.*?<\/li>)+/g, match => {
                    if (!match.includes('<ul>')) {
                        return `<ul>${match}</ul>`;
                    }
                    return match;
                });
            }
            
            return formatted;
        }
        
        showToast(message, type = 'info') {
            // ایجاد یک toast ساده
            const toast = document.createElement('div');
            toast.className = `simple-toast toast-${type}`;
            toast.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                                 type === 'error' ? 'fa-times-circle' : 
                                 'fa-info-circle'}"></i>
                <span>${message}</span>
            `;
            
            document.body.appendChild(toast);
            
            // نمایش و حذف خودکار
            setTimeout(() => {
                toast.classList.add('show');
            }, 10);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
        
        startLessonPractice(lessonId) {
            // تغییر به بخش تمرین و نمایش درس
            this.showSection('practice');
            
            // در آینده می‌توانید تمرین خاص درس را اینجا نمایش دهید
            this.showToast('بخش تمرین این درس به زودی اضافه خواهد شد', 'info');
        }
        
        showSection(sectionName) {
            // یک تابع ساده برای تغییر بخش‌ها
            const sectionId = sectionName + '-section';
            
            // مخفی کردن همه بخش‌ها
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            // نمایش بخش انتخاب شده
            const targetSection = document.getElementById(sectionId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // آپدیت منو
            document.querySelectorAll('.menu-item, .mobile-menu-item').forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === sectionName) {
                    item.classList.add('active');
                }
            });
        }
    }
    
    // ایجاد نمونه از کلاس
    window.lessonsManager = new LessonsManager();
});