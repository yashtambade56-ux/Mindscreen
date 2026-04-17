import React, { useRef, useEffect } from 'react';

const HeartbeatPulse = ({ heartRate }) => {
  const canvasRef = useRef(null);
  const dataRef = useRef([]);
  const indexRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = canvas.offsetHeight;
    
    // Standard physiological pulse signature
    const pulsePattern = [
      0.5, 1, 0.5, // P wave
      0, 0,
      -2, 25, -5, // QRS complex (sharp spike)
      0, 0,
      1, 2, 3, 2, 1, // T wave
      0, 0, 0, 0
    ];

    let lastY = height / 2;
    let animationId;

    const render = () => {
      // Create trailing effect signal trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(indexRef.current, 0, 8, height);

      // Determine Y position
      const isPulseTime = indexRef.current % Math.floor(width / (heartRate / 30)) === 0;
      
      if (isPulseTime && dataRef.current.length === 0) {
          dataRef.current = [...pulsePattern];
      }

      let offset = 0;
      if (dataRef.current.length > 0) {
          offset = dataRef.current.shift() * (height / 45);
      } else {
          // Add subtle biological noise/jitter to the baseline
          offset = (Math.random() - 0.5) * 1.5;
      }

      const targetY = (height / 2) - offset;

      // Draw line from last point to current
      ctx.beginPath();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.moveTo(indexRef.current - 1, lastY);
      ctx.lineTo(indexRef.current, targetY);
      ctx.stroke();

      // Add "glow" head
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#f43f5e';
      ctx.fillRect(indexRef.current - 1, targetY - 1, 2, 2);
      ctx.shadowBlur = 0;

      lastY = targetY;
      indexRef.current = (indexRef.current + 1) % width;
      
      // Clear head
      ctx.clearRect(indexRef.current, 0, 6, height);

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [heartRate]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
};

export default HeartbeatPulse;
