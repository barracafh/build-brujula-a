// Bun no resuelve `server-only` (lo aporta Next). Para probar módulos de
// servidor desde scripts: bun --preload ./scripts/sin-server-only.ts <script>
// @ts-expect-error el proyecto no incluye los tipos de Bun
import { plugin } from "bun";
plugin({
  name: "server-only",
  setup(b: { module: (nombre: string, f: () => unknown) => void }) {
    b.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});
