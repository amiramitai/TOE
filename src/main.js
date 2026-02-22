import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

window.onerror = (msg, src, line, col, err) => {
  document.getElementById('app').innerHTML =
    '<pre style="color:red;padding:2rem;background:#111;position:fixed;inset:0;z-index:9999;overflow:auto;">' +
    String(err ? err.stack : msg) + '</pre>';
};

const app = mount(App, { target: document.getElementById('app') });
export default app;
