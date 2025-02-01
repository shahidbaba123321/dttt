// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initializePreloader();
    initializeHeader();
    initializeMobileMenu();
    initializeSliders();
    initializeAnimations();
    initializeSearchForm();
    initializeGallery();
    initializeCountdown();
    initializeScrollEffects();
    initializeBookingSystem();
    initializeWeatherWidget();
    initializeReviewSystem();
    initializeNewsletterForm();
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
    const header = document.querySelector('.header');
    const headerHeight = header?.offsetHeight || 0;
    
    // Update header on scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > headerHeight) {
            header?.classList.add('sticky');
        } else {
            header?.classList.remove('sticky');
        }
    });

    // Dropdown menus
    const dropdowns = document.querySelectorAll('.menu-item-has-children');
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        const submenu = dropdown.querySelector('.sub-menu');

        link?.addEventListener('click', (e) => {
            if (window.innerWidth < 1024) {
                e.preventDefault();
                submenu.style.height = submenu.style.height ? null : `${submenu.scrollHeight}px`;
                dropdown.classList.toggle('active');
            }
        });
    });
}

// Mobile Menu
function initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    const header = document.querySelector('.header');

    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        mainNav?.classList.toggle('active');
        document.body.classList.toggle('menu-open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.main-nav') && !e.target.closest('.mobile-menu-btn')) {
            mobileMenuBtn?.classList.remove('active');
            mainNav?.classList.remove('active');
            document.body.classList.remove('menu-open');
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

    // Custom animations for elements
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                
                // Add delay if specified
                const delay = entry.target.dataset.delay;
                if (delay) {
                    entry.target.style.animationDelay = `${delay}s`;
                }
            }
        });
    }, {
        threshold: 0.2,
    });

    animatedElements.forEach(element => observer.observe(element));
}

// Search Form
function initializeSearchForm() {
    const searchForm = document.querySelector('.search-form');
    
    searchForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(searchForm);
        const searchData = Object.fromEntries(formData);

        // Validate form
        if (validateSearchForm(searchData)) {
            // Process search
            processSearch(searchData);
        }
    });

    function validateSearchForm(data) {
        let isValid = true;
        // Add your validation logic here
        return isValid;
    }

    function processSearch(data) {
        // Add your search processing logic here
        console.log('Search data:', data);
    }
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

    function openLightbox(imgSrc) {
        const lightbox = createLightbox(imgSrc);
        document.body.appendChild(lightbox);
        
        setTimeout(() => {
            lightbox.classList.add('active');
        }, 10);

        // Close lightbox
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox(lightbox);
            }
        });
    }

    function createLightbox(imgSrc) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img src="${imgSrc}" alt="Gallery Image">
                <button class="lightbox-close">&times;</button>
            </div>
        `;
        return lightbox;
    }

    function closeLightbox(lightbox) {
        lightbox.classList.remove('active');
        setTimeout(() => {
            lightbox.remove();
        }, 300);
    }
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

        backToTop.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

// Booking System
function initializeBookingSystem() {
    const bookingForms = document.querySelectorAll('.booking-form');
    
    bookingForms.forEach(form => {
        // Set minimum date as today for date inputs
        const dateInputs = form.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        
        dateInputs.forEach(input => {
            input.setAttribute('min', today);
        });

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (validateBookingForm(form)) {
                try {
                    const response = await submitBooking(form);
                    if (response.success) {
                        showNotification('Booking successful!', 'success');
                        form.reset();
                    }
                } catch (error) {
                    showNotification('Booking failed. Please try again.', 'error');
                }
            }
        });
    });
}

// Weather Widget
async function initializeWeatherWidget() {
    const weatherWidget = document.querySelector('.weather-widget');
    if (!weatherWidget) return;

    try {
        const response = await fetch('your-weather-api-endpoint');
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Weather data fetch failed:', error);
    }
}

// Review System
function initializeReviewSystem() {
    const reviewForm = document.querySelector('.review-form');
    if (!reviewForm) return;

    const ratingStars = reviewForm.querySelectorAll('.rating-star');
    let currentRating = 0;

    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            updateStars();
        });

        star.addEventListener('mouseover', () => {
            highlightStars(index + 1);
        });

        star.addEventListener('mouseleave', () => {
            highlightStars(currentRating);
        });
    });

    function updateStars() {
        ratingStars.forEach((star, index) => {
            star.classList.toggle('active', index < currentRating);
        });
    }

    function highlightStars(count) {
        ratingStars.forEach((star, index) => {
            star.classList.toggle('hover', index < count);
        });
    }
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

async function subscribeToNewsletter(email) {
    // Add your newsletter subscription logic here
    return { success: true };
}

async function submitBooking(form) {
    // Add your booking submission logic here
    return { success: true };
}

function validateBookingForm(form) {
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
