import { RegistryService } from "./service";
import { LocalStore } from "./store";

// Survives development hot reload; production runs as one local Node server.
const runtime = globalThis as typeof globalThis & { registrySliceService?: RegistryService };
export function service(): RegistryService {
  return runtime.registrySliceService ??= new RegistryService(new LocalStore(process.env.REGISTRY_DATA_DIR));
}
