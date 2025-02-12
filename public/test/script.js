// Existing Initialization Functions
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileMenu();
    initializeHeaderScroll();
    initializeSmoothScroll();
    initializeFeatureCards();
    observeAnimatedElements();
    // Initialize the 3D website (convert the whole page)
    initialize3DWebsite();
});

// Mobile Menu and Dropdown Functionality
function initializeMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.getElementById('nav-menu');
    const menuOverlay = document.querySelector('.menu-overlay');
    const body = document.body;
    const dropdowns = document.querySelectorAll('.dropdown');

    // Toggle mobile menu
    mobileMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMenu();
    });

    function toggleMenu(force = null) {
        const isActive = force !== null ? force : !mobileMenu.classList.contains('active');
        mobileMenu.classList.toggle('active', isActive);
        navMenu.classList.toggle('active', isActive);
        menuOverlay.classList.toggle('active', isActive);
        body.classList.toggle('menu-open', isActive);
    }

    // Handle dropdowns in mobile view
    dropdowns.forEach(dropdown => {
        const link = dropdown.querySelector('a');
        const dropdownContent = dropdown.querySelector('.dropdown-content');

        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                e.stopPropagation();
                
                // Close other dropdowns
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('active');
                    }
                });
                
                dropdown.classList.toggle('active');
            }
        });

        // Prevent dropdown content clicks from closing the menu
        dropdownContent?.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.stopPropagation();
            }
        });
    });

    // Close menu when clicking overlay
    menuOverlay?.addEventListener('click', () => {
        toggleMenu(false);
        dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navMenu.contains(e.target) && !mobileMenu.contains(e.target)) {
            toggleMenu(false);
            dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
        }
    });
}

// Header Scroll Effect
function initializeHeaderScroll() {
    const header = document.querySelector('header');
    let lastScroll = 0;
    let scrollTimeout;

    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);

        scrollTimeout = setTimeout(() => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll <= 0) {
                header.classList.remove('scroll-up');
                header.classList.remove('scroll-down');
                return;
            }
            
            if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
                // Scrolling down
                header.classList.remove('scroll-up');
                header.classList.add('scroll-down');
            } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
                // Scrolling up
                header.classList.remove('scroll-down');
                header.classList.add('scroll-up');
            }
            
            lastScroll = currentScroll;
        }, 50);
    });
}

// Smooth Scroll Implementation
function initializeSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = document.querySelector('header').offsetHeight;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Feature Cards Animation
function initializeFeatureCards() {
    const cards = document.querySelectorAll('.feature-card');
    
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });

        // Add hover effect to learn more button
        const learnMore = card.querySelector('.learn-more');
        if (learnMore) {
            learnMore.addEventListener('mouseenter', () => {
                const icon = learnMore.querySelector('i');
                icon.style.transform = 'translateX(5px)';
            });

            learnMore.addEventListener('mouseleave', () => {
                const icon = learnMore.querySelector('i');
                icon.style.transform = 'translateX(0)';
            });
        }
    });
}

// Intersection Observer for Animations
function observeAnimatedElements() {
    const options = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, options);

    document.querySelectorAll('.animate-on-scroll').forEach(element => {
        observer.observe(element);
    });
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Error, Success, and Loading Handlers (unchanged)
function showError(element, message) {
    element.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
}
function showSuccess(element, message) {
    element.innerHTML = `
        <div class="success-message">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
}
function showLoading(element, message = 'Loading...') {
    element.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>${message}</span>
        </div>
    `;
}

// Prevent form submission if validation fails
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', (e) => {
        if (!validateForm(form)) {
            e.preventDefault();
        }
    });
});
function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        if (input.hasAttribute('required') && !input.value.trim()) {
            showError(input.parentElement, `${input.name} is required`);
            isValid = false;
        }
        if (input.type === 'email' && input.value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                showError(input.parentElement, 'Please enter a valid email address');
                isValid = false;
            }
        }
    });
    
    return isValid;
}

// Remove loader on window load
window.addEventListener('load', () => {
    const loader = document.querySelector('.loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
    }
});

// Sentiment Analysis via HuggingFace Inference API (unchanged)
document.getElementById('analyze-button').addEventListener('click', async function() {
    const input = document.getElementById('feedback-input').value.trim();
    const resultDiv = document.getElementById('sentiment-result');

    if (!input) {
        resultDiv.textContent = 'Please enter some feedback to analyze.';
        return;
    }

    resultDiv.textContent = 'Analyzing...';

    try {
        const response = await fetch('https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ inputs: input })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Data:', data);

        if (data && data.length > 0 && data[0].length > 0) {
            const result = data[0].reduce((prev, current) => (prev.score > current.score) ? prev : current);
            const sentiment = result.label;
            const confidence = result.score;
            resultDiv.innerHTML = `
                <strong>Sentiment:</strong> ${sentiment}<br>
                <strong>Confidence:</strong> ${(confidence * 100).toFixed(2)}%
            `;
        } else {
            resultDiv.textContent = 'No sentiment data available.';
        }
    } catch (error) {
        console.error('Error:', error);
        resultDiv.textContent = 'Error analyzing sentiment. Please try again later.';
    }
});

// Dummy signup and login handlers (unchanged)
document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.getElementById('role').value;
    if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'user-dashboard.html';
    }
});
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('input[type="password"]').value;
    const role = document.getElementById('login-role').value;
    const adminCredentials = { email: 'admin@example.com', password: 'admin123' };
    const userCredentials = { email: 'user@example.com', password: 'user123' };
    if (role === 'admin' && email === adminCredentials.email && password === adminCredentials.password) {
        window.location.href = 'admin-dashboard.html';
    } else if (role === 'user' && email === userCredentials.email && password === userCredentials.password) {
        window.location.href = 'user-dashboard.html';
    } else {
        alert('Invalid credentials. Please try again.');
    }
});

// =====================================================================
// New: Initialize 3D Website with CSS3DRenderer (Converts entire page)
// =====================================================================
function initialize3DWebsite() {
    // Create Three.js scene, camera, and CSS3DRenderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.z = 0;
    const renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = 0;
    document.body.appendChild(renderer.domElement);

    // Select all major content elements to convert into 3D objects
    const elements = document.querySelectorAll('header, section, footer, .menu-overlay');
    const spacing = window.innerHeight; // space each section by one viewport height
    let index = 0;
    elements.forEach(element => {
        // Create a CSS3DObject for the element
        const object = new THREE.CSS3DObject(element);
        object.position.set(0, 0, -index * spacing);
        scene.add(object);
        index++;
    });

    // Set the body height so that native scrolling covers all sections
    document.body.style.height = (index * window.innerHeight) + 'px';

    // On scroll, update the camera's z position to simulate 3D scrolling
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        // For each viewport height scrolled, move the camera by "spacing" units in z
        camera.position.z = - (scrollY / window.innerHeight) * spacing;
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation loop to render the 3D scene
    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

// Add a dummy touch listener for mobile devices (unchanged)
document.addEventListener('touchstart', function() {}, true);
