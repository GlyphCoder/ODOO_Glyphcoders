import { useRef, useEffect } from 'react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260329_050842_be71947f-f16e-4a14-810c-06e83d23ddb5.mp4';

export function VideoBackground() {
  const videoRef = useRef(null);
  const fadingOutRef = useRef(false);
  const frameRef = useRef(null);

  const cancelFrame = () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };

  const fadeIn = (video) => {
    cancelFrame();
    fadingOutRef.current = false;
    const start = parseFloat(video.style.opacity) || 0;
    const t0 = performance.now();
    const DURATION = 250;
    const step = (now) => {
      const p = Math.min((now - t0) / DURATION, 1);
      video.style.opacity = start + (1 - start) * p;
      if (p < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  };

  const fadeOut = (video, onDone) => {
    if (fadingOutRef.current) return;
    fadingOutRef.current = true;
    cancelFrame();
    const start = parseFloat(video.style.opacity) || 1;
    const t0 = performance.now();
    const DURATION = 250;
    const step = (now) => {
      const p = Math.min((now - t0) / DURATION, 1);
      video.style.opacity = start * (1 - p);
      if (p < 1) frameRef.current = requestAnimationFrame(step);
      else if (onDone) onDone();
    };
    frameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.style.opacity = '0';

    const onLoaded = () => fadeIn(video);
    const onTimeUpdate = () => {
      if (!fadingOutRef.current && video.duration - video.currentTime <= 0.55)
        fadeOut(video);
    };
    const onEnded = () => {
      video.style.opacity = '0';
      fadingOutRef.current = false;
      setTimeout(() => { video.currentTime = 0; video.play().then(() => fadeIn(video)); }, 100);
    };

    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    return () => {
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      cancelFrame();
    };
  }, []);

  return (
    <div className="video-bg-wrapper">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted
        playsInline
        style={{ opacity: 0 }}
      />
      <div className="video-overlay" />
    </div>
  );
}
