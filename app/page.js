'use client';
import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [timerState, setTimerState] = useState({
    isRunning: false,
    isFocus: true,
    timeLeft: 25 * 60,
    totalSessions: 0,
    consecutiveSessions: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  // Initialize from localStorage
  useEffect(() => {
    // Load saved state
    const savedState = localStorage.getItem('pomodoroState');
    const savedMode = localStorage.getItem('darkMode');
    
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // Calculate elapsed time if timer was running
      if (parsedState.isRunning) {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - parsedState.lastUpdated) / 1000);
        parsedState.timeLeft = Math.max(0, parsedState.timeLeft - elapsedSeconds);
        
        // Check if timer completed while closed
        if (parsedState.timeLeft === 0) {
          handleTimerCompletion(parsedState);
        }
      }
      setTimerState(parsedState);
    }
    
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
    
    setIsLoading(false);
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      const stateToSave = {
        ...timerState,
        lastUpdated: Date.now()
      };
      localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
    }
  }, [timerState, isLoading]);

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Handle timer completion
  const handleTimerCompletion = (state) => {
    state.isRunning = false;
    
    if (state.isFocus) {
      // Focus completed - switch to break
      state.isFocus = false;
      state.totalSessions += 1;
      state.consecutiveSessions += 1;
      
      // Check for long break
      if (state.consecutiveSessions >= 4) {
        state.timeLeft = 15 * 60; // 15 min long break
        state.consecutiveSessions = 0;
      } else {
        state.timeLeft = 5 * 60; // 5 min short break
      }
      
      // Play sound
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed'));
      }
      
      // Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Break Time! 🎉', {
          body: 'Great job! Time for a well-deserved break.',
          icon: '/favicon.ico'
        });
      }
    } else {
      // Break completed - switch to focus
      state.isFocus = true;
      state.timeLeft = 25 * 60; // 25 min focus
      
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed'));
      }
      
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Focus Time! ⏰', {
          body: 'Break is over! Ready to focus again?',
          icon: '/favicon.ico'
        });
      }
    }
    
    return state;
  };

  // Timer countdown logic
  useEffect(() => {
    if (timerState.isRunning) {
      lastUpdateRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        setTimerState(prevState => {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - lastUpdateRef.current) / 1000);
          
          if (elapsedSeconds > 0) {
            lastUpdateRef.current = now;
            
            let newTimeLeft = prevState.timeLeft - elapsedSeconds;
            
            if (newTimeLeft <= 0) {
              // Timer completed - handle auto-switch
              const completedState = handleTimerCompletion({ ...prevState });
              return completedState;
            } else {
              // Timer still running
              return {
                ...prevState,
                timeLeft: newTimeLeft
              };
            }
          }
          
          return prevState;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerState.isRunning]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (timerState.isRunning) {
          pauseTimer();
        } else {
          startTimer();
        }
      }
      if (event.code === 'KeyR') {
        event.preventDefault();
        resetTimer();
      }
      if (event.code === 'KeyS') {
        event.preventDefault();
        switchMode();
      }
      if (event.code === 'KeyD') {
        event.preventDefault();
        setDarkMode(!darkMode);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timerState.isRunning, darkMode]);

  // Timer controls
  const startTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: true
    }));
  };

  const pauseTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false
    }));
  };

  const resetTimer = () => {
    setTimerState(prev => ({
      ...prev,
      isRunning: false,
      timeLeft: prev.isFocus ? 25 * 60 : 5 * 60
    }));
  };

  const switchMode = () => {
    setTimerState(prev => {
      const newIsFocus = !prev.isFocus;
      return {
        ...prev,
        isFocus: newIsFocus,
        timeLeft: newIsFocus ? 25 * 60 : 5 * 60,
        isRunning: false,
        totalSessions: newIsFocus ? prev.totalSessions + 1 : prev.totalSessions
      };
    });
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const totalTime = timerState.isFocus ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timerState.timeLeft) / totalTime) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Calculate stats
  const stats = {
    totalSessions: timerState.totalSessions,
    consecutiveSessions: timerState.consecutiveSessions,
    nextLongBreak: Math.max(0, 4 - timerState.consecutiveSessions),
    isLongBreakNext: timerState.consecutiveSessions >= 3
  };

  // Styles based on dark mode
  const getStyles = () => {
    if (darkMode) {
      return {
        main: "min-h-screen bg-gray-900 text-white flex items-center justify-center p-4 transition-colors duration-200",
        card: "bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6 transition-colors duration-200",
        textMuted: "text-gray-400",
        buttonPrimary: "bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm",
        buttonSecondary: "border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm",
        progressBg: "#374151",
        progressFill: timerState.isFocus ? "#3b82f6" : "#10b981",
        statsBg: "bg-gray-700 border-gray-600"
      };
    } else {
      return {
        main: "min-h-screen bg-white text-black flex items-center justify-center p-4 transition-colors duration-200",
        card: "bg-white border border-gray-300 rounded-2xl shadow-xl p-6 transition-colors duration-200",
        textMuted: "text-gray-500",
        buttonPrimary: "bg-black text-white hover:bg-gray-800 px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm",
        buttonSecondary: "border border-gray-300 text-gray-700 hover:border-gray-400 hover:text-black px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm",
        progressBg: "#f3f4f6",
        progressFill: timerState.isFocus ? "#3b82f6" : "#10b981",
        statsBg: "bg-gray-50 border-gray-200"
      };
    }
  };

  const styles = getStyles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Timer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={`${styles.card} w-full max-w-sm`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-2xl font-light mb-1">POMODORO</h1>
            <div className={`${styles.textMuted} text-sm font-medium`}>
              {timerState.isFocus ? 'FOCUS TIME' : 'BREAK TIME'}
              {timerState.isRunning && ' • RUNNING'}
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors duration-200"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Circular Progress */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="50%" cy="50%" r={radius} stroke={styles.progressBg} strokeWidth="3" fill="none" />
            <circle cx="50%" cy="50%" r={radius} stroke={styles.progressFill} strokeWidth="3" fill="none"
              strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-light tracking-tight mb-2">
              {formatTime(timerState.timeLeft)}
            </div>
            <div className={`text-sm ${timerState.isFocus ? 'text-blue-500' : 'text-green-500'} font-medium`}>
              {timerState.isFocus ? 'Stay Focused!' : 'Enjoy Your Break!'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-3 mb-8">
          {timerState.isRunning ? (
            <button onClick={pauseTimer} className={styles.buttonSecondary}>
              ⏸️ PAUSE
            </button>
          ) : (
            <button onClick={startTimer} className={styles.buttonPrimary}>
              ▶️ START
            </button>
          )}
          <button onClick={resetTimer} className={styles.buttonSecondary}>
            🔄 RESET
          </button>
        </div>

        {/* Mode Switch */}
        <div className="text-center mb-8">
          <button onClick={switchMode} className={`${styles.buttonSecondary} text-xs tracking-wide`}>
            {timerState.isFocus ? '⏸️ SWITCH TO BREAK' : '🎯 SWITCH TO FOCUS'}
          </button>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-blue-500">{stats.totalSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TOTAL</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-500">{stats.consecutiveSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>STREAK</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">{stats.nextLongBreak}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TO LONG BREAK</div>
            </div>
          </div>
          
          {stats.isLongBreakNext && (
            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <span className="text-xs text-yellow-800 dark:text-yellow-200 font-medium">
                🎉 Next break will be 15 minutes!
              </span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center">
          <div className={styles.textMuted + " text-xs space-y-1"}>
            <div>🎯 25min focus • ⏸️ 5min break</div>
            <div>4 sessions = 🎉 15min long break</div>
            <div className="pt-2 font-medium">Space: Start/Pause • R: Reset • S: Switch • D: Dark Mode</div>
          </div>
        </div>
      </div>
    </div>
  );
}
