import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { initGoogleAuth, fetchStepCount, fetchCalories } from './services/googleFit';
import MoodScanner from './components/MoodScanner';
import { useActivityTracker, getMoodHistory } from './services/activityTracker';
import HeartbeatPulse from './components/HeartbeatPulse';
import { getAxonResponse } from './services/axonService';

const DEMO_USERS = [
  { id: 'u1', name: 'AARYAN', steps: 10420, cal: 2400, mood: 'happy', bpm: 68, score: 15, status: 'OPTIMAL' },
  { id: 'u2', name: 'PIYUSH', steps: 4200, cal: 1100, mood: 'neutral', bpm: 78, score: 52, status: 'STABLE' },
  { id: 'u3', name: 'SATVIK', steps: 2100, cal: 500, mood: 'sad', bpm: 82, score: 78, status: 'WARNING' },
  { id: 'u4', name: 'YASH', steps: 8500, cal: 1800, mood: 'happy', bpm: 70, score: 35, status: 'EXCELLENT' },
  { id: 'u5', name: 'UNKNOWN', steps: 1200, cal: 300, mood: 'angry', bpm: 95, score: 92, status: 'CRITICAL' }
];

const App = () => {
  // --- State ---
  const [steps, setSteps] = useState(3421);
  const [calories, setCalories] = useState(840);
  const [isConnected, setIsConnected] = useState(false);
  const [showDemoSelector, setShowDemoSelector] = useState(false);
  const [burnoutScore, setBurnoutScore] = useState(45);
  const [accessToken, setAccessToken] = useState(null);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleString());
  const [detectedMood, setDetectedMood] = useState(null);
  const [heartRate, setHeartRate] = useState(72);
  const [spo2, setSpo2] = useState(98);
  const [boostActive, setBoostActive] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'init-1', type: 'axon', text: 'SYSTEM INITIALIZED. STANDING BY FOR BIOMETRIC DATA.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const authClient = useRef(null);
  const { mouseMovement, typingSpeed } = useActivityTracker();

  // --- Handlers ---
  const addMessage = useCallback((text, type = 'axon') => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text }]);
  }, []);

  const handleMoodDetected = useCallback((result) => {
    if (!result?.mood) return;
    setDetectedMood(result);
    addMessage(`BIO_UPDATE// MOOD: ${result.mood.toUpperCase()}`);
    
    // Auto-trigger boost on high surprise (proxy for detection/RedBull)
    if (result.mood === 'surprised' && result.confidence > 80) {
      triggerBoost();
    }
  }, [addMessage]);

  const handleConnect = () => {
    if (authClient.current) authClient.current.requestAccessToken();
    else addMessage('ERROR// AUTH CLIENT NOT READY.');
  };

  const loadDemoUser = (user) => {
    setSteps(user.steps);
    setCalories(user.cal);
    setDetectedMood({ mood: user.mood, confidence: 99 });
    setHeartRate(user.bpm);
    setBurnoutScore(user.score);
    setCurrentUserProfile(user.name);
    setIsConnected(true);
    setShowDemoSelector(false);
    addMessage(`AUTH_BYPASS// PROFILE: ${user.name} INJECTED SUCCESSFULLY.`);
  };

  const triggerBoost = () => {
    if (boostActive) return;
    setBoostActive(true);
    addMessage('CRITICAL// BOOSTER_DETECTED: INITIATING_MAX_PERFORMANCE.');
    speakText('CAFFEINE SPIKE DETECTED. INITIATING HYPER BOOST MODE.');
    setTimeout(() => setBoostActive(false), 8000);
  };

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);

  const speakText = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.85; // Lower pitch for futuristic/robotic feel
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');
    addMessage(userText, 'user');

    const response = await getAxonResponse(userText, {
      mood: detectedMood?.mood,
      burnout: burnoutScore,
      steps: steps,
      bpm: Math.round(heartRate)
    });

    addMessage(response, 'axon');
    speakText(response);
  };

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartRate(prev => {
        const target = burnoutScore > 70 ? 88 : 72;
        return prev + (target > prev ? 0.5 : -0.5) + (Math.random() * 2 - 1);
      });
      setSpo2(98 + (Math.random() > 0.5 ? 1 : -1));
      setTimestamp(new Date().toLocaleString());
    }, 2000);
    return () => clearInterval(interval);
  }, [burnoutScore]);

  useEffect(() => {
    const initAuth = () => {
      authClient.current = initGoogleAuth(
        (response) => {
          setAccessToken(response.access_token);
          setIsConnected(true);
          addMessage('AXON// LINK ESTABLISHED.');
          speakText('SYSTEM ONLINE. LINK ESTABLISHED.');
        },
        () => addMessage('ERROR// AUTHENTICATION FAILED.')
      );
    };
    initAuth();
  }, [addMessage]);

  const status = (() => {
    if (burnoutScore > 80) return { label: 'CRITICAL', class: 'rose-text', advice: 'EMERGENCY: Immediate rest required.' };
    if (burnoutScore > 50) return { label: 'WARNING', class: 'amber-text', advice: 'ALERT: Elevated stress levels.' };
    return { label: 'OPTIMAL', class: 'emerald-text', advice: 'STABLE: System performance nominal.' };
  })();

  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="app-root-wrapper">
      <div id="main-background"></div>
      <div className="bg-grid-overlay"></div>

      <div className="container">
        <header>
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <h1>MindScreen // HUD // AXON</h1>
              {isConnected && currentUserProfile && (
                <div className="bg-axon-cyan/10 border border-axon-cyan/40 px-3 py-1 animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-axon-cyan animate-ping text-[0px] leading-[0px] inline-flex m-0 p-0 overflow-hidden box-content relative border-0"></div>
                  <span className="text-[0.6rem] font-black tracking-widest text-axon-cyan uppercase">OP_{currentUserProfile}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-6">
              <div className="text-[0.6rem] font-mono text-axon-cyan/40 tracking-widest leading-none text-right">
                WPM: {typingSpeed} <br/> DATA_LATENCY: 14ms
              </div>
              <div className="timestamp border-l border-axon-cyan/20 pl-4">{timestamp}</div>
            </div>
          </div>
        </header>

        {!isConnected && (
          <div className="permission-banner border-axon-cyan shadow-[0_0_30px_rgba(6,182,212,0.1)] !py-6 px-10 flex justify-between items-center">
            <div className="flex flex-col items-start">
              <p className="text-axon-cyan animate-pulse tracking-[0.2em] font-bold text-[0.8rem] leading-none mb-1">SYSTEM_LOCKED</p>
              <p className="text-[0.5rem] opacity-50 tracking-[0.3em] font-black uppercase">BIOMETRIC_AUTH_REQUIRED</p>
            </div>

            {!showDemoSelector ? (
              <div className="flex gap-6">
                <button className="perm-btn !p-5 !px-12 text-sm bg-axon-cyan/10 !border-2" onClick={() => setShowDemoSelector(true)}>DEMO_PROFILES</button>
                <button className="perm-btn !p-5 !px-12 text-sm border-axon-cyan !border-2" onClick={handleConnect}>SYNC_FIT</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {DEMO_USERS.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => loadDemoUser(user)}
                    className="group flex flex-col items-center bg-black/40 border-2 border-axon-cyan/30 p-3 hover:border-axon-cyan transition-all min-w-[120px]"
                  >
                    <div className="text-[0.9rem] font-bold text-white mb-0.5">{user.name}</div>
                    <div className="text-[0.5rem] opacity-50 leading-none uppercase tracking-tighter">{user.score}% STRESS</div>
                  </button>
                ))}
                <button onClick={() => setShowDemoSelector(false)} className="text-[0.6rem] opacity-50 hover:text-white px-4 font-bold">X</button>
              </div>
            )}
          </div>
        )}

        <div className="dashboard-grid">
          {/* Column 1 */}
          <div className="side-column">
            <div className="hud-panel mb-4 shadow-[inset_0_0_10px_rgba(244,63,94,0.05)]">
              <div className="panel-header"><span>VITAL_TELEMETRY</span></div>
              <div className="flex flex-col gap-4 p-2">
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[0.5rem] text-axon-rose font-bold uppercase tracking-widest">HEART_RATE</span>
                    <span className="text-2xl font-bold font-mono text-axon-rose leading-none">{Math.round(heartRate)} <span className="text-[0.6rem] opacity-50">BPM</span></span>
                  </div>
                  <div className="h-10 w-full bg-axon-rose/5 border-b border-axon-rose/20 relative overflow-hidden mt-1">
                    <HeartbeatPulse heartRate={heartRate} />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[0.5rem] text-axon-cyan font-bold uppercase tracking-widest">OXYGEN_SPO2</span>
                    <span className="text-xl font-bold font-mono text-axon-cyan">{spo2}%</span>
                  </div>
                  <div className="flex gap-1 h-3 bg-black/40 p-0.5 rounded-sm">
                    {[...Array(20)].map((_, i) => (
                      <div key={i} className={`flex-1 ${i < (spo2 - 80) ? 'bg-axon-cyan shadow-[0_0_8px_#06b6d4]' : 'bg-axon-cyan/5'}`}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <MoodScanner onMoodDetected={handleMoodDetected} burnoutScore={burnoutScore} />
            
            <div className="hud-panel mt-4">
              <div className="panel-header"><span>ACTIVITY_METRICS</span></div>
              <div className="tech-stat-row">
                <div className="text-[0.6rem] opacity-70 mb-1">STEPS_COUNT_24H</div>
                <div className="text-2xl font-bold font-mono text-white mb-2">{steps.toLocaleString()}</div>
                <div className="hud-progress h-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={`s-${i}`} className={`progress-segment ${i < (steps / 1500) ? 'active shadow-[0_0_5px_#06b6d4]' : ''}`}></div>
                  ))}
                </div>
                <div className="text-[0.5rem] mt-2 text-axon-cyan/40">CALORIES_BURNED: {calories} KCAL</div>
              </div>
            </div>
          </div>

          <div className="center-column">
            <div className={`character-display ${boostActive ? 'hyper-boost' : ''}`}>
               <div className="scan-line"></div>
               {boostActive && (
                 <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                    <div className="text-8xl animate-ping opacity-20">🔥</div>
                    <div className="text-9xl animate-pulse opacity-10 absolute">🔥</div>
                 </div>
               )}
               <img 
                 src={burnoutScore > 80 ? '/models/3.png' : burnoutScore > 40 ? '/models/2.png' : '/models/1.png'} 
                 alt="AVATAR" 
                 id="mood-character" 
                 className={`drop-shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all duration-300 ${boostActive ? 'scale-125 brightness-150 rotate-3' : ''}`} 
               />
               <div className="character-base"></div>
            </div>
            <div className="big-score-container text-center pt-8">
               <div className="text-[0.7rem] text-axon-cyan/50 tracking-[0.5em] mb-2 uppercase">Overall_Burnout_Score</div>
               <div id="burnout-score" className={`${status.class} text-7xl font-bold tracking-tighter drop-shadow-lg`}>{burnoutScore}%</div>
               <div className={`status-label py-1 px-4 border ${status.class.replace('-text', '') === 'rose' ? 'border-axon-rose/30 bg-axon-rose/5' : status.class.replace('-text', '') === 'amber' ? 'border-axon-amber/30 bg-axon-amber/5' : 'border-axon-emerald/30 bg-axon-emerald/5'} mt-4 inline-block text-[0.6rem] font-bold tracking-widest uppercase`}>
                 {status.label} // {status.advice}
               </div>
            </div>
          </div>

          <div className="side-column">
             <div className="hud-panel mb-4 border-axon-cyan/20">
              <div className="panel-header"><span>CURRENT_STATUS</span></div>
              <div className="flex flex-col gap-3 p-3">
                <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                  <span className="text-[0.55rem] opacity-50 uppercase tracking-widest">Emotion:</span>
                  <span className="text-[0.7rem] font-bold text-axon-cyan uppercase">{detectedMood?.mood || 'READY'}</span>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2 rounded">
                  <span className="text-[0.55rem] opacity-50 uppercase tracking-widest">Vibe_Index:</span>
                  <span className="text-[0.7rem] font-bold text-axon-amber uppercase">{burnoutScore < 50 ? 'CHILL' : 'HECTIC'}</span>
                </div>
                <div className="h-10 w-full bg-axon-cyan/5 mt-1 border-l border-axon-cyan relative overflow-hidden">
                  <div className="absolute inset-0 flex items-end gap-[1px]">
                    {[...Array(40)].map((_,i) => <div key={i} className="flex-1 bg-axon-cyan/20" style={{height: `${20 + Math.random()*80}%`}}></div>)}
                  </div>
                </div>
              </div>
            </div>

            <div className="hud-panel flex-1 flex flex-col min-h-[500px] overflow-hidden">
              <div className="axon-identity p-4 border-b border-axon-cyan/10 flex items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <div className="axon-avatar w-12 h-12 flex items-center justify-center bg-axon-cyan text-black text-lg font-black rounded-full shadow-[0_0_20px_#06b6d4]">A</div>
                  <div className="text-center">
                    <div className="text-[0.8rem] font-black tracking-[0.2em] text-axon-cyan">AXON.v3</div>
                    <div className="text-[0.4rem] text-axon-emerald font-bold animate-pulse tracking-widest">NEURAL_LINK_STABLE</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      setIsVoiceEnabled(!isVoiceEnabled);
                      if (!isVoiceEnabled) speakText('VOICE EMISSION ENABLED.');
                    }}
                    className={`px-4 py-1.5 border text-[0.55rem] font-black tracking-widest transition-all ${isVoiceEnabled ? 'bg-axon-cyan text-black border-axon-cyan' : 'bg-transparent text-axon-cyan/50 border-axon-cyan/30'}`}
                  >
                    SYNC_{isVoiceEnabled ? 'ON' : 'OFF'}
                  </button>
                  <button 
                    onClick={() => {
                      if (window.speechSynthesis) window.speechSynthesis.cancel();
                    }}
                    className="px-4 py-1.5 border border-axon-rose/50 text-axon-rose text-[0.55rem] font-black tracking-widest hover:bg-axon-rose hover:text-white transition-all"
                  >
                    ABORT_VOICE
                  </button>
                </div>
              </div>
              <div ref={chatRef} className="axon-chat flex-1 p-3 flex flex-col gap-5 overflow-y-auto hud-scroller mb-4">
                {messages.slice(-10).map((m, i) => (
                  <div key={i} className={`text-[0.85rem] p-4 border-l-2 leading-relaxed animate-in slide-in-from-right duration-300 ${m.type === 'axon' ? 'border-axon-cyan/40 bg-axon-cyan/10 text-axon-cyan shadow-[inset_0_0_10px_rgba(6,182,212,0.05)]' : 'border-axon-purple/40 bg-axon-purple/10 text-axon-purple shadow-[inset_0_0_10px_rgba(168,85,247,0.05)]'}`}>
                    <span className="opacity-40 text-[0.5rem] block mb-1 tracking-[0.2em]">[{m.type === 'axon' ? 'DATA_STREAM' : 'USER_INPUT'}]</span>
                    {m.text}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-axon-cyan/10 bg-black/20">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['BIO_REPORT', 'STRESS_ANALYSIS', 'TACTICAL_ADVICE', 'SYSTEM_SCAN'].map(cmd => (
                    <button 
                      key={cmd}
                      onClick={() => setInputValue(cmd)}
                      className="text-[0.5rem] p-2 border border-axon-cyan/30 text-axon-cyan/70 hover:bg-axon-cyan/10 hover:border-axon-cyan hover:text-axon-cyan transition-all uppercase font-bold text-center"
                    >
                      {cmd}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="INIT_COMMAND..."
                    className="flex-1 bg-black/50 border border-axon-cyan/30 p-3 text-[0.8rem] text-axon-cyan focus:outline-none focus:border-axon-cyan transition-all placeholder:opacity-20"
                  />
                  <button type="submit" className="px-6 bg-axon-cyan/10 border-2 border-axon-cyan text-[0.7rem] font-black text-axon-cyan hover:bg-axon-cyan hover:text-black transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]">SEND</button>
                </form>
                <div className="text-[0.35rem] text-axon-cyan/20 tracking-[0.5em] uppercase mt-3 text-center">Neural_Link_Status: NOMINAL // Secure_Socket: AES-256</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
