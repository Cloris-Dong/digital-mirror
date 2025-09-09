// The Digital Mirror - Interactive Web Art Piece

class DigitalMirror {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.canvas = document.getElementById('distortion-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('overlay');
        this.systemStatus = document.getElementById('system-status');
        this.humanityLevel = document.getElementById('humanity-level');
        this.instructions = document.getElementById('instructions');
        this.verdictOverlay = document.getElementById('verdict-overlay');
        this.verdictText = document.getElementById('verdict-text');
        this.resetButton = document.getElementById('reset-button');
        this.errorMessage = document.getElementById('error-message');
        this.retryButton = document.getElementById('retry-button');
        
        this.distortionLevel = 0;
        this.maxDistortionLevel = 5;
        this.humanityPercentage = 100;
        this.isListening = false;
        this.recognition = null;
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupWebcam();
            this.setupSpeechRecognition();
            this.setupEventListeners();
            this.startDistortionLoop();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError();
        }
    }
    
    async setupWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } 
            });
            
            this.webcam.srcObject = stream;
            this.webcam.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.webcam.videoWidth;
                this.canvas.height = this.webcam.videoHeight;
            });
            
            return new Promise((resolve) => {
                this.webcam.addEventListener('canplay', resolve);
            });
        } catch (error) {
            console.error('Webcam access denied:', error);
            throw error;
        }
    }
    
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatus('LISTENING...', '#ffff00');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
                if (transcript.includes('i am human')) {
                    this.processHumanClaim();
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateStatus('SYSTEM ERROR', '#ff0000');
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.updateStatus('SYSTEM READY', '#00ff00');
                // Restart recognition after a short delay
                setTimeout(() => {
                    if (!this.isListening) {
                        this.recognition.start();
                    }
                }, 1000);
            };
            
            // Start listening
            this.recognition.start();
        } else {
            console.warn('Speech recognition not supported');
            this.updateStatus('SPEECH NOT SUPPORTED', '#ff0000');
        }
    }
    
    setupEventListeners() {
        this.resetButton.addEventListener('click', () => {
            this.resetMirror();
        });
        
        this.retryButton.addEventListener('click', () => {
            this.retryWebcam();
        });
        
        // Manual trigger for testing (click on mirror)
        this.webcam.addEventListener('click', () => {
            this.processHumanClaim();
        });
    }
    
    processHumanClaim() {
        if (this.distortionLevel >= this.maxDistortionLevel) {
            return; // Already at maximum distortion
        }
        
        this.distortionLevel++;
        this.humanityPercentage = Math.max(0, 100 - (this.distortionLevel * 20));
        
        this.updateDistortion();
        this.updateStatus('ANALYZING...', '#ffff00');
        
        // Add glitch effect
        this.addGlitchEffect();
        
        if (this.distortionLevel >= this.maxDistortionLevel) {
            setTimeout(() => {
                this.showVerdict();
            }, 2000);
        } else {
            setTimeout(() => {
                this.updateStatus('SYSTEM READY', '#00ff00');
            }, 1500);
        }
    }
    
    updateDistortion() {
        // Remove previous distortion classes from video element only
        this.webcam.className = '';
        
        // Apply new distortion level to video element
        if (this.distortionLevel > 0) {
            this.webcam.classList.add(`distortion-${this.distortionLevel}`);
        }
        
        // Update humanity level display
        this.humanityLevel.textContent = `HUMANITY: ${this.humanityPercentage}%`;
        
        // Update instructions
        if (this.distortionLevel < this.maxDistortionLevel) {
            this.instructions.innerHTML = `
                <p>Distortion Level: ${this.distortionLevel}/${this.maxDistortionLevel}</p>
                <p class="command">"I am human"</p>
            `;
        } else {
            this.instructions.style.display = 'none';
        }
    }
    
    addGlitchEffect() {
        const glitchDuration = 500;
        const startTime = Date.now();
        
        const glitch = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / glitchDuration;
            
            if (progress < 1) {
                // Random glitch effects
                const randomOffset = (Math.random() - 0.5) * 4;
                this.webcam.style.transform = `translate(${randomOffset}px, ${randomOffset}px)`;
                this.webcam.style.filter += ` hue-rotate(${Math.random() * 360}deg)`;
                
                requestAnimationFrame(glitch);
            } else {
                // Reset transform
                this.webcam.style.transform = '';
            }
        };
        
        glitch();
    }
    
    updateStatus(text, color) {
        const statusText = this.systemStatus.querySelector('.status-text');
        statusText.textContent = text;
        statusText.style.color = color;
    }
    
    showVerdict() {
        this.verdictOverlay.style.display = 'flex';
        this.overlay.style.display = 'none';
        
        // Add final distortion
        this.webcam.classList.add('distortion-5');
        
        // Animate verdict text
        setTimeout(() => {
            this.verdictText.style.animation = 'glitch 0.3s infinite';
        }, 500);
    }
    
    resetMirror() {
        this.distortionLevel = 0;
        this.humanityPercentage = 100;
        
        // Reset video element visual state completely
        this.webcam.className = '';
        this.webcam.style.transform = '';
        this.webcam.style.filter = '';
        this.webcam.style.opacity = '';
        this.webcam.style.clipPath = '';
        
        // Reset UI
        this.verdictOverlay.style.display = 'none';
        this.overlay.style.display = 'block';
        this.instructions.style.display = 'block';
        this.instructions.innerHTML = `
            <p>Look into the mirror and say:</p>
            <p class="command">"I am human"</p>
        `;
        
        this.updateStatus('SYSTEM READY', '#00ff00');
        this.humanityLevel.textContent = 'HUMANITY: 100%';
        
        // Restart speech recognition
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
    }
    
    showError() {
        this.errorMessage.style.display = 'block';
        this.overlay.style.display = 'none';
    }
    
    async retryWebcam() {
        this.errorMessage.style.display = 'none';
        try {
            await this.setupWebcam();
            this.overlay.style.display = 'block';
        } catch (error) {
            this.showError();
        }
    }
    
    startDistortionLoop() {
        // Continuous subtle distortion effects
        const animate = () => {
            if (this.distortionLevel > 0) {
                // Add subtle random noise
                const noise = Math.random() * 0.1;
                this.canvas.style.opacity = noise;
            }
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize the Digital Mirror when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DigitalMirror();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause when tab is not visible
        if (window.digitalMirror && window.digitalMirror.recognition) {
            window.digitalMirror.recognition.stop();
        }
    } else {
        // Resume when tab becomes visible
        if (window.digitalMirror && window.digitalMirror.recognition && !window.digitalMirror.isListening) {
            window.digitalMirror.recognition.start();
        }
    }
});
