import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-shower-thoughts",
  description: "Drop a shower thought, peers vote up or down, sort by score.",
  accentHex: "#3aa8a1",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
