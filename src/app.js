import { createStore } from './core/state.js';
import { LockScreen } from './ui/LockScreen.js';
import { Shell } from './ui/Shell.js';
import { createAutolock } from './core/autolock.js';

export class App {
  constructor({ root }) {
    this.root = root;
    this.vaultKey = null;
    this.store = createStore({ authenticated: false });
    this.lockScreen = null;
    this.shell = null;
    this.autolock = null;
  }

  async start() {
    this.lockScreen = new LockScreen(this.root, {
      onUnlock: (key) => this.enterApp(key),
    });
    await this.lockScreen.mount();
  }

  async enterApp(key) {
    this.vaultKey = key;
    this.store.set({ authenticated: true });
    if (this.lockScreen) {
      this.lockScreen.unmount();
      this.lockScreen = null;
    }
    this.shell = new Shell(this.root, {
      vaultKey: key,
      onLock: () => this.lock(),
    });
    await this.shell.mount();
    if (this.autolock) this.autolock.destroy();
    this.autolock = createAutolock({ onLock: () => this.lock() });
  }

  async lock() {
    if (this.autolock) { this.autolock.destroy(); this.autolock = null; }
    this.vaultKey = null;
    this.store.set({ authenticated: false });
    if (this.shell) {
      this.shell.unmount();
      this.shell = null;
    this.autolock = null;
    }
    await this.start();
  }
}
