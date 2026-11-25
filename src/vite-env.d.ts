/// <reference types="vite/client" />

declare module "virtual:bloom-scan" {
  const scan: import("./lib/bloomScan").BloomScan;
  export default scan;
}
