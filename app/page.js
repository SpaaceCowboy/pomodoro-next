'use client';
import { useState, useEffect, useRef } from 'react';

// Use your actual backend URL - make sure it's correct!
const API_BASE_URL = 'https://pomodoro-node.vercel.app';

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

  // Initialize
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      setDarkMode(savedMode === 'true');
    }
    checkBackendConnection();
  }, []);

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      console.log('Testing backend connection to:', API_BASE_URL);
      const response = await fetch(`${API_BASE_URL}/api/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Backend response:', data);
      setConnectionError(false);
      setIsLoading(false);
      
      // Start fetching timer state if backend is working
      fetchTimerState();
      fetchStats();
      
    } catch (error) {
      console.error('Backend connection failed:', error);
      setConnectionError(true);
      setIsLoading(false);
    }
  };

  // Apply dark mode
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Fetch timer state
  const fetchTimerState = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timer/state`);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const state = await response.json();
      setTimerState(state);
      setConnectionError(false);
    } catch (error) {
      console.log('Failed to fetch timer state');
      setConnectionError(true);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/timer/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.log('Could not fetch stats');
    }
  };

  // Set up polling
  useEffect(() => {
    if (connectionError) return;

    const timerInterval = setInterval(fetchTimerState, timerState.isRunning ? 1000 : 5000);
    const statsInterval = setInterval(fetchStats, 10000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(statsInterval);
    };
  }, [timerState.isRunning, connectionError]);

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

  // Calculate progress
  const totalTime = timerState.isFocus ? 25 * 60 : 5 * 60;
  const progress = ((totalTime - timerState.timeLeft) / totalTime) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // API calls
  const apiCall = async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      if (data.success) {
        setTimerState(data.state);
        setConnectionError(false);
        fetchStats(); // Refresh stats after action
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

  // Retry connection
  const retryConnection = () => {
    setIsLoading(true);
    checkBackendConnection();
  };

  // Styles based on dark mode
  const getStyles = () => {
    if (darkMode) {
      return {
        main: "min-h-screen bg-gray-900 text-white flex items-center justify-center p-4",
        card: "bg-gray-800 border border-gray-700 rounded-2xl shadow-xl p-6",
        textMuted: "text-gray-400",
        buttonPrimary: "bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-lg font-medium transition-colors text-sm",
        buttonSecondary: "border border-gray-600 text-gray-300 hover:border-gray-500 px-8 py-3 rounded-lg font-medium transition-colors text-sm",
        progressBg: "#374151",
        progressFill: "#ffffff"
      };
    } else {
      return {
        main: "min-h-screen bg-white text-black flex items-center justify-center p-4",
        card: "bg-white border border-gray-300 rounded-2xl shadow-xl p-6",
        textMuted: "text-gray-500",
        buttonPrimary: "bg-black text-white hover:bg-gray-800 px-8 py-3 rounded-lg font-medium transition-colors text-sm",
        buttonSecondary: "border border-gray-300 text-gray-700 hover:border-gray-400 px-8 py-3 rounded-lg font-medium transition-colors text-sm",
        progressBg: "#f3f4f6",
        progressFill: "#000000"
      };
    }
  };

  const styles = getStyles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔌</div>
          <h2 className="text-2xl font-bold mb-2 dark:text-white">Connection Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Cannot connect to the Pomodoro server. This might be a temporary issue.
          </p>
          <button
            onClick={retryConnection}
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            🔄 Retry Connection
          </button>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Backend URL: {API_BASE_URL}
          </div>
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
            ⚠️ Connection issue - <button onClick={retryConnection} className="underline">Retry</button>
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-left">
            <h1 className="text-2xl font-light mb-1">POMODORO</h1>
            <div className={styles.textMuted + " text-sm"}>
              {timerState.isFocus ? 'FOCUS TIME' : 'BREAK TIME'}
            </div>
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
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
            <div className="text-5xl font-light tracking-tight">
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
            <button onClick={pauseTimer} className={styles.buttonSecondary}>
              PAUSE
            </button>
          ) : (
            <button onClick={startTimer} className={styles.buttonPrimary}>
              START
            </button>
          )}
          <button onClick={resetTimer} className={styles.buttonSecondary}>
            RESET
          </button>
        </div>

        {/* Mode Switch */}
        <div className="text-center mb-8">
          <button onClick={switchMode} className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-xs tracking-wide hover:border-gray-400 dark:hover:border-gray-500">
            {timerState.isFocus ? 'SWITCH TO BREAK' : 'SWITCH TO FOCUS'}
          </button>
        </div>

        {/* Stats */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-light">{stats.totalSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TOTAL</div>
            </div>
            <div>
              <div className="text-2xl font-light">{stats.consecutiveSessions}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>STREAK</div>
            </div>
            <div>
              <div className="text-2xl font-light">{stats.nextLongBreak}</div>
              <div className={styles.textMuted + " text-xs mt-1"}>TO LONG BREAK</div>
            </div>
          </div>
          
          {stats.isLongBreakNext && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-700 dark:text-gray-300">Next break: 15 minutes</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <div className={styles.textMuted + " text-xs space-y-1"}>
            <div>25min focus • 5min break</div>
            <div>4 sessions = 15min long break</div>
            <div className="pt-2">Press D for dark mode</div>
          </div>
        </div>
      </div>
    </div>
  );
}
