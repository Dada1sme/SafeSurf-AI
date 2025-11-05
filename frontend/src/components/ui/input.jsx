import React from "react";

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`border border-gray-300 px-4 py-2 rounded-full w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5c4fff] ${className}`}
      {...props}
    />
  );
}
