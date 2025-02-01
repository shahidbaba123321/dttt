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

// Enhanced Interactive Features (interactive-features.js)

// 1. Image Gallery with Lightbox
function initializeGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = createLightboxElement();

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            openLightbox(item.querySelector('img').src);
        });
    });

    function createLightboxElement() {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <button class="lightbox-close">&times;</button>
                <button class="lightbox-prev"><i class="fas fa-chevron-left"></i></button>
                <button class="lightbox-next"><i class="fas fa-chevron-right"></i></button>
                <img src="" alt="Gallery Image">
            </div>
            <div class="lightbox-thumbnails"></div>
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

// 2. Interactive Tour Map
function initializeTourMap() {
    const tourMap = document.getElementById('tourMap');
    if (!tourMap) return;

    const map = L.map('tourMap').setView([34.0837, 74.7973], 8); // Kashmir coordinates

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    // Add custom markers for tour locations
    const tourLocations = [
        { lat: 34.0837, lng: 74.7973, name: 'Srinagar', description: 'Capital city' },
        { lat: 34.0484, lng: 74.4008, name: 'Gulmarg', description: 'Ski resort' },
        // Add more locations
    ];

    tourLocations.forEach(location => {
        const marker = L.marker([location.lat, location.lng])
            .addTo(map)
            .bindPopup(`
                <h3>${location.name}</h3>
                <p>${location.description}</p>
                <button class="btn-view-details">View Details</button>
            `);
    });
}

// 3. Dynamic Weather Widget
function initializeWeatherWidget() {
    const weatherWidget = document.querySelector('.weather-widget');
    if (!weatherWidget) return;

    async function fetchWeather(city) {
        const API_KEY = 'your_api_key';
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
            );
            const data = await response.json();
            updateWeatherUI(data);
        } catch (error) {
            console.error('Error fetching weather:', error);
        }
    }

    function updateWeatherUI(data) {
        weatherWidget.innerHTML = `
            <div class="weather-info">
                <h3>${data.name}</h3>
                <div class="temperature">${Math.round(data.main.temp)}°C</div>
                <div class="weather-description">${data.weather[0].description}</div>
            </div>
        `;
    }

    // Update weather every 30 minutes
    fetchWeather('Srinagar');
    setInterval(() => fetchWeather('Srinagar'), 1800000);
}

// 4. Virtual Tour Experience
function initializeVirtualTour() {
    const virtualTourViewer = document.querySelector('.virtual-tour-viewer');
    if (!virtualTourViewer) return;

    const scenes = {
        'dal-lake': 'path/to/dal-lake-360.jpg',
        'gulmarg': 'path/to/gulmarg-360.jpg',
        // Add more scenes
    };

    const viewer = new PhotoSphereViewer({
        container: virtualTourViewer,
        panorama: scenes['dal-lake'],
        navbar: [
            'autorotate',
            'zoom',
            'fullscreen'
        ]
    });
}

// 5. Interactive Price Calculator
function initializePriceCalculator() {
    const calculator = document.querySelector('.price-calculator');
    if (!calculator) return;

    const calculateTotal = () => {
        const basePrice = parseFloat(calculator.dataset.basePrice);
        const guests = parseInt(calculator.querySelector('[name="guests"]').value);
        const days = parseInt(calculator.querySelector('[name="days"]').value);
        const addons = Array.from(calculator.querySelectorAll('[name="addons"]:checked'))
            .reduce((sum, addon) => sum + parseFloat(addon.value), 0);

        const total = (basePrice * guests * days) + addons;
        calculator.querySelector('.total-amount').textContent = `₹${total.toLocaleString()}`;
    };

    calculator.addEventListener('change', calculateTotal);
}

// 6. Live Chat Widget
function initializeLiveChat() {
    const chatWidget = document.querySelector('.chat-widget');
    if (!chatWidget) return;

    const chatMessages = chatWidget.querySelector('.chat-messages');
    const chatInput = chatWidget.querySelector('.chat-input');

    chatWidget.querySelector('.chat-toggle').addEventListener('click', () => {
        chatWidget.classList.toggle('active');
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            addMessage('user', chatInput.value);
            // Simulate response
            setTimeout(() => {
                addMessage('agent', 'Thank you for your message. Our team will respond shortly.');
            }, 1000);
            chatInput.value = '';
        }
    });

    function addMessage(type, content) {
        const message = document.createElement('div');
        message.className = `chat-message ${type}-message`;
        message.textContent = content;
        chatMessages.appendChild(message);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// 7. Tour Comparison Tool
function initializeTourComparison() {
    const comparisonTable = document.querySelector('.tour-comparison');
    if (!comparisonTable) return;

    const tours = document.querySelectorAll('.tour-checkbox');
    
    tours.forEach(tour => {
        tour.addEventListener('change', updateComparison);
    });

    function updateComparison() {
        const selectedTours = Array.from(tours)
            .filter(tour => tour.checked)
            .map(tour => tour.value);

        // Update comparison table
        fetchTourDetails(selectedTours).then(details => {
            renderComparisonTable(details);
        });
    }
}

// 8. Seasonal Content Switcher
function initializeSeasonalContent() {
    const season = getCurrentSeason();
    const seasonalElements = document.querySelectorAll('[data-season]');

    seasonalElements.forEach(element => {
        if (element.dataset.season === season) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });
}

// 9. Review System
function initializeReviewSystem() {
    const reviewForm = document.querySelector('.review-form');
    if (!reviewForm) return;

    const ratingStars = reviewForm.querySelectorAll('.rating-star');
    
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => {
            updateRating(index + 1);
        });

        star.addEventListener('mouseover', () => {
            highlightStars(index + 1);
        });
    });

    reviewForm.addEventListener('submit', handleReviewSubmission);
}

// 10. Accessibility Features
function initializeAccessibility() {
    // Font size adjuster
    const fontSizeControls = document.querySelector('.font-size-controls');
    if (fontSizeControls) {
        fontSizeControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('increase')) {
                adjustFontSize(1);
            } else if (e.target.classList.contains('decrease')) {
                adjustFontSize(-1);
            }
        });
    }

    // High contrast mode
    const contrastToggle = document.querySelector('.contrast-toggle');
    if (contrastToggle) {
        contrastToggle.addEventListener('click', toggleHighContrast);
    }
}

// Initialize all interactive features
document.addEventListener('DOMContentLoaded', () => {
    initializeGallery();
    initializeTourMap();
    initializeWeatherWidget();
    initializeVirtualTour();
    initializePriceCalculator();
    initializeLiveChat();
    initializeTourComparison();
    initializeSeasonalContent();
    initializeReviewSystem();
    initializeAccessibility();
});
