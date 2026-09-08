.PHONY: install dev backend frontend build typecheck docker-up docker-down docker-build test-smoke

install:
	cd backend && npm install
	cd frontend && npm install

dev:
	cd frontend && npx concurrently --kill-others --names backend,frontend --prefix-colors blue,magenta "cd ../backend && npm run dev" "npm run dev"

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

build:
	cd backend && npm run build
	cd frontend && npm run build

typecheck:
	cd backend && npm run typecheck
	cd frontend && npx tsc --noEmit

docker-build:
	docker compose build

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

test-smoke:
	@curl -sf http://127.0.0.1:4000/api/health | tee /dev/stderr | grep -q '"ok":true'
	@curl -sf http://127.0.0.1:4000/api/apps >/dev/null
	@curl -sf http://127.0.0.1:3000 >/dev/null
	@echo "smoke ok"
