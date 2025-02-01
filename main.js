// main.js - Complete Modified Version

document.addEventListener('DOMContentLoaded', () => {
    // Initialize all components
    initializePreloader();
    initializeNavigation();
    initializeSliders();
    initializeAnimations();
    initializeScrollEffects();
    initializeBookingSystem();
    initializeGallery();
    initializeWeatherWidget();
    initializeInteractiveMap();
    initializeLiveChat();
    initializeReviewSystem();
    initializeCustomCursor();
});

// 1. Preloader
function initializePreloader() {
    const preloader = document.querySelector('.preloader');
    window.addEventListener('load', () => {
        preloader.classList.add('fade-out');
        setTimeout(() => {
            preloader.style.display = 'none';
            // Trigger entrance animations
            document.body.classList.add('loaded');
        }, 1000);
    });
}

// 2. Navigation System
function initializeNavigation() {
    const header = document.querySelector('.header');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const dropdowns = document.querySelectorAll('.dropdown');

    // Sticky Header
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    });

    // Mobile Menu Toggle
    mobileMenuBtn?.addEventListener('click', () => {
        mobileMenuBtn.classList.toggle('active');
        navLinks.classList.toggle('active');
    });

    // Dropdown Menus
    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');
        const content = dropdown.querySelector('.dropdown-content');

        trigger?.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('active');
            
            // Close other dropdowns
            dropdowns.forEach(other => {
                if (other !== dropdown) {
                    other.classList.remove('active');
                }
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
}

// 3. Slider Initialization
// Update in main.js
function initializeSliders() {
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
        },
    });
}

    // Testimonials Slider
    const testimonialSlider = new Swiper('.testimonial-slider', {
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

    // Package Slider
    const packageSlider = new Swiper('.package-slider', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        navigation: {
            nextEl: '.package-next',
            prevEl: '.package-prev',
        },
        breakpoints: {
            640: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            },
        },
    });
}

// 4. Animation System
function initializeAnimations() {
    // Initialize AOS
    AOS.init({
        duration: 1000,
        once: true,
        offset: 100,
    });

    // Custom animations for specific elements
    const animatedElements = document.querySelectorAll('.custom-animate');
    
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px',
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                if (entry.target.dataset.delay) {
                    entry.target.style.animationDelay = `${entry.target.dataset.delay}s`;
                }
            }
        });
    }, observerOptions);

    animatedElements.forEach(element => observer.observe(element));
}

// 5. Scroll Effects
function initializeScrollEffects() {
    // Parallax Effect
    const parallaxElements = document.querySelectorAll('.parallax');
    
    window.addEventListener('scroll', () => {
        parallaxElements.forEach(element => {
            const speed = element.dataset.speed || 0.5;
            const yPos = -(window.scrollY * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });

    // Smooth Scroll for Anchor Links
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

    // Back to Top Button
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

// 6. Booking System
function initializeBookingSystem() {
    const bookingForm = document.querySelector('.booking-form');
    if (!bookingForm) return;

    const dateInputs = bookingForm.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];

    // Set minimum date as today
    dateInputs.forEach(input => {
        input.setAttribute('min', today);
    });

    // Calculate price
    bookingForm.addEventListener('change', calculatePrice);
    
    function calculatePrice() {
        const basePrice = parseFloat(bookingForm.dataset.basePrice) || 0;
        const guests = parseInt(bookingForm.querySelector('[name="guests"]').value) || 1;
        const checkIn = new Date(bookingForm.querySelector('[name="checkIn"]').value);
        const checkOut = new Date(bookingForm.querySelector('[name="checkOut"]').value);
        
        if (checkIn && checkOut && checkOut > checkIn) {
            const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
            const total = basePrice * guests * days;
            
            bookingForm.querySelector('.total-price').textContent = `₹${total.toLocaleString()}`;
        }
    }

    // Form Submission
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

// 7. Gallery System
function initializeGallery() {
    const gallery = document.querySelector('.gallery');
    if (!gallery) return;

    const images = gallery.querySelectorAll('.gallery-item');
    const lightbox = createLightbox();

    images.forEach(image => {
        image.addEventListener('click', () => {
            openLightbox(image.querySelector('img').src);
        });
    });

    function createLightbox() {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <img src="" alt="Gallery Image">
                <button class="lightbox-prev">&lt;</button>
                <button class="lightbox-next">&gt;</button>
            </div>
        `;
        document.body.appendChild(lightbox);
        return lightbox;
    }

    function openLightbox(imageSrc) {
        lightbox.classList.add('active');
        lightbox.querySelector('img').src = imageSrc;
        document.body.style.overflow = 'hidden';
    }
}

// 8. Weather Widget
async function initializeWeatherWidget() {
    const weatherWidget = document.querySelector('.weather-widget');
    if (!weatherWidget) return;

    try {
        const response = await fetch(`your-weather-api-endpoint`);
        const data = await response.json();
        updateWeatherUI(data);
    } catch (error) {
        console.error('Weather data fetch failed:', error);
    }
}

// 9. Interactive Map
function initializeInteractiveMap() {
    const mapElement = document.getElementById('tourMap');
    if (!mapElement) return;

    const map = L.map('tourMap').setView([34.0837, 74.7973], 8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add markers for tour locations
    const locations = [
        { lat: 34.0837, lng: 74.7973, name: 'Srinagar', description: 'Capital city' },
        // Add more locations
    ];

    locations.forEach(location => {
        L.marker([location.lat, location.lng])
            .bindPopup(`<h3>${location.name}</h3><p>${location.description}</p>`)
            .addTo(map);
    });
}

// 10. Live Chat
function initializeLiveChat() {
    const chatWidget = document.querySelector('.chat-widget');
    if (!chatWidget) return;

    const chatToggle = chatWidget.querySelector('.chat-toggle');
    const chatMessages = chatWidget.querySelector('.chat-messages');
    const chatInput = chatWidget.querySelector('.chat-input');

    chatToggle?.addEventListener('click', () => {
        chatWidget.classList.toggle('active');
    });

    chatInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            sendMessage(chatInput.value);
            chatInput.value = '';
        }
    });
}

// 11. Review System
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
}

// 12. Custom Cursor
function initializeCustomCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor) return;

    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });

    // Add hover effect for interactive elements
    document.querySelectorAll('a, button, .interactive').forEach(element => {
        element.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        element.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
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
    const formData = new FormData(form);
    try {
        const response = await fetch('your-booking-endpoint', {
            method: 'POST',
            body: formData
        });
        return await response.json();
    } catch (error) {
        throw new Error('Booking submission failed');
    }
}

function initializeMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');

    mobileMenuBtn?.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
}

// Initialize everything when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializePreloader();
    initializeNavigation();
    initializeSliders();
    initializeMobileMenu();
    initializeAnimations();
    initializeScrollEffects();
    initializeBookingSystem();
    initializeGallery();
    initializeWeatherWidget();
    initializeInteractiveMap();
    initializeLiveChat();
    initializeReviewSystem();
    initializeCustomCursor();
});
