"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SWIPE_THRESHOLD_PX = 60;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
  /** When set with length > 1, single-finger horizontal swipe at 1× zoom changes photo */
  galleryUrls?: string[];
  onGalleryIndexChange?: (url: string) => void;
};

function distance(a: Touch, b: Touch): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

export function FullscreenZoomableImage({
  src,
  alt,
  onClose,
  galleryUrls,
  onGalleryIndexChange,
}: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  useEffect(() => {
    scaleRef.current = scale;
    txRef.current = tx;
    tyRef.current = ty;
  }, [scale, tx, ty]);

  const pinchStart = useRef<{
    dist: number;
    scale: number;
    tx: number;
    ty: number;
  } | null>(null);
  const panStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
    scaleRef.current = 1;
    txRef.current = 0;
    tyRef.current = 0;
    pinchStart.current = null;
    panStart.current = null;
    swipeStartX.current = null;
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2) {
      swipeStartX.current = null;
      panStart.current = null;
      pinchStart.current = {
        dist: distance(e.touches[0], e.touches[1]),
        scale: scaleRef.current,
        tx: txRef.current,
        ty: tyRef.current,
      };
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (scaleRef.current > MIN_SCALE) {
        pinchStart.current = null;
        swipeStartX.current = null;
        panStart.current = {
          x: t.clientX,
          y: t.clientY,
          tx: txRef.current,
          ty: tyRef.current,
        };
      } else {
        pinchStart.current = null;
        panStart.current = null;
        swipeStartX.current = t.clientX;
      }
    }
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const d = distance(e.touches[0], e.touches[1]);
      const start = pinchStart.current;
      const ratio = d / start.dist;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, start.scale * ratio)
      );
      scaleRef.current = next;
      setScale(next);
      if (next <= MIN_SCALE + 0.01) {
        txRef.current = 0;
        tyRef.current = 0;
        setTx(0);
        setTy(0);
      }
      return;
    }
    if (
      e.touches.length === 1 &&
      panStart.current &&
      scaleRef.current > MIN_SCALE
    ) {
      e.preventDefault();
      const t = e.touches[0];
      const p = panStart.current;
      const nx = p.tx + (t.clientX - p.x);
      const ny = p.ty + (t.clientY - p.y);
      txRef.current = nx;
      tyRef.current = ny;
      setTx(nx);
      setTy(ny);
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      e.stopPropagation();
      if (e.touches.length >= 2) return;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (pinchStart.current) {
          pinchStart.current = null;
          panStart.current = {
            x: t.clientX,
            y: t.clientY,
            tx: txRef.current,
            ty: tyRef.current,
          };
        }
        return;
      }

      pinchStart.current = null;
      panStart.current = null;

      const s = scaleRef.current;
      if (
        s <= MIN_SCALE &&
        swipeStartX.current != null &&
        galleryUrls &&
        galleryUrls.length > 1 &&
        onGalleryIndexChange
      ) {
        const end = e.changedTouches[0]?.clientX;
        if (end != null) {
          const delta = end - swipeStartX.current;
          const idx = galleryUrls.indexOf(src);
          if (idx >= 0) {
            if (delta > SWIPE_THRESHOLD_PX && idx > 0) {
              onGalleryIndexChange(galleryUrls[idx - 1]);
            } else if (
              delta < -SWIPE_THRESHOLD_PX &&
              idx < galleryUrls.length - 1
            ) {
              onGalleryIndexChange(galleryUrls[idx + 1]);
            }
          }
        }
      }
      swipeStartX.current = null;

      if (scaleRef.current <= MIN_SCALE + 0.02) {
        scaleRef.current = 1;
        txRef.current = 0;
        tyRef.current = 0;
        setScale(1);
        setTx(0);
        setTy(0);
      }
    },
    [galleryUrls, onGalleryIndexChange, src]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onTouchEnd, onTouchMove, onTouchStart]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 touch-none"
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen photo"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-full max-h-full flex items-center justify-center will-change-transform"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (scaleRef.current <= MIN_SCALE + 0.02) onClose();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-[100vw] max-h-[85dvh] w-auto h-auto object-contain select-none"
          draggable={false}
        />
      </div>
    </div>
  );
}
