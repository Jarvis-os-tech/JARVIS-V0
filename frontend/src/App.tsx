import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { PERSONAS } from './data/personas';
import { VoicePersona, ConnectionState, ConversationMessage, AgentConfig } from './types';
import { Header } from './components/Header';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { VisionPreviewModal } from './components/VisionPreviewModal';
import { JarvisMemoryHUD } from './components/JarvisMemoryHUD';
import { ConnectorsModal } from './components/ConnectorsModal';
import { CommandInputBar } from './components/CommandInputBar';
import { jarvisMemoryEngine } from './services/memoryEngine';
import { AudioQueuePlayer, float32ToInt16Base64, calculateVolume } from './utils/audio';
import { demoVoiceInstance } from './services/demoVoiceService';
import { initAuthListener } from './services/authService';
import { AlertCircle, RefreshCw, Cpu } from 'lucide-react';

export default function App() {
  const [selectedPersona, setSelectedPersona] = useState<VoicePersona>(PERSONAS[0]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [isMemoryHUDOpen, setIsMemoryHUDOpen] = useState(false);
  const [isConnectorsOpen, setIsConnectorsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [memoryCount, setMemoryCount] = useState<number>(jarvisMemoryEngine.getStats().totalItems);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reminders, setReminders] = useState<{ id: string; title: string }[]>([]);

  const [inputVolume, setInputVolume] = useState<number>(0);
  const [outputVolume, setOutputVolume] = useState<number>(0);

  const [isVisionActive, setIsVisionActive] = useState(false);
  const [visionMode, setVisionMode] = useState<'camera' | 'screen' | null>(null);
  const [visionStream, setVisionStream] = useState<MediaStream | null>(null);
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);

  // Demo Voice Mode
  const [isDemoMode, setIsDemoMode] = useState(false);

  const selectedPersonaRef = useRef<VoicePersona>(selectedPersona);
  const isDemoModeRef = useRef(isDemoMode);

  useEffect(() => {
    selectedPersonaRef.current = selectedPersona;
  }, [selectedPersona]);

  useEffect(() => {
    isDemoModeRef.current = isDemoMode;
  }, [isDemoMode]);

  const refreshMemoryStats = () => {
    setMemoryCount(jarvisMemoryEngine.getStats().totalItems);
  };

  // Initial API Key, Server Health Check & Auth Listener
  useEffect(() => {
    // Initial server health check and sovereign memory synchronization
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (!data.hasApiKey) {
          setErrorMsg('GEMINI_API_KEY is not configured in AI Studio Secrets. You can still test J.A.R.V.I.S. with local speech synthesis in Demo Mode.');
        } else {
          setErrorMsg(null);
        }
      })
      .catch(err => console.warn('[App] Health check failed:', err));

    // Sync with backend Sovereign Memory Vault & SQLite on startup
    jarvisMemoryEngine.syncWithServer().then(() => {
      refreshMemoryStats();
    });

    const unsubscribeAuth = initAuthListener((user) => {
      setCurrentUser(user);
      if (user) {
        const name = user.displayName || user.email?.split('@')[0] || 'Sir';
        jarvisMemoryEngine.extractAndMemorize(`User is signed in as ${name} with email ${user.email}`, 'user');
        refreshMemoryStats();
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Global Keyboard Shortcuts for High-Velocity Execution
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea or modal is open
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape' && connectionState === 'speaking') {
        e.preventDefault();
        handleInterrupt();
        return;
      }

      // Quick shortcut triggers
      if (e.key === '1') {
        e.preventDefault();
        handleSendPrompt("J.A.R.V.I.S., rapid status check on all core telemetry.");
      } else if (e.key === '2') {
        e.preventDefault();
        handleSendPrompt("J.A.R.V.I.S., review your long-term and semantic memory banks. What key directives do you hold?");
      } else if (e.key === '3') {
        e.preventDefault();
        handleSendPrompt("J.A.R.V.I.S., run a deep multi-stage architecture and latency audit on our system.");
      } else if (e.key === '4') {
        e.preventDefault();
        handleSendPrompt("J.A.R.V.I.S., compute our next tactical milestone roadmap and commit it to episodic memory.");
      } else if (e.key === '5') {
        e.preventDefault();
        handleSendPrompt("J.A.R.V.I.S., set a 5-minute reminder for system synchronization.");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectionState, isDemoMode]);

  const stopVision = () => {
    if (visionStream) {
      visionStream.getTracks().forEach(track => track.stop());
      setVisionStream(null);
    }
    setIsVisionActive(false);
    setVisionMode(null);
    setIsLiveStreaming(false);
  };

  const startVision = async (mode: 'camera' | 'screen') => {
    try {
      stopVision();
      let stream: MediaStream;
      if (mode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'monitor' } } as any);
      }

      setVisionStream(stream);
      setVisionMode(mode);
      setIsVisionActive(true);

      stream.getVideoTracks()[0].onended = () => {
        stopVision();
      };
    } catch (err: any) {
      console.error("Vision mode access failed:", err);
      setErrorMsg(`Failed to start ${mode} optical stream: ${err.message || 'Permission denied'}`);
    }
  };

  const handleToggleVision = (mode: 'camera' | 'screen') => {
    if (isVisionActive && visionMode === mode) {
      stopVision();
    } else {
      startVision(mode);
    }
  };

  const handleCaptureAndSend = (base64Image: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'image',
        image: base64Image,
        mimeType: 'image/jpeg'
      }));
    }

    const captureNote = `[Visual frame transmitted to J.A.R.V.I.S. via ${visionMode || 'telemetry stream'}]`;
    jarvisMemoryEngine.recordTurn('user', captureNote);
    refreshMemoryStats();

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text: captureNote,
        imageUrl: `data:image/jpeg;base64,${base64Image}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (isDemoModeRef.current) {
      setTimeout(() => {
        handleAssistantSpeak(`Optical frame received, Sir. Real-time vision analytics are active in J.A.R.V.I.S. memory.`);
      }, 400);
    }
  };

  const handleLiveStreamFrame = (base64Image: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'image',
        image: base64Image,
        mimeType: 'image/jpeg'
      }));
    }
  };

  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    selectedPersonaId: PERSONAS[0].id,
    voiceName: 'Puck', // Default voice is Puck
    customInstruction: '',
    micSensitivity: 5,
    enableTranscription: true,
    enableNoiseFilter: true,
    model: 'gemini-3.1-flash-live-preview'
  });

  const wsRef = useRef<WebSocket | null>(null);
  const audioQueuePlayerRef = useRef<AudioQueuePlayer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const isMutedRef = useRef(isMuted);

  const localRecRef = useRef<any>(null);
  const shouldLocalRecListenRef = useRef(false);

  // Synthesize J.A.R.V.I.S. full system prompt with multi-tier memory matrix
  const buildSystemInstruction = () => {
    const memoryPrompt = jarvisMemoryEngine.buildJarvisHierarchicalMemoryPrompt();
    const languageRule = "CRITICAL MULTILINGUAL RULE: Auto-detect the user's language from spoken audio or text in real-time. Respond and speak back in the exact same language.";
    const reminderToolRule = "CRITICAL TOOL USAGE: You have access to a UI Reminder tool (set_ui_reminder). If the user asks you to set a reminder, invoke the set_ui_reminder tool function immediately.";
    const visionToolRule = `CRITICAL REAL-TIME CAMERA & SCREEN SHARING VOICE PROTOCOL:
