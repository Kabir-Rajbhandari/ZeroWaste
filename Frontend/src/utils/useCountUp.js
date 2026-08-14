import { useEffect, useState } from "react";

/**
 * Hook to animate counting from 0 to a target number
 * @param {number} targetValue - The final number to count to
 * @param {number} duration - Duration in milliseconds (default: 2000)
 * @param {boolean} shouldStart - Whether the animation should start (default: true)
 * @returns {number} The current animated value
 */
export function useCountUp(targetValue, duration = 2000, shouldStart = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!shouldStart || targetValue === 0) {
      setCount(targetValue);
      return;
    }

    let startTime = null;
    let animationFrameId;

    const animate = (currentTime) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smooth animation (easeInOutQuad)
      const easeProgress =
        progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;

      const currentValue = Math.floor(easeProgress * targetValue);
      setCount(currentValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration, shouldStart]);

  return count;
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(num) {
  return new Intl.NumberFormat("en-US").format(num);
}
