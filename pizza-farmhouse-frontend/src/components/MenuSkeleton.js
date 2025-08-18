import React from 'react';

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
    <div className="h-40 bg-gray-200 rounded-md mb-4"></div>
    <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-full bg-gray-200 rounded mb-4"></div>
    <div className="flex justify-between items-center mt-6">
      <div className="h-8 w-1/4 bg-gray-200 rounded"></div>
      <div className="h-10 w-1/3 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

export default function MenuSkeleton() {
  return (
    <div>
      <div className="h-8 w-1/5 bg-gray-300 rounded mb-6 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}