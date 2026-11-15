// Package saves stores named saved games (for example chess games as PGN text) in a JSON file.
package saves

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

const (
	maxSaves = 200
	maxName  = 100
	maxData  = 256 * 1024 // 256 KB per save is far more than any game needs
)

// Save is one saved game. Data is game-specific text (PGN for chess).
type Save struct {
	ID      string `json:"id"`
	Game    string `json:"game"`
	Name    string `json:"name"`
	Data    string `json:"data"`
	Created string `json:"created"` // RFC 3339
}

// Store is safe for concurrent use.
type Store struct {
	mu    sync.Mutex
	path  string // empty = in-memory only
	saves []Save
}

// Open loads the store from path. A missing file gives an empty store; a corrupt file is
// moved aside rather than overwritten.
func Open(path string) (*Store, error) {
	s := &Store{path: path}
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
	if err := json.Unmarshal(data, &s.saves); err != nil {
		_ = os.Rename(path, fmt.Sprintf("%s.corrupt-%d", path, time.Now().Unix()))
		s.saves = nil
	}
	return s, nil
}

func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

func clip(s string, n int) string {
	s = strings.TrimSpace(s)
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// Add stores a new save and returns it.
func (s *Store) Add(game, name, data string) (Save, error) {
	game, name = clip(game, 40), clip(name, maxName)
	if game == "" {
		return Save{}, errors.New("game is required")
	}
	if name == "" {
		name = "Untitled"
	}
	if strings.TrimSpace(data) == "" {
		return Save{}, errors.New("nothing to save")
	}
	if len(data) > maxData {
		return Save{}, errors.New("save is too large")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.saves) >= maxSaves {
		return Save{}, fmt.Errorf("too many saved games (limit %d) — delete some first", maxSaves)
	}
	sv := Save{ID: newID(), Game: game, Name: name, Data: data, Created: time.Now().UTC().Format(time.RFC3339)}
	s.saves = append(s.saves, sv)
	if err := s.saveLocked(); err != nil {
		s.saves = s.saves[:len(s.saves)-1]
		return Save{}, err
	}
	return sv, nil
}

// List returns the saves for one game (all games if game is empty), newest first.
func (s *Store) List(game string) []Save {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := []Save{}
	for _, sv := range s.saves {
		if game == "" || sv.Game == game {
			out = append(out, sv)
		}
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Created > out[j].Created })
	return out
}

// Delete removes a save by id. Deleting an unknown id is not an error.
func (s *Store) Delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, sv := range s.saves {
		if sv.ID == id {
			old := append([]Save(nil), s.saves...)
			s.saves = append(s.saves[:i], s.saves[i+1:]...)
			if err := s.saveLocked(); err != nil {
				s.saves = old
				return err
			}
			return nil
		}
	}
	return nil
}

// saveLocked writes the file atomically (temp file + rename). Caller must hold s.mu.
func (s *Store) saveLocked() error {
	if s.path == "" {
		return nil
	}
	data, err := json.MarshalIndent(s.saves, "", "  ")
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
