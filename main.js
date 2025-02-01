// Main JavaScript (main.js)
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all functions
    initializeSliders();
    initializeScrollEffects();
    initializeNavigation();
    initializeCountdown();
    initializeAnimations();
    initializeFormValidation();
    initializeLightbox();
    initializeBookingSystem();
});

// Slider Initializations
function initializeSliders() {
    // Hero Slider
    const heroSlider = new Swiper('.hero-slider', {
        slidesPerView: 1,
        effect: 'fade',
        speed: 1000,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
        },
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
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

// Scroll Effects
function initializeScrollEffects() {
    const header = document.querySelector('.main-header');
    const backToTop = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', () => {
        // Header scroll effect
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Back to top button visibility
        if (window.scrollY > 500) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Navigation Functionality
function initializeNavigation() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.menu-item-has-children');

    // Mobile menu toggle
    mobileMenuBtn.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Dropdown menus
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        const submenu = dropdown.querySelector('.sub-menu');

        link.addEventListener('click', (e) => {
            if (window.innerWidth < 1024) {
                e.preventDefault();
                submenu.style.height = submenu.style.height ? null : submenu.scrollHeight + 'px';
            }
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

            if (distance < 0) {
                clearInterval(timer);
                countdown.innerHTML = "EXPIRED";
            }
        }, 1000);
    });
}

// Animations
function initializeAnimations() {
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100
    });

    // Custom animations for elements
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(element => observer.observe(element));
}

// Form Validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let isValid = true;
            const formData = new FormData(form);

            // Basic validation
            for (let [key, value] of formData.entries()) {
                if (!value) {
                    isValid = false;
                    showError(`Please fill in ${key}`);
                }
            }

            if (isValid) {
                // Handle form submission
                handleFormSubmit(form, formData);
            }
        });
    });
}

// Form Submission Handler
async function handleFormSubmit(form, formData) {
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            showNotification('Success! Form submitted successfully.', 'success');
            form.reset();
        } else {
            throw new Error('Form submission failed');
        }
    } catch (error) {
        showNotification('Error submitting form. Please try again.', 'error');
    }
}

// Notification System
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

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);

    // Close button functionality
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}

// Booking System
function initializeBookingSystem() {
    const bookingForms = document.querySelectorAll('.booking-form');
    
    bookingForms.forEach(form => {
        // Date input restrictions
        const dateInputs = form.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        
        dateInputs.forEach(input => {
            input.setAttribute('min', today);
        });

        // Dynamic price calculation
        form.addEventListener('change', calculatePrice);
    });
}

// Price Calculator
function calculatePrice(e) {
    const form = e.target.closest('form');
    const basePrice = parseFloat(form.dataset.basePrice) || 0;
    const guests = parseInt(form.querySelector('[name="guests"]').value) || 1;
    const days = calculateDays(
        form.querySelector('[name="checkIn"]').value,
        form.querySelector('[name="checkOut"]').value
    );

    const totalPrice = basePrice * guests * days;
    const priceDisplay = form.querySelector('.total-price');
    
    if (priceDisplay) {
        priceDisplay.textContent = `₹${totalPrice.toLocaleString()}`;
    }
}

// Helper Functions
function calculateDays(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
}

// Initialize on load
window.addEventListener('load', () => {
    // Remove preloader
    const preloader = document.querySelector('.preloader');
    preloader.style.opacity = '0';
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 500);
});
