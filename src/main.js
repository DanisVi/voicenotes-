import './styles/main.css';
import { App } from './app.js';
import { initTheme } from './core/theme.js';

initTheme();

const app = new App({ root: document.getElementById('root') });
app.start();
