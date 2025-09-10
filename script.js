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
        this.speechFeedback = document.getElementById('speech-feedback');
        this.detectedText = document.getElementById('detected-text');
        
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
    
    setupSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            // Enhanced speech recognition settings
            this.recognition.continuous = true;
            this.recognition.interimResults = true; // Enable interim results for better feedback
            this.recognition.lang = 'en-US';
            this.recognition.maxAlternatives = 5; // Get more alternatives
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatus('LISTENING...', '#ffff00');
                this.updateInstructions('Speak clearly: "I am human"');
                console.log('🎤 Speech recognition started');
            };
            
            this.recognition.onresult = (event) => {
                console.log('🎤 Speech recognition result event:', event);
                
                // Process all results
                for (let i = 0; i < event.results.length; i++) {
                    const result = event.results[i];
                    const isFinal = result.isFinal;
                    
                    console.log(`🎤 Result ${i} (${isFinal ? 'FINAL' : 'INTERIM'}):`, result);
                    
                    // Check all alternatives for this result
                    for (let j = 0; j < result.length; j++) {
                        const alternative = result[j];
                        const transcript = alternative.transcript.toLowerCase().trim();
                        const confidence = alternative.confidence || 'N/A';
                        
                        console.log(`🎤 Alternative ${j}: "${transcript}" (confidence: ${confidence})`);
                        
                        // Show visual feedback of what's being detected
                        this.showSpeechFeedback(transcript, confidence, isFinal);
                        
                        // Check for phrase match
                        if (this.checkPhraseMatch(transcript)) {
                            console.log('✅ PHRASE MATCHED! Processing human claim...');
                            this.processHumanClaim();
                            return; // Exit early on match
                        }
                    }
                }
                
                // If we get here, no phrase was matched
                if (event.results.length > 0) {
                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult.isFinal) {
                        console.log('❌ No matching phrase detected in final result');
                        this.showSpeechFeedback('No match detected', 'N/A', true);
                    }
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('🎤 Speech recognition error:', event.error);
                this.handleSpeechError(event.error);
            };
            
            this.recognition.onend = () => {
                console.log('🎤 Speech recognition ended');
                this.isListening = false;
                this.updateStatus('SYSTEM READY', '#00ff00');
                this.updateInstructions('Speak clearly: "I am human"');
                
                // Restart recognition after a short delay
                setTimeout(() => {
                    if (!this.isListening && this.distortionLevel < this.maxDistortionLevel) {
                        try {
                            console.log('🎤 Restarting speech recognition...');
                            this.recognition.start();
                        } catch (error) {
                            console.error('Failed to restart speech recognition:', error);
                        }
                    }
                }, 1000);
            };
            
            // Start listening
            try {
                console.log('🎤 Starting speech recognition...');
                this.recognition.start();
            } catch (error) {
                console.error('Failed to start speech recognition:', error);
                this.handleSpeechError('startup');
            }
        } else {
            console.warn('Speech recognition not supported');
            this.updateStatus('SPEECH NOT SUPPORTED', '#ff0000');
            this.updateInstructions('Speech recognition not available. Please use a modern browser.');
        }
    }
    
    handleSpeechError(error) {
        let errorMessage = '';
        switch (error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please speak louder.';
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not accessible. Please check permissions.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone permission denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'startup':
                errorMessage = 'Failed to start speech recognition. Please refresh the page.';
                break;
            default:
                errorMessage = 'Speech recognition error. Please try again.';
        }
        
        this.updateStatus('SPEECH ERROR', '#ff0000');
        this.updateInstructions(errorMessage);
        
        // Retry after error
        setTimeout(() => {
            if (this.recognition && this.distortionLevel < this.maxDistortionLevel) {
                try {
                    this.recognition.start();
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
            }
        }, 3000);
    }
    
    updateInstructions(message) {
        this.instructions.innerHTML = `
            <p>${message}</p>
            <p class="command">"I am human"</p>
        `;
    }
    
    checkPhraseMatch(transcript) {
        // Define all possible variations
        const phrases = [
            'i am human',
            'i\'m human',
            'i am a human',
            'i\'m a human',
            'i am the human',
            'i\'m the human',
            'i am human being',
            'i\'m human being',
            'i am a human being',
            'i\'m a human being'
        ];
        
        // Check if transcript contains any of our phrases
        for (const phrase of phrases) {
            if (transcript.includes(phrase)) {
                console.log(`✅ Matched phrase: "${phrase}" in transcript: "${transcript}"`);
                return true;
            }
        }
        
        return false;
    }
    
    showSpeechFeedback(transcript, confidence, isFinal) {
        // Update the visual feedback element
        const status = isFinal ? 'FINAL' : 'INTERIM';
        const confidenceText = confidence !== 'N/A' ? ` (${Math.round(confidence * 100)}%)` : '';
        
        this.detectedText.textContent = `"${transcript}"${confidenceText} [${status}]`;
        this.detectedText.className = `detected-text ${isFinal ? 'final' : 'interim'}`;
        
        // Update the instructions to show what was detected
        this.updateInstructions(
            `Detected: "${transcript}"${confidenceText} [${status}]`
        );
        
        // Also update status with confidence
        if (isFinal) {
            this.updateStatus(`DETECTED: "${transcript}"`, '#ffff00');
        }
    }
    
    setupEventListeners() {
        this.resetButton.addEventListener('click', () => {
            this.resetMirror();
        });
        
        this.retryButton.addEventListener('click', () => {
            this.retryWebcam();
        });
        
        // No click handlers on video - audio only
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
            this.updateInstructions(`Distortion Level: ${this.distortionLevel}/${this.maxDistortionLevel}`);
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
        this.updateInstructions('Look into the mirror and say:');
        
        // Clear speech feedback
        this.detectedText.textContent = 'Listening...';
        this.detectedText.className = 'detected-text';
        
        this.updateStatus('SYSTEM READY', '#00ff00');
        this.humanityLevel.textContent = 'HUMANITY: 100%';
        
        // Restart speech recognition
        if (this.recognition && !this.isListening) {
            this.recognition.start();
        }
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

// Handle page visibility changes - keep listening for audio
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Resume speech recognition when tab becomes visible
        if (window.digitalMirror && window.digitalMirror.recognition && !window.digitalMirror.isListening) {
            try {
                window.digitalMirror.recognition.start();
            } catch (error) {
                console.error('Failed to restart speech recognition on visibility change:', error);
            }
        }
    }
});
