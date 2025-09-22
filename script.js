// The Digital Mirror - Interactive Web Art Piece with Volume-Based Speech Detection

class DigitalMirror {
    constructor() {
        this.webcam = document.getElementById('webcam');
        this.canvas = document.getElementById('distortion-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.overlay = document.getElementById('overlay');
        this.humanityLevel = document.getElementById('humanity-level');
        this.cleanInstruction = document.getElementById('clean-instruction');
        this.listeningIndicator = document.getElementById('listening-indicator');
        this.verdictOverlay = document.getElementById('verdict-overlay');
        this.verdictText = document.getElementById('verdict-text');
        this.resetButton = document.getElementById('reset-button');
        this.errorMessage = document.getElementById('error-message');
        this.retryButton = document.getElementById('retry-button');
        
        this.distortionLevel = 0;
        this.maxDistortionLevel = 5;
        this.humanityPercentage = 100;
        this.isListening = false;
        this.fallbackActive = false;
        
        // Audio analysis properties
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.volumeThreshold = 25; // Adjust this value for sensitivity
        this.cooldownTime = 2000; // 2 seconds between triggers
        this.lastTriggerTime = 0;
        this.animationId = null;
        this.isProcessing = false;
        
        // Speech recognition retry properties
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000; // 2 seconds between retries
        
        this.init();
    }
    
    async init() {
        try {
            await this.setupWebcam();
            await this.setupAudioDetection();
            this.setupEventListeners();
            this.setupFallbackControls();
            this.startDistortionLoop();
        } catch (error) {
            console.error('Initialization failed:', error);
            this.showError();
        }
    }
    
    async setupWebcam() {
        try {
            // Request both video and audio permissions
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: true // Request microphone access
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
            console.error('Media access denied:', error);
            this.handleMediaError(error);
            throw error;
        }
    }
    
    handleMediaError(error) {
        let errorMessage = '';
        switch (error.name) {
            case 'NotAllowedError':
                errorMessage = 'Camera and microphone access denied. Please allow permissions and refresh the page.';
                break;
            case 'NotFoundError':
                errorMessage = 'No camera or microphone found. Please connect a device and refresh.';
                break;
            case 'NotReadableError':
                errorMessage = 'Camera or microphone is being used by another application.';
                break;
            case 'OverconstrainedError':
                errorMessage = 'Camera or microphone constraints cannot be satisfied.';
                break;
            default:
                errorMessage = 'Unable to access camera or microphone. Please check your device settings.';
        }
        
        this.showError(errorMessage);
    }
    
    async setupAudioDetection() {
        try {
            this.showListeningIndicator('Initializing...');
            
            // Try Web Speech API first
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                await this.setupSpeechRecognition();
            } else {
                throw new Error('Speech recognition not supported');
            }
            
        } catch (error) {
            console.error('Speech recognition setup failed:', error);
            this.fallbackToAlternativeMethods();
        }
    }
    
    async setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        
        // Handle results
        this.recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.toLowerCase().trim();
            
            console.log('Speech detected:', transcript);
            
