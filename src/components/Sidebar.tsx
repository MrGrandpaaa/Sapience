import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
  userName: string;
  onUpdateName?: (newName: string) => void;
}

export function Sidebar({ userName, onUpdateName }: SidebarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(userName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when userName prop changes
  useEffect(() => {
    setEditValue(userName);
  }, [userName]);

  // Focus and select input text when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setEditValue(userName);
    setIsEditing(true);
  };

  const handleSave = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== userName && onUpdateName) {
      onUpdateName(trimmed);
    } else {
      setEditValue(userName);
    }
    setIsEditing(false);
  }, [editValue, userName, onUpdateName]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(userName);
      setIsEditing(false);
    }
  };

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {/* ── Brand / Application Identity ── */}
      <div className="sidebar-brand">
        <img
          src="/sapience-logo.png"
          alt="Sapience logo"
          className="sidebar-brand-logo"
        />
        <span className="sidebar-brand-name">Sapience</span>
      </div>

      {/* ── User name box (Editable) ── */}
      <div
        className={`sidebar-user${isEditing ? ' sidebar-user--editing' : ''}`}
        onClick={!isEditing ? handleStartEdit : undefined}
        title={!isEditing ? 'Click to edit name' : undefined}
      >
        <UserIcon />
        {isEditing ? (
          <input
            ref={inputRef}
            className="sidebar-user-input"
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            maxLength={50}
          />
        ) : (
          <>
            <span className="sidebar-user-name">{userName}</span>
            <EditPencilIcon />
          </>
        )}
      </div>

      {/* ── Navigation links ── */}
      <div className="sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
          }
          end
        >
          <HomeIcon />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/vocabulary"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
          }
        >
          <BookIcon />
          <span>Vocabulary</span>
        </NavLink>

        <NavLink
          to="/game"
          className={({ isActive }) =>
            `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
          }
        >
          <GameIcon />
          <span>Game</span>
        </NavLink>
      </div>
    </nav>
  );
}

/* ── Inline SVG icons ───────────────────────────────────────────────── */

function UserIcon() {
  return (
    <svg
      className="sidebar-icon sidebar-icon--user"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg
      className="sidebar-edit-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5" />
      <path d="M19 13v6a1 1 0 0 1-1 1h-4v-5h-4v5H6a1 1 0 0 1-1-1v-6" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      className="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  );
}

function GameIcon() {
  return (
    <svg
      className="sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4m-2-2v4" />
      <circle cx="15.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="13.5" r="0.5" fill="currentColor" />
    </svg>
  );
}