- If the user asks to turn on or open the camera, activate camera, see them, look at an object in front of them: INVOKE the 'activate_camera' tool function immediately.
- If the user asks to share screen, show their screen, look at their monitor/code/window, or start screen share: INVOKE the 'activate_screen_share' tool function immediately.
- If the user asks to stop sharing, turn off camera, or close vision: INVOKE the 'deactivate_vision' tool function immediately.`;
    const rapidResponseRule = `CRITICAL SPEED & PROACTIVE TIME-MANAGEMENT PROTOCOL:
1. Speak with lightning-fast conversational velocity. Use natural J.A.R.V.I.S. shortcuts: "Right away, Sir", "On it, Sir", "Acknowledged", "Executing now".
2. If a request is complex, heavy, requires multi-step analysis, computation, or prolonged lookup: PROACTIVELY tell the user right away that it will take a moment before proceeding or presenting the result (e.g. "Right away, Sir. Initializing sub-routines; this will require a few moments to compute, so standby while I process." or "On it, Sir. Accessing the databanks now—give me just a moment to cross-reference.").`;
    const userAuthContext = currentUser
      ? `AUTHENTICATED OPERATOR: User is signed in as ${currentUser.displayName || 'Sir'} (${currentUser.email}). Greet and address them accordingly.`
      : '';
    
    return `${selectedPersonaRef.current.systemInstruction}\n\n${userAuthContext}\n\n${memoryPrompt}\n\n${languageRule}\n${reminderToolRule}\n${visionToolRule}\n${rapidResponseRule}\n${agentConfig.customInstruction || ''}`;
  };

  const startLocalSpeechRecognition = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn("Local speech recognition not supported in this browser.");
      return;
    }

    if (localRecRef.current) {
      try {
        localRecRef.current.start();
      } catch (e) {}
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      console.log("[J.A.R.V.I.S. SPEECH REC] Active");
    };

    rec.onresult = (event: any) => {
      let currentResultText = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentResultText += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }

      if (currentResultText && isFinal && currentResultText.trim()) {
        const lower = currentResultText.toLowerCase();

        // Check for direct voice command activations for Camera & Screen Sharing
        if (lower.includes('turn on camera') || lower.includes('open camera') || lower.includes('activate camera') || lower.includes('start camera') || lower.includes('enable camera') || lower.includes('show camera')) {
          console.log('[Voice Command] Activating camera feed');
          startVision('camera');
          setIsLiveStreaming(true);
        } else if (lower.includes('share screen') || lower.includes('share my screen') || lower.includes('activate screen share') || lower.includes('start screen share') || lower.includes('open screen share') || lower.includes('show my screen') || lower.includes('show screen')) {
          console.log('[Voice Command] Activating screen sharing');
          startVision('screen');
          setIsLiveStreaming(true);
        } else if (lower.includes('stop camera') || lower.includes('stop screen') || lower.includes('stop sharing') || lower.includes('stop vision') || lower.includes('close camera') || lower.includes('close screen') || lower.includes('disable camera')) {
          console.log('[Voice Command] Deactivating vision stream');
          stopVision();
        }

        // Record into memory engine & extract facts
        jarvisMemoryEngine.recordTurn('user', currentResultText);
        jarvisMemoryEngine.extractAndMemorize(currentResultText, 'user');
        refreshMemoryStats();

        // Handle Demo Voice response
        if (isDemoModeRef.current) {
          appendTranscriptChunk('user', currentResultText);
          const response = demoVoiceInstance.generateResponse(currentResultText, 'J.A.R.V.I.S.');
          handleAssistantSpeak(response);
        }
      }
    };

    rec.onerror = (evt: any) => {
      console.warn("[SPEECH REC Error]:", evt);
    };

    rec.onend = () => {
      if (shouldLocalRecListenRef.current) {
        setTimeout(() => {
          if (shouldLocalRecListenRef.current) {
            try {
              rec.start();
            } catch (e) {}
          }
        }, 150);
      }
    };

    localRecRef.current = rec;
    shouldLocalRecListenRef.current = true;
    try {
      rec.start();
    } catch (e) {
      console.error("[SPEECH REC Start Failed]:", e);
    }
  };

  const stopLocalSpeechRecognition = () => {
    shouldLocalRecListenRef.current = false;
    if (localRecRef.current) {
      try {
        localRecRef.current.abort();
      } catch (e) {}
      localRecRef.current = null;
    }
  };

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Initialize AudioQueuePlayer
  useEffect(() => {
    audioQueuePlayerRef.current = new AudioQueuePlayer(
      (vol) => setOutputVolume(vol),
      (isPlaying) => {
        if (isPlaying && connectionState !== 'disconnected') {
          setConnectionState('speaking');
        } else if (!isPlaying && connectionState === 'speaking') {
          setConnectionState('listening');
        }
      }
    );

    return () => {
      audioQueuePlayerRef.current?.close();
      stopMicStream();
      closeWebSocket();
    };
  }, []);

  const handleAssistantSpeak = (text: string, returnState?: ConnectionState) => {
    const priorState = connectionState;
    setConnectionState('speaking');
    jarvisMemoryEngine.recordTurn('jarvis', text);
    refreshMemoryStats();

    demoVoiceInstance.speak(text, {
      persona: selectedPersonaRef.current,
      onVolumeChange: (vol) => setOutputVolume(vol),
      onStartSpeaking: () => {
        setConnectionState('speaking');
      },
      onStopSpeaking: () => {
        setOutputVolume(0);
        const nextState = returnState ?? (priorState === 'disconnected' ? 'disconnected' : 'listening');
        setConnectionState(nextState);
        finalizeLastMessage();
      },
      onTranscriptChunk: (chunk) => {
        appendTranscriptChunk('agent', chunk);
      }
    });
  };

  const appendTranscriptChunk = (sender: 'user' | 'agent', textChunk: string) => {
    if (!textChunk) return;

    setMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg && lastMsg.sender === sender && !lastMsg.isFinal) {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMsg,
            text: lastMsg.text + textChunk,
            isStreaming: true,
            personaId: sender === 'agent' ? 'jarvis' : undefined
          }
        ];
      } else {
        return [
          ...prev,
          {
            id: `${sender}-${Date.now()}`,
            sender,
            text: textChunk,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isStreaming: true,
            personaId: sender === 'agent' ? 'jarvis' : undefined
          }
        ];
      }
    });
  };

  const finalizeLastMessage = () => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last && last.text) {
        jarvisMemoryEngine.recordTurn(last.sender === 'user' ? 'user' : 'jarvis', last.text);
        if (last.sender === 'user') {
          jarvisMemoryEngine.extractAndMemorize(last.text, 'user');
        }
        refreshMemoryStats();
      }
      return prev.map((m) => (m.isStreaming || !m.isFinal ? { ...m, isFinal: true, isStreaming: false } : m));
    });
  };

  const stopMicStream = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setInputVolume(0);
    stopLocalSpeechRecognition();
  };

  const startMicStream = async () => {
    try {
      stopMicStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      if (inputAudioCtx.state === 'suspended') {
        await inputAudioCtx.resume();
      }
      inputAudioCtxRef.current = inputAudioCtx;

      // Load capture AudioWorklet (runs on real-time audio thread, not main thread)
      await inputAudioCtx.audioWorklet.addModule('/audio-processors/capture.worklet.js');
      const workletNode = new AudioWorkletNode(inputAudioCtx, 'audio-capture-processor');
      processorRef.current = workletNode;

      // Handle audio chunks from the worklet
      workletNode.port.onmessage = (event: MessageEvent) => {
        if (isMutedRef.current) {
          setInputVolume(0);
          return;
        }

        if (event.data.type === 'audio') {
          const inputData = event.data.data as Float32Array;
          const vol = calculateVolume(inputData);
          setInputVolume(vol);

          const base64Pcm = float32ToInt16Base64(inputData);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'audio',
              audio: base64Pcm
            }));
          }
        }
      };

      const source = inputAudioCtx.createMediaStreamSource(stream);
      source.connect(workletNode);

      startLocalSpeechRecognition();
    } catch (err: any) {
      console.error("Microphone access failed:", err);
      const isPermError = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.includes('Permission denied') || err.message?.includes('permission');
      if (isPermError) {
        setErrorMsg("Microphone access denied. Please grant microphone permissions in browser settings or use prompt shortcuts below.");
      } else {
        setErrorMsg(`Microphone access failed: ${err.message || 'Microphone unavailable'}.`);
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        setConnectionState('listening');
      } else {
        setConnectionState('error');
      }
    }
  };

  const closeWebSocket = () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
  };

  const connectWebSocket = () => {
    setErrorMsg(null);
    setConnectionState('connecting');

    // Pre-warm the audio output stream immediately on user-initiated connection
    // to prime the AudioContext, awake hardware DAC clock, and eliminate TTFW latency
    audioQueuePlayerRef.current?.prewarm();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;

    closeWebSocket();

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Re-verify audio context pre-warming upon socket open
      audioQueuePlayerRef.current?.prewarm();
      const combinedInstruction = buildSystemInstruction();

      ws.send(JSON.stringify({
        type: 'init',
        voiceName: 'Puck', // Default Puck Voice
        systemInstruction: combinedInstruction,
        model: 'gemini-3.1-flash-live-preview'
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'connected') {
          setConnectionState('connected');
          audioQueuePlayerRef.current?.prewarm();
          startMicStream();

          // Initial greeting prompt
          ws.send(JSON.stringify({
            type: 'text',
            text: "J.A.R.V.I.S., you have just initialized your 4-tier cognitive memory matrix and acoustic link. Greet the user with calm, polite sophistication."
          }));
        }

        if (msg.type === 'audio' && msg.audio) {
          setConnectionState('speaking');
          audioQueuePlayerRef.current?.enqueueChunk(msg.audio);
        }

        if ((msg.type === 'output_transcription' || msg.type === 'outputTranscript') && msg.text) {
          appendTranscriptChunk('agent', msg.text);
        }

        if ((msg.type === 'input_transcription' || msg.type === 'inputTranscript') && msg.text) {
          appendTranscriptChunk('user', msg.text);
          jarvisMemoryEngine.recordTurn('user', msg.text);
          jarvisMemoryEngine.extractAndMemorize(msg.text, 'user');
          refreshMemoryStats();
        }

        if (msg.type === 'interrupted') {
          audioQueuePlayerRef.current?.stopAndClear();
          finalizeLastMessage();
          setConnectionState('listening');
        }

        if (msg.type === 'turn_complete' || msg.type === 'turnComplete') {
          finalizeLastMessage();
          setConnectionState('listening');
        }

        if (msg.type === 'set_ui_reminder') {
          console.log(`[WS Tool] Scheduling reminder for ${msg.minutes} minutes: ${msg.title}`);
          const ms = msg.minutes * 60 * 1000;
          setTimeout(() => {
            setReminders(prev => [...prev, { id: Date.now().toString(), title: msg.title }]);
          }, ms);
        }

        if (msg.type === 'activate_camera') {
          console.log('[Live WS Tool] Activating camera feed');
          startVision('camera');
          setIsLiveStreaming(true);
        }

        if (msg.type === 'activate_screen_share') {
          console.log('[Live WS Tool] Activating screen share feed');
          startVision('screen');
          setIsLiveStreaming(true);
        }

        if (msg.type === 'deactivate_vision') {
          console.log('[Live WS Tool] Deactivating vision stream');
          stopVision();
        }

        if (msg.type === 'memory_update' && msg.facts) {
          console.log('[Live Memory Event] Received mined facts from backend:', msg.facts);
          for (const f of msg.facts) {
            jarvisMemoryEngine.addSemanticFact({
              subject: 'Dynamic Rule Mining',
              predicate: f.kind || 'fact',
              object: f.content,
              domain: 'preferences',
              confidence: 0.95,
              tags: ['dynamic-miner', f.kind || 'fact']
            });
          }
          refreshMemoryStats();
        }

        if (msg.type === 'memory_fact_saved') {
          console.log('[Live Memory Event] Fact committed to sovereign vault:', msg.key, msg.value);
          jarvisMemoryEngine.addLongTermMemory({
            category: 'directive',
            title: msg.key,
            content: msg.value,
            importance: 'high',
            isPinned: true
          });
          refreshMemoryStats();
        }

        if (msg.type === 'error') {
          console.error("Live API Session Error:", msg.message);
          setErrorMsg(msg.message || "Failed to establish Gemini Live voice session.");
          setConnectionState('error');
        }
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      setConnectionState((prev) => (prev === 'error' ? 'error' : 'disconnected'));
      stopMicStream();
    };

    ws.onerror = (evt) => {
      console.warn("WebSocket connection state error:", evt);
      setErrorMsg("Realtime neural link disconnected. Click Retry to reconnect.");
      setConnectionState('error');
    };
  };

  const handleStartSession = () => {
    audioQueuePlayerRef.current?.prewarm();
    if (isDemoMode) {
      setErrorMsg(null);
      setConnectionState('listening');
      startMicStream();
      const greeting = `J.A.R.V.I.S. online, Sir. 4-tier cognitive memory matrix is initialized and ready for your directives.`;
      handleAssistantSpeak(greeting);
      return;
    }
    connectWebSocket();
  };

  const handleStopSession = () => {
    if (isDemoMode) {
      demoVoiceInstance.stop();
      setOutputVolume(0);
    }
    audioQueuePlayerRef.current?.stopAndClear();
    closeWebSocket();
    stopMicStream();
    setConnectionState('disconnected');

    // Automatically record an episodic milestone upon completing session
    jarvisMemoryEngine.recordSessionEpisode(
      'Interactive Voice & Cognitive Diagnostics Session',
      'Completed voice conversation cycle, synched user inputs, and preserved semantic knowledge state.',
      ['Session completed cleanly', 'Cognitive buffers preserved']
    );
    refreshMemoryStats();
  };

  const handleInterrupt = () => {
    if (isDemoMode) {
      demoVoiceInstance.stop();
      setOutputVolume(0);
      setConnectionState('listening');
      return;
    }
    audioQueuePlayerRef.current?.stopAndClear();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setConnectionState('listening');
  };

  const handleSendPrompt = (promptText: string) => {
    audioQueuePlayerRef.current?.prewarm();
    jarvisMemoryEngine.recordTurn('user', promptText);
    jarvisMemoryEngine.extractAndMemorize(promptText, 'user');
    refreshMemoryStats();

    const lower = promptText.toLowerCase();
    if (lower.includes('turn on camera') || lower.includes('open camera') || lower.includes('activate camera') || lower.includes('start camera') || lower.includes('enable camera') || lower.includes('show camera')) {
      startVision('camera');
      setIsLiveStreaming(true);
    } else if (lower.includes('share screen') || lower.includes('share my screen') || lower.includes('activate screen share') || lower.includes('start screen share') || lower.includes('open screen share') || lower.includes('show my screen') || lower.includes('show screen')) {
      startVision('screen');
      setIsLiveStreaming(true);
    } else if (lower.includes('stop camera') || lower.includes('stop screen') || lower.includes('stop sharing') || lower.includes('stop vision') || lower.includes('close camera') || lower.includes('close screen') || lower.includes('disable camera')) {
      stopVision();
    }

    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    // Transmit over active WebSocket if connected (whether listening, connected, or speaking)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'text',
        text: promptText
      }));
    } else {
      // Disconnected / Offline query: Answer prompt without forcibly activating live voice session or mic
      const wasDisconnected = connectionState === 'disconnected';
      if (isDemoMode) {
        setConnectionState('speaking');
        const response = demoVoiceInstance.generateResponse(promptText, 'J.A.R.V.I.S.');
        handleAssistantSpeak(response, wasDisconnected ? 'disconnected' : undefined);
      } else {
        (async () => {
          try {
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: promptText,
                systemInstruction: buildSystemInstruction()
              })
            });
            const data = await res.json();
            if (data && data.text) {
              handleAssistantSpeak(data.text, wasDisconnected ? 'disconnected' : undefined);
            } else {
              const fallback = demoVoiceInstance.generateResponse(promptText, 'J.A.R.V.I.S.');
              handleAssistantSpeak(fallback, wasDisconnected ? 'disconnected' : undefined);
            }
          } catch (err) {
            console.warn('[Text Command] Fallback to demo voice response:', err);
            const fallback = demoVoiceInstance.generateResponse(promptText, 'J.A.R.V.I.S.');
            handleAssistantSpeak(fallback, wasDisconnected ? 'disconnected' : undefined);
          }
        })();
      }
    }
  };

  return (
    <div className="h-screen w-screen bg-[#030712] text-slate-100 flex flex-col font-sans antialiased relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Background Arc-Reactor Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-cyan-600/10 via-blue-600/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* J.A.R.V.I.S. Header */}
      <Header
        connectionState={connectionState}
        selectedPersonaName={selectedPersona.name}
        isDemoMode={isDemoMode}
        onOpenMemoryHUD={() => setIsMemoryHUDOpen(true)}
        memoryCount={memoryCount}
        currentUser={currentUser}
        onOpenConnectors={() => setIsConnectorsOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 min-h-0 w-full relative z-10 flex flex-col items-center justify-between overflow-y-auto">
        <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
          
          {/* Demo Mode Notice Banner */}
          {isDemoMode && !errorMsg && (
            <div className="w-full max-w-xl mb-3 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-3 backdrop-blur-md animate-fade-in shadow-lg">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono">
                  <strong>J.A.R.V.I.S. Demo Mode Active:</strong> Voice synthesis, 4-tier memory banks &amp; Arc-Reactor are running.
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="w-full max-w-xl mb-3 p-3.5 rounded-2xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md animate-fade-in bg-cyan-950/60 border border-cyan-500/30 text-cyan-200 shadow-xl">
              <div className="flex items-start gap-2.5 flex-1">
                <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-white font-mono">Neural Link Notice</span>
                  <span className="text-[11px] leading-relaxed text-slate-300">{errorMsg}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => {
                    setIsDemoMode(true);
                    setErrorMsg(null);
                    setConnectionState('disconnected');
                  }}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold transition-all text-[11px] shadow-sm font-mono"
                >
                  Use Demo Voice
                </button>
                <button
                  onClick={() => {
                    if (connectionState === 'disconnected' || connectionState === 'error') {
                      handleStartSession();
                    } else {
                      startMicStream();
                    }
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-medium border border-cyan-500/20 transition-colors flex items-center gap-1 text-[11px] font-mono"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            </div>
          )}

          {/* Core Interactive Arc Reactor Voice Visualizer */}
          <VoiceVisualizer
            connectionState={connectionState}
            inputVolume={inputVolume}
            outputVolume={outputVolume}
            personaName={selectedPersona.name}
            personaColor="cyan"
            isMuted={isMuted}
            onToggleMute={() => setIsMuted(!isMuted)}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onInterrupt={handleInterrupt}
            isVisionActive={isVisionActive}
            visionMode={visionMode}
            onToggleVision={handleToggleVision}
          />

          {/* J.A.R.V.I.S. Command Input Bar */}
          <CommandInputBar
            onSendPrompt={handleSendPrompt}
            isProcessing={connectionState === 'speaking' || connectionState === 'connecting'}
          />
        </main>
      </div>

      {/* J.A.R.V.I.S. 4-Tier Memory Matrix Hologram HUD */}
      <JarvisMemoryHUD
        isOpen={isMemoryHUDOpen}
        onClose={() => {
          setIsMemoryHUDOpen(false);
          refreshMemoryStats();
        }}
        onSendPromptToJarvis={(p) => handleSendPrompt(p)}
      />

      {/* Connectors & Google Auth Modal */}
      <ConnectorsModal
        isOpen={isConnectorsOpen}
        onClose={() => setIsConnectorsOpen(false)}
        currentUser={currentUser}
        onUserUpdate={(u) => {
          setCurrentUser(u);
          refreshMemoryStats();
        }}
      />

      {/* Vision Preview PiP Widget */}
      <VisionPreviewModal
        isOpen={isVisionActive}
        mode={visionMode}
        stream={visionStream}
        onClose={stopVision}
        onSwitchMode={(newMode) => startVision(newMode)}
        onCaptureAndSend={handleCaptureAndSend}
        isLiveStreaming={isLiveStreaming}
        onToggleLiveStreaming={() => setIsLiveStreaming(!isLiveStreaming)}
        onLiveStreamFrame={handleLiveStreamFrame}
      />

      {/* Reminders Notification Banner */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
        {reminders.map(reminder => (
          <div key={reminder.id} className="bg-cyan-950 border border-cyan-400/50 text-cyan-200 px-5 py-3.5 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] animate-fade-in flex items-center justify-between pointer-events-auto min-w-[280px]">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-xs text-white">{reminder.title}</span>
            </div>
            <button
              onClick={() => setReminders(prev => prev.filter(r => r.id !== reminder.id))}
              className="text-cyan-400 hover:text-white transition-colors ml-4 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded bg-cyan-500/20"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
