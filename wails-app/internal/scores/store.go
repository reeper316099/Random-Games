// Package scores keeps the high-score tables for every game and saves them to a JSON file.
package scores

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	// TopN is how many results are kept per table.
	TopN = 10
	// maxTables stops a misbehaving page from creating unlimited tables.
	maxTables = 500
	maxText   = 80
)

// Entry is one result reported by a game.
type Entry struct {
	Game     string  `json:"game"`     // e.g. "minesweeper"
	Category string  `json:"category"` // e.g. "Easy" (may be empty)
	Metric   string  `json:"metric"`   // e.g. "Best time"
	Value    float64 `json:"value"`
	Unit     string  `json:"unit"`   // "s", "moves", "chips", "hands" ...
	Better   string  `json:"better"` // "low" (smaller wins) or "high"
	Detail   string  `json:"detail,omitempty"`
	When     string  `json:"when"` // RFC 3339, filled in on submit
}

// Board is one table of results: a single game + category + metric.
type Board struct {
	Game     string  `json:"game"`
	Category string  `json:"category"`
	Metric   string  `json:"metric"`
	Unit     string  `json:"unit"`
	Better   string  `json:"better"`
	Entries  []Entry `json:"entries"`
}

// Result tells the caller what happened to a submitted entry.
type Result struct {
	Rank    int  `json:"rank"`    // 1-based position in the table, 0 if it did not make the top N
	NewBest bool `json:"newBest"` // true if it is now first place
}

// Store is safe for concurrent use.
type Store struct {
	mu     sync.Mutex
	path   string // empty = in-memory only
	boards map[string]*Board
}

func key(game, category, metric string) string { return game + "\x1f" + category + "\x1f" + metric }

// Open loads the store from path. A missing file gives an empty store; a corrupt file is
// moved aside (so nothing is silently lost) and an empty store is returned.
func Open(path string) (*Store, error) {
	s := &Store{path: path, boards: map[string]*Board{}}
	if path == "" {
		return s, nil
	}
	data, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return s, nil
	}
	if err != nil {
		return s, err
	}
	var boards []Board
	if err := json.Unmarshal(data, &boards); err != nil {
		backup := fmt.Sprintf("%s.corrupt-%d", path, time.Now().Unix())
		_ = os.Rename(path, backup)
		return s, nil
	}
	for i := range boards {
		b := boards[i]
		if len(b.Entries) > TopN {
			b.Entries = b.Entries[:TopN]
		}
		s.boards[key(b.Game, b.Category, b.Metric)] = &b
	}
	return s, nil
}

func clean(s string) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > maxText {
		s = string(r[:maxText])
	}
	return s
}

// Submit records an entry and returns where it landed.
func (s *Store) Submit(e Entry) (Result, error) {
	e.Game, e.Category, e.Metric = clean(e.Game), clean(e.Category), clean(e.Metric)
	e.Unit, e.Detail = clean(e.Unit), clean(e.Detail)
	if e.Game == "" || e.Metric == "" {
		return Result{}, errors.New("game and metric are required")
	}
	if math.IsNaN(e.Value) || math.IsInf(e.Value, 0) {
		return Result{}, errors.New("value must be a finite number")
	}
	if e.Better != "low" {
		e.Better = "high"
	}
	if e.When == "" {
		e.When = time.Now().UTC().Format(time.RFC3339)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	k := key(e.Game, e.Category, e.Metric)
	b, ok := s.boards[k]
	if !ok {
		if len(s.boards) >= maxTables {
			return Result{}, errors.New("too many score tables")
		}
		b = &Board{Game: e.Game, Category: e.Category, Metric: e.Metric, Unit: e.Unit, Better: e.Better}
		s.boards[k] = b
	}

	// Insert after any equal values so earlier results keep their rank on ties.
	better := func(a, c float64) bool {
		if b.Better == "low" {
			return a < c
		}
		return a > c
	}
	pos := len(b.Entries)
	for i, existing := range b.Entries {
		if better(e.Value, existing.Value) {
			pos = i
			break
		}
	}
	if pos >= TopN {
		return Result{}, nil // not good enough for the top N
	}
	b.Entries = append(b.Entries, Entry{})
	copy(b.Entries[pos+1:], b.Entries[pos:])
	b.Entries[pos] = e
	if len(b.Entries) > TopN {
		b.Entries = b.Entries[:TopN]
	}
	if err := s.saveLocked(); err != nil {
		return Result{Rank: pos + 1, NewBest: pos == 0}, err
	}
	return Result{Rank: pos + 1, NewBest: pos == 0}, nil
}

// All returns every non-empty table in a stable order (game, category, metric).
func (s *Store) All() []Board {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]Board, 0, len(s.boards))
	for _, b := range s.boards {
		if len(b.Entries) == 0 {
			continue
		}
		c := *b
		c.Entries = append([]Entry(nil), b.Entries...)
		out = append(out, c)
	}
	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Game != b.Game {
			return a.Game < b.Game
		}
		if a.Category != b.Category {
			return a.Category < b.Category
		}
		return a.Metric < b.Metric
	})
	return out
}

// Reset clears every table for one game, or everything if game is empty.
func (s *Store) Reset(game string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, b := range s.boards {
		if game == "" || b.Game == game {
			delete(s.boards, k)
		}
	}
	return s.saveLocked()
}

// Path returns where scores are saved ("" if only kept in memory).
func (s *Store) Path() string { return s.path }

// saveLocked writes the file atomically (temp file + rename). Caller must hold s.mu.
func (s *Store) saveLocked() error {
	if s.path == "" {
		return nil
	}
	boards := make([]Board, 0, len(s.boards))
	for _, b := range s.boards {
		boards = append(boards, *b)
	}
	sort.Slice(boards, func(i, j int) bool {
		return key(boards[i].Game, boards[i].Category, boards[i].Metric) < key(boards[j].Game, boards[j].Category, boards[j].Metric)
	})
	data, err := json.MarshalIndent(boards, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}
