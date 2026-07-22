IDENTITY ?= $(shell security find-identity -v -p codesigning 2>/dev/null | awk -F '"' '/Apple Development:/ {print $$2; exit}')
APP := dist/$(if $(filter arm64,$(shell uname -m)),mac-arm64,mac)/Kap.app

.PHONY: build dmg-adhoc install

build:
	@test -n "$(IDENTITY)" || { echo "No Apple Development signing identity found"; exit 1; }
	pnpm build
	pnpm exec electron-builder --mac --config.mac.identity="$(IDENTITY)"

dmg-adhoc:
	pnpm dist

install: build
	pkill -x Kap 2>/dev/null || true
	sudo rm -rf /Applications/Kap.app
	sudo ditto "$(APP)" /Applications/Kap.app
	open /Applications/Kap.app