            // Check for "I am human" variations
            if (this.detectHumanPhrase(transcript)) {
                console.log('Human phrase detected!');
                this.processHumanClaim();
            }
        };
        
        // Handle errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.handleSpeechError(event.error);
        };
        
        // Handle start
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.showListeningIndicator('Listening...');
        };
        
        // Handle end
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            if (this.isListening) {
                // Restart recognition if we're still supposed to be listening
                setTimeout(() => {
                    if (this.isListening && this.recognition) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            console.error('Failed to restart recognition:', error);
                            this.handleSpeechError('restart-failed');
                        }
                    }
                }, 500); // Slightly longer delay
            }
        };
        
        // Start recognition
        try {
            this.recognition.start();
            this.isListening = true;
            console.log('Speech recognition initialization complete');
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.handleSpeechError('start-failed');
        }
    }
    
    detectHumanPhrase(transcript) {
        // Check for various forms of "I am human"
        const humanPhrases = [
            'i am human',
            'i am a human',
            'i am the human',
            'i am human being',
            'i am a human being',
            'i am the human being',
            'i am human person',
            'i am a human person',
            'i am the human person'
        ];
        
        return humanPhrases.some(phrase => transcript.includes(phrase));
    }
    
    handleSpeechError(error) {
        let errorMessage = '';
        let shouldRestart = false;
        
        switch (error) {
            case 'aborted':
                errorMessage = 'Speech recognition aborted. Restarting...';
                shouldRestart = true;
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Continuing to listen...';
                shouldRestart = true;
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not accessible. Please check permissions.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow access.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed.';
                break;
            default:
                errorMessage = `Speech recognition error: ${error}`;
                shouldRestart = true;
        }
        
        console.error('Speech recognition error:', errorMessage);
        
        if (shouldRestart && this.isListening) {
            this.retryCount++;
            if (this.retryCount <= this.maxRetries) {
                this.showListeningIndicator(`Restarting... (${this.retryCount}/${this.maxRetries})`);
                // Restart recognition after a delay
                setTimeout(() => {
                    if (this.isListening && this.recognition) {
                        try {
                            this.recognition.start();
                            this.showListeningIndicator('Listening...');
                            console.log(`Speech recognition restarted (attempt ${this.retryCount})`);
                        } catch (restartError) {
                            console.error('Failed to restart speech recognition:', restartError);
                            this.handleSpeechError('restart-failed');
                        }
                    }
                }, this.retryDelay);
            } else {
                console.error('Max retries reached, falling back to alternative methods');
                this.fallbackToAlternativeMethods();
            }
        } else {
            this.showListeningIndicator('Error: ' + errorMessage);
            // Fall back to alternative methods for serious errors
            setTimeout(() => {
                this.fallbackToAlternativeMethods();
            }, 2000);
        }
    }
    
    stopListening() {
        this.isListening = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    showListeningIndicator(text) {
        if (this.listeningIndicator) {
            this.listeningIndicator.textContent = text;
            this.listeningIndicator.style.display = text ? 'block' : 'none';
        }
    }
    
    fallbackToAlternativeMethods() {
        console.log('Falling back to alternative input methods');
        this.fallbackActive = true;
        this.isListening = false;
        this.retryCount = 0; // Reset retry counter
        this.showListeningIndicator('Fallback Mode');
        
        // Enable fallback controls
        this.enableFallbackControls();
        
        // Add a test button for debugging
        this.addTestButton();
    }
    
    addTestButton() {
        const testButton = document.createElement('button');
        testButton.textContent = 'TEST DISTORTION';
        testButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6600;
            color: #000;
            border: 2px solid #ff6600;
            padding: 10px 15px;
            font-family: 'Courier New', monospace;
            cursor: pointer;
            z-index: 1000;
        `;
        testButton.onclick = () => {
            console.log('Test button clicked - triggering distortion');
            this.processHumanClaim();
        };
        document.body.appendChild(testButton);
    }
    
    enableFallbackControls() {
        // Add keyboard listener
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space' || event.key.toLowerCase() === 'h') {
                event.preventDefault();
                this.processHumanClaim();
            }
        });
        
        // Add click listener to video
        this.webcam.addEventListener('click', () => {
            this.processHumanClaim();
        });
    }
    
    setupEventListeners() {
        this.resetButton.addEventListener('click', () => {
            this.resetMirror();
        });
        
        this.retryButton.addEventListener('click', () => {
            this.retryWebcam();
        });
    }
    
    setupFallbackControls() {
        // This will be called if audio detection fails
        // Controls are enabled in fallbackToAlternativeMethods()
    }
    
    processHumanClaim() {
        if (this.distortionLevel >= this.maxDistortionLevel) {
            return; // Already at maximum distortion
        }
        
        this.distortionLevel++;
        this.humanityPercentage = Math.max(0, 100 - (this.distortionLevel * 20));
        
        this.updateDistortion();
        this.showListeningIndicator('Processing...');
        
        // Add glitch effect
        this.addGlitchEffect();
        
        if (this.distortionLevel >= this.maxDistortionLevel) {
            setTimeout(() => {
                this.showVerdict();
            }, 2000);
        } else {
            setTimeout(() => {
                if (this.recognition) {
                    this.showListeningIndicator('Listening...');
                } else {
                    this.showListeningIndicator('Fallback Mode');
                }
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
        this.humanityLevel.textContent = `POTENTIAL HUMANITY: ${this.humanityPercentage}%`;
        
        // Update instruction visibility
        if (this.distortionLevel >= this.maxDistortionLevel) {
            this.cleanInstruction.style.display = 'none';
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
    
    
    showVerdict() {
        this.verdictOverlay.style.display = 'flex';
        this.overlay.style.display = 'none';
        
        // Add final distortion
        this.webcam.classList.add('distortion-5');
        
        // Stop listening
        this.stopListening();
        
        // Animate verdict text
        setTimeout(() => {
            this.verdictText.style.animation = 'glitch 0.3s infinite';
        }, 500);
    }
    
    resetMirror() {
        this.distortionLevel = 0;
        this.humanityPercentage = 100;
        this.lastTriggerTime = 0;
        this.isProcessing = false;
        
        // Reset video element visual state completely
        this.webcam.className = '';
        this.webcam.style.transform = '';
        this.webcam.style.filter = '';
        this.webcam.style.opacity = '';
        this.webcam.style.clipPath = '';
        
        // Reset UI
        this.verdictOverlay.style.display = 'none';
        this.overlay.style.display = 'block';
        this.cleanInstruction.style.display = 'block';
        
        // Restart speech recognition if available
        if (this.recognition) {
            this.retryCount = 0; // Reset retry counter
            this.recognition.start();
            this.isListening = true;
            this.showListeningIndicator('Listening...');
        } else if (this.fallbackActive) {
            this.showListeningIndicator('Fallback Mode');
        } else {
            this.showListeningIndicator('');
        }
        
        this.humanityLevel.textContent = 'POTENTIAL HUMANITY: 100%';
    }
    
    showError(customMessage = null) {
        if (customMessage) {
            this.errorMessage.querySelector('p').textContent = customMessage;
        }
        this.errorMessage.style.display = 'block';
        this.overlay.style.display = 'none';
    }
    
    async retryWebcam() {
        this.errorMessage.style.display = 'none';
        try {
            await this.setupWebcam();
            this.overlay.style.display = 'block';
            // Retry audio detection
            await this.setupAudioDetection();
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
    
    // Cleanup method
    cleanup() {
        this.stopListening();
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        if (this.webcam && this.webcam.srcObject) {
            const tracks = this.webcam.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
    }
}

// Initialize the Digital Mirror when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.digitalMirror = new DigitalMirror();
});

// Handle page visibility changes - keep listening for speech
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.digitalMirror) {
        // Resume speech recognition when tab becomes visible
        if (window.digitalMirror.recognition && window.digitalMirror.isListening) {
            window.digitalMirror.recognition.start();
        }
    }
});

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
    if (window.digitalMirror) {
        window.digitalMirror.cleanup();
    }
});