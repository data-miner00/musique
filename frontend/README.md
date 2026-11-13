# Musique Frontend

## Getting Started

Start the backend on `localhost:8000` (see `backend/README.md`), then:

```
npm run dev
```

The frontend calls the API on its own origin under `/api`; the dev server forwards those requests to the backend on `localhost:8000`. No `.env` file is needed.

To test from another device on the local network, such as a phone:

```
npm run dev -- --host
```

Then open the "Network" address it prints. The backend can stay on localhost.
