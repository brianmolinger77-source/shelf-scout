import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const GENRES = [
  "True Crime", "WWII History", "Cold War History", "American History",
  "Business Scandal", "Wall Street", "Music Biography", "Drug Trade",
  "Middle East History", "Political History", "Organized Crime",
  "Science History", "Pro Wrestling", "Spy & Intelligence", "Biography", "Other"
];

// inCollection: true = confirmed in Radnor catalog
// location: section + call number from catalog (null = not yet verified)
const INITIAL_BOOKS = [
  { id: 1,  title: "Say Nothing",             author: "Patrick Radden Keefe", genre: "True Crime",          notes: "Highest confidence pick — IRA shadow world, Keefe writes like Bowden.", inCollection: null, location: null },
  { id: 2,  title: "Empire of Pain",           author: "Patrick Radden Keefe", genre: "Business Scandal",    notes: "Sackler family built a pharma empire using drug cartel mechanics. Doctor Dealer scaled to a dynasty.", inCollection: null, location: null },
  { id: 3,  title: "Smuggler's Blues",         author: "George Jung",          genre: "True Crime",          notes: "The real story behind Blow, in Jung's own voice. Shadow economy built from nothing — like American Desperado.", inCollection: null, location: null },
  { id: 4,  title: "Players Ball",             author: "David Kushner",        genre: "Organized Crime",     notes: "Origin story of the internet porn industry — serious business history inside a taboo subject. Like Reefer Madness.", inCollection: true, location: "Nonfiction · 338.4 KUS" },
  { id: 5,  title: "Powerhouse",               author: "James Andrew Miller",  genre: "Biography",           notes: "Oral history of CAA talent agency that secretly ran Hollywood. Shadow infrastructure, outsiders building an empire.", inCollection: null, location: null },
  { id: 6,  title: "Desperados",               author: "Elaine Shannon",       genre: "Drug Trade",          notes: "Origin story of the DEA and the early drug war — key players on both sides. Right in your 70s drug trade interest.", inCollection: null, location: null },
  { id: 7,  title: "The Spy and the Traitor",  author: "Ben Macintyre",        genre: "Spy & Intelligence",  notes: "KGB officer who spied for Britain — best pure spy narrative since Berlin 1961.", inCollection: null, location: null },
  { id: 8,  title: "Guests of the Ayatollah", author: "Mark Bowden",          genre: "Middle East History", notes: "Iran hostage crisis told through key decision makers on both sides. Bowden at his best — same style as Killing Pablo.", inCollection: true, location: "Nonfiction · 955.0542 BOW" },
  { id: 9,  title: "El Narco",                 author: "Ioan Grillo",          genre: "Drug Trade",          notes: "Origin story of the Mexican drug trade. Grillo disappears into the story like Schlosser. No author insertion.", inCollection: true, location: "Nonfiction · 364.1 GRI" },
  { id: 10, title: "The Tao of Wu",            author: "The RZA",              genre: "Music Biography",     notes: "Wu-Tang origin story and philosophy. Funny, surprising, substantive — great palate cleanser after a heavy read.", inCollection: null, location: null },
];

const CATALOG_URL = (title, author) =>
  `https://charlotte.delco.lib.pa.us/search/X?searchtype=X&searcharg=${encodeURIComponent(title + ' ' + author)}&searchscope=35&SORT=D`;

let nextId = 100;

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setValue(JSON.parse(stored));
    } catch {}
  }, [key]);
  const set = useCallback((updater) => {
    setValue(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]);
  return [value, set];
}

