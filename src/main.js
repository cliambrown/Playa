import { createApp } from 'vue';

import { plugin as vueTransitionsPlugin } from '@morev/vue-transitions';
import '@morev/vue-transitions/styles';

import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

import './styles.css';
import App from './App.vue';

import { createWebHistory, createRouter } from 'vue-router';

import HomeView from './views/HomeView.vue';
import ArchivesView from './views/ArchivesView.vue';
import SettingsView from './views/SettingsView.vue';
import ClearPlaybackView from './views/ClearPlaybackView.vue';
import ItemPageView from './views/ItemPageView.vue';

import InputWithLabel from './components/InputWithLabel.vue';
import Button from './components/Button.vue';

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/archives', name: 'archives', component: ArchivesView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/clear-playback', name: 'clearPlayback', component: ClearPlaybackView },
  { path: '/items/:id', name: 'item', component: ItemPageView },
  { path: '/items/create-show', name: 'item.create.show', component: ItemPageView },
  { path: '/items/create-movie', name: 'item.create.movie', component: ItemPageView },
  { path: '/items/create-yt-playlist', name: 'item.create.ytPlaylist', component: ItemPageView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

createApp(App)
  .component('InputWithLabel', InputWithLabel)
  .component('Button', Button)
  .component('VueDatePicker', VueDatePicker)
  .use(router)
  .use(vueTransitionsPlugin({}))
  .mount('#app');
