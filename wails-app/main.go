package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
)

// frontend/dist holds the shell page (committed) and games/ (copied in by sync-games.sh).
//
//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Random Games",
		Width:     1180,
		Height:    820,
		MinWidth:  480,
		MinHeight: 520,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 11, G: 15, B: 23, A: 1},
		OnStartup:        app.startup,
		Bind:             []interface{}{app},
		// Passing Mac options (even empty ones) is what enables the green zoom/fullscreen button;
		// without them Wails leaves it greyed out.
		Mac: &mac.Options{},
	})
	if err != nil {
		log.Fatal(err)
	}
}
