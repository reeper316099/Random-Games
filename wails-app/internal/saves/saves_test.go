package saves

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAddListDelete(t *testing.T) {
	s, _ := Open("")
	a, err := s.Add("chess", "Game A", "1. e4 e5 *")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Add("chess", "Game B", "1. d4 d5 *"); err != nil {
		t.Fatal(err)
	}
	s.Add("other", "Not chess", "x")
	if n := len(s.List("chess")); n != 2 {
		t.Fatalf("expected 2 chess saves, got %d", n)
	}
	if n := len(s.List("")); n != 3 {
		t.Fatalf("expected 3 saves total, got %d", n)
	}
	if err := s.Delete(a.ID); err != nil {
		t.Fatal(err)
	}
	if n := len(s.List("chess")); n != 1 {
		t.Fatalf("expected 1 chess save after delete, got %d", n)
	}
	if err := s.Delete("does-not-exist"); err != nil {
		t.Fatal("deleting an unknown id should not fail")
	}
}

func TestValidation(t *testing.T) {
	s, _ := Open("")
	if _, err := s.Add("", "n", "d"); err == nil {
		t.Fatal("missing game accepted")
	}
	if _, err := s.Add("chess", "n", "   "); err == nil {
		t.Fatal("empty data accepted")
	}
	if _, err := s.Add("chess", "n", strings.Repeat("x", maxData+1)); err == nil {
		t.Fatal("oversized data accepted")
	}
	sv, err := s.Add("chess", "", "1. e4 *")
	if err != nil || sv.Name != "Untitled" {
		t.Fatalf("blank name should become Untitled, got %q (%v)", sv.Name, err)
	}
	long, _ := s.Add("chess", strings.Repeat("n", 500), "1. e4 *")
	if n := len([]rune(long.Name)); n != maxName {
		t.Fatalf("name not clipped: %d", n)
	}
}

func TestLimit(t *testing.T) {
	s, _ := Open("")
	for i := 0; i < maxSaves; i++ {
		if _, err := s.Add("chess", "g", "1. e4 *"); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := s.Add("chess", "g", "1. e4 *"); err == nil {
		t.Fatal("limit not enforced")
	}
}

func TestPersistence(t *testing.T) {
	path := filepath.Join(t.TempDir(), "x", "saves.json")
	s, _ := Open(path)
	sv, err := s.Add("chess", "Keep me", "1. e4 e5 *")
	if err != nil {
		t.Fatal(err)
	}
	s2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	got := s2.List("chess")
	if len(got) != 1 || got[0].ID != sv.ID || got[0].Data != "1. e4 e5 *" {
		t.Fatalf("not restored: %+v", got)
	}
}

func TestCorruptFileMovedAside(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "saves.json")
	os.WriteFile(path, []byte("nope"), 0o644)
	s, err := Open(path)
	if err != nil || len(s.List("")) != 0 {
		t.Fatal("expected empty store")
	}
	if m, _ := filepath.Glob(filepath.Join(dir, "saves.json.corrupt-*")); len(m) != 1 {
		t.Fatal("corrupt file should be kept as backup")
	}
}
