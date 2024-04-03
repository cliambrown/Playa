import { createApp } from 'vue';

import { plugin as vueTransitionsPlugin } from '@morev/vue-transitions';
import '@morev/vue-transitions/styles';

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import './styles.css';
import App from './App.vue';

import { createWebHistory, createRouter } from 'vue-router'

import HomeView from './views/HomeView.vue';
import SettingsView from './views/SettingsView.vue';
import ClearPlaybackView from './views/ClearPlaybackView.vue';
import ShowPageView from './views/ShowPageView.vue';
import ExternalItemPageView from './views/ExternalItemPageView.vue';
import MoviePageView from './views/MoviePageView.vue';

import InputWithLabel from './components/InputWithLabel.vue';
import Button from './components/Button.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/clear-playback', name: 'clearPlayback', component: ClearPlaybackView },
  { path: '/shows/:id', name: 'show', component: ShowPageView },
  { path: '/external-items/:id', name: 'externalItem', component: ExternalItemPageView },
  { path: '/movies/:id', name: 'movie', component: MoviePageView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
});

window.addEventListener('keyup', event => {
  if (event.key === 'Escape') router.go(-1);
});

createApp(App)
  .component('InputWithLabel', InputWithLabel)
  .component('Button', Button)
  .component('VueDatePicker', VueDatePicker)
  .use(router)
  .use(vueTransitionsPlugin({}))
  .mount('#app');
