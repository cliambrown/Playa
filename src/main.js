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
import Show from './views/Show.vue';

import InputWithLabel from './components/InputWithLabel.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/clear-playback', name: 'clearPlayback', component: ClearPlaybackView },
  { path: '/shows/:id', name: 'show', component: Show },
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
  .component('VueDatePicker', VueDatePicker)
  .use(router)
  .use(vueTransitionsPlugin({}))
  .mount('#app');
