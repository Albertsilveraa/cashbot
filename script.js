// Configuración de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Variables globales
let currentPDF = null;
let currentPage = 1;
let totalPages = 0;
let currentScale = 1.0;
const canvas = document.getElementById('pdf-canvas');
const ctx = canvas.getContext('2d');

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializePDFViewer();
    initializeAnimations();
    initializeCopyButtons();
    initializeStepAnimations();
    initializePhoneInteractions();
});

// ===== NAVEGACIÓN =====
function initializeNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Smooth scrolling para enlaces de navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Cerrar menú móvil si está abierto
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                }
            }
        });
    });

    // Cambiar estilo de navbar al hacer scroll
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ===== VIEWER DE PDF =====
function initializePDFViewer() {
    const pdfUpload = document.getElementById('pdf-upload');
    const pdfCanvas = document.getElementById('pdf-canvas');
    const pdfPlaceholder = document.getElementById('pdf-placeholder');
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomLevel = document.getElementById('zoom-level');

    // Subir PDF
    if (pdfUpload) {
        pdfUpload.addEventListener('change', handlePDFUpload);
    }

    // Navegación de páginas
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
                updatePageInfo();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPage();
                updatePageInfo();
            }
        });
    }

    // Controles de zoom
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            currentScale = Math.min(currentScale + 0.25, 3.0);
            renderCurrentPage();
            updateZoomLevel();
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            currentScale = Math.max(currentScale - 0.25, 0.5);
            renderCurrentPage();
            updateZoomLevel();
        });
    }

    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        if (currentPDF) {
            switch(e.key) {
                case 'ArrowLeft':
                    if (currentPage > 1) {
                        currentPage--;
                        renderCurrentPage();
                        updatePageInfo();
                    }
                    break;
                case 'ArrowRight':
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderCurrentPage();
                        updatePageInfo();
                    }
                    break;
                case '+':
                case '=':
                    currentScale = Math.min(currentScale + 0.25, 3.0);
                    renderCurrentPage();
                    updateZoomLevel();
                    break;
                case '-':
                    currentScale = Math.max(currentScale - 0.25, 0.5);
                    renderCurrentPage();
                    updateZoomLevel();
                    break;
            }
        }
    });
}

async function handlePDFUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        showNotification('Por favor selecciona un archivo PDF válido', 'error');
        return;
    }

    try {
        showLoading(true);
        
        const arrayBuffer = await file.arrayBuffer();
        currentPDF = await pdfjsLib.getDocument(arrayBuffer).promise;
        totalPages = currentPDF.numPages;
        currentPage = 1;
        currentScale = 1.0;

        // Mostrar controles y ocultar placeholder
        document.getElementById('pdf-placeholder').style.display = 'none';
        document.getElementById('pdf-nav').style.display = 'flex';
        document.getElementById('zoom-controls').style.display = 'flex';
        document.getElementById('pdf-canvas').style.display = 'block';

        // Renderizar primera página
        await renderCurrentPage();
        updatePageInfo();
        updateZoomLevel();

        showNotification('PDF cargado correctamente', 'success');
    } catch (error) {
        console.error('Error al cargar PDF:', error);
        showNotification('Error al cargar el PDF', 'error');
    } finally {
        showLoading(false);
    }
}

async function renderCurrentPage() {
    if (!currentPDF) return;

    try {
        const page = await currentPDF.getPage(currentPage);
        const viewport = page.getViewport({ scale: currentScale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };

        await page.render(renderContext).promise;
    } catch (error) {
        console.error('Error al renderizar página:', error);
        showNotification('Error al renderizar la página', 'error');
    }
}

function updatePageInfo() {
    const pageInfo = document.getElementById('page-info');
    if (pageInfo) {
        pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    }

    // Actualizar estado de botones
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.style.opacity = currentPage <= 1 ? '0.5' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.opacity = currentPage >= totalPages ? '0.5' : '1';
    }
}

