# Inz - Sklep

Prosty backend + frontend z logowaniem (JWT w httpOnly cookie).

## Jak uruchomić

1. Backend
   - Skonfiguruj MongoDB (lokalnie: `mongodb://localhost:27017/sklep`).
   - Zmienna środowiskowa w `backend/.env`:
     - `MONGO_URI=mongodb://localhost:27017/sklep`
     - `PORT=5000`
     - `JWT_SECRET=devsecret`
     - opcjonalnie: `CLIENT_URL=http://localhost:5173`
   - Start:
     - Dev: `npm run dev` (w katalogu `backend`)
     - Prod: `npm run build && npm start`

2. Frontend
   - Dev: `npm run dev` (w katalogu `frontend`)
   - Opcjonalnie możesz ustawić `VITE_API_URL` (domyślnie `http://localhost:5000`).

## API (skrót)

- `POST /api/auth/register` body: `{ username, email, password }` – rejestracja i automatyczne logowanie
- `POST /api/auth/login` body: `{ email, password }` – logowanie
- `POST /api/auth/logout` – wylogowanie (czyści cookie)
- `GET /api/auth/me` – dane aktualnie zalogowanego użytkownika

Wszystkie żądania z przeglądarki muszą mieć `credentials: 'include'` (cookie).

## Uwagi

- CORS jest skonfigurowany dla `localhost` (różne porty są dozwolone w dev).
- Cookie ma `SameSite=Lax` i `Secure=false` w dev; w produkcji ustaw `NODE_ENV=production` (wtedy `Secure` i `SameSite=None`).
