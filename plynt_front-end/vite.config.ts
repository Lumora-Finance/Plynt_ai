import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Dynamically import tanstackStart so the module resolves at build time
// (same approach used by @lovable.dev/vite-tanstack-config internally)
const { tanstackStart } = await import("@tanstack/react-start/plugin/vite");

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tailwindcss(),
    TanStackRouterVite({
      autoCodeSplitting: true,
      codeSplittingOptions: { addHmr: false },
    }),
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro(),
    react(),
  ],
  build: {
    target: "esnext",
    rolldownOptions: {
      // @stripe/stripe-js is a peer dependency of @stripe/crypto (pulled in by
      // @privy-io/react-auth). It is loaded dynamically by the Stripe SDK at
      // runtime and must not be bundled — mark it as external so Rolldown
      // doesn't fail trying to resolve it.
      external: ["@stripe/stripe-js"],
    },
  },
  ssr: {
    // Externalize all node_modules from the SSR bundle. Vite 8 + Rolldown is
    // stricter than Rollup about unresolved imports in browser-only packages
    // (e.g. @privy-io/react-auth, @stripe/crypto, @walletconnect/*). Setting
    // `true` tells the SSR build to treat every dependency as external, which
    // is the correct behaviour for a Node/edge server that has node_modules
    // available at runtime.
    external: true,
  },
});
