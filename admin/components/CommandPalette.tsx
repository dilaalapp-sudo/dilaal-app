import React, { useEffect, useMemo, useRef, useState } from 'react';

interface CommandItem {
  id: string;
  label: string;
  icon: string;
  section: string;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const COMMANDS: CommandItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Navigate', keywords: 'home overview stats' },
  { id: 'listings', label: 'Listings', icon: 'inventory_2', section: 'Navigate', keywords: 'moderation properties' },
  { id: 'users', label: 'Users', icon: 'group', section: 'Navigate', keywords: 'accounts members' },
  { id: 'brokers', label: 'Brokers', icon: 'badge', section: 'Navigate', keywords: 'agents directory' },
  { id: 'admin-team', label: 'Admin Team', icon: 'shield_person', section: 'Navigate', keywords: 'staff roles' },
  { id: 'businesses', label: 'Businesses', icon: 'storefront', section: 'Navigate', keywords: 'verification companies' },
  { id: 'categories', label: 'Categories', icon: 'category', section: 'Navigate', keywords: 'taxonomy' },
  { id: 'reports', label: 'Reports', icon: 'flag', section: 'Navigate', keywords: 'disputes issues' },
  { id: 'audit-logs', label: 'Audit Logs', icon: 'history', section: 'Navigate', keywords: 'activity trail' },
  { id: 'settings', label: 'Settings', icon: 'settings', section: 'Navigate', keywords: 'configuration system' },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q) || c.keywords?.includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        onSelect(filtered[activeIndex].id);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, activeIndex, onClose, onSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative mx-auto mt-[12vh] w-[92%] max-w-xl animate-in zoom-in-95 fade-in" style={{ animationDuration: '150ms' }}>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-outline-variant/15">
            <span className="material-symbols-outlined text-on-surface-variant text-[20px]" aria-hidden="true">search</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages and actions..."
              aria-label="Search commands"
              className="flex-1 py-3.5 bg-transparent text-sm text-on-surface placeholder:text-outline outline-none"
            />
            <kbd className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold text-on-surface-variant bg-surface-container border border-outline-variant/20">Esc</kbd>
          </div>
          <ul className="max-h-[320px] overflow-y-auto p-2" role="listbox" aria-label="Results">
            {filtered.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-on-surface-variant">No results found</li>
            ) : (
              filtered.map((item, idx) => (
                <li key={item.id} role="option" aria-selected={idx === activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => {
                      onSelect(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      idx === activeIndex ? 'bg-primary/10 text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">{item.icon}</span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-on-surface">{item.label}</span>
                      <span className="block text-[11px] text-on-surface-variant">{item.section}</span>
                    </span>
                    {idx === activeIndex && (
                      <span className="text-[10px] text-on-surface-variant font-medium">Enter</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="px-4 py-2.5 border-t border-outline-variant/10 flex items-center gap-4 text-[11px] text-on-surface-variant bg-surface-container/30">
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/20">↑↓</kbd> Navigate</span>
            <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/20">↵</kbd> Open</span>
          </div>
        </div>
      </div>
    </div>
  );
};