function updateZoomLevel() {
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(currentScale * 100)}%`;
    }

    // Actualizar estado de botones de zoom
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    
    if (zoomInBtn) {
        zoomInBtn.disabled = currentScale >= 3.0;
        zoomInBtn.style.opacity = currentScale >= 3.0 ? '0.5' : '1';
    }
    
    if (zoomOutBtn) {
        zoomOutBtn.disabled = currentScale <= 0.5;
        zoomOutBtn.style.opacity = currentScale <= 0.5 ? '0.5' : '1';
    }
}

// Función para cargar PDFs de ejemplo
async function loadSamplePDF(sampleType) {
    try {
        showLoading(true);
        
        // Simular carga de PDF de ejemplo
        const sampleData = generateSamplePDFData(sampleType);
        
        // En una implementación real, aquí cargarías el PDF desde el servidor
        showNotification('Esta función cargaría un PDF de ejemplo', 'info');
        
    } catch (error) {
        console.error('Error al cargar PDF de ejemplo:', error);
        showNotification('Error al cargar el PDF de ejemplo', 'error');
    } finally {
        showLoading(false);
    }
}

function generateSamplePDFData(type) {
    // Datos de ejemplo para diferentes tipos de reportes
    const sampleData = {
        sample1: {
            date: '25/12/2024',
            balance: 'S/ 1,250.00',
            sales: 'S/ 1,580.00',
            expenses: 'S/ 330.00'
        },
        sample2: {
            date: '22/12 - 28/12/2024',
            balance: 'S/ 8,750.00',
            sales: 'S/ 11,200.00',
            expenses: 'S/ 2,450.00'
        }
    };
    
    return sampleData[type] || sampleData.sample1;
}

// ===== ANIMACIONES =====
function initializeAnimations() {
    // Intersection Observer para animaciones al scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observar elementos que deben animarse
    document.querySelectorAll('.feature-card, .step-item, .installation-steps').forEach(el => {
        observer.observe(el);
    });

    // Animación del chat en el hero
    setTimeout(() => {
        animateChatMessages();
    }, 1000);
}

function animateChatMessages() {
    const messages = document.querySelectorAll('.chat-messages .message');
    messages.forEach((message, index) => {
        setTimeout(() => {
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }, (index + 1) * 800);
    });
}

// ===== BOTONES DE COPIAR =====
function initializeCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            copyToClipboard(this);
        });
    });
}

function copyToClipboard(button) {
    const codeBlock = button.parentNode;
    const code = codeBlock.querySelector('code');
    
    if (code) {
        const text = code.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            // Feedback visual
            const originalIcon = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.style.background = 'rgba(16, 185, 129, 0.2)';
            
            setTimeout(() => {
                button.innerHTML = originalIcon;
                button.style.background = 'rgba(255, 255, 255, 0.1)';
            }, 2000);
            
            showNotification('Código copiado al portapapeles', 'success');
        }).catch(err => {
            console.error('Error al copiar:', err);
            showNotification('Error al copiar el código', 'error');
        });
    }
}

// ===== UTILIDADES =====
function showLoading(show) {
    const loadingClass = 'loading';
    const pdfSection = document.querySelector('.pdf-viewer-container');
    
    if (show) {
        pdfSection.classList.add(loadingClass);
    } else {
        pdfSection.classList.remove(loadingClass);
    }
}

function showNotification(message, type = 'info') {
    // Crear o obtener el contenedor de notificaciones
    let container = document.querySelector('.notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notifications-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }

    // Crear la notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        background: ${getNotificationColor(type)};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        pointer-events: auto;
        max-width: 300px;
        font-size: 14px;
        font-weight: 500;
    `;
    notification.textContent = message;

    container.appendChild(notification);

    // Mostrar la notificación
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);

    // Ocultar y remover la notificación
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#6366f1'
    };
    return colors[type] || colors.info;
}

// ===== EFECTOS ADICIONALES =====

// Efecto parallax sutil en el hero
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    
    if (hero && scrolled < window.innerHeight) {
        const rate = scrolled * -0.5;
        hero.style.transform = `translateY(${rate}px)`;
    }
});

