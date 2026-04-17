import { useState, useEffect } from 'react';

export const useActivityTracker = () => {
  const [mouseMovement, setMouseMovement] = useState(0);
  const [typingSpeed, setTypingSpeed] = useState(0); // Words per minute estimate
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    let charCount = 0;
    let lastTime = Date.now();
    let moveCount = 0;

    const handleMouseMove = () => {
      moveCount++;
      setLastActivity(Date.now());
    };

    const handleKeyDown = () => {
      charCount++;
      setLastActivity(Date.now());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = (now - lastTime) / 60000;
      
      // Update typing speed (characters per minute / 5 = WPM)
      const wpm = elapsedMinutes > 0 ? (charCount / 5) / elapsedMinutes : 0;
      setTypingSpeed(Math.round(wpm));
      
      // Update mouse intensity
      setMouseMovement(moveCount);

      // Reset counters for next interval
      charCount = 0;
      moveCount = 0;
      lastTime = now;
    }, 5000); // Update every 5 seconds

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  return { mouseMovement, typingSpeed, lastActivity };
};

export const saveMoodToHistory = (mood) => {
  const history = JSON.parse(localStorage.getItem('mood_history') || '[]');
  history.push({ mood, timestamp: new Date().toISOString() });
  // Keep last 50 entries
  if (history.length > 50) history.shift();
  localStorage.setItem('mood_history', JSON.stringify(history));
};

export const getMoodHistory = () => {
  return JSON.parse(localStorage.getItem('mood_history') || '[]');
};
