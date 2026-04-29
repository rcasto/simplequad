.PHONY: build build-and-watch

build:
	cd pixi-platformer && npm ci && npm run build
	cd image-compression && npm ci && npm run build

build-and-watch:
	cd pixi-platformer && npm ci && npm run build:watch &
	cd image-compression && npm ci && npm run build:watch &