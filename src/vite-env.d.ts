/// <reference types="vite/client" />

// vite-imagetools: query-built variants of an image (see components/Logo.tsx).
declare module '*&as=srcset' {
  const srcset: string;
  export default srcset;
}
declare module '*&format=png' {
  const src: string;
  export default src;
}
