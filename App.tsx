import { useState, useEffect, useRef } from 'react';
import { Mic, Camera, Settings, Home, MessageCircle, Volume2, VolumeX, MicOff, Play, Pause, Menu, X } from 'lucide-react';

// Use environment variable for the API key
// It's crucial to prefix environment variables with REACT_APP_ in Create React App
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

type Page = 'home' | 'chat' | 'settings' | 'camera';
type CameraMode = 'user' | 'environment';

// TypeScript interfaces for Speech Recognition
interface SpeechRecognitionEvent {
    results: {
        [index: number]: {
            [index: number]: {
                transcript: string;
                confidence: number;
            };
        };
    };
}

interface SpeechRecognitionErrorEvent {
    error: string;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
    interface Window {
        SpeechRecognition: {
            new(): SpeechRecognition;
        };
        webkitSpeechRecognition: {
            new(): SpeechRecognition;
        };
    }
}

// Loading Screen Component
function LoadingScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [loadingText, setLoadingText] = useState("Initializing AKSHI...");

    useEffect(() => {
        const texts = [
            "Initializing AKSHI...",
            "Loading AI Vision Models...",
            "Preparing Camera Systems...",
            "Calibrating Audio Processing...",
            "Activating Neural Networks...",
            "Ready to See the World!"
        ];

        const interval = setInterval(() => {
            setProgress(prev => {
                const newProgress = prev + 2;
                const textIndex = Math.floor(newProgress / 17);
                if (textIndex < texts.length) {
                    setLoadingText(texts[textIndex]);
                }

                if (newProgress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => onComplete(), 800);
                    return 100;
                }
                return newProgress;
            });
        }, 50);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a23] via-[#1a1a3a] to-[#000000] flex items-center justify-center z-50">
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-20 animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 text-center max-w-md mx-auto px-6">
                {/* Logo */}
                <div className="mb-8">
                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/30">
                        <span className="text-4xl">👁️</span>
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        AKSHI
                    </h1>
                    <p className="text-gray-400 text-lg">Visual AI Assistant</p>
                </div>

                {/* Loading Text */}
                <div className="mb-8">
                    <p className="text-white text-lg font-medium mb-6 animate-pulse">
                        {loadingText}
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 mb-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out shadow-lg shadow-blue-500/50"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-gray-500 text-sm">{progress}%</p>

                {/* Floating elements */}
                <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-500 rounded-full opacity-10 blur-xl animate-bounce" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500 rounded-full opacity-10 blur-xl animate-bounce" style={{ animationDelay: '1s' }} />
            </div>
        </div>
    );
}

