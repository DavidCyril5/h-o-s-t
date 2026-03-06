'use client';
import { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', marginTop: '20px' }}
      data-ad-client="ca-pub-9230418530624208"
      data-ad-slot="3874053361"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  );
}
