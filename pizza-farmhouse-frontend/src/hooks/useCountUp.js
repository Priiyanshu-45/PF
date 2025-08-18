import { useState, useEffect, useRef } from 'react';

export function useCountUp(endValue, duration = 800, isAnimating) {
  const [count, setCount] = useState(0);
  const animationFrameId = useRef();

  useEffect(() => {
    if (isAnimating) {
      let startTime = null;
      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        setCount(Math.floor(progress * endValue));
        if (progress < 1) {
          animationFrameId.current = requestAnimationFrame(animate);
        }
      };
      animationFrameId.current = requestAnimationFrame(animate);
    } else {
      setCount(endValue);
    }

    return () => cancelAnimationFrame(animationFrameId.current);
  }, [endValue, duration, isAnimating]);

  return count;
}