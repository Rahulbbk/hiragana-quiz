import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

const HIRAGANA_DATA = [
  { hiragana: 'ん', romaji: 'n' },   { hiragana: 'す', romaji: 'su' }, { hiragana: 'め', romaji: 'me' }, { hiragana: 'ひ', romaji: 'hi' }, { hiragana: 'と', romaji: 'to' },
  { hiragana: 'わ', romaji: 'wa' },  { hiragana: 'か', romaji: 'ka' }, { hiragana: 'て', romaji: 'te' }, { hiragana: 'ゆ', romaji: 'yu' }, { hiragana: 'つ', romaji: 'tsu' },
  { hiragana: 'ろ', romaji: 'ro' },  { hiragana: 'も', romaji: 'mo' }, { hiragana: 'な', romaji: 'na' }, { hiragana: 'こ', romaji: 'ko' }, { hiragana: 'や', romaji: 'ya' },
  { hiragana: 'む', romaji: 'mu' },  { hiragana: 'お', romaji: 'o' },  { hiragana: 'く', romaji: 'ku' }, { hiragana: 'し', romaji: 'shi' },{ hiragana: 'ぬ', romaji: 'nu' },
  { hiragana: 'み', romaji: 'mi' },  { hiragana: 'け', romaji: 'ke' }, { hiragana: 'ほ', romaji: 'ho' }, { hiragana: 'は', romaji: 'ha' }, { hiragana: 'る', romaji: 'ru' },
  { hiragana: 'れ', romaji: 're' },  { hiragana: 'た', romaji: 'ta' }, { hiragana: 'え', romaji: 'e' },  { hiragana: 'に', romaji: 'ni' }, { hiragana: 'さ', romaji: 'sa' },
  { hiragana: 'い', romaji: 'i' },   { hiragana: 'そ', romaji: 'so' }, { hiragana: 'よ', romaji: 'yo' }, { hiragana: 'り', romaji: 'ri' }, { hiragana: 'ふ', romaji: 'fu' },
  { hiragana: 'う', romaji: 'u' },   { hiragana: 'あ', romaji: 'a' },  { hiragana: 'せ', romaji: 'se' }, { hiragana: 'ま', romaji: 'ma' }, { hiragana: 'ち', romaji: 'chi' },
  { hiragana: 'ね', romaji: 'ne' },  { hiragana: 'へ', romaji: 'he' }, { hiragana: 'の', romaji: 'no' }, { hiragana: 'ら', romaji: 'ra' }, { hiragana: 'き', romaji: 'ki' }
];

