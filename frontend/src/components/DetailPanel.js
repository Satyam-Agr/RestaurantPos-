import React from "react";
import { X } from "lucide-react";

/**
 * Sliding side panel used by every role's table drill-down. Locked to the
 * right on desktop, bottom sheet on mobile.
 */
export default function DetailPanel({ onClose, testId, children }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-stretch sm:justify-end"
      data-testid={testId}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:w-[440px] max-h-[92vh] sm:max-h-full bg-surface sm:h-full rounded-t-3xl sm:rounded-none shadow-lift animate-fadeUp overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-end p-3 bg-surface/95 backdrop-blur border-b border-bg2 z-10">
          <button
            onClick={onClose}
            data-testid="detail-close-btn"
            className="text-ink2 hover:text-ink p-1.5 rounded-full hover:bg-bg2"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
