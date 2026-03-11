"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

/**
 * Mobile pull-to-refresh wrapper. Pull down from the top of the
 * scrollable area to trigger a refresh callback with visual feedback.
 */
export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const touchStartY = React.useRef(0);
  const isPulling = React.useRef(false);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const container = containerRef.current;
    // Only start pull if scrolled to the very top
    if (container && container.scrollTop <= 0 && !refreshing) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = React.useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || refreshing) return;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 0) {
      // Dampen the pull: actual distance is half of finger movement, capped
      const distance = Math.min(deltaY * 0.5, MAX_PULL);
      setPullDistance(distance);
    }
  }, [refreshing]);

  const handleTouchEnd = React.useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.5); // Hold indicator in place
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pullDistance > 0 || refreshing ? `${Math.max(pullDistance, refreshing ? 40 : 0)}px` : "0px" }}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            refreshing && "animate-spin"
          )}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 360}deg)`, opacity: progress }}
        />
      </div>
      {children}
    </div>
  );
}