export default function App() {
  const [gameState, setGameState] = useState('menu');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(360);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStudyGuide, setShowStudyGuide] = useState(false);
  const [hoveredChar, setHoveredChar] = useState(null);

  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'correct') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'complete') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const noteOsc = ctx.createOscillator();
          const noteGain = ctx.createGain();
          noteOsc.connect(noteGain);
          noteGain.connect(ctx.destination);
          noteOsc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          noteGain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
          noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.2);
          noteOsc.start(ctx.currentTime + idx * 0.1);
          noteOsc.stop(ctx.currentTime + idx * 0.1 + 0.25);
        });
      }
    } catch (e) {
      console.log("Audio play blocked/unsupported:", e);
    }
  };

  const startGame = () => {
    const indexes = Array.from({ length: HIRAGANA_DATA.length }, (_, i) => i);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    setQuestions(indexes);
    setCurrentIndex(0);
    setUserAnswers({});
    setTimeLeft(360);
    setGameState('playing');
  };

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing' && questions.length > 0) {
      if (Object.keys(userAnswers).length === HIRAGANA_DATA.length) {
        endGame();
      }
    }
  }, [userAnswers, gameState, questions]);

  const endGame = () => {
    setGameState('ended');
    playSound('complete');
  };

  const handleCardClick = (clickedChar) => {
    if (gameState !== 'playing') return;
    const currentCorrectItem = HIRAGANA_DATA[questions[currentIndex]];
    const romajiKey = currentCorrectItem.romaji;
    if (userAnswers[romajiKey]) return;

    const isCorrect = clickedChar.romaji === romajiKey;
    const newAnswers = {
      ...userAnswers,
      [romajiKey]: {
        clicked: clickedChar.hiragana,
        correctHiragana: currentCorrectItem.hiragana,
        isCorrect
      }
    };
    setUserAnswers(newAnswers);
    playSound(isCorrect ? 'correct' : 'wrong');
    moveToNextUnanswered(currentIndex, newAnswers);
  };

  const moveToNextUnanswered = (startIdx, currentAnswers) => {
    let found = false;
    for (let i = startIdx + 1; i < questions.length; i++) {
      if (!currentAnswers[HIRAGANA_DATA[questions[i]].romaji]) {
        setCurrentIndex(i); found = true; break;
      }
    }
    if (!found) {
      for (let i = 0; i < startIdx; i++) {
        if (!currentAnswers[HIRAGANA_DATA[questions[i]].romaji]) {
          setCurrentIndex(i); found = true; break;
        }
      }
    }
  };

  const navigateQuestion = (direction) => {
    if (gameState !== 'playing') return;
    if (direction === 'next') {
      setCurrentIndex((currentIndex + 1) % questions.length);
    } else {
      setCurrentIndex((currentIndex - 1 + questions.length) % questions.length);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCardStyle = (item) => {
    const answeredEntry = userAnswers[item.romaji];

    if (gameState === 'ended') {
      if (answeredEntry) {
        return answeredEntry.isCorrect
          ? 'bg-emerald-500 text-white shadow-emerald-200 border-emerald-600 scale-95'
          : 'bg-rose-500 text-white shadow-rose-200 border-rose-600 animate-pulse';
      }
      return 'bg-slate-100 text-slate-400 border-slate-200 opacity-60';
    }

    if (gameState === 'playing' || gameState === 'paused') {
      if (answeredEntry?.isCorrect) {
        return 'bg-emerald-500 text-white border-emerald-600 pointer-events-none scale-95 opacity-80';
      }
      if (answeredEntry && !answeredEntry.isCorrect) {
        return 'bg-slate-100 text-slate-400 border-slate-200 pointer-events-none opacity-80';
      }
      return 'bg-white hover:bg-indigo-50 hover:border-indigo-400 active:bg-indigo-100 border-slate-200 text-slate-800 shadow-sm transform hover:-translate-y-0.5 transition-all';
    }

    return 'bg-white border-slate-200 text-slate-800';
  };

  const answeredCount = Object.keys(userAnswers).length;
  const correctCount = Object.values(userAnswers).filter(a => a.isCorrect).length;
  const wrongCount = answeredCount - correctCount;
  const progressPercent = (answeredCount / HIRAGANA_DATA.length) * 100;
  const currentPrompt = questions.length > 0 ? HIRAGANA_DATA[questions[currentIndex]] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10 px-4 py-3 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Hiragana Mastery
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">Test your Japanese syllabary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={soundEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowStudyGuide(!showStudyGuide)}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-all ${
                showStudyGuide ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Study Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 flex flex-col justify-start">

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="flex-grow flex flex-col items-center justify-center py-10 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/30 animate-pulse">
              <span className="text-4xl text-indigo-400 font-bold">あ</span>
            </div>
            <h2 className="text-3xl font-extrabold mb-3 text-white tracking-tight">Ready for the Challenge?</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Match the Romaji prompt with the correct Hiragana character. Correct cards will light up{' '}
              <span className="text-emerald-400 font-semibold">Green</span>. Missed cards will be revealed in{' '}
              <span className="text-rose-400 font-semibold">Red</span> at the very end of the test.
            </p>
            <button
              onClick={startGame}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/25 transition-all text-base flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Challenge (45 Keys)</span>
            </button>
            <div className="grid grid-cols-2 gap-4 w-full mt-12 border-t border-slate-800 pt-8 text-left">
              <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Time Limit</h4>
                <p className="text-sm font-semibold text-slate-300">6 Minutes</p>
              </div>
              <div className="p-3.5 bg-slate-900/50 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Format</h4>
                <p className="text-sm font-semibold text-slate-300">Grid Selection</p>
              </div>
            </div>
          </div>
        )}

        {/* Study Guide */}
        {showStudyGuide && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 mb-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Interactive Study Chart</h3>
              </div>
              <p className="text-xs text-indigo-400 font-medium">Hover or tap cards to reveal reading</p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {HIRAGANA_DATA.map((item, idx) => (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredChar(idx)}
                  onMouseLeave={() => setHoveredChar(null)}
                  onTouchStart={() => setHoveredChar(idx)}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center justify-center transition-all hover:bg-indigo-950/40 hover:border-indigo-500/50 cursor-help"
                >
                  <span className="text-xl font-bold text-slate-100">{item.hiragana}</span>
                  <span className="text-xs font-medium text-indigo-400 mt-1">
                    {hoveredChar === idx ? item.romaji : '•'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gameplay */}
        {(gameState === 'playing' || gameState === 'paused' || gameState === 'ended') && (
          <div className="w-full flex flex-col gap-5">

            {/* HUD */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Progress</span>
                  <span className="text-lg font-extrabold text-white">
                    {answeredCount} <span className="text-slate-500 text-sm">/ 45 Answered</span>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full ${gameState === 'playing' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
                    <span className="font-mono text-lg font-bold tracking-wider text-slate-200">{formatTime(timeLeft)}</span>
                  </div>
                  {gameState !== 'ended' && (
                    <button
                      onClick={() => setGameState(gameState === 'playing' ? 'paused' : 'playing')}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        gameState === 'playing'
                          ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                          : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white'
                      }`}
                    >
                      {gameState === 'playing' ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800/50">
                <div
                  className="bg-indigo-500 h-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            {/* Prompt */}
            {gameState !== 'ended' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col items-center justify-center">
                {gameState === 'paused' ? (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <Pause className="w-12 h-12 text-amber-500 animate-pulse" />
                    <p className="text-slate-400 font-medium">Game Paused</p>
                    <button
                      onClick={() => setGameState('playing')}
                      className="mt-2 px-5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                      Resume Challenge
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <button
                        onClick={() => navigateQuestion('prev')}
                        className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-center py-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">FIND THE HIRAGANA FOR</span>
                      <h3 className="text-6xl font-extrabold tracking-tight text-white mt-1 select-none font-mono">
                        {currentPrompt?.romaji}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2">
                        Question {currentIndex + 1} of 45
                      </p>
                    </div>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <button
                        onClick={() => navigateQuestion('next')}
                        className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Results Panel */}
            {gameState === 'ended' && (
              <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl p-6 shadow-2xl">
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/30 text-indigo-400 mb-3">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Challenge Completed!</h3>
                  <p className="text-slate-400 text-xs mt-1">Review your results below. All incorrect answers are highlighted in Red.</p>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-500 block font-medium">Final Score</span>
                    <span className="text-xl font-bold text-white">{correctCount} / 45</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-500 block font-medium">Accuracy</span>
                    <span className="text-xl font-bold text-emerald-400">{Math.round((correctCount / 45) * 100)}%</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl text-center">
                    <span className="text-xs text-slate-500 block font-medium">Missed Keys</span>
                    <span className="text-xl font-bold text-rose-400">{wrongCount}</span>
                  </div>
                </div>
                {wrongCount > 0 && (
                  <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 mb-6 max-h-36 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-rose-400" />
                      Study List (Your Mistakes)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(userAnswers).map(([romaji, value]) =>
                        !value.isCorrect ? (
                          <span key={romaji} className="bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-300">
                            {value.correctHiragana} ({romaji})
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={startGame}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            )}

            {/* Hiragana Grid */}
            <div className="relative">
              {gameState === 'paused' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-20 rounded-2xl flex items-center justify-center">
                  <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                    <Pause className="w-4 h-4" /> Game is paused. Click Play above to show buttons.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-5 gap-2 sm:gap-3">
                {HIRAGANA_DATA.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleCardClick(item)}
                    disabled={gameState !== 'playing'}
                    className={`h-14 sm:h-16 rounded-xl text-lg sm:text-2xl font-bold border flex flex-col items-center justify-center transition-all ${getCardStyle(item)}`}
                  >
                    <span>{item.hiragana}</span>
                    {gameState === 'ended' && userAnswers[item.romaji] && (
                      <span className="text-[10px] font-mono font-medium opacity-80 uppercase">
                        {item.romaji}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-600 border-t border-slate-900 mt-8 max-w-4xl mx-auto w-full">
        <p>Interactive Hiragana Keyboard Trainer • Beautiful educational utilities</p>
      </footer>
    </div>
  );
}
