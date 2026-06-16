import React from "react";
import CardShell from "../CardShell.jsx";

const PlaceholderView = ({ title, icon: Icon }) => {
  return (
    <div className="h-full w-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-medium text-white flex items-center gap-3">
          {Icon && <Icon className="text-[#46C5A5]" size={28} />}
          {title}
        </h2>
      </div>

      <div className="flex-1 border border-dashed border-neutral-800 flex flex-col items-center justify-center text-neutral-600 bg-[#050505]/50">
        <div className="w-16 h-16 rounded-full border border-neutral-800 flex items-center justify-center mb-4">
          <div className="w-2 h-2 rounded-full bg-[#46C5A5] animate-ping" />
        </div>
        <p className="font-medium text-xs uppercase tracking-[0.3em]">
          Module Initializing
        </p>
        <p className="text-[10px] mt-2 opacity-50 uppercase tracking-widest">
          Awaiting Live Stream Connection
        </p>
      </div>
    </div>
  );
};

export default PlaceholderView;