// Efecto de typing en el chat
function createTypingEffect() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        setTimeout(() => {
            typingIndicator.style.display = 'block';
        }, 3000);
        
        setTimeout(() => {
            typingIndicator.style.display = 'none';
        }, 5000);
    }
}

// CSS adicional para animaciones
const additionalStyles = `
    .message {
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.5s ease;
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease-out forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .typing-indicator {
        display: none;
        padding: 16px;
        align-items: center;
    }
    
    .typing-dots {
        display: flex;
        gap: 4px;
        padding: 8px 12px;
        background: #f3f4f6;
        border-radius: 16px;
    }
    
    .typing-dots span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #9ca3af;
        animation: typing 1.4s infinite ease-in-out;
    }
    
    .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typing {
        0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
    
    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    .loading {
        opacity: 0.6;
        pointer-events: none;
        position: relative;
    }
    
    .loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        margin: -20px 0 0 -20px;
        border: 4px solid #f3f4f6;
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s infinite linear;
    }
    
    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

// Inyectar estilos adicionales
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Phone mockup interactions
function playVoiceInPhone() {
    const playBtn = document.querySelector('.play-btn');
    const waveforms = document.querySelectorAll('.wave-bar');
    
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Animate waveforms
        waveforms.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.background = 'rgba(255, 255, 255, 1)';
                bar.style.transform = 'scaleY(1.5)';
                
                setTimeout(() => {
                    bar.style.background = 'rgba(255, 255, 255, 0.7)';
                    bar.style.transform = 'scaleY(1)';
                }, 300);
            }, index * 100);
        });
        
        // Reset after animation
        setTimeout(() => {
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        }, 2000);
    }
}

function togglePhoneVoice() {
    const voiceBtn = document.querySelector('.voice-btn.recording');
    const typingIndicator = document.getElementById('typing-indicator');
    
    if (voiceBtn && typingIndicator) {
        voiceBtn.classList.toggle('recording');
        
        if (voiceBtn.classList.contains('recording')) {
            voiceBtn.style.background = '#ef4444';
            voiceBtn.style.animation = 'pulse 1s infinite';
            
            // Show typing indicator after 2 seconds
            setTimeout(() => {
                typingIndicator.style.display = 'flex';
                voiceBtn.style.background = 'var(--primary-color)';
                voiceBtn.style.animation = 'none';
                
                // Hide typing indicator after 3 seconds
                setTimeout(() => {
                    typingIndicator.style.display = 'none';
                }, 3000);
            }, 2000);
        }
    }
}

function sendPhoneMessage() {
    const input = document.getElementById('phone-input');
    const chatMessages = document.getElementById('phone-chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');
    
    if (input && input.value.trim() && chatMessages) {
        const message = input.value.trim();
        
        // Add user message
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `
            <div class="message-content">
                <div class="message-bubble">
                    ${message}
                </div>
                <div class="message-time">9:19 AM</div>
            </div>
        `;
        
        chatMessages.appendChild(userMessage);
        
        // Clear input
        input.value = '';
        
        // Show typing indicator
        typingIndicator.style.display = 'flex';
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Add bot response after delay
        setTimeout(() => {
            typingIndicator.style.display = 'none';
            
            const botMessage = document.createElement('div');
            botMessage.className = 'message bot-message';
            botMessage.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        ¡Perfecto! He registrado tu mensaje. ¿En qué más puedo ayudarte? 😊
                    </div>
                    <div class="message-time">9:19 AM ✓✓</div>
                </div>
            `;
            
            chatMessages.appendChild(botMessage);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 2000);
    }
}

