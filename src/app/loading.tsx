import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 bg-base text-primary min-h-[calc(100vh-4rem)] select-none animate-pulse">
      {/* Hero Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-16 md:mb-24">
        {/* Left Side Hero */}
        <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
          <div className="w-48 h-6 bg-muted rounded-full mx-auto lg:mx-0" />
          <div className="w-3/4 h-12 bg-muted rounded-2xl mx-auto lg:mx-0" />
          <div className="w-full h-16 bg-muted rounded-2xl" />
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <div className="w-full sm:w-40 h-12 bg-muted rounded-2xl" />
            <div className="w-full sm:w-40 h-12 bg-muted rounded-2xl" />
          </div>
        </div>

        {/* Right Side Leaders Card */}
        <div className="lg:col-span-5 bg-card border border-border-custom/80 rounded-2xl p-6 shadow-xl w-full space-y-4">
          <div className="w-36 h-5 bg-muted rounded-full" />
          <div className="space-y-3">
            <div className="w-full h-12 bg-muted/60 rounded-xl" />
            <div className="w-full h-12 bg-muted/60 rounded-xl" />
            <div className="w-full h-12 bg-muted/60 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Matches Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border-custom pb-3">
            <div className="w-32 h-6 bg-muted rounded-full" />
            <div className="w-24 h-4 bg-muted rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 4 Match Card Skeletons */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border border-border-custom rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="w-24 h-4 bg-muted rounded-full" />
                  <div className="w-20 h-4 bg-muted rounded-full" />
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="w-20 h-5 bg-muted rounded-md" />
                  <div className="w-8 h-5 bg-muted rounded-md" />
                  <div className="w-20 h-5 bg-muted rounded-md" />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="w-16 h-4 bg-muted rounded-md" />
                  <div className="w-24 h-10 bg-muted rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking Table Skeleton */}
        <div className="lg:col-span-1 bg-card border border-border-custom rounded-2xl overflow-hidden shadow-2xl space-y-4 p-5">
          <div className="w-40 h-6 bg-muted rounded-full" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-border-custom/30 last:border-0 pb-3">
                <div className="w-8 h-8 bg-muted rounded-xl" />
                <div className="w-28 h-4 bg-muted rounded-full flex-grow mx-4" />
                <div className="w-10 h-5 bg-muted rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
