package main

import (
	"context"
	"log"
	"os"
	"path/filepath"

	"randomgames/internal/saves"
	"randomgames/internal/scores"
)

// App is bound to the frontend: its exported methods are callable from JavaScript
// as window.go.main.App.<Method>().
type App struct {
	ctx   context.Context
	store *scores.Store
	saves *saves.Store
}

// NewApp opens (or creates) the scores file in the user's config directory.
// If that fails the app still works, but scores are only kept until it closes.
func NewApp() *App {
	path, savesPath := "", ""
	if dir, err := os.UserConfigDir(); err == nil {
		path = filepath.Join(dir, "RandomGames", "scores.json")
		savesPath = filepath.Join(dir, "RandomGames", "saves.json")
	}
	store, err := scores.Open(path)
	if err != nil {
		log.Printf("could not read scores file %q: %v (continuing with an empty table)", path, err)
	}
	sv, err := saves.Open(savesPath)
	if err != nil {
		log.Printf("could not read saves file %q: %v (continuing with no saved games)", savesPath, err)
	}
	return &App{store: store, saves: sv}
}

func (a *App) startup(ctx context.Context) { a.ctx = ctx }

// SubmitScore records a result from a game and reports where it ranked.
func (a *App) SubmitScore(e scores.Entry) (scores.Result, error) { return a.store.Submit(e) }

// GetScores returns every high-score table.
func (a *App) GetScores() []scores.Board { return a.store.All() }

// ResetScores clears the tables for one game, or all of them when game is "".
func (a *App) ResetScores(game string) error { return a.store.Reset(game) }

// ScoresPath tells the user where their scores file lives.
func (a *App) ScoresPath() string { return a.store.Path() }

// SaveGame stores a named save (for chess, the PGN text) and returns it.
func (a *App) SaveGame(game, name, data string) (saves.Save, error) {
	return a.saves.Add(game, name, data)
}

// ListSaves returns saved games for one game (newest first).
func (a *App) ListSaves(game string) []saves.Save { return a.saves.List(game) }

// DeleteSave removes a saved game by id.
func (a *App) DeleteSave(id string) error { return a.saves.Delete(id) }
