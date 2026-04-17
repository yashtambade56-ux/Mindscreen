import React, { useRef, useState, useEffect, useCallback } from 'react';
import { saveMoodToHistory } from '../services/activityTracker';

const MoodScanner = ({ onMoodDetected, burnoutScore }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const demoIntervalRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [faceapi, setFaceapi] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isRealTime, setIsRealTime] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [detection, setDetection] = useState(null);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  // Load Models
  useEffect(() => {
    const initFaceApi = async () => {
      try {
        const mod = await import('face-api.js');
        setFaceapi(mod);
        const MODEL_URL = '/models/face-api';
        await Promise.all([
          mod.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          mod.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
      } catch (err) { setError('CORE_FAILURE'); }
    };
    initFaceApi();
  }, []);

  // Sync stream
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current && !isDemoMode) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.warn('Play blocked', e));
    }
  }, [isCameraOpen, isDemoMode, isExpanded]);

  // Demo Mode Simulation Loop
  useEffect(() => {
    if (isDemoMode && isCameraOpen) {
      demoIntervalRef.current = setInterval(() => {
        const moods = ['happy', 'neutral', 'sad', 'angry'];
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        const res = { mood: randomMood, confidence: 85 + Math.floor(Math.random() * 10) };
        setDetection(res);
        onMoodDetected(res);
      }, 3000);
    } else {
      clearInterval(demoIntervalRef.current);
    }
    return () => clearInterval(demoIntervalRef.current);
  }, [isDemoMode, isCameraOpen, onMoodDetected]);

  // Real-time Detection Loop (Non-demo)
  useEffect(() => {
    let intervalId;
    if (isRealTime && isCameraOpen && videoRef.current && faceapi && !isDemoMode) {
      intervalId = setInterval(async () => {
        const video = videoRef.current;
        if (!video || video.paused || video.ended || video.readyState !== 4) return;
        try {
          const result = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.1 })).withFaceExpressions();
          if (result && canvasRef.current) {
            const canvas = canvasRef.current;
            const displaySize = { width: video.clientWidth, height: video.clientHeight };
            if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
              canvas.width = displaySize.width;
              canvas.height = displaySize.height;
            }
            const dims = faceapi.matchDimensions(canvas, displaySize, true);
            const resizedDetection = faceapi.resizeResults(result, dims);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const { x, y, width, height } = resizedDetection.detection.box;
            const sorted = Object.entries(resizedDetection.expressions).sort((a,b) => b[1]-a[1]);
            const [mood] = sorted[0];
            const confidence = Math.round(sorted[0][1]*100);
            const config = getMoodConfig(mood);
            
            // Draw Box
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);
            
            // Draw Emoji
            ctx.font = '64px Arial, "Segoe UI Emoji", "Apple Color Emoji", serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(config.emoji, x + width/2, y - 10);
            
            // Draw Subtitle
            ctx.font = 'BOLD 12px monospace';
            ctx.fillStyle = '#06b6d4';
            ctx.fillText(`${mood.toUpperCase()} ${confidence}%`, x + width/2, y + height + 20);

            const detectionResult = { mood, confidence };
            setDetection(detectionResult);
            // RELAY TO SYSTEM CORE
            onMoodDetected(detectionResult);
          }
        } catch (e) { console.warn('RT Error', e); }
      }, 300);
    }
    return () => clearInterval(intervalId);
  }, [isRealTime, isCameraOpen, faceapi, isDemoMode]);

  const openCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setIsCameraOpen(true);
      addLog('BIO_FEED_SYNCED');
    } catch (err) {
      setError(`DENIED: ${err.name}`);
      // Auto-fallback to demo mode if true camera fails
      setIsDemoMode(true);
      setIsCameraOpen(true);
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setIsDemoMode(false);
  };

  const captureAndDetect = async () => {
    if (isDemoMode) {
       addLog('DEMO_CAPTURE: SIMULATED');
       return;
    }
    if (!videoRef.current || !isModelsLoaded || !faceapi) return;
    setIsScanning(true);
    try {
      const res = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 416 })).withFaceExpressions();
      if (res) {
        const sorted = Object.entries(res.expressions).sort((a,b) => b[1]-a[1]);
        const mood = sorted[0][0];
        setDetection({ mood, confidence: Math.round(sorted[0][1]*100) });
        onMoodDetected({ mood, confidence: Math.round(sorted[0][1]*100) });
        saveMoodToHistory(mood);
      }
    } catch (e) { setError('SCAN_FAIL'); }
    finally { setIsScanning(false); }
  };

  const handleManualMood = (m) => {
    const config = getMoodConfig(m);
    const res = { mood: m, confidence: 100 };
    setDetection(res);
    onMoodDetected(res);
    saveMoodToHistory(m);
  };

  const renderScannerContent = (expanded) => (
    <div className={`mt-2 ${expanded ? 'flex-1 flex flex-col gap-4 overflow-hidden p-4' : ''}`}>
      <div className={`relative rounded-lg overflow-hidden bg-black/50 border border-axon-cyan/20 transition-all ${expanded ? 'flex-1 !min-h-[300px] border-2 shadow-[0_0_30px_rgba(6,182,212,0.1)]' : 'min-h-[220px]'} flex items-center justify-center ${isCameraOpen ? 'border-axon-cyan/60 shadow-[0_0_20px_rgba(6,182,212,0.2)]' : ''}`}>
        {!isCameraOpen ? (
          <button onClick={openCamera} className="perm-btn text-[0.6rem] !px-8 !py-4 border-2">INITIALIZE_BIO_LINK</button>
        ) : (
          <>
            {isDemoMode ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-axon-cyan/5 animate-pulse relative">
                <span className="text-axon-cyan text-[0.8rem] font-mono mb-4 tracking-[0.5em]">SIMULATION_LINK_STABLE</span>
                <div className={`${expanded ? 'text-9xl' : 'text-4xl'} animate-bounce duration-1000`}>{getMoodConfig(detection?.mood || 'neutral').emoji}</div>
                <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              </>
            )}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 px-2 py-1 border border-axon-cyan/20 rounded shadow-lg">
              <div className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-axon-amber animate-pulse' : 'bg-axon-cyan animate-pulse'}`}></div>
              <span className={`text-[0.5rem] font-black tracking-widest ${isDemoMode ? 'text-axon-amber' : 'text-axon-cyan'}`}>
                {isDemoMode ? 'DATA_RE_LOOP' : 'LIVE_SPECTROMETRY'}
              </span>
            </div>
            {!expanded && (
              <button onClick={() => setIsExpanded(true)} className="absolute bottom-4 right-4 bg-black/60 border border-axon-cyan/30 text-axon-cyan p-2 hover:bg-axon-cyan hover:text-black transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
            )}
          </>
        )}
        {isScanning && <div className="absolute inset-0 bg-axon-cyan/20 animate-pulse pointer-events-none z-10" />}
      </div>
      <div className={`flex flex-col gap-2 ${expanded ? 'w-full mb-6' : 'mt-3'}`}>
        {(!isCameraOpen || expanded) && (
          <div className="flex flex-wrap justify-center gap-3 py-4 border border-axon-cyan/10 rounded bg-axon-cyan/5 px-4">
            {['happy', 'neutral', 'sad', 'angry', 'disgusted', 'fearful', 'surprised'].map(m => (
              <button key={m} onClick={() => handleManualMood(m)} className={`${expanded ? 'text-4xl' : 'text-2xl'} hover:scale-150 hover:drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-all duration-300 transform active:scale-95`}>
                {getMoodConfig(m).emoji}
              </button>
            ))}
          </div>
        )}

        {isCameraOpen && (
           <div className="flex gap-4">
              <button onClick={captureAndDetect} className="flex-1 bg-axon-cyan text-black text-[0.6rem] font-black py-3 rounded uppercase tracking-[0.3em] hover:brightness-110 shadow-lg border-b-4 border-black/20">MANUAL_CAPTURE</button>
              <button onClick={() => { closeCamera(); setIsExpanded(false); }} className="px-6 border-2 border-axon-rose/40 text-axon-rose font-black text-[0.6rem] hover:bg-axon-rose hover:text-white transition-all">ABORT</button>
           </div>
        )}
      </div>

      {error && <div className="mt-2 text-[0.5rem] text-axon-rose font-bold text-center uppercase tracking-[0.3em] bg-axon-rose/10 p-2 border border-axon-rose/30">{error}</div>}
      
      {detection && (
        <div className={`p-4 border border-axon-cyan/30 rounded bg-axon-cyan/5 animate-in slide-in-from-bottom duration-500 ${expanded ? 'w-full mb-6' : 'mt-3'}`}>
           <div className="flex items-center justify-between mb-2">
             <div className={`text-sm font-bold ${getMoodConfig(detection.mood).color} flex items-center gap-3`}>
               <span className="text-2xl">{getMoodConfig(detection.mood).emoji}</span>
               {detection.mood.toUpperCase()}
             </div>
             <button onClick={() => onMoodDetected({ mood: 'surprised', confidence: 100 })} className="px-3 py-1 border-2 border-axon-rose/50 text-axon-rose text-[0.5rem] font-black hover:bg-axon-rose hover:text-white transition-all rounded shadow-lg">REDBULL_SCAN</button>
           </div>
           
           <div className="space-y-2">
             <div className="flex justify-between text-[0.5rem] text-axon-cyan/70 uppercase font-black tracking-widest">
               <span>Biometric_Vector: {detection.mood}</span>
               <span>{detection.confidence}%</span>
             </div>
             <div className="h-1 bg-black/40 w-full overflow-hidden rounded-full">
                <div className="h-full bg-axon-cyan shadow-[0_0_10px_#06b6d4] transition-all duration-700" style={{width: `${detection.confidence}%`}}></div>
             </div>
           </div>
        </div>
      )}
    </div>
  );

  const getMoodConfig = (mood) => {
    switch (mood) {
      case 'happy': return { emoji: '😊', color: 'text-axon-emerald' };
      case 'sad': return { emoji: '😔', color: 'text-axon-rose' };
      case 'angry': return { emoji: '😠', color: 'text-axon-rose' };
      case 'neutral': return { emoji: '😐', color: 'text-axon-cyan' };
      case 'disgusted': return { emoji: '🤢', color: 'text-axon-emerald' };
      case 'fearful': return { emoji: '😨', color: 'text-axon-purple' };
      case 'surprised': return { emoji: '😲', color: 'text-axon-amber' };
      default: return { emoji: '🤖', color: 'text-axon-cyan' };
    }
  };

  const addLog = (m) => { setError(m); setTimeout(() => setError(null), 3000); };

  return (
    <>
      {/* Background Dimmer & Centering Wrapper when expanded */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <div 
            className="hud-panel w-full max-w-[500px] h-full max-h-[600px] bg-[#020617] border-2 border-axon-cyan shadow-[0_0_50px_rgba(6,182,212,0.3)] flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-header flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="text-[0.4rem] bg-axon-rose px-1 text-black font-black animate-pulse">CUBE_LINK_ACTIVE</span>
                MOOD_SCANNER_v3.0
              </span>
              <button onClick={() => setIsExpanded(false)} className="bg-axon-rose/20 text-axon-rose border border-axon-rose/40 px-3 py-1 font-bold text-xs hover:bg-axon-rose hover:text-white transition-all">
                EXIT_CUBE [X]
              </button>
            </div>
            
            {/* Render the actual content here for expanded state */}
            {renderScannerContent(true)}
          </div>
        </div>
      )}
      
      {!isExpanded && (
        <div className="hud-panel mt-4 flex flex-col">
          <div className="panel-header flex justify-between items-center">
             <span>MOOD_SCANNER_v2.2</span>
             <button onClick={() => setIsRealTime(!isRealTime)} className={`text-[0.4rem] px-2 py-0.5 rounded border transition-all ${isRealTime ? 'bg-axon-cyan text-black' : 'text-axon-cyan border-axon-cyan/30'}`}>
               RT_OS: {isRealTime ? 'READY' : 'STANDBY'}
             </button>
          </div>
          {renderScannerContent(false)}
        </div>
      )}

    </>
  );
};

export default MoodScanner;