export default function ShelfScout() {
  const [books, setBooks]         = useLocalStorage('shelfscout-books-v2', INITIAL_BOOKS);
  const [filterGenre, setFilter]  = useState('All');
  const [sortBy, setSort]         = useState('collection');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ title: '', author: '', genre: 'True Crime', notes: '', inCollection: false, location: '' });
  const [formError, setFormError] = useState('');

  function addBook() {
    if (!form.title.trim() || !form.author.trim()) { setFormError('Title and author are required.'); return; }
    if (books.find(b => b.title.toLowerCase() === form.title.trim().toLowerCase())) { setFormError('That book is already on your list.'); return; }
    setBooks(prev => [{
      ...form,
      id: nextId++,
      title: form.title.trim(),
      author: form.author.trim(),
      location: form.location.trim() || null,
      inCollection: form.inCollection || null,
    }, ...prev]);
    setForm({ title: '', author: '', genre: 'True Crime', notes: '', inCollection: false, location: '' });
    setFormError('');
    setShowForm(false);
  }

  function removeBook(id) {
    setBooks(prev => prev.filter(b => b.id !== id));
  }

  function updateBook(id, changes) {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b));
  }

  const allGenres = ['All', ...Array.from(new Set(books.map(b => b.genre))).sort()];

  const collectionOrder = b => {
    if (b.inCollection === true) return 0;
    if (b.inCollection === null) return 1;
    return 2; // false = not in collection
  };

  const visible = books
    .filter(b => filterGenre === 'All' || b.genre === filterGenre)
    .filter(b => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'title')      return a.title.localeCompare(b.title);
      if (sortBy === 'author')     return a.author.localeCompare(b.author);
      if (sortBy === 'genre')      return a.genre.localeCompare(b.genre);
      if (sortBy === 'collection') return collectionOrder(a) - collectionOrder(b);
      return b.id - a.id;
    });

  const inCollectionCount = books.filter(b => b.inCollection === true).length;

  return (
    <>
      <Head>
        <title>Shelf Scout 2</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* HEADER */}
      <header style={{ borderBottom: '3px solid #c8840a', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
            Shelf <span style={{ color: '#f5c842', fontStyle: 'italic' }}>Scout</span>
          </h1>
          <p style={{ fontSize: '0.72rem', color: '#a09070', marginTop: 2, fontFamily: 'sans-serif' }}>
            Your reading list · Radnor Township Library
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {inCollectionCount > 0 && (
            <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
              <div style={{ fontSize: '1.2rem', color: '#7ecb84', fontWeight: 700 }}>{inCollectionCount}</div>
              <div style={{ fontSize: '0.65rem', color: '#7ecb84', textTransform: 'uppercase', letterSpacing: '0.08em' }}>At Radnor</div>
            </div>
          )}
          <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '1.2rem', color: '#f5c842', fontWeight: 700 }}>{books.length}</div>
            <div style={{ fontSize: '0.65rem', color: '#a09070', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Books saved</div>
          </div>
          <button onClick={() => { setShowForm(f => !f); setFormError(''); }}
            style={{ background: showForm ? '#444' : '#c8840a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 8, fontFamily: 'sans-serif', fontWeight: 600, fontSize: '0.88rem' }}>
            {showForm ? '✕ Cancel' : '+ Add Book'}
          </button>
        </div>
      </header>

      {/* ADD FORM */}
      {showForm && (
        <div style={{ background: '#252010', borderBottom: '2px solid #3a3020', padding: '20px 24px' }}>
          <div style={{ maxWidth: 720 }}>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 14, color: '#f5c842' }}>Add a book</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
              {[['Title *', 'title', 'e.g. Say Nothing'], ['Author *', 'author', 'e.g. Patrick Radden Keefe']].map(([label, key, ph]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.68rem', color: '#a09070', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</label>
                  <input type="text" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addBook()} placeholder={ph}
                    style={{ width: '100%', background: '#1a1208', border: '1.5px solid #444', borderRadius: 7, padding: '8px 11px', color: '#faf6ef', fontSize: '0.9rem' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#a09070', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'sans-serif' }}>Genre</label>
                <select value={form.genre} onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                  style={{ width: '100%', background: '#1a1208', border: '1.5px solid #444', borderRadius: 7, padding: '8px 11px', color: '#faf6ef', fontFamily: 'sans-serif', fontSize: '0.86rem' }}>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#a09070', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'sans-serif' }}>Notes</label>
                <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Recommended by Claude — similar to Killing Pablo"
                  style={{ width: '100%', background: '#1a1208', border: '1.5px solid #444', borderRadius: 7, padding: '8px 11px', color: '#faf6ef', fontFamily: 'sans-serif', fontSize: '0.86rem' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', color: '#a09070', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, fontFamily: 'sans-serif' }}>
                  Location in Library
                </label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Nonfiction · 955.05 BOW"
                  style={{ width: '100%', background: '#1a1208', border: '1.5px solid #444', borderRadius: 7, padding: '8px 11px', color: '#faf6ef', fontFamily: 'sans-serif', fontSize: '0.86rem' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 22 }}>
                <input type="checkbox" id="inCollection" checked={form.inCollection}
                  onChange={e => setForm(f => ({ ...f, inCollection: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: '#c8840a' }} />
                <label htmlFor="inCollection" style={{ fontSize: '0.84rem', color: '#faf6ef', fontFamily: 'sans-serif', cursor: 'pointer' }}>
                  In Radnor collection
                </label>
              </div>
            </div>
            {formError && <p style={{ color: '#e07050', fontSize: '0.8rem', marginBottom: 10, fontFamily: 'sans-serif' }}>⚠ {formError}</p>}
            <button onClick={addBook}
              style={{ background: '#c8840a', color: 'white', border: 'none', padding: '9px 22px', borderRadius: 8, fontFamily: 'sans-serif', fontWeight: 600, fontSize: '0.88rem' }}>
              Add to List →
            </button>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div style={{ background: '#211808', borderBottom: '1px solid #2a2010', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or author…"
          style={{ background: '#1a1208', border: '1.5px solid #3a3020', borderRadius: 7, padding: '6px 11px', color: '#faf6ef', fontFamily: 'sans-serif', fontSize: '0.82rem', width: 200 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
          {allGenres.map(g => (
            <button key={g} onClick={() => setFilter(g)} style={{
              background: filterGenre === g ? '#c8840a' : 'transparent',
              color: filterGenre === g ? 'white' : '#8a7d6b',
              border: `1px solid ${filterGenre === g ? '#c8840a' : '#3a3020'}`,
              borderRadius: 20, padding: '3px 11px', fontFamily: 'sans-serif', fontSize: '0.75rem'
            }}>{g}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.72rem', color: '#666', fontFamily: 'sans-serif' }}>Sort:</span>
          {[['collection','At Radnor'],['added','Recent'],['title','Title'],['author','Author']].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)} style={{
              background: sortBy === val ? '#2a2010' : 'transparent',
              color: sortBy === val ? '#f5c842' : '#666',
              border: 'none', fontFamily: 'sans-serif', fontSize: '0.75rem', padding: '4px 8px', borderRadius: 4
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* BOOK GRID */}
      <main style={{ padding: '20px 24px' }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'sans-serif' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📚</div>
            <p style={{ fontSize: '1.05rem', color: '#faf6ef', fontFamily: 'Georgia, serif', marginBottom: 8 }}>
              {books.length === 0 ? 'Your list is empty' : 'No books match that filter'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {visible.map(book => (
              <div key={book.id}
                style={{ background: '#211808', border: `1px solid ${book.inCollection ? '#2d5a32' : '#2a2010'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#c8840a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = book.inCollection ? '#2d5a32' : '#2a2010'; e.currentTarget.style.transform = ''; }}
              >
                <div style={{ height: 3, background: book.inCollection ? 'linear-gradient(90deg, #2d8a40, #7ecb84)' : 'linear-gradient(90deg, #c8840a, #f5c842)' }} />
                <div style={{ padding: '13px 15px' }}>

                  {/* Title / Author / Remove */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.98rem', fontWeight: 700, lineHeight: 1.3, marginBottom: 2 }}>{book.title}</p>
                      <p style={{ fontSize: '0.78rem', color: '#a09070', fontFamily: 'sans-serif' }}>by {book.author}</p>
                    </div>
                    <button onClick={() => removeBook(book.id)} title="Remove"
                      style={{ background: 'none', border: 'none', color: '#444', fontSize: '1rem', padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e07050'}
                      onMouseLeave={e => e.currentTarget.style.color = '#444'}>✕</button>
                  </div>

                  {/* Genre badge */}
                  <div style={{ marginBottom: book.notes ? 8 : 10 }}>
                    <span style={{ background: 'rgba(200,132,10,0.12)', border: '1px solid rgba(200,132,10,0.25)', borderRadius: 4, padding: '2px 8px', fontSize: '0.68rem', color: '#f5c842', fontFamily: 'sans-serif' }}>
                      {book.genre}
                    </span>
                  </div>

                  {/* Notes */}
                  {book.notes && (
                    <p style={{ fontSize: '0.76rem', color: '#7a6d5b', fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5, fontFamily: 'sans-serif', borderLeft: '2px solid #2a2010', paddingLeft: 8 }}>
                      {book.notes}
                    </p>
                  )}

                  {/* Collection status */}
                  {book.inCollection === true ? (
                    <div style={{ background: '#1e3d22', border: '1px solid #2d6b34', borderRadius: 6, padding: '7px 11px', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.76rem', color: '#7ecb84', fontFamily: 'sans-serif', fontWeight: 500 }}>
                        ✓ In Radnor Collection
                      </div>
                      {book.location && (
                        <div style={{ fontSize: '0.72rem', color: '#7ecb84', fontFamily: 'sans-serif', opacity: 0.8, marginTop: 3 }}>
                          📍 {book.location}
                        </div>
                      )}
                    </div>
                  ) : book.inCollection === false ? (
                    <div style={{ background: '#2a2a2a', border: '1px solid #444', borderRadius: 6, padding: '7px 11px', marginBottom: 8 }}>
                      <div style={{ fontSize: '0.76rem', color: '#888', fontFamily: 'sans-serif' }}>— Not in Radnor Collection</div>
                    </div>
                  ) : (
                    <div style={{ background: '#222', border: '1px solid #333', borderRadius: 6, padding: '7px 11px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.76rem', color: '#666', fontFamily: 'sans-serif' }}>Collection status unknown</span>
                      <a href={CATALOG_URL(book.title, book.author)} target="_blank" rel="noreferrer"
                        style={{ fontSize: '0.72rem', color: '#c8840a', fontFamily: 'sans-serif', textDecoration: 'none', flexShrink: 0, marginLeft: 8 }}>
                        Look up →
                      </a>
                    </div>
                  )}

                  {/* Catalog link */}
                  <a href={CATALOG_URL(book.title, book.author)} target="_blank" rel="noreferrer"
                    style={{ display: 'block', textAlign: 'center', background: '#1a2e1c', color: '#6db872', border: '1px solid #2a4e2c', borderRadius: 6, padding: '7px 12px', fontSize: '0.76rem', fontFamily: 'sans-serif', fontWeight: 500 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#223a24'}
                    onMouseLeave={e => e.currentTarget.style.background = '#1a2e1c'}>
                    🏛 Open in Catalog →
                  </a>

                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #2a2010', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: '0.72rem', color: '#444', fontFamily: 'sans-serif' }}>
          {visible.length} of {books.length} books · Ask Claude in chat for personalized recommendations
        </p>
        <p style={{ fontSize: '0.7rem', color: '#444', fontFamily: 'sans-serif' }}>Shelf Scout · Radnor Township Library</p>
      </footer>
    </>
  );
}
