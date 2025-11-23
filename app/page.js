'use client';
import { useState, useEffect } from 'react';

export default function Home() {
  const [timerState, setTimerState] = useState({
    isRunning: false,
    isFocus: true,
    timeLeft: 25 * 60,
    totalSessions: 0
  });

  const [stats, setStats] = useState({
    totalSessions: 0,
    consecutiveSessions: 0,
    nextLongBreak: 4,
    isLongBreakNext: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [audio] = useState(typeof Audio !== "undefined" ? new Audio("/alarm.mp3") : null);

  // Initialize on component mount
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
    setIsLoading(false);
  }, []);

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch timer state from backend
  useEffect(() => {
    const fetchTimerState = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/timer/state');
        const state = await response.json();
        setTimerState(state);
      } catch (error) {
        console.log('Backend not connected yet');
      }
    };

    fetchTimerState();
    const interval = setInterval(fetchTimerState, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/timer/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.log('Could not fetch stats');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // Play sound when timer reaches 0
  useEffect(() => {
    if (timerState.timeLeft === 0 && audio) {
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  }, [timerState.timeLeft, audio]);

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
        toggleDarkMode();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [timerState.isRunning]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress for circular bar
  const totalTime = timerState.isFocus ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timerState.timeLeft) / totalTime) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Button handlers
  const startTimer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/timer/start', { method: 'POST' });
      const data = await response.json();
      setTimerState(data.state);
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  };

  const pauseTimer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/timer/pause', { method: 'POST' });
      const data = await response.json();
      setTimerState(data.state);
    } catch (error) {
      console.error('Error pausing timer:', error);
    }
  };

  const resetTimer = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/timer/reset', { method: 'POST' });
      const data = await response.json();
      setTimerState(data.state);
    } catch (error) {
      console.error('Error resetting timer:', error);
    }
  };

  const switchMode = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/timer/switch', { method: 'POST' });
      const data = await response.json();
      setTimerState(data.state);
    } catch (error) {
      console.error('Error switching mode:', error);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Dynamic styles based on dark mode
  const getStyles = () => {
    if (darkMode) {
      return {
        main: "min-h-screen bg-gray-900 text-white flex items-center justify-center p-4",
        container: "bg-gray-800 text-white border-gray-700",
        card: "bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6",
        textMuted: "text-gray-400",
        textNormal: "text-gray-300",
        buttonPrimary: "bg-white text-black hover:bg-gray-200",
        buttonSecondary: "border border-gray-600 text-gray-300 hover:border-gray-500",
        progressBg: "#374151",
        progressFill: "#ffffff",
        statsBg: "bg-gray-700 border-gray-600"
      };
    } else {
      return {
        main: "min-h-screen bg-white text-black flex items-center justify-center p-4",
        container: "bg-white text-black border-gray-300",
        card: "bg-white border border-gray-300 rounded-2xl shadow-xl p-6",
        textMuted: "text-gray-500",
        textNormal: "text-gray-700",
        buttonPrimary: "bg-black text-white hover:bg-gray-800",
        buttonSecondary: "border border-gray-300 text-gray-700 hover:border-gray-400",
        progressBg: "#f3f4f6",
        progressFill: "#000000",
        statsBg: "bg-gray-50 border-gray-200"
      };
    }
  };

  const styles = getStyles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={`${styles.card} w-full max-w-sm`}>
        
        {/* Header with Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className={`${styles.container} text-2xl font-light mb-1`}>POMODORO</h1>
            <div className={styles.textMuted + " text-sm"}>
              {timerState.isFocus ? 'FOCUS TIME' : 'BREAK TIME'}
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={`${styles.buttonSecondary} p-2 rounded-lg transition-colors duration-200`}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Circular Progress Bar */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke={styles.progressBg}
              strokeWidth="3"
              fill="none"
            />
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke={styles.progressFill}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`${styles.container} text-5xl font-light tracking-tight`}>
              {formatTime(timerState.timeLeft)}
            </div>
            <div className={styles.textMuted + " text-xs mt-2 tracking-wide"}>
              {timerState.isRunning ? 'RUNNING' : 'PAUSED'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-3 mb-8">
          {timerState.isRunning ? (
            <button
              onClick={pauseTimer}
              className={`${styles.buttonSecondary} px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm`}
            >
              PAUSE
            </button>
          ) : (
            <button
              onClick={startTimer}
              className={`${styles.buttonPrimary} px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm`}
            >
              START
            </button>
          )}
          
          <button
            onClick={resetTimer}
            className={`${styles.buttonSecondary} px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-sm`}
          >
            RESET
          </button>
        </div>

        {/* Mode Switch */}
        <div className="text-center mb-8">
          <button
            onClick={switchMode}
            className={`${styles.buttonSecondary} px-6 py-2 rounded-lg font-medium transition-colors duration-200 text-xs tracking-wide`}
          >
            {timerState.isFocus ? 'SWITCH TO BREAK' : 'SWITCH TO FOCUS'}
          </button>
        </div>

        {/* Stats */}
        <div className={"border-t pt-6 " + styles.border}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`${styles.container} text-2xl font-light`}>{stats.totalSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TOTAL</div>
            </div>
            <div>
              <div className={`${styles.container} text-2xl font-light`}>{stats.consecutiveSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>STREAK</div>
            </div>
            <div>
              <div className={`${styles.container} text-2xl font-light`}>{stats.nextLongBreak}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TO LONG BREAK</div>
            </div>
          </div>
          
          {stats.isLongBreakNext && (
            <div className={`${styles.statsBg} mt-4 p-3 rounded-lg border`}>
              <span className={styles.textNormal + " text-xs"}>Next break: 15 minutes</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className={styles.textMuted + " text-xs space-y-1"}>
            <div>25min focus • 5min break</div>
            <div>4 sessions = 15min long break</div>
            <div className="pt-2">Press D to toggle dark mode</div>
          </div>
        </div>
      </div>
    </div>
  );
}