package scores

import (
	"math"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func e(value float64, better string) Entry {
	return Entry{Game: "minesweeper", Category: "Easy", Metric: "Best time", Value: value, Unit: "s", Better: better}
}

func TestLowerIsBetterOrdering(t *testing.T) {
	s, _ := Open("")
	for _, v := range []float64{50, 30, 40} {
		if _, err := s.Submit(e(v, "low")); err != nil {
			t.Fatal(err)
		}
	}
	got := s.All()[0].Entries
	want := []float64{30, 40, 50}
	for i, w := range want {
		if got[i].Value != w {
			t.Fatalf("entry %d = %v, want %v", i, got[i].Value, w)
		}
	}
}

func TestHigherIsBetterAndRank(t *testing.T) {
	s, _ := Open("")
	s.Submit(Entry{Game: "blackjack", Metric: "Biggest win", Value: 100, Better: "high"})
	r, _ := s.Submit(Entry{Game: "blackjack", Metric: "Biggest win", Value: 500, Better: "high"})
	if r.Rank != 1 || !r.NewBest {
		t.Fatalf("expected rank 1 new best, got %+v", r)
	}
	r, _ = s.Submit(Entry{Game: "blackjack", Metric: "Biggest win", Value: 300, Better: "high"})
	if r.Rank != 2 || r.NewBest {
		t.Fatalf("expected rank 2, got %+v", r)
	}
}

func TestTiesKeepEarlierResultFirst(t *testing.T) {
	s, _ := Open("")
	a := e(30, "low")
	a.Detail = "first"
	b := e(30, "low")
	b.Detail = "second"
	s.Submit(a)
	r, _ := s.Submit(b)
	if r.Rank != 2 {
		t.Fatalf("tie should rank after the earlier result, got %d", r.Rank)
	}
	if s.All()[0].Entries[0].Detail != "first" {
		t.Fatal("earlier tie should stay first")
	}
}

func TestOnlyTopNKept(t *testing.T) {
	s, _ := Open("")
	for i := 0; i < TopN+5; i++ {
		s.Submit(e(float64(100-i), "low")) // each is better than the last
	}
	if n := len(s.All()[0].Entries); n != TopN {
		t.Fatalf("kept %d entries, want %d", n, TopN)
	}
	r, _ := s.Submit(e(9999, "low")) // far worse than the 10th
	if r.Rank != 0 {
		t.Fatalf("a result outside the top %d should have rank 0, got %d", TopN, r.Rank)
	}
}

func TestValidation(t *testing.T) {
	s, _ := Open("")
	bad := []Entry{
		{Metric: "m", Value: 1},
		{Game: "g", Value: 1},
		{Game: "g", Metric: "m", Value: math.NaN()},
		{Game: "g", Metric: "m", Value: math.Inf(1)},
	}
	for i, b := range bad {
		if _, err := s.Submit(b); err == nil {
			t.Fatalf("bad entry %d was accepted", i)
		}
	}
	long := strings.Repeat("x", 500)
	if _, err := s.Submit(Entry{Game: "g", Metric: "m", Value: 1, Detail: long}); err != nil {
		t.Fatal(err)
	}
	if n := len([]rune(s.All()[0].Entries[0].Detail)); n != maxText {
		t.Fatalf("detail not truncated: %d", n)
	}
}

func TestPersistsAcrossReopen(t *testing.T) {
	path := filepath.Join(t.TempDir(), "sub", "scores.json")
	s, _ := Open(path)
	if _, err := s.Submit(e(42.5, "low")); err != nil {
		t.Fatal(err)
	}
	s2, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	all := s2.All()
	if len(all) != 1 || all[0].Entries[0].Value != 42.5 {
		t.Fatalf("scores not restored: %+v", all)
	}
}

func TestCorruptFileIsMovedAside(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "scores.json")
	os.WriteFile(path, []byte("{ not json"), 0o644)
	s, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(s.All()) != 0 {
		t.Fatal("expected an empty store")
	}
	matches, _ := filepath.Glob(filepath.Join(dir, "scores.json.corrupt-*"))
	if len(matches) != 1 {
		t.Fatalf("corrupt file should be kept as a backup, found %d", len(matches))
	}
}

func TestReset(t *testing.T) {
	s, _ := Open("")
	s.Submit(Entry{Game: "a", Metric: "m", Value: 1})
	s.Submit(Entry{Game: "b", Metric: "m", Value: 1})
	s.Reset("a")
	all := s.All()
	if len(all) != 1 || all[0].Game != "b" {
		t.Fatalf("reset one game failed: %+v", all)
	}
	s.Reset("")
	if len(s.All()) != 0 {
		t.Fatal("reset all failed")
	}
}

func TestInfoIsStoredAndCleaned(t *testing.T) {
	s, _ := Open("")
	long := strings.Repeat("x", 500)
	in := []InfoLine{{Label: " Bet ", Value: " 25 "}, {Label: "", Value: "dropped"}, {Label: "Long", Value: long}}
	for i := 0; i < 100; i++ {
		in = append(in, InfoLine{Label: "L", Value: "v"})
	}
	if _, err := s.Submit(Entry{Game: "g", Metric: "m", Value: 1, Info: in}); err != nil {
		t.Fatal(err)
	}
	got := s.All()[0].Entries[0].Info
	if len(got) != maxInfoLines {
		t.Fatalf("want %d lines, got %d", maxInfoLines, len(got))
	}
	if got[0].Label != "Bet" || got[0].Value != "25" {
		t.Fatalf("not trimmed: %+v", got[0])
	}
	if n := len([]rune(got[1].Value)); n != maxInfoText {
		t.Fatalf("long value not capped: %d", n)
	}
}