// Demo form handling
function handleDemoRequest(event) {
    event.preventDefault();
    
    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.disabled = true;
    
    // Simulate form submission
    setTimeout(() => {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Solicitud Enviada!';
        submitBtn.style.background = '#10b981';
        
        // Show success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
            <div style="
                background: #10b981; 
                color: white; 
                padding: 16px; 
                border-radius: 8px; 
                margin-top: 16px;
                text-align: center;
            ">
                ✅ ¡Perfecto! Te contactaremos muy pronto para configurar tu Inti Bot.
            </div>
        `;
        
        form.appendChild(successMessage);
        
        // Reset form after 3 seconds
        setTimeout(() => {
            form.reset();
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            submitBtn.style.background = '';
            successMessage.remove();
        }, 3000);
    }, 1500);
}

// ===== ENHANCED STEP ANIMATIONS =====
function initializeStepAnimations() {
    const steps = document.querySelectorAll('.step');
    
    // Intersection Observer for step animations
    const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                // Add progressive delay for visual effect
                const stepNumber = Array.from(steps).indexOf(entry.target);
                entry.target.style.animationDelay = `${stepNumber * 0.2}s`;
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '-50px'
    });
    
    steps.forEach(step => {
        stepObserver.observe(step);
        
        // Add hover effects for step cards
        const stepContent = step.querySelector('.step-content');
        const stepNumber = step.querySelector('.step-number');
        const stepVisual = step.querySelector('.step-visual');
        
        if (stepContent) {
            stepContent.addEventListener('mouseenter', () => {
                step.classList.add('step-hover');
                addRippleEffect(stepContent);
            });
            
            stepContent.addEventListener('mouseleave', () => {
                step.classList.remove('step-hover');
            });
        }
        
        // Add click interaction for step numbers
        if (stepNumber) {
            stepNumber.addEventListener('click', () => {
                createFloatingIcon(stepNumber);
            });
        }
    });
    
    // Animate usage examples
    const exampleCards = document.querySelectorAll('.example-card');
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = `${Array.from(exampleCards).indexOf(entry.target) * 0.1}s`;
                entry.target.classList.add('fade-in-up');
            }
        });
    }, { threshold: 0.3 });
    
    exampleCards.forEach(card => cardObserver.observe(card));
}

// ===== ENHANCED PHONE INTERACTIONS =====
function initializePhoneInteractions() {
    const phoneFrame = document.querySelector('.phone-frame');
    const chatMessages = document.querySelector('#phone-chat-messages');
    const phoneInput = document.querySelector('#phone-input');
    
    if (!phoneFrame) return;
    
    // Add tilt effect on phone hover
    phoneFrame.addEventListener('mousemove', (e) => {
        const rect = phoneFrame.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const deltaX = (e.clientX - centerX) / (rect.width / 2);
        const deltaY = (e.clientY - centerY) / (rect.height / 2);
        
        const tiltX = deltaY * 5; // max 5 degrees
        const tiltY = deltaX * -5; // max 5 degrees
        
        phoneFrame.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
    });
    
    phoneFrame.addEventListener('mouseleave', () => {
        phoneFrame.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    });
    
    // Enhanced phone input interaction
    if (phoneInput) {
        phoneInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && phoneInput.value.trim()) {
                sendPhoneMessage();
            }
        });
    }
    
    // Add pulse effect to voice button
    const voiceBtn = document.querySelector('.voice-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            voiceBtn.classList.add('pulse-effect');
            setTimeout(() => {
                voiceBtn.classList.remove('pulse-effect');
            }, 1000);
        });
    }
}

// ===== UTILITY FUNCTIONS =====
function addRippleEffect(element) {
    const ripple = document.createElement('div');
    ripple.className = 'ripple-effect';
    ripple.style.position = 'absolute';
    ripple.style.borderRadius = '50%';
    ripple.style.background = 'rgba(99, 102, 241, 0.3)';
    ripple.style.transform = 'scale(0)';
    ripple.style.animation = 'ripple 0.6s linear';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    ripple.style.width = '20px';
    ripple.style.height = '20px';
    ripple.style.marginLeft = '-10px';
    ripple.style.marginTop = '-10px';
    ripple.style.pointerEvents = 'none';
    
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

function createFloatingIcon(element) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-check floating-check';
    icon.style.position = 'absolute';
    icon.style.color = 'var(--secondary-color)';
    icon.style.fontSize = '1.2rem';
    icon.style.pointerEvents = 'none';
    icon.style.animation = 'float-up 1s ease-out forwards';
    icon.style.left = '50%';
    icon.style.top = '50%';
    icon.style.transform = 'translate(-50%, -50%)';
    
    element.appendChild(icon);
    
    setTimeout(() => {
        icon.remove();
    }, 1000);
}

// Add dynamic CSS animations
function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        @keyframes float-up {
            0% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -150%) scale(1.5);
            }
        }
        
        .fade-in-up {
            animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .pulse-effect {
            animation: pulseGlow 1s ease-out;
        }
        
        @keyframes pulseGlow {
            0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
            100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        
        .step-hover .step-number {
            animation: bounce 0.6s ease;
        }
        
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        .phone-frame {
            transition: transform 0.3s ease;
        }
    `;
    
    document.head.appendChild(style);
}

// Inicializar efectos adicionales
document.addEventListener('DOMContentLoaded', () => {
    createTypingEffect();
    addDynamicStyles();
    
    // Allow Enter key in phone input
    const phoneInput = document.getElementById('phone-input');
    if (phoneInput) {
        phoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendPhoneMessage();
            }
        });
    }
});

