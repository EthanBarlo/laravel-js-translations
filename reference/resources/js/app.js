import { translationsReady } from "@translations";
import { Alpine, Livewire } from "../../vendor/livewire/livewire/dist/livewire.esm";

// Wait for translations to load before initializing Livewire
// Loading starts at the import of @translations so its already started before this point
// Hopefully its already loaded by the time we get here, if not we wait.
(async () => {
    await translationsReady;
    
    Livewire.start();
})();