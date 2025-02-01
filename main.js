// main.js

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initializePreloader();
    initializeHeader();
    initializeSliders();
    initializeMobileMenu();
    initializeAnimations();
    initializeScrollEffects();
    initializeSearchOverlay();
    initializeBookingForm();
    initializeGallery();
    initializeCountdown();
    initializeNewsletterForm();
    initializeLazyLoading();

    // Initialize Swiper
    const heroSlider = new Swiper('.hero-slider', {
        slidesPerView: 1,
        loop: true,
        autoplay: {
            delay: 5000,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
    });

    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    menuToggle?.addEventListener('click', () => {
        navMenu?.classList.toggle('active');
    });

    // Sticky Header
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header?.classList.add('sticky');
        } else {
            header?.classList.remove('sticky');
        }
    });
});

// Preloader
function initializePreloader() {
    const preloader = document.querySelector('.preloader');
    if (!preloader) return;

    window.addEventListener('load', () => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
            document.body.classList.add('loaded');
        }, 1000);
    });
}

// Header & Navigation
function initializeHeader() {
    const header = document.querySelector('.main-header');
    const headerHeight = header?.offsetHeight || 0;

    // Sticky Header
    window.addListener('scroll', () => {
        if (window.scrollY > headerHeight) {
            header?.classList.add('sticky');
        } else {
            header?.classList.remove('sticky');
        }
    });

    // Dropdown Menus
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('.nav-link');
        
        link?.addListener('click', (e) => {
            if (window.innerWidth < 1024) {
                e.prDefault();
                dropdown.classList.toggle('active');
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
}

// Mobile Menu
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    const body = document.body;

    mobileMenuToggle?.addListener('click', () => {
        mobileMenuToggle.classList.toggle('active');
        mainNav?.classList.toggle('active');
        body.classList.toggle('menu-open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.main-nav') && !e.target.closest('.mobile-menu-toggle')) {
            mobileMenuToggle?.classList.remove('active');
            mainNav?.classList.remove('active');
            body.classList.remove('menu-open');
        }
    });
}

// Sliders
function initializeSliders() {
    // Hero Slider
    const heroSlider = new Swiper('.hero-slider', {
        slidesPerView: 1,
        effect: 'fade',
        speed: 1000,
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            renderBullet: (index, className) => {
                return `<span class="${className}"><span class="bullet-text">0${index + 1}</span></span>`;
            },
        },
        navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
        },
    });

    // Testimonials Slider
    const testimonialSlider = new Swiper('.testimonials-slider', {
        slidesPerView: 1,
        spaceBetween: 30,
        loop: true,
        autoplay: {
            delay: 4000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        breakpoints: {
            768: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            },
        },
    });
}

// Animations
function initializeAnimations() {
    // Initialize AOS
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
    });

    // Custom animations
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                if (entry.target.dataset.delay) {
                    entry.target.style.animationDelay = `${entry.target.dataset.delay}s`;
                }
            }
        });
    }, {
        threshold: 0.2,
    });

    animatedElements.forEach(element => observer.observe(element));
}

// Scroll Effects
function initializeScrollEffects() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Back to top button
    const backToTop = document.querySelector('.back-to-top');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Search Overlay
function initializeSearchOverlay() {
    const searchToggle = document.querySelector('.search-toggle');
    const searchOverlay = document.querySelector('.search-overlay');
    const searchClose = document.querySelector('.search-close');

    searchToggle?.addEventListener('click', () => {
        searchOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    searchClose?.addEventListener('click', () => {
        searchOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// Booking Form
function initializeBookingForm() {
    const bookingForm = document.querySelector('.booking-form');
    if (!bookingForm) return;

    const dateInputs = bookingForm.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];

    // Set minimum date as today
    dateInputs.forEach(input => {
        input.setAttribute('min', today);
    });

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (validateForm(bookingForm)) {
            try {
                const response = await submitBooking(bookingForm);
                if (response.success) {
                    showNotification('Booking successful!', 'success');
                    bookingForm.reset();
                }
            } catch (error) {
                showNotification('Booking failed. Please try again.', 'error');
            }
        }
    });
}

// Gallery
function initializeGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const imgSrc = item.querySelector('img').src;
            openLightbox(imgSrc);
        });
    });
}

// Countdown Timer
function initializeCountdown() {
    const countdowns = document.querySelectorAll('[data-countdown]');
    
    countdowns.forEach(countdown => {
        const targetDate = new Date(countdown.dataset.countdown).getTime();
        
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(timer);
                countdown.innerHTML = 'EXPIRED';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            countdown.innerHTML = `
                <div class="countdown-item"><span>${days}</span> Days</div>
                <div class="countdown-item"><span>${hours}</span> Hours</div>
                <div class="countdown-item"><span>${minutes}</span> Minutes</div>
                <div class="countdown-item"><span>${seconds}</span> Seconds</div>
            `;
        }, 1000);
    });
}

// Newsletter Form
function initializeNewsletterForm() {
    const newsletterForm = document.querySelector('.newsletter-form');
    
    newsletterForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = newsletterForm.querySelector('input[type="email"]').value;
        
        if (validateEmail(email)) {
            try {
                const response = await subscribeToNewsletter(email);
                if (response.success) {
                    showNotification('Successfully subscribed!', 'success');
                    newsletterForm.reset();
                }
            } catch (error) {
                showNotification('Subscription failed. Please try again.', 'error');
            }
        } else {
            showNotification('Please enter a valid email address.', 'error');
        }
    });
}

// Lazy Loading
function initializeLazyLoading() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <p>${message}</p>
            <button class="notification-close">&times;</button>
        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

async function submitBooking(form) {
    // Add your booking submission logic here
    return { success: true };
}

async function subscribeToNewsletter(email) {
    // Add your newsletter subscription logic here
    return { success: true };
}

function openLightbox(imgSrc) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
        <div class="lightbox-content">
            <img src="${imgSrc}" alt="Gallery Image">
            <button class="lightbox-close">&times;</button>
        </div>
    `;

    document.body.appendChild(lightbox);
    document.body.style.overflow = 'hidden';

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
        lightbox.remove();
        document.body.style.overflow = '';
    });
}
