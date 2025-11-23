'use client';
import { useState, useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://pomodoro-node.vercel.app';

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
  const [connectionError, setConnectionError] = useState(false);
  const audioRef = useRef(null);
  const prevTimeLeftRef = useRef(25 * 60);

  // Initialize
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
    
    // Initialize audio
    audioRef.current = new Audio('/alarm.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch timer state
  useEffect(() => {
    let isSubscribed = true;
    
    const fetchTimerState = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/timer/state`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const state = await response.json();
        if (isSubscribed) {
          setTimerState(state);
          setConnectionError(false);
          setIsLoading(false);
        }
      } catch (error) {
        console.log('Backend connection error:', error);
        if (isSubscribed) {
          setConnectionError(true);
          setIsLoading(false);
        }
      }
    };

    fetchTimerState();
    
    // Poll more frequently when timer is running
    const interval = setInterval(fetchTimerState, timerState.isRunning ? 500 : 2000);
    
    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [timerState.isRunning]);

  // Fetch stats separately
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/timer/stats`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.log('Could not fetch stats');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  // Play sound when timer reaches 0
  useEffect(() => {
    if (prevTimeLeftRef.current > 0 && timerState.timeLeft === 0) {
      // Timer just reached 0
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      
      // Show browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(
          timerState.isFocus ? 'Break Time! 🎉' : 'Focus Time! ⏰',
          {
            body: timerState.isFocus 
              ? 'Great job! Time for a well-deserved break.' 
              : 'Break is over! Ready to focus again?',
            icon: '/favicon.ico'
          }
        );
      }
    }
    prevTimeLeftRef.current = timerState.timeLeft;
  }, [timerState.timeLeft, timerState.isFocus]);

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

  // Format time
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

  // API calls
  const apiCall = async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data.success) {
        setTimerState(data.state);
        setConnectionError(false);
        
        // Also update stats after mode-changing actions
        if (endpoint === '/api/timer/switch' || endpoint === '/api/timer/start') {
          const statsResponse = await fetch(`${API_BASE_URL}/api/timer/stats`);
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      }
    } catch (error) {
      console.error('API error:', error);
      setConnectionError(true);
    }
  };

  const startTimer = () => apiCall('/api/timer/start');
  const pauseTimer = () => apiCall('/api/timer/pause');
  const resetTimer = () => apiCall('/api/timer/reset');
  const switchMode = () => apiCall('/api/timer/switch');

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
        progressFill: timerState.isFocus ? "#3b82f6" : "#10b981", // Blue for focus, green for break
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
        progressFill: timerState.isFocus ? "#3b82f6" : "#10b981", // Blue for focus, green for break
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
        
        {/* Connection Status */}
        {connectionError && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm text-center">
            ⚠️ Connection issue - check your internet
          </div>
        )}
        
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
