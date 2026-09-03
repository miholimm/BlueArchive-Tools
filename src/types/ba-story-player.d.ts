// Ambient declaration for the prebuilt `ba-story-player` Vue component.
// Its package.json "exports" map points "." only at the JS/UMD bundles and
// does not expose the "types" condition, so TypeScript (moduleResolution:
// Bundler) cannot resolve dist/lib/main.d.ts. Declaring the module here lets
// the React bridge consume it cleanly.
declare module 'ba-story-player' {
  import type { DefineComponent } from 'vue'
  const BaStoryPlayer: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >
  export default BaStoryPlayer
}