// ===== FUNCIONES PARA LA SECCIÓN DE REPORTES =====

// Función para descargar el PDF de ejemplo
function downloadSamplePDF() {
    // Crear un enlace para descargar el archivo PDF de ejemplo
    const link = document.createElement('a');
    link.href = 'cierre_1_27-06-2025_17-52.pdf';
    link.download = 'Ejemplo_Cierre_Caja_Inti_Cash_Bot.pdf';
    
    // Simular click para descargar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Mostrar notificación
    showNotification('Descargando PDF de ejemplo...', 'success');
}

// Función para compartir el PDF de ejemplo
function shareSamplePDF() {
    if (navigator.share) {
        // API de compartir nativa del navegador
        navigator.share({
            title: 'Reporte de Cierre de Caja - Inti Cash Bot',
            text: 'Mira este ejemplo de reporte automático generado por Inti Cash Bot',
            url: window.location.origin + '/cierre_1_27-06-2025_17-52.pdf'
        }).then(() => {
            showNotification('PDF compartido exitosamente', 'success');
        }).catch((error) => {
            console.log('Error al compartir:', error);
            // Fallback: copiar enlace al portapapeles
            copyPDFLinkToClipboard();
        });
    } else {
        // Fallback: copiar enlace al portapapeles
        copyPDFLinkToClipboard();
    }
}

// Función fallback para copiar enlace del PDF
function copyPDFLinkToClipboard() {
    const url = window.location.origin + '/cierre_1_27-06-2025_17-52.pdf';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            showNotification('Enlace del PDF copiado al portapapeles', 'success');
        }).catch(() => {
            showNotification('No se pudo copiar el enlace', 'error');
        });
    } else {
        // Fallback más antiguo
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Enlace del PDF copiado al portapapeles', 'success');
        } catch (err) {
            showNotification('No se pudo copiar el enlace', 'error');
        }
        
        document.body.removeChild(textArea);
    }
}

// Función para imprimir el PDF de ejemplo
function printSamplePDF() {
    // Abrir el PDF en una nueva ventana para impresión
    const pdfWindow = window.open('cierre_1_27-06-2025_17-52.pdf', '_blank');
    
    if (pdfWindow) {
        pdfWindow.onload = function() {
            pdfWindow.print();
        };
        showNotification('Abriendo PDF para imprimir...', 'info');
    } else {
        showNotification('No se pudo abrir el PDF. Verifica que no estén bloqueadas las ventanas emergentes.', 'error');
    }
}

// Función para mostrar la previsualización del PDF
function previewPDF() {
    // Scroll suave hacia la sección de reportes
    const reportsSection = document.getElementById('reportes');
    if (reportsSection) {
        reportsSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Agregar un efecto visual temporal al documento PDF
        setTimeout(() => {
            const pdfDocument = document.querySelector('.pdf-document');
            if (pdfDocument) {
                pdfDocument.style.animation = 'pulse 1s ease-in-out';
                setTimeout(() => {
                    pdfDocument.style.animation = '';
                }, 1000);
            }
        }, 1000);
    }
} 