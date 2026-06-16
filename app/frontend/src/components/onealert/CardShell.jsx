import React from "react";

export const CardShell = ({
  title,
  subtitle,
  accent,
  right,
  children,
  testid,
  className = "",
}) => (
  <section
    data-testid={testid}
    className={`relative border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col h-full transition-colors duration-150 hover:border-[var(--primary)]/30 ${className}`}
  >
    <header className="flex items-start justify-between flex-wrap gap-y-4 px-5 pt-5 pb-3 border-b border-[var(--border)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[0.25em] text-[var(--text-secondary)] font-medium break-words">
            {subtitle}
          </div>
          <h3 className="font-display text-[17px] md:text-lg font-medium text-[var(--text-primary)] leading-tight break-words">
            {title}
          </h3>
        </div>
      </div>
      {right && <div className="shrink-0 ml-3">{right}</div>}
    </header>
    <div className="flex-1 min-h-0 p-5">{children}</div>
  </section>
);

export default CardShell;
