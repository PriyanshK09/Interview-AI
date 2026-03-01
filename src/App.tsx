import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Play, Square, User, Briefcase, Building2, Settings2, Loader2, MessageSquare, X, Trophy, Target, Sparkles } from 'lucide-react';
import Markdown from 'react-markdown';
import { InterviewService, InterviewSessionConfig } from './services/interviewService';
import { AudioPlayer } from './services/audioPlayer';

export default function App() {
  const [isInterviewing, setIsInterviewing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  const [config, setConfig] = useState<InterviewSessionConfig>({
    name: 'Candidate',
    role: 'Software Engineer',
    company: 'Google',
    difficulty: 'Mid-level',
    persona: 'Friendly'
  });
  
  const interviewService = useRef<InterviewService | null>(null);
  const audioPlayer = useRef<AudioPlayer | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioPlayer.current) {
        setIsAISpeaking(audioPlayer.current.isSpeaking);
      }
    }, 100);
    return () => {
      clearInterval(interval);
      interviewService.current?.stopInterview();
      audioPlayer.current?.stop();
    };
  }, []);

  const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [transcript]);

  const startInterview = async () => {
    setIsConnecting(true);
    setStatus('connecting');
    setFeedback(null);
    setTranscript([]);
    
    interviewService.current = new InterviewService();
    audioPlayer.current = new AudioPlayer();

    try {
      await interviewService.current.startInterview(
        config,
        (text) => {
          console.log("Model text:", text);
        },
        (audioData) => {
          audioPlayer.current?.playChunk(audioData);
        },
        () => {
          console.log("Interrupted");
          audioPlayer.current?.clearQueue();
        },
        (newTranscript) => {
          setTranscript(newTranscript);
        }
      );
      setIsInterviewing(true);
      setStatus('active');
    } catch (error) {
      console.error("Failed to start interview:", error);
      setStatus('idle');
    } finally {
      setIsConnecting(false);
    }
  };

  const stopInterview = async () => {
    setIsGeneratingFeedback(true);
    
    // Get feedback before stopping the service fully
    const generatedFeedback = await interviewService.current?.getFeedback();
    if (generatedFeedback) {
      setFeedback(generatedFeedback);
      setShowFeedbackModal(true);
    }

    interviewService.current?.stopInterview();
    audioPlayer.current?.stop();
    setIsInterviewing(false);
    setIsGeneratingFeedback(false);
    setStatus('idle');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-tight">English AI Interviewer</h1>
              <p className="hidden sm:block text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Live Simulation</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${
              status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              status === 'connecting' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                status === 'active' ? 'bg-emerald-500 animate-pulse' :
                status === 'connecting' ? 'bg-amber-500 animate-pulse' :
                'bg-zinc-500'
              }`} />
              {status.toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-12 grid lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-4 space-y-6 lg:space-y-8 order-2 lg:order-1">
          <section className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl lg:rounded-3xl p-6 lg:p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <Settings2 className="w-5 h-5 text-emerald-500" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Interview Settings</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={config.name}
                    onChange={(e) => setConfig({...config, name: e.target.value})}
                    disabled={isInterviewing}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Target Role</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={config.role}
                    onChange={(e) => setConfig({...config, role: e.target.value})}
                    disabled={isInterviewing}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Company</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={config.company}
                    onChange={(e) => setConfig({...config, company: e.target.value})}
                    disabled={isInterviewing}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
                    placeholder="e.g. TechCorp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Experience Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Junior', 'Mid-level', 'Senior'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setConfig({...config, difficulty: level})}
                      disabled={isInterviewing}
                      className={`py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                        config.difficulty === level 
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      } disabled:opacity-50`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-widest mb-2">Interviewer Persona</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Friendly', 'Strict', 'Technical'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setConfig({...config, persona: p})}
                      disabled={isInterviewing}
                      className={`py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                        config.persona === p 
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      } disabled:opacity-50`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl lg:rounded-3xl p-6 lg:p-8">
            <h3 className="text-sm font-semibold text-emerald-400 mb-2">Pro Tip</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Speak naturally as you would in a real interview. The AI will listen to your responses and ask relevant follow-up questions.
            </p>
          </section>
        </div>

        {/* Right Column: Interaction Area */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8 order-1 lg:order-2">
          <div className="flex-1 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl lg:rounded-[2.5rem] relative overflow-hidden flex flex-col backdrop-blur-sm min-h-[450px] lg:min-h-[600px]">
            {/* Visualizer Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <AnimatePresence mode="wait">
                {!isInterviewing && !isConnecting && !isGeneratingFeedback ? (
                  <motion.div 
                    key="idle"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center z-10 p-6 lg:p-12"
                  >
                    <div className="w-20 h-20 lg:w-24 lg:h-24 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6 lg:mb-8 border border-zinc-700 shadow-2xl">
                      <User className="w-8 h-8 lg:w-10 lg:h-10 text-zinc-400" />
                    </div>
                    <h2 className="text-2xl lg:text-3xl font-bold mb-4 tracking-tight">Ready to start?</h2>
                    <p className="text-zinc-400 mb-8 lg:mb-10 max-w-md mx-auto leading-relaxed text-sm lg:text-base">
                      Set your target role and company on the left, then click below to begin your live voice interview session.
                    </p>
                    <button 
                      onClick={startInterview}
                      className="group relative px-6 lg:px-8 py-3 lg:py-4 bg-emerald-500 text-black font-bold rounded-xl lg:rounded-2xl flex items-center gap-3 mx-auto transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/20 text-sm lg:text-base"
                    >
                      <Play className="w-4 h-4 lg:w-5 lg:h-5 fill-current" />
                      START INTERVIEW
                    </button>
                  </motion.div>
                ) : (isConnecting || isGeneratingFeedback) ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center text-center z-10 p-6"
                  >
                    <Loader2 className="w-10 h-10 lg:w-12 lg:h-12 text-emerald-500 animate-spin mx-auto mb-6" />
                    <h2 className="text-lg lg:text-xl font-semibold text-zinc-300">
                      {isConnecting ? 'Establishing Connection...' : 'Analyzing Performance...'}
                    </h2>
                    <p className="text-zinc-500 text-xs lg:text-sm mt-2">
                      {isConnecting ? 'Initializing Gemini Live API' : 'Generating constructive feedback'}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="active"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col z-10 min-h-0"
                  >
                    {/* Active Interview Header */}
                    <div className="p-4 lg:p-6 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-900/20">
                      <div className="flex items-center gap-3 lg:gap-4">
                        <div className="relative">
                          <AnimatePresence>
                            {isAISpeaking && (
                              <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                transition={{ 
                                  duration: 1, 
                                  repeat: Infinity,
                                  ease: "easeOut" 
                                }}
                                className="absolute inset-0 bg-emerald-500/30 rounded-full blur-md"
                              />
                            )}
                          </AnimatePresence>
                          <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                            isAISpeaking 
                              ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                              : 'bg-zinc-800 border-zinc-700'
                          }`}>
                            <User className={`w-4 h-4 lg:w-5 lg:h-5 transition-colors ${isAISpeaking ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] lg:text-xs font-bold text-zinc-500 uppercase tracking-widest truncate">Interviewer</p>
                            {isAISpeaking && (
                              <motion.span 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[8px] lg:text-[10px] text-emerald-500 font-bold uppercase tracking-tighter animate-pulse whitespace-nowrap"
                              >
                                Speaking...
                              </motion.span>
                            )}
                          </div>
                          <p className="text-xs lg:text-sm font-medium text-zinc-300 truncate">Interviewing for {config.role}</p>
                        </div>
                      </div>
                      <button 
                        onClick={stopInterview}
                        className="px-3 lg:px-4 py-1.5 lg:py-2 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 border border-zinc-700 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
                      >
                        <Square className="w-2.5 h-2.5 lg:w-3 lg:h-3 fill-current" />
                        STOP
                      </button>
                    </div>

                    {/* Transcript Area */}
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar bg-zinc-950/30">
                      {transcript.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 opacity-50">
                          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <p className="text-xs lg:text-sm italic font-medium">Connecting to interviewer...</p>
                        </div>
                      )}
                      {transcript.map((msg, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] lg:max-w-[75%]`}>
                            <span className="text-[9px] uppercase tracking-[0.2em] text-zinc-500 font-black mb-1.5 px-1">
                              {msg.role === 'user' ? 'Candidate' : 'Interviewer'}
                            </span>
                            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-emerald-500 text-black font-semibold rounded-tr-none shadow-emerald-500/10' 
                                : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700/50 shadow-black/20'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={transcriptEndRef} />
                    </div>

                    {/* Voice Visualizer Footer */}
                    <div className="p-4 lg:p-6 border-t border-zinc-800/50 bg-zinc-900/20 flex items-center justify-center gap-4 lg:gap-8">
                      <div className="hidden sm:flex gap-1 items-end h-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [6, 24, 6] }}
                            transition={{ 
                              duration: 0.8, 
                              repeat: Infinity, 
                              delay: i * 0.1,
                              ease: "easeInOut"
                            }}
                            className="w-1 bg-emerald-500/50 rounded-full"
                          />
                        ))}
                      </div>
                      <p className="text-[8px] lg:text-[10px] uppercase tracking-widest text-zinc-500 font-bold animate-pulse text-center">
                        Listening for your voice...
                      </p>
                      <div className="hidden sm:flex gap-1 items-end h-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ height: [6, 24, 6] }}
                            transition={{ 
                              duration: 0.8, 
                              repeat: Infinity, 
                              delay: i * 0.1,
                              ease: "easeInOut"
                            }}
                            className="w-1 bg-emerald-500/50 rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <Mic className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Input</p>
                <p className="text-sm font-medium truncate">16kHz Mono</p>
              </div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Model</p>
                <p className="text-sm font-medium truncate">Gemini 2.5 Live</p>
              </div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Loader2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Latency</p>
                <p className="text-sm font-medium truncate">~200ms</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && feedback && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFeedbackModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <div className="p-5 sm:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold">Interview Feedback</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Performance Summary</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-500" />
                </button>
              </div>

              <div className="p-5 sm:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">Analysis</h3>
                    </div>
                    <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed">
                      <Markdown>{feedback}</Markdown>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-8 bg-zinc-950/50 border-t border-zinc-800 flex justify-end">
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:scale-105 transition-transform text-sm"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
