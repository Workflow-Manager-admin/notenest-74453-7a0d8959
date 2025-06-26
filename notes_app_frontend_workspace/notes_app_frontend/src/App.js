import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// PUBLIC_INTERFACE
function App() {
  // State management

  // Try to read user theme from localStorage and system preference
  const getInitialTheme = () => {
    try {
      const persisted = localStorage.getItem('theme');
      if (persisted) return persisted;
      // Fallback to prefers-color-scheme
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    } catch {}
    return 'light';
  };

  const [theme, setTheme] = useState(getInitialTheme());
  const [notes, setNotes] = useState(() => {
    // Try to load from localStorage for offline persistence
    try {
      const persisted = localStorage.getItem('notes');
      return persisted ? JSON.parse(persisted) : [];
    } catch {
      return [];
    }
  });
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme]);

  // Persist notes to localStorage
  useEffect(() => {
    localStorage.setItem('notes', JSON.stringify(notes));
  }, [notes]);

  // Get currently selected note object
  const selectedNote = useMemo(
    () => notes.find(n => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // PUBLIC_INTERFACE
  const handleCreateNote = () => {
    setIsCreating(true);
    setSelectedNoteId(null);
  };

  // PUBLIC_INTERFACE
  function handleSaveNote(note) {
    if (!note.title.trim() && !note.content.replace(/<(.|\n)*?>/g, '').trim()) {
      return;
    }
    if (note.id) {
      setNotes(prev =>
        prev.map(n => (n.id === note.id ? { ...note, updated: new Date().toISOString() } : n))
      );
    } else {
      const newNote = {
        ...note,
        id: `n${Date.now()}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };
      setNotes(prev => [newNote, ...prev]);
      setSelectedNoteId(newNote.id);
    }
    setIsCreating(false);
  }

  // PUBLIC_INTERFACE
  function handleDeleteNote(noteId) {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    setIsCreating(false);
    setSelectedNoteId(null);
  }

  // Filtered notes based on search
  const filteredNotes = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return notes;
    return notes.filter(
      n =>
        n.title.toLowerCase().includes(q) ||
        n.content.replace(/<(.|\n)*?>/g, '').toLowerCase().includes(q)
    );
  }, [notes, search]);

  // PUBLIC_INTERFACE
  function handleNoteClick(noteId) {
    setIsCreating(false);
    setSelectedNoteId(noteId);
  }

  // UI
  return (
    <div className="App notes-app-root">
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className="notes-main">
        <aside className="notes-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Notes</span>
            <button
              className="notes-create-btn"
              title="Create new note"
              onClick={handleCreateNote}
              aria-label="Create new note"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >+</button>
          </div>
          <SearchBox value={search} onChange={setSearch} />
          <NotesList
            notes={filteredNotes}
            onNoteClick={handleNoteClick}
            selectedNoteId={selectedNoteId}
            onDelete={handleDeleteNote}
          />
        </aside>
        <main className="notes-detail-area">
          {isCreating
            ? <NoteEditor
                onSave={handleSaveNote}
                onCancel={() => setIsCreating(false)}
                accentColor="var(--accent-color)"
              />
            : selectedNote
              ? <NoteEditor
                  note={selectedNote}
                  onSave={handleSaveNote}
                  onCancel={() => setSelectedNoteId(null)}
                  onDelete={handleDeleteNote}
                  accentColor="var(--accent-color)"
                />
              : <div className="notes-empty-state">
                  <span className="empty-state-emoji">📝</span>
                  <p className="empty-state-text">
                    {notes.length
                      ? "Select or create a note to get started."
                      : "No notes yet. Click + to create your first note!"}
                  </p>
                </div>}
        </main>
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
function Header({ theme, onToggleTheme }) {
  return (
    <nav className="notes-navbar">
      <div className="navbar-brand">
        <span className="nav-title">
          <span className="nav-accent">Note</span>Nest
        </span>
      </div>
      <button
        className="theme-toggle"
        onClick={onToggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        style={{
          marginLeft: 'auto'
        }}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </nav>
  );
}

// PUBLIC_INTERFACE
function SearchBox({ value, onChange }) {
  return (
    <div className="notes-searchbox">
      <input
        className="searchbox-input"
        type="text"
        placeholder="Search notes..."
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search notes"
      />
    </div>
  );
}

// PUBLIC_INTERFACE
function NotesList({ notes, selectedNoteId, onNoteClick, onDelete }) {
  return (
    <ul className="notes-list">
      {notes.length === 0 && (
        <li className="notes-list-empty">No notes found.</li>
      )}
      {notes.map(note =>
        <li
          className={`notes-list-item${note.id === selectedNoteId ? ' selected' : ''}`}
          key={note.id}
          onClick={() => onNoteClick(note.id)}
          tabIndex={0}
          aria-selected={note.id === selectedNoteId}
        >
          <div className="notes-list-title-row">
            <span className="notes-list-title">{note.title || <em>(untitled)</em>}</span>
            <button
              className="notes-list-delete"
              tabIndex={-1}
              title="Delete note"
              aria-label="Delete note"
              onClick={e => {
                e.stopPropagation();
                onDelete(note.id);
              }}
            >🗑️</button>
          </div>
          <div className="notes-list-date">
            {note.updated
              ? new Date(note.updated).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
              : ''}
          </div>
        </li>
      )}
    </ul>
  );
}

// PUBLIC_INTERFACE
function NoteEditor({ note = {}, onSave, onCancel, onDelete, accentColor }) {
  const [title, setTitle] = useState(note.title || '');
  const [content, setContent] = useState(note.content || '');

  useEffect(() => {
    setTitle(note.title || '');
    setContent(note.content || '');
  }, [note.id]);

  // PUBLIC_INTERFACE
  function handleContentChange(e) {
    setContent(e.target.innerHTML);
  }

  // PUBLIC_INTERFACE
  function handleSave() {
    onSave({ ...note, title, content });
  }

  // Allow 'Enter' for multiline, Ctrl+Enter to submit
  function handleKeyDown(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      handleSave();
    }
  }

  return (
    <div className="note-editor-box">
      <input
        className="note-title-input"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={80}
        autoFocus
      />
      <div
        className="note-content-edit"
        contentEditable
        suppressContentEditableWarning
        onInput={handleContentChange}
        dangerouslySetInnerHTML={{ __html: content }}
        style={{
          minHeight: 180,
          outline: 'none',
          marginBottom: '12px',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '12px',
          fontSize: 16,
          background: 'var(--bg-secondary)',
        }}
        onKeyDown={handleKeyDown}
        aria-label="Rich text note content"
      />
      <div className="note-editor-actions">
        <button
          className="btn save-btn"
          onClick={handleSave}
          style={{
            background: accentColor || 'var(--primary-color)',
            color: '#333',
            fontWeight: 600,
            marginRight: 10
          }}
        >Save</button>
        <button
          className="btn cancel-btn"
          onClick={onCancel}
          style={{
            background: 'var(--border-color)',
            color: 'var(--text-primary)',
            fontWeight: 400
          }}
        >Cancel</button>
        {onDelete && note.id && (
          <button
            className="btn delete-btn"
            onClick={() => {
              if (window.confirm('Delete this note?')) onDelete(note.id);
            }}
            style={{
              background: '#e53935',
              color: 'white'
            }}
          >Delete</button>
        )}
      </div>
    </div>
  );
}

export default App;
