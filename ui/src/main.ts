import { mount } from 'svelte';
import '@fontsource-variable/mona-sans';
import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/500.css';
import '@fontsource/atkinson-hyperlegible-next/600.css';
import './app.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app')! });
