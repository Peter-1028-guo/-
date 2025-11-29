import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, RewriteStyle, STYLE_LABELS, TargetLanguage, LANGUAGE_LABELS } from './types';
import { transcribeAudio, rewriteText } from './services/siliconFlowService';
import { LOCAL_STORAGE_API_KEY } from './constants';
import SettingsModal from './components/SettingsModal';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_API_KEY) || '');
  
  const [activeStyle, setActiveStyle] = useState<RewriteStyle | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<TargetLanguage>('Original');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea logic
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to correctly calculate scrollHeight for shrinking content
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [transcription]);

  // Format seconds into MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return {
      min: minutes.toString().padStart(2, '0'),
      sec: seconds.toString().padStart(2, '0')
    };
  };

  const { min, sec } = formatTime(duration);

  const handleStartRecording = async () => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setErrorMessage(null);
    setTranscription('');
    setActiveStyle(null);
    setActiveLanguage('Original');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        handleTranscription(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatus(AppStatus.RECORDING);
      
      // Start Timer
      setDuration(0);
      timerIntervalRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMessage("Microphone access denied or not available.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      setStatus(AppStatus.PROCESSING);
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    try {
      const result = await transcribeAudio(audioBlob, apiKey);
      setTranscription(result.text);
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to transcribe audio.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleProcessText = async (newStyle: RewriteStyle | null, newLanguage: TargetLanguage) => {
    if (!transcription) return;
    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const previousStatus = status;
    setStatus(AppStatus.REWRITING);
    setActiveStyle(newStyle);
    setActiveLanguage(newLanguage);
    setErrorMessage(null);

    try {
      // Pass null if style is not selected, pass language
      const result = await rewriteText(transcription, newStyle, newLanguage, apiKey);
      setTranscription(result);
      setStatus(AppStatus.COMPLETED);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process text.");
      setStatus(previousStatus === AppStatus.COMPLETED ? AppStatus.COMPLETED : AppStatus.ERROR);
      // Revert states on error roughly, or just keep them as user intention
    }
  };

  const onStyleClick = (style: RewriteStyle) => {
    // If clicking the active style, deselect it (toggle off)
    const nextStyle = activeStyle === style ? null : style;
    handleProcessText(nextStyle, activeLanguage);
  };

  const onLanguageClick = (language: TargetLanguage) => {
    // Cannot deselect language completely to null, default is Original
    if (activeLanguage === language) return; 
    handleProcessText(activeStyle, language);
  };

  const handleDiscard = () => {
    setTranscription('');
    setDuration(0);
    setErrorMessage(null);
    setStatus(AppStatus.IDLE);
    setActiveStyle(null);
    setActiveLanguage('Original');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const handleSaveNote = () => {
    // In a real app, this would save to a database.
    alert("Note saved!");
    handleDiscard();
  };

  const updateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(LOCAL_STORAGE_API_KEY, key);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const isInteracting = status === AppStatus.RECORDING || status === AppStatus.PROCESSING || status === AppStatus.REWRITING;

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden font-display">
      <div className="layout-container flex h-full grow flex-col">
        <div className="flex flex-1 justify-center py-5 sm:px-10 md:px-20 lg:px-40">
          <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
            
            {/* Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 px-4 sm:px-10 py-3">
              <div className="flex items-center gap-4 text-white">
                <div className="size-6 text-primary">
                  <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_6_543)">
                      <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z"></path>
                      <path clipRule="evenodd" d="M7.24189 26.4066C7.31369 26.4411 7.64204 26.5637 8.52504 26.3738C9.59462 26.1438 11.0343 25.5311 12.7183 24.4963C14.7583 23.2426 17.0256 21.4503 19.238 19.238C21.4503 17.0256 23.2426 14.7583 24.4963 12.7183C25.5311 11.0343 26.1438 9.59463 26.3738 8.52504C26.5637 7.64204 26.4411 7.31369 26.4066 7.24189C26.345 7.21246 26.143 7.14535 25.6664 7.1918C24.9745 7.25925 23.9954 7.5498 22.7699 8.14278C20.3369 9.32007 17.3369 11.4915 14.4142 14.4142C11.4915 17.3369 9.32007 20.3369 8.14278 22.7699C7.5498 23.9954 7.25925 24.9745 7.1918 25.6664C7.14534 26.143 7.21246 26.345 7.24189 26.4066ZM29.9001 10.7285C29.4519 12.0322 28.7617 13.4172 27.9042 14.8126C26.465 17.1544 24.4686 19.6641 22.0664 22.0664C19.6641 24.4686 17.1544 26.465 14.8126 27.9042C13.4172 28.7617 12.0322 29.4519 10.7285 29.9001L21.5754 40.747C21.6001 40.7606 21.8995 40.931 22.8729 40.7217C23.9424 40.4916 25.3821 39.879 27.0661 38.8441C29.1062 37.5904 31.3734 35.7982 33.5858 33.5858C35.7982 31.3734 37.5904 29.1062 38.8441 27.0661C39.879 25.3821 40.4916 23.9425 40.7216 22.8729C40.931 21.8995 40.7606 21.6001 40.747 21.5754L29.9001 10.7285ZM29.2403 4.41187L43.5881 18.7597C44.9757 20.1473 44.9743 22.1235 44.6322 23.7139C44.2714 25.3919 43.4158 27.2666 42.252 29.1604C40.8128 31.5022 38.8165 34.012 36.4142 36.4142C34.012 38.8165 31.5022 40.8128 29.1604 42.252C27.2666 43.4158 25.3919 44.2714 23.7139 44.6322C22.1235 44.9743 20.1473 44.9757 18.7597 43.5881L4.41187 29.2403C3.29027 28.1187 3.08209 26.5973 3.21067 25.2783C3.34099 23.9415 3.8369 22.4852 4.54214 21.0277C5.96129 18.0948 8.43335 14.7382 11.5858 11.5858C14.7382 8.43335 18.0948 5.9613 21.0277 4.54214C22.4852 3.8369 23.9415 3.34099 25.2783 3.21067C26.5973 3.08209 28.1187 3.29028 29.2403 4.41187Z"></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_6_543"><rect fill="white" height="48" width="48"></rect></clipPath>
                    </defs>
                  </svg>
                </div>
                <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">AI Voice Notes</h2>
              </div>
              
              <div className="flex gap-2">
                 <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors gap-2 text-sm font-bold leading-normal min-w-0 px-3"
                  title="Configure API Token"
                >
                  <span className="material-symbols-outlined text-xl">settings</span>
                </button>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-col flex-1 w-full items-center justify-center p-4">
              <div className="flex flex-col gap-8 w-full max-w-2xl">
                
                {/* Title */}
                <div className="flex flex-wrap justify-center gap-3 text-center">
                  <p className="text-white text-4xl font-black leading-tight tracking-[-0.033em] w-full">
                    {status === AppStatus.IDLE && !transcription ? 'New Voice Note' : 'Voice Note'}
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-center text-sm">
                    {errorMessage}
                  </div>
                )}
                
                 {/* Transcription Area */}
                <div className="flex flex-col w-full gap-2">
                  <div className="flex justify-between items-baseline">
                      <p className="text-white text-base font-medium leading-normal">Transcription</p>
                      {status === AppStatus.PROCESSING && (
                        <span className="text-primary text-sm animate-pulse font-medium">Processing audio...</span>
                      )}
                      {status === AppStatus.REWRITING && (
                        <span className="text-primary text-sm animate-pulse font-medium">Processing text...</span>
                      )}
                  </div>
                  
                  <textarea 
                    ref={textareaRef}
                    className="form-input flex w-full min-w-0 resize-none overflow-y-auto rounded-lg text-white/90 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-white/20 bg-black/20 focus:border-primary/80 min-h-36 max-h-[60vh] placeholder:text-white/40 p-4 text-base font-normal leading-normal disabled:opacity-50 transition-all" 
                    placeholder={status === AppStatus.RECORDING ? "Listening..." : "Start speaking to see your words here..."}
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    disabled={isInteracting}
                  ></textarea>

                  {/* Tools Area */}
                  {transcription && status !== AppStatus.RECORDING && status !== AppStatus.PROCESSING && (
                    <div className="flex flex-col gap-3 mt-2 bg-black/10 rounded-lg p-3 border border-white/5">
                      
                      {/* Language Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs uppercase font-bold tracking-wider min-w-[60px]">Language:</span>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(LANGUAGE_LABELS) as TargetLanguage[]).map((lang) => (
                            <button
                              key={lang}
                              onClick={() => onLanguageClick(lang)}
                              disabled={status === AppStatus.REWRITING}
                              className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                ${activeLanguage === lang 
                                  ? 'bg-white/20 text-white border border-white/30' 
                                  : 'bg-transparent text-white/60 hover:text-white border border-transparent hover:bg-white/5'}
                                ${status === AppStatus.REWRITING ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              {LANGUAGE_LABELS[lang]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Style Selection */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white/50 text-xs uppercase font-bold tracking-wider min-w-[60px]">Style:</span>
                         <div className="flex flex-wrap gap-2">
                          {(Object.keys(STYLE_LABELS) as RewriteStyle[]).map((style) => (
                            <button
                              key={style}
                              onClick={() => onStyleClick(style)}
                              disabled={status === AppStatus.REWRITING}
                              className={`
                                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                                ${activeStyle === style 
                                  ? 'bg-primary text-white ring-1 ring-primary' 
                                  : 'bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'}
                                ${status === AppStatus.REWRITING ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              <span className="material-symbols-outlined text-[16px]">{STYLE_LABELS[style].icon}</span>
                              {STYLE_LABELS[style].label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* Timer & Controls */}
                <div className="flex flex-col items-center justify-center gap-6 py-6 px-4 rounded-xl bg-black/20 relative overflow-hidden">
                  
                  {/* Timer Display */}
                  <div className="flex gap-4 w-full max-w-xs justify-center">
                    <div className="flex flex-col items-stretch gap-2 w-20">
                      <div className="flex h-14 items-center justify-center rounded-lg px-3 bg-black/20">
                        <p className={`text-white text-xl font-bold leading-tight tracking-[-0.015em] ${status === AppStatus.RECORDING ? 'text-primary' : ''}`}>
                          {min}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center text-white text-xl font-bold">:</div>
                    <div className="flex flex-col items-stretch gap-2 w-20">
                      <div className="flex h-14 items-center justify-center rounded-lg px-3 bg-black/20">
                        <p className={`text-white text-xl font-bold leading-tight tracking-[-0.015em] ${status === AppStatus.RECORDING ? 'text-primary' : ''}`}>
                          {sec}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mic Button */}
                  <div className="relative">
                     {status === AppStatus.RECORDING ? (
                        <button 
                          onClick={handleStopRecording}
                          className="flex items-center justify-center overflow-hidden rounded-full h-20 w-20 bg-red-500 text-white gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-500/30 recording-pulse"
                        >
                          <span className="material-symbols-outlined text-4xl">stop</span>
                        </button>
                     ) : (
                        <button 
                          onClick={handleStartRecording}
                          disabled={isInteracting}
                          className="flex items-center justify-center overflow-hidden rounded-full h-20 w-20 bg-primary text-white gap-2 transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-4xl">mic</span>
                        </button>
                     )}
                  </div>
                  
                  {(status === AppStatus.PROCESSING || status === AppStatus.REWRITING) && (
                     <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20">
                        <div className="h-full bg-primary animate-[shimmer_2s_infinite] w-1/3 mx-auto rounded-full"></div>
                     </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row px-4 py-3 justify-center gap-4">
                  <button 
                    onClick={handleDiscard}
                    disabled={isInteracting}
                    className="flex min-w-[120px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-white/10 text-white/80 hover:text-white hover:bg-white/20 transition-colors gap-2 text-base font-bold leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handleSaveNote}
                    disabled={isInteracting || (!transcription && duration === 0)}
                    className="flex min-w-[120px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white gap-2 text-base font-bold leading-normal transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" 
                  >
                    Save Note
                  </button>
                </div>

              </div>
            </main>
          </div>
        </div>
      </div>
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateApiKey}
      />
    </div>
  );
};

export default App;