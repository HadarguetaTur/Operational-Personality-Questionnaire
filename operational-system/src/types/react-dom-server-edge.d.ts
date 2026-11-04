// react-dom ships `server.edge.js` but @types/react-dom@18 has no typings for it.
// It exposes the same API as `react-dom/server`.
declare module 'react-dom/server.edge' {
  export * from 'react-dom/server';
}