function App() {
    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Core states (keeping all original logic)
    const [isListening, setIsListening] = useState(false);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [assistantResponse, setAssistantResponse] = useState('');
    const [cameraMode, setCameraMode] = useState<CameraMode>('environment');
    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [speechEnabled, setSpeechEnabled] = useState(true);
    const [currentQuestion, setCurrentQuestion] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isVoicesLoaded, setIsVoicesLoaded] = useState(false);
    const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | null>(null);

    // Refs (keeping all original logic)
    const videoRef = useRef<HTMLVideoElement>(null);
    const recognitionRef = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check browser support (keeping original logic)
    const hasSpeechRecognition = !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasSpeechSynthesis = !!window.speechSynthesis;

    // ALL ORIGINAL FUNCTIONS KEPT EXACTLY THE SAME
    const captureImage = (): string | null => {
        if (!videoRef.current || !canvasRef.current) return null;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (video.readyState < 2 || video.videoWidth === 0) return null;

        const context = canvas.getContext('2d');
        if (!context) return null;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/jpeg', 0.8);
    };

    const analyzeImageWithOpenAI = async (imageDataUrl: string, question: string): Promise<string> => {
        if (!OPENAI_API_KEY) {
            throw new Error('OpenAI API key is not configured. Please check your environment variables.');
        }

        try {
            const requestBody = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `You are a visual assistant helping users understand what they see. Analyze this image and answer the question: "${question}"

Please provide a clear, detailed, and helpful response. Focus on:
- Being descriptive and specific about what you observe
- Answering the user's question directly
- Including relevant details about colors, objects, people, text, or scenes
- Keeping the response conversational and accessible
- If there's text in the image, read it accurately
- If asked about safety or navigation, provide practical guidance

Keep your response under 200 words but be thorough and helpful.`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageDataUrl,
                                    detail: "low"
                                },
                            },
                        ],
                    },
                ],
                max_tokens: 1024,
            };

            const response = await fetch(OPENAI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(`API request failed: ${response.status} - ${errorData?.error?.message || response.statusText}`);
            }

            const data = await response.json();

            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                return data.choices[0].message.content;
            } else {
                console.error('Unexpected API response:', data);
                throw new Error('Invalid response from AI service');
            }
        } catch (error) {
            console.error('OpenAI API Error:', error);
            throw error;
        }
    };

    const speak = (text: string, onEndCallback?: () => void) => {
        if (!speechEnabled || !hasSpeechSynthesis || !text.trim() || microphonePermission !== 'granted') {
            if (onEndCallback) {
                onEndCallback();
            }
            return;
        }

        stopSpeaking();

        if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
        }

        try {
            const attemptSpeak = () => {
                const voices = window.speechSynthesis.getVoices();

                if (voices.length === 0 && !isVoicesLoaded) {
                    speechTimeoutRef.current = setTimeout(attemptSpeak, 100);
                    return;
                }

                const utterance = new SpeechSynthesisUtterance(text.trim());
                utteranceRef.current = utterance;

                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                utterance.volume = 0.9;
                utterance.lang = 'en-US';

                if (voices.length > 0) {
                    const preferredVoice = voices.find(voice =>
                        voice.lang.startsWith('en') &&
                        (voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Natural'))
                    ) || voices.find(voice =>
                        voice.lang.startsWith('en') &&
                        voice.localService
                    ) || voices.find(voice => voice.lang.startsWith('en'));

                    if (preferredVoice) {
                        utterance.voice = preferredVoice;
                    }
                }

                utterance.onstart = () => {
                    console.log('Speech started');
                    setIsSpeaking(true);
                };

                utterance.onend = () => {
                    console.log('Speech ended');
                    setIsSpeaking(false);
                    utteranceRef.current = null;
                    if (onEndCallback) {
                        onEndCallback();
                    }
                };

                utterance.onerror = (event) => {
                    console.error('Speech synthesis error:', event.error, event);
                    setIsSpeaking(false);
                    utteranceRef.current = null;

                    if (!['interrupted', 'canceled'].includes(event.error)) {
                        console.warn('Speech synthesis failed, but continuing silently');
                    }
                    if (onEndCallback) {
                        onEndCallback();
                    }
                };

                window.speechSynthesis.speak(utterance);

                speechTimeoutRef.current = setTimeout(() => {
                    if (isSpeaking) {
                        console.warn('Speech timeout, resetting state');
                        setIsSpeaking(false);
                        utteranceRef.current = null;
                    }
                }, Math.max(text.length * 100, 5000));
            };

            attemptSpeak();

        } catch (error) {
            console.error('Error in speak function:', error);
            setIsSpeaking(false);
            utteranceRef.current = null;
            if (onEndCallback) {
                onEndCallback();
            }
        }
    };

    const stopSpeaking = () => {
        try {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
            }
            if (speechTimeoutRef.current) {
                clearTimeout(speechTimeoutRef.current);
            }
            setIsSpeaking(false);
            utteranceRef.current = null;
        } catch (error) {
            console.error('Error stopping speech:', error);
        }
    };

    const checkMicrophonePermission = async () => {
        try {
            const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setMicrophonePermission(result.state);
            result.onchange = () => {
                setMicrophonePermission(result.state);
            };
        } catch (error) {
            console.error('Error checking microphone permission:', error);
            setMicrophonePermission('denied');
        }
    };

    const processQuestion = async (question: string) => {
        if (!isCameraActive) {
            const message = 'Camera is not active. Please turn on the camera first.';
            setError(message);
            speak(message);
            setIsProcessing(false);
            return;
        }

        try {
            const imageDataUrl = captureImage();
            if (!imageDataUrl) {
                const message = 'Unable to capture image. Please ensure the camera is working.';
                setError(message);
                speak(message);
                setIsProcessing(false);
                return;
            }

            setCapturedImage(imageDataUrl);

            console.log('Analyzing image with question:', question);

            const response = await analyzeImageWithOpenAI(imageDataUrl, question);

            console.log('AI Response:', response);
            setAssistantResponse(response);
            setError(null);

            speak(response);
        } catch (error: any) {
            console.error('Error processing question:', error);
            const errorMessage = error.message || 'Sorry, I encountered an error analyzing the image. Please try again.';
            setError(errorMessage);
            setAssistantResponse(errorMessage);
            speak(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const startListening = () => {
        if (!hasSpeechRecognition) {
            const message = 'Speech recognition is not supported in this browser. Please try Chrome or Edge.';
            setError(message);
            speak(message);
            return;
        }

        if (microphonePermission !== 'granted') {
            const message = 'Microphone permission is required to ask questions. Please allow access.';
            setError(message);
            speak(message);
            return;
        }

        if (!isCameraActive) {
            const message = 'Please turn on the camera first.';
            setError(message);
            speak(message);
            return;
        }

        if (isListening || isProcessing) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsProcessing(false);
            return;
        }

        setIsProcessing(true);
        setCurrentQuestion('');
        setAssistantResponse('');
        setError(null);

        speak('I\'m listening. Please ask your question about what I see.', () => {
            if (recognitionRef.current && !isListening) {
                try {
                    recognitionRef.current.start();
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    const message = 'Unable to start voice recognition. Please try again.';
                    setError(message);
                    speak(message);
                    setIsProcessing(false);
                }
            }
        });
    };

    const toggleCamera = async () => {
        if (isCameraActive) {
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            setIsCameraActive(false);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setMediaStream(null);
            setCapturedImage(null);
            setError(null);
            speak("Camera stopped.");
        } else {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('Camera not supported in this browser');
                }

                const constraints = {
                    video: {
                        facingMode: cameraMode,
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 }
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                    };
                }

                setMediaStream(stream);
                setIsCameraActive(true);
                setError(null);
                speak("Camera started. You can now ask questions about what I see.");

                if (currentPage !== 'camera') {
                    setCurrentPage('camera');
                }
            } catch (error: any) {
                console.error('Camera error:', error);
                let errorMessage = 'Unable to access camera. ';

                if (error.name === 'NotAllowedError') {
                    errorMessage += 'Please allow camera permissions and try again.';
                } else if (error.name === 'NotFoundError') {
                    errorMessage += 'No camera found on this device.';
                } else if (error.name === 'NotReadableError') {
                    errorMessage += 'Camera is being used by another application.';
                } else {
                    errorMessage += 'Please check your camera settings and try again.';
                }

                setError(errorMessage);
                speak(errorMessage);
            }
        }
    };

    const switchCamera = async () => {
        const newMode = cameraMode === 'user' ? 'environment' : 'user';
        setCameraMode(newMode);

        if (isCameraActive && mediaStream) {
            try {
                mediaStream.getTracks().forEach(track => track.stop());

                const constraints = {
                    video: {
                        facingMode: newMode,
                        width: { ideal: 1280, min: 640 },
                        height: { ideal: 720, min: 480 }
                    },
                    audio: false
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                setMediaStream(stream);
                speak(`Switched to ${newMode === 'user' ? 'front' : 'back'} camera.`);

            } catch (error) {
                console.error('Error switching camera:', error);
                speak('Unable to switch camera. Please try again.');
                setCameraMode(cameraMode);
            }
        } else {
            speak(`Camera mode set to ${newMode === 'user' ? 'front' : 'back'} camera.`);
        }
    };

    // ALL ORIGINAL useEffect HOOKS KEPT THE SAME
    useEffect(() => {
        if (!hasSpeechRecognition) return;

        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            console.log('Speech recognition started');
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const result = event.results[0][0];
            const transcript = result.transcript.trim();
            const confidence = result.confidence;

            console.log('Recognized:', transcript, 'Confidence:', confidence);

            if (transcript && transcript.length > 2) {
                setCurrentQuestion(transcript);
                speak(`I heard: ${transcript}. Let me analyze what I can see.`, () => {
                    processQuestion(transcript);
                });
            } else {
                speak('I didn\'t catch that clearly. Please try asking your question again.');
                setIsProcessing(false);
            }
        };

        recognition.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
            if (!error && isCameraActive && microphonePermission === 'granted') {
                setTimeout(() => {
                    if (recognitionRef.current) {
                        try {
                            recognitionRef.current.start();
                        } catch (e) {
                            console.error('Error restarting recognition:', e);
                        }
                    }
                }, 500);
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);

            let errorMessage = '';
            let shouldSpeak = true;

            switch (event.error) {
                case 'not-allowed':
                case 'service-not-allowed':
                    errorMessage = 'Microphone access denied. Please allow microphone permissions and try again.';
                    setMicrophonePermission('denied');
                    break;
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try speaking more clearly.';
                    shouldSpeak = false;
                    break;
                case 'audio-capture':
                    errorMessage = 'No microphone found. Please check your microphone.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your internet connection.';
                    break;
                case 'aborted':
                    shouldSpeak = false;
                    break;
                default:
                    errorMessage = 'Speech recognition failed. Please try again.';
            }

            if (errorMessage) {
                setError(errorMessage);
                if (shouldSpeak) {
                    speak(errorMessage);
                }
            }
            setIsProcessing(false);
        };

        recognitionRef.current = recognition;
        checkMicrophonePermission();

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [isCameraActive, error, microphonePermission]);

    useEffect(() => {
        if (hasSpeechSynthesis) {
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                console.log('Available voices:', voices.length);
                if (voices.length > 0) {
                    setIsVoicesLoaded(true);
                }
            };

            loadVoices();

            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }

            setTimeout(loadVoices, 1000);
        }
    }, []);

    useEffect(() => {
        if (!speechEnabled) return;

        const announcements = {
            home: 'Home page. Turn on the camera and click Ask Question to get visual assistance.',
            chat: 'Features page showing visual assistance capabilities.',
            settings: 'Settings page for configuring audio and camera preferences.',
            camera: isCameraActive
                ? 'Camera page. Camera is active and ready for questions.'
                : 'Camera page. Click Start Camera to begin.'
        };

        const timer = setTimeout(() => {
            speak(announcements[currentPage]);
        }, 800);

        return () => clearTimeout(timer);
    }, [currentPage, speechEnabled, isCameraActive]);

    useEffect(() => {
        return () => {
            stopSpeaking();
            if (speechTimeoutRef.current) {
                clearTimeout(speechTimeoutRef.current);
            }
            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    // Loading completion handler
    const handleLoadingComplete = () => {
        setIsLoading(false);
    };

    if (isLoading) {
        return <LoadingScreen onComplete={handleLoadingComplete} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a23] via-[#1a1a3a] to-[#000000] text-white overflow-hidden">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-20 animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${3 + Math.random() * 2}s`
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 min-h-screen flex flex-col">
                {/* Modern Navigation */}
                <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-xl border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            {/* Logo */}
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <span className="text-xl font-bold">👁️</span>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                        AKSHI
                                    </h1>
                                    <p className="text-xs text-gray-400">Visual AI Assistant</p>
                                </div>
                            </div>

                            {/* Desktop Navigation */}
                            <div className="hidden md:flex items-center space-x-8">
                                {[
                                    { id: 'home', label: 'Home', icon: Home },
                                    { id: 'camera', label: 'Camera', icon: Camera },
                                    { id: 'chat', label: 'Features', icon: MessageCircle },
                                    { id: 'settings', label: 'Settings', icon: Settings }
                                ].map(({ id, label, icon: Icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => setCurrentPage(id as Page)}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 ${
                                            currentPage === id
                                                ? 'bg-blue-600/30 text-blue-400 shadow-lg shadow-blue-500/20'
                                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon size={18} />
                                        <span className="font-medium">{label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Menu Button */}
                            <button
                                className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>

                        {/* Mobile Menu */}
                        {isMobileMenuOpen && (
                            <div className="md:hidden mt-4 pb-4 border-t border-white/10 pt-4">
                                <div className="flex flex-col space-y-2">
                                    {[
                                        { id: 'home', label: 'Home', icon: Home },
                                        { id: 'camera', label: 'Camera', icon: Camera },
                                        { id: 'chat', label: 'Features', icon: MessageCircle },
                                        { id: 'settings', label: 'Settings', icon: Settings }
                                    ].map(({ id, label, icon: Icon }) => (
                                        <button
                                            key={id}
                                            onClick={() => {
                                                setCurrentPage(id as Page);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                                                currentPage === id
                                                    ? 'bg-blue-600/30 text-blue-400 shadow-lg shadow-blue-500/20'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </nav>

                {/* Error Display */}
                {error && (
                    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 mx-4 max-w-md">
                        <div className="bg-red-900/80 backdrop-blur-xl border border-red-500/30 rounded-2xl p-4 shadow-2xl shadow-red-500/20">
                            <p className="text-red-100 text-center font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Home Page */}
                {currentPage === 'home' && (
                    <main className="flex-1 flex flex-col items-center justify-center px-6 pt-24 pb-8">
                        <div className="max-w-4xl mx-auto text-center">
                            {/* Hero Section */}
                            <div className="mb-12">
                                <h1 className="text-5xl md:text-7xl font-bold mb-6">
                                    <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600 bg-clip-text text-transparent">
                                        What Can I Help You
                                    </span>
                                    <br />
                                    <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                                        See Today?
                                    </span>
                                </h1>
                                <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                                    Advanced AI-powered visual assistance for accessibility and understanding
                                </p>
                            </div>

                            {/* Current Question Display */}
                            {currentQuestion && (
                                <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-6 mb-8 shadow-2xl shadow-yellow-500/10">
                                    <div className="flex items-center justify-center space-x-2 mb-2">
                                        <Mic className="text-yellow-400" size={20} />
                                        <h3 className="text-yellow-300 font-semibold">Your Question</h3>
                                    </div>
                                    <p className="text-white text-lg">"{currentQuestion}"</p>
                                </div>
                            )}

                            {/* AI Response Display */}
                            {assistantResponse && (
                                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 mb-8 text-left shadow-2xl shadow-blue-500/10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                                <span className="text-sm">🤖</span>
                                            </div>
                                            <h3 className="font-semibold text-blue-300">AKSHI Response</h3>
                                        </div>
                                        <div className="flex space-x-2">
                                            {isSpeaking ? (
                                                <button
                                                    onClick={stopSpeaking}
                                                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full transition-all duration-300"
                                                    title="Stop speaking"
                                                >
                                                    <Pause size={20} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => speak(assistantResponse)}
                                                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-full transition-all duration-300"
                                                    title="Repeat response"
                                                >
                                                    <Play size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-100 leading-relaxed text-lg">{assistantResponse}</p>
                                </div>
                            )}

                            {/* Audio Visualizer */}
                            <div className="relative mb-12">
                                <div className="relative w-64 h-64 mx-auto">
                                    {/* Animated rings */}
                                    {[0, 1, 2].map((ring) => (
                                        <div
                                            key={ring}
                                            className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${
                                                isListening || isProcessing
                                                    ? `border-blue-400/60 animate-pulse scale-${110 + ring * 10}`
                                                    : 'border-blue-400/20'
                                                }`}
                                            style={{
                                                margin: `${ring * 20}px`,
                                                animationDelay: `${ring * 0.2}s`
                                            }}
                                        />
                                    ))}

                                    {/* Center icon */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {isListening ? (
                                            <div className="relative">
                                                <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 animate-pulse">
                                                    <MicOff size={40} className="text-white" />
                                                </div>
                                                <div className="absolute -inset-2 bg-red-400/20 rounded-full animate-ping" />
                                            </div>
                                        ) : isProcessing ? (
                                            <div className="relative">
                                                <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/40">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-white border-t-transparent" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:scale-110 transition-transform duration-300">
                                                <Mic size={40} className="text-white" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Main Action Button */}
                            <div className="mb-8">
                                <button
                                    onClick={startListening}
                                    disabled={!hasSpeechRecognition || isProcessing || isListening || !isCameraActive}
                                    className={`group relative px-8 py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
                                        !isCameraActive
                                            ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed backdrop-blur-sm'
                                            : !hasSpeechRecognition
                                                ? 'bg-red-600/50 text-red-300 cursor-not-allowed backdrop-blur-sm'
                                                : isListening
                                                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-2xl shadow-red-500/30 animate-pulse'
                                                    : isProcessing
                                                        ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-2xl shadow-yellow-500/30'
                                                        : 'bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40'
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        {isListening ? (
                                            <>
                                                <MicOff size={28} />
                                                <span>Listening...</span>
                                            </>
                                        ) : isProcessing ? (
                                            <>
                                                <div className="animate-spin rounded-full h-7 w-7 border-3 border-white border-t-transparent" />
                                                <span>Processing...</span>
                                            </>
                                        ) : !isCameraActive ? (
                                            <>
                                                <Camera size={28} />
                                                <span>Turn Camera On First</span>
                                            </>
                                        ) : (
                                            <>
                                                <Mic size={28} />
                                                <span>Ask Question</span>
                                            </>
                                        )}
                                    </div>
                                    {!isListening && !isProcessing && isCameraActive && (
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                                    )}
                                </button>
                            </div>

                            {/* Control Buttons */}
                            <div className="flex flex-wrap justify-center gap-4 mb-12">
                                <button
                                    onClick={toggleCamera}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm transform hover:scale-105 ${
                                        isCameraActive
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/30'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg shadow-blue-500/30'
                                        }`}
                                >
                                    <Camera size={20} />
                                    <span>{isCameraActive ? 'Stop Camera' : 'Start Camera'}</span>
                                </button>

                                <button
                                    onClick={() => setSpeechEnabled(!speechEnabled)}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm transform hover:scale-105 ${
                                        speechEnabled
                                            ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/30'
                                            : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg shadow-gray-500/30'
                                        }`}
                                >
                                    {speechEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                                    <span>{speechEnabled ? 'Audio On' : 'Audio Off'}</span>
                                </button>
                            </div>

                            {/* Quick Commands */}
                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                                <h3 className="text-gray-300 text-lg font-semibold mb-4">Try these voice commands:</h3>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {[
                                        "What do you see?",
                                        "Read the text",
                                        "Describe the scene",
                                        "Are there people?",
                                        "What colors?",
                                        "Count objects",
                                        "Is this safe?",
                                        "Help me navigate"
                                    ].map((cmd, i) => (
                                        <span key={i} className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 px-4 py-2 rounded-full text-sm text-gray-300 border border-blue-500/20 backdrop-blur-sm">
                                            "{cmd}"
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </main>
                )}

                {/* Camera Page */}
                {currentPage === 'camera' && (
                    <main className="flex-1 px-4 pt-24 pb-8">
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-8">
                                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                                    Live Camera Feed
                                </h2>
                                <p className="text-gray-400">Point your camera and ask questions about what you see</p>
                            </div>

                            {/* Camera Feed */}
                            <div className="relative aspect-video bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                                <canvas ref={canvasRef} className="hidden" />

                                {/* Overlay indicators */}
                                {capturedImage && isProcessing && (
                                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center backdrop-blur-sm">
                                        <div className="text-center">
                                            <div className="w-48 h-36 mx-auto mb-6 rounded-xl overflow-hidden shadow-2xl border border-blue-500/30">
                                                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="w-12 h-12 mx-auto mb-4">
                                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
                                            </div>
                                            <p className="text-white text-lg font-medium">Analyzing image...</p>
                                        </div>
                                    </div>
                                )}

                                {isListening && (
                                    <div className="absolute top-6 right-6">
                                        <div className="bg-red-600/90 backdrop-blur-xl text-white px-4 py-2 rounded-full font-bold animate-pulse shadow-lg shadow-red-500/30 border border-red-400/30">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                <span>Listening</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!isCameraActive && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="w-20 h-20 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                                <Camera className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 text-xl font-medium">Camera is off</p>
                                            <p className="text-gray-500 text-sm mt-2">Click Start Camera to begin</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Camera Controls */}
                            <div className="flex flex-wrap justify-center gap-4 mb-8">
                                <button
                                    onClick={toggleCamera}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm transform hover:scale-105 ${
                                        isCameraActive
                                            ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30'
                                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/30'
                                        } text-white`}
                                >
                                    <Camera size={20} />
                                    <span>{isCameraActive ? 'Stop Camera' : 'Start Camera'}</span>
                                </button>

                                <button
                                    onClick={switchCamera}
                                    disabled={!isCameraActive}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm transform hover:scale-105 ${
                                        isCameraActive
                                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <div className="w-5 h-5 border-2 border-current rounded-md flex items-center justify-center">
                                        <div className="w-1 h-1 bg-current rounded-full"></div>
                                    </div>
                                    <span>Switch Camera</span>
                                </button>

                                <button
                                    onClick={startListening}
                                    disabled={!isCameraActive || isListening || isProcessing}
                                    className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 backdrop-blur-sm transform hover:scale-105 ${
                                        !isCameraActive
                                            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                                            : isListening
                                                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/30 animate-pulse'
                                                : isProcessing
                                                    ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg shadow-yellow-500/30'
                                                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-500/30'
                                        }`}
                                >
                                    {isListening ? (
                                        <>
                                            <MicOff size={20} />
                                            <span>Listening...</span>
                                        </>
                                    ) : isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Mic size={20} />
                                            <span>Ask Question</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* AI Response */}
                            {assistantResponse && (
                                <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6 shadow-2xl shadow-blue-500/10">
                                    <div className="flex items-center space-x-2 mb-4">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                            <span className="text-sm">🤖</span>
                                        </div>
                                        <h3 className="font-semibold text-blue-300 text-lg">AKSHI Response</h3>
                                    </div>
                                    <p className="text-gray-100 leading-relaxed text-lg">{assistantResponse}</p>
                                    {currentQuestion && (
                                        <div className="mt-4 pt-4 border-t border-blue-500/20">
                                            <p className="text-gray-400 text-sm italic">
                                                <span className="text-blue-300">Question:</span> "{currentQuestion}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </main>
                )}

                {/* Features Page */}
                {currentPage === 'chat' && (
                    <main className="flex-1 px-6 pt-24 pb-8">
                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                                    Visual Assistant Features
                                </h2>
                                <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                                    Discover the powerful capabilities of AKSHI's AI-powered vision system
                                </p>
                            </div>

                            {/* Feature Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                                {[
                                    {
                                        icon: Mic,
                                        title: 'Voice Control',
                                        description: 'Ask questions using natural speech with advanced recognition and error handling.',
                                        color: 'from-blue-500 to-blue-600'
                                    },
                                    {
                                        icon: Camera,
                                        title: 'Real-time Capture',
                                        description: 'Instant image capture when you ask questions for accurate visual analysis.',
                                        color: 'from-purple-500 to-purple-600'
                                    },
                                    {
                                        icon: Volume2,
                                        title: 'Audio Feedback',
                                        description: 'Clear spoken responses with natural voice synthesis and customizable settings.',
                                        color: 'from-green-500 to-green-600'
                                    }
                                ].map((feature, index) => (
                                    <div key={index} className="group bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105 shadow-xl">
                                        <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <feature.icon className="text-white" size={24} />
                                        </div>
                                        <h3 className="font-semibold text-xl mb-3 text-white">{feature.title}</h3>
                                        <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Capabilities Section */}
                            <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 shadow-2xl shadow-blue-500/10">
                                <h3 className="text-2xl font-bold text-blue-300 mb-6 text-center">AI Capabilities</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                        <h4 className="font-semibold text-lg mb-4 text-white flex items-center">
                                            <div className="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                                            Scene Analysis
                                        </h4>
                                        <ul className="text-gray-300 space-y-2">
                                            <li className="flex items-start">
                                                <span className="text-blue-400 mr-2">•</span>
                                                Complete scene description
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-400 mr-2">•</span>
                                                Object identification & counting
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-400 mr-2">•</span>
                                                People detection & description
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-blue-400 mr-2">•</span>
                                                Color analysis & recognition
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                                        <h4 className="font-semibold text-lg mb-4 text-white flex items-center">
                                            <div className="w-3 h-3 bg-purple-400 rounded-full mr-3"></div>
                                            Text & Navigation
                                        </h4>
                                        <ul className="text-gray-300 space-y-2">
                                            <li className="flex items-start">
                                                <span className="text-purple-400 mr-2">•</span>
                                                OCR text reading
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-purple-400 mr-2">•</span>
                                                Safety assessment
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-purple-400 mr-2">•</span>
                                                Navigation assistance
                                            </li>
                                            <li className="flex items-start">
                                                <span className="text-purple-400 mr-2">•</span>
                                                Obstacle detection
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                )}

                {/* Settings Page */}
                {currentPage === 'settings' && (
                    <main className="flex-1 px-6 pt-24 pb-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="text-center mb-12">
                                <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                                    Settings
                                </h2>
                                <p className="text-xl text-gray-400">Configure your AKSHI experience</p>
                            </div>

                            <div className="space-y-6">
                                {/* Audio Settings */}
                                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                                    <h3 className="font-semibold text-xl mb-6 flex items-center text-white">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                            <Volume2 size={18} className="text-white" />
                                        </div>
                                        Audio Settings
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">Speech Output</span>
                                                <p className="text-gray-400 text-sm">Enable or disable voice responses</p>
                                            </div>
                                            <button
                                                onClick={() => setSpeechEnabled(!speechEnabled)}
                                                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                                                    speechEnabled
                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
                                                        : 'bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${
                                                    speechEnabled ? 'translate-x-6' : 'translate-x-0'
                                                    } shadow-lg`}></div>
                                            </button>
                                        </div>

                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">Voice Recognition</span>
                                                <p className="text-gray-400 text-sm">Browser speech recognition support</p>
                                            </div>
                                            <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                                                hasSpeechRecognition
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-red-600/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {hasSpeechRecognition ? '✓ Supported' : '✗ Not Supported'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">Voices Loaded</span>
                                                <p className="text-gray-400 text-sm">Speech synthesis voices status</p>
                                            </div>
                                            <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                                                isVoicesLoaded
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                                                }`}>
                                                {isVoicesLoaded ? '✓ Ready' : '⏳ Loading...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Camera Settings */}
                                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                                    <h3 className="font-semibold text-xl mb-6 flex items-center text-white">
                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                                            <Camera size={18} className="text-white" />
                                        </div>
                                        Camera Settings
                                    </h3>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">Current Mode</span>
                                                <p className="text-gray-400 text-sm">Active camera selection</p>
                                            </div>
                                            <span className="text-blue-400 font-medium">
                                                {cameraMode === 'user' ? '📱 Front Camera' : '📷 Back Camera'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">Status</span>
                                                <p className="text-gray-400 text-sm">Camera activation state</p>
                                            </div>
                                            <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                                                isCameraActive
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                                                }`}>
                                                {isCameraActive ? '● Active' : '○ Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* API Configuration */}
                                <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/20 shadow-xl shadow-purple-500/10">
                                    <h3 className="font-semibold text-xl mb-6 text-purple-300 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                                            <Settings size={18} className="text-white" />
                                        </div>
                                        API Configuration
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2">
                                            <div>
                                                <span className="text-white font-medium">OpenAI Vision API</span>
                                                <p className="text-gray-400 text-sm">GPT-4 Vision model status</p>
                                            </div>
                                            <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                                                OPENAI_API_KEY
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-red-600/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {OPENAI_API_KEY ? '✓ Configured' : '⚠ Missing'}
                                            </span>
                                        </div>

                                        {!OPENAI_API_KEY && (
                                            <div className="bg-red-900/30 backdrop-blur-sm border border-red-600/30 rounded-xl p-4">
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-red-900 text-sm font-bold">!</span>
                                                    </div>
                                                    <p className="text-red-200 text-sm leading-relaxed">
                                                        Please configure your **REACT_APP_OPENAI_API_KEY** environment variable to enable the AI features.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* System Tests */}
                                <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20 shadow-xl shadow-green-500/10">
                                    <h3 className="font-semibold text-xl mb-6 text-green-300 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                                            <Play size={18} className="text-white" />
                                        </div>
                                        System Tests
                                    </h3>

                                    <div className="grid grid-cols-1 gap-4">
                                        <button
                                            onClick={() => speak("Audio test successful. Speech synthesis is working perfectly. The system is ready to provide voice responses.")}
                                            className="group bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 hover:border-green-500/50 rounded-xl p-4 transition-all text-left transform hover:scale-[1.02]"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Volume2 size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-white">Test Audio Output</span>
                                                    <p className="text-green-300 text-sm">Verify speech synthesis</p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={async () => {
                                                try {
                                                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                                    stream.getTracks().forEach(track => track.stop());
                                                    speak('Camera test successful. Your camera is accessible and working properly.');
                                                } catch (error) {
                                                    speak('Camera test failed. Please check permissions and try again.');
                                                }
                                            }}
                                            className="group bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-500/50 rounded-xl p-4 transition-all text-left transform hover:scale-[1.02]"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Camera size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-white">Test Camera Access</span>
                                                    <p className="text-blue-300 text-sm">Check camera permissions</p>
                                                </div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (hasSpeechRecognition) {
                                                    speak('Voice recognition is supported and ready. You can ask questions using your voice.');
                                                } else {
                                                    speak('Voice recognition is not supported in this browser. Please use Chrome or Edge for best results.');
                                                }
                                            }}
                                            className="group bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 hover:border-purple-500/50 rounded-xl p-4 transition-all text-left transform hover:scale-[1.02]"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Mic size={20} className="text-white" />
                                                </div>
                                                <div>
                                                    <span className="font-medium text-white">Test Voice Recognition</span>
                                                    <p className="text-purple-300 text-sm">Verify speech input</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* Browser Compatibility */}
                                <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 shadow-xl">
                                    <h3 className="font-semibold text-xl mb-6 text-white flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center mr-3">
                                            <Settings size={18} className="text-white" />
                                        </div>
                                        Browser Compatibility
                                    </h3>

                                    <div className="space-y-4">
                                        {[
                                            { feature: 'Speech Recognition', supported: hasSpeechRecognition, desc: 'Voice input capability' },
                                            { feature: 'Speech Synthesis', supported: hasSpeechSynthesis, desc: 'Voice output capability' },
                                            { feature: 'Camera Access', supported: !!navigator.mediaDevices, desc: 'Video capture support' }
                                        ].map((item, index) => (
                                            <div key={index} className="flex justify-between items-center py-2">
                                                <div>
                                                    <span className="text-white font-medium">{item.feature}</span>
                                                    <p className="text-gray-400 text-sm">{item.desc}</p>
                                                </div>
                                                <span className={`text-sm px-4 py-2 rounded-full font-medium ${
                                                    item.supported
                                                        ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                        : 'bg-red-600/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {item.supported ? '✓ Supported' : '✗ Not Supported'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {(!hasSpeechRecognition || !hasSpeechSynthesis) && (
                                        <div className="mt-6 p-4 bg-yellow-900/30 backdrop-blur-sm border border-yellow-600/30 rounded-xl">
                                            <div className="flex items-start space-x-3">
                                                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <span className="text-yellow-900 text-sm font-bold">!</span>
                                                </div>
                                                <p className="text-yellow-200 text-sm leading-relaxed">
                                                    For the best experience, use Chrome, Edge, or Safari with up-to-date versions.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </main>
                )}

                {/* Speaking Indicator */}
                {isSpeaking && (
                    <div className="fixed top-24 right-6 z-50">
                        <div className="bg-green-600/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl shadow-green-500/30 border border-green-400/30 animate-pulse">
                            <div className="flex items-center space-x-3">
                                <div className="flex space-x-1">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="w-1 h-4 bg-white rounded-full animate-bounce"
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                        />
                                    ))}
                                </div>
                                <span className="font-medium">Speaking...</span>
                                <button
                                    onClick={stopSpeaking}
                                    className="ml-2 hover:bg-green-700/50 rounded-full p-1 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <footer className="relative mt-auto py-6 px-6 border-t border-white/10 bg-black/20 backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto text-center">
                        <p className="text-gray-400 text-sm">
                            © 2025 AKSHI Visual Assistant. Empowering vision through AI technology.
                        </p>
                    </div>
                </footer>
            </div>
        </div>
    );
}

export default App;