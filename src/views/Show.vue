<script setup>
import { computed, ref } from 'vue';
import { open } from '@tauri-apps/api/shell';
import { TransitionExpand } from '@morev/vue-transitions';
import { store } from '../store.js'
import { useGet, useOpenOrHomeDir } from '../helpers';
import { searchShow } from '../tvdb';
import Button from '../components/Button.vue';
import EpisodeCard from '../components/EpisodeCard.vue';

let updateTimeoutId = null;
let updateMsgTimoutId = null;

const showEdit = ref(false);
const showMatches = ref(true);

const show = computed(() => {
  return store.shows[store.route.params.id]
});

function handleUpdate() {
  if (!store.loaded_from_db) return false;
  window.clearTimeout(updateTimeoutId);
  window.clearTimeout(updateMsgTimoutId);
  store.loading_msg = 'Waiting...'
  updateTimeoutId = window.setTimeout(async () => {
    store.loading = true;
    store.loading_msg = 'Saving...'
    const response = await show.value.saveToDB();
    if (parseInt(useGet(response, 'rowsAffected')))
      store.loading_msg = 'Show saved';
    store.loading = false;
    updateMsgTimoutId = window.setTimeout(() => {
      store.loading_msg = ''
    }, 5000);
  }, 250);
}

function openTvdbSlug(slug) {
  if (slug) open('https://www.thetvdb.com/series/' + slug);
}

async function searchShowInTvdb() {
  // if (!show || !show.value.name) return false;
  // const matches = searchShow(store, show.value.name);
  // if (!matches || !Array.isArray(matches)) return false;
  // show.value.tvdb_matches = matches;
  // showMatches.value = true;
  show.value.tvdb_matches = [
    {
        "objectID": "series-194031",
        "aliases": [
            "Bobs Burgers",
            "Bob's Burgers (2011)",
            "Bob Burgerfalodája",
            "Бургеры Боба"
        ],
        "country": "usa",
        "id": "series-194031",
        "image_url": "https://artworks.thetvdb.com/banners/posters/194031-2.jpg",
        "name": "Bob's Burgers",
        "first_air_time": "2011-01-09",
        "overview": "Bob's Burgers follows a third-generation restaurateur, Bob, as he runs Bob's Burgers with the help of his wife and their three kids. Bob and his quirky family have big ideas about burgers, but fall short on service and sophistication. Despite the greasy counters, lousy location and a dearth of customers, Bob and his family are determined to make Bob's Burgers \"grand re-re-re-opening\" a success.",
        "primary_language": "eng",
        "primary_type": "series",
        "status": "Continuing",
        "type": "series",
        "tvdb_id": "194031",
        "year": "2011",
        "slug": "bobs-burgers",
        "overviews": {
            "ces": "Seznamme se s Belcherovými. Pětičlenná rodinka vlastnící restauraci, která je známá přípravou hamburgerů na mnoho způsobů. Hlavní hrdina Bob to nemá nejlehčí, musí se starat o rodinnou restauraci, vychovávat 3 nezvladatelné děti (Tina, Gen, Louise) a plnit své manželce Lindě po čem zrovna touží. Manželka se mu snaží pomáhat, stejně jako jeho nejstarší dcera Tina, která se z dětí vyvedla nejlépe. Kdežto mladší Gen a nejmladší Louise se snaží pouze připoutat na sebe pozornost a nadělat co nejvíce nepořádku. V každé epizodě se divákovi dostane nějaká ta porce zábavy a vtipu, takže oblíbit si novou seriálovou rodinku jistě nebude problém.",
            "deu": "In einem heruntergekommenen Stadtteil betreiben Bob und seine Familie ein kleines Burgerrestaurtant. Auch wenn die Geschäfte derzeit ziemlich mies laufen ist Bob überzeugt davon, mit seinen Burgern irgendwann einmal den ganz großen Erfolg zu erzielen. Doch vorher machen ihm seine Frau und Kinder das Leben schwer ...",
            "eng": "Bob's Burgers follows a third-generation restaurateur, Bob, as he runs Bob's Burgers with the help of his wife and their three kids. Bob and his quirky family have big ideas about burgers, but fall short on service and sophistication. Despite the greasy counters, lousy location and a dearth of customers, Bob and his family are determined to make Bob's Burgers \"grand re-re-re-opening\" a success.",
            "fin": "Komediallinen animaatiosarja Bob-nimisestä miehestä, hänen perheestään sekä räpistelevästä hampurilaismestasta. Huolimatta surkeasta sijainnista ja lukemattomista vastoinkäymisistä Bob ja hänen rakastettavan kummallinen kotijoukkonsa on vakuuttunut siitä, että juuri burgerit ovat avain menestykseen.",
            "fra": "Bob Belcher tient un petit restaurant de burgers dans une ville américaine, aidé par sa femme, l'exubérante Linda, ainsi que ses trois enfants : Tina, l'aînée passionnée par les chevaux et les postérieurs, Gene, le garçon excentrique qui ne recule jamais devant un challenge, et enfin Louise, la petite dernière au caractère bien trempé toujours en train de faire des manigances.",
            "hun": "Az amerikai sitcom rajzfilmsorozat a Belcher családról és az általuk vezetett hamburgerbüféről szól. Bob Belcher a burgerfaloda tulaja, és büféjét a világon (szinte) mindennél jobban imádja. Linda Bob feleségeként társa az életben és az üzletben; mindig igyekszik új dolgokat kipróbálni még akkor is, ha nem tudja, mi sül ki a dologból.",
            "ita": "La serie ruota attorno alle divertenti vicende di Bob, gestore del ristorante Bob's Burger ma totalmente inesperto e pasticcione, e della sua famiglia, formata da moglie e tre figli.",
            "nor": "I denne populære animerte komiserien følger vi Bob Belcher, som sammen med sin hustru og deres tre barn driver restauranten Bob's Burger. Restauranten er familiens siste håp for å holde sammen.",
            "por": "Uma série de desenhos animados que segue o dia a dia de um homem da classe trabalhadora, Bob, e da sua família peculiar. Juntos, gerem o restaurante Bob's Burgers.",
            "pt": "A série acompanha Bob da terceira geração de uma família de proprietários de restaurantes, responsável por administrar a hamburgueria \"Bob's Burgers\" junto com sua esposa e seus três filhos. Bob e sua peculiar família têm grandes ideias para os hambúrgueres, mas estão pobres em serviço e em sofisticação.",
            "rus": "«Закусочная Боба» — это забегаловка по соседству с крематорием, которой заправляет Боб Белчер со своей женой и тремя детьми. Сам Боб знает всё о приготовлении самых вкусных бургеров в округе, но такие понятия, как «обслуживание клиентов», «санитарные нормы» и «продвижение товара», даются ему с большим трудом. Но на то и существует семья, чтобы... Хотя нет, не тот случай: семья на рабочем месте — помощник тот ещё.",
            "spa": "Bob's Burgers muestra la vida de un cocinero de tercera generación, Bob, trabajando en su hamburguesería Bob's Burgers con la ayuda de su mujer y sus tres hijos. Bob y su peculiar familia tienen grandes ideas sobre hamburguesas, pero les falta un mejor y más sofisticado servicio. A pesar del local grasiento, la terrible localización y la escasez de clientela, Bob y su familia están decididos a hacer de la \"gran re-re-re-apertura\" de Bob's Burgers un éxito.",
            "swe": "“Bob’s Burgers” följer den underbart skandalösa familjen Belcher, med unika talanger för att förvandla de mest alldagliga situationer till komplett kaos.",
            "tur": "Karısı ve üç çocuğunun yardımıyla işlettiği hamburger restoranı sahibi Bob ve ailesinin hikayesini konu alan animasyon dizisidir.",
            "zhtw": "本劇圍繞Belcher一家和他們在Ocean Avenue上的漢堡店展開。創作者Loren Bouchard曾表示漢堡店位於美國東北部某個海邊小鎮。然而一些評論家根據「It Snakes a Village」推斷劇中的小鎮應該坐落在新澤西南部。 Bob的漢堡店是一座兩層的綠色樓房，一樓是漢堡店，二樓則是Bob一家生活的地方。店面周圍有不少其他店鋪，其中「It's Your Funeral Home and Crematorium」的主人Mort是漢堡店的常客。\r\n\r\n"
        },
        "translations": {
            "bul": "Бургерите на Боб",
            "ces": "Bobovy burgery",
            "deu": "Bob's Burgers",
            "eng": "Bob's Burgers",
            "fin": "Bob's Burgers",
            "fra": "Bob's Burgers",
            "heb": "הבורגרים של בוב",
            "hun": "Bob Burger Falodája",
            "ita": "Bob's Burgers",
            "por": "Bob's Burgers",
            "pt": "Bob's Burgers",
            "rus": "Закусочная Боба",
            "spa": "Bob's Burgers",
            "swe": "Bob's Burgers",
            "tur": "Bob's Burgers",
            "zhtw": "開心漢堡店"
        },
        "network": "FOX",
        "remote_ids": [
            {
                "id": "10.5240/7312-38DB-5B25-19BB-BDCF-E",
                "type": 13,
                "sourceName": "EIDR"
            },
            {
                "id": "tt1561755",
                "type": 2,
                "sourceName": "IMDB"
            },
            {
                "id": "32726",
                "type": 12,
                "sourceName": "TheMovieDB.com"
            },
            {
                "id": "EP01279298",
                "type": 3,
                "sourceName": "TMS (Zap2It)"
            }
        ],
        "thumbnail": "https://artworks.thetvdb.com/banners/posters/194031-2_t.jpg"
    },
    {
        "objectID": "series-194031",
        "aliases": [
            "Bobs Burgers",
            "Bob's Burgers (2011)",
            "Bob Burgerfalodája",
            "Бургеры Боба"
        ],
        "country": "usa",
        "id": "series-194031",
        "image_url": "https://artworks.thetvdb.com/banners/posters/194031-2.jpg",
        "name": "Bob's Burgers",
        "first_air_time": "2011-01-09",
        "overview": "Bob's Burgers follows a third-generation restaurateur, Bob, as he runs Bob's Burgers with the help of his wife and their three kids. Bob and his quirky family have big ideas about burgers, but fall short on service and sophistication. Despite the greasy counters, lousy location and a dearth of customers, Bob and his family are determined to make Bob's Burgers \"grand re-re-re-opening\" a success.",
        "primary_language": "eng",
        "primary_type": "series",
        "status": "Continuing",
        "type": "series",
        "tvdb_id": "194031",
        "year": "2012",
        "slug": "bobs-burgers",
        "overviews": {
            "ces": "Seznamme se s Belcherovými. Pětičlenná rodinka vlastnící restauraci, která je známá přípravou hamburgerů na mnoho způsobů. Hlavní hrdina Bob to nemá nejlehčí, musí se starat o rodinnou restauraci, vychovávat 3 nezvladatelné děti (Tina, Gen, Louise) a plnit své manželce Lindě po čem zrovna touží. Manželka se mu snaží pomáhat, stejně jako jeho nejstarší dcera Tina, která se z dětí vyvedla nejlépe. Kdežto mladší Gen a nejmladší Louise se snaží pouze připoutat na sebe pozornost a nadělat co nejvíce nepořádku. V každé epizodě se divákovi dostane nějaká ta porce zábavy a vtipu, takže oblíbit si novou seriálovou rodinku jistě nebude problém.",
            "deu": "In einem heruntergekommenen Stadtteil betreiben Bob und seine Familie ein kleines Burgerrestaurtant. Auch wenn die Geschäfte derzeit ziemlich mies laufen ist Bob überzeugt davon, mit seinen Burgern irgendwann einmal den ganz großen Erfolg zu erzielen. Doch vorher machen ihm seine Frau und Kinder das Leben schwer ...",
            "eng": "Bob's Burgers follows a third-generation restaurateur, Bob, as he runs Bob's Burgers with the help of his wife and their three kids. Bob and his quirky family have big ideas about burgers, but fall short on service and sophistication. Despite the greasy counters, lousy location and a dearth of customers, Bob and his family are determined to make Bob's Burgers \"grand re-re-re-opening\" a success.",
            "fin": "Komediallinen animaatiosarja Bob-nimisestä miehestä, hänen perheestään sekä räpistelevästä hampurilaismestasta. Huolimatta surkeasta sijainnista ja lukemattomista vastoinkäymisistä Bob ja hänen rakastettavan kummallinen kotijoukkonsa on vakuuttunut siitä, että juuri burgerit ovat avain menestykseen.",
            "fra": "Bob Belcher tient un petit restaurant de burgers dans une ville américaine, aidé par sa femme, l'exubérante Linda, ainsi que ses trois enfants : Tina, l'aînée passionnée par les chevaux et les postérieurs, Gene, le garçon excentrique qui ne recule jamais devant un challenge, et enfin Louise, la petite dernière au caractère bien trempé toujours en train de faire des manigances.",
            "hun": "Az amerikai sitcom rajzfilmsorozat a Belcher családról és az általuk vezetett hamburgerbüféről szól. Bob Belcher a burgerfaloda tulaja, és büféjét a világon (szinte) mindennél jobban imádja. Linda Bob feleségeként társa az életben és az üzletben; mindig igyekszik új dolgokat kipróbálni még akkor is, ha nem tudja, mi sül ki a dologból.",
            "ita": "La serie ruota attorno alle divertenti vicende di Bob, gestore del ristorante Bob's Burger ma totalmente inesperto e pasticcione, e della sua famiglia, formata da moglie e tre figli.",
            "nor": "I denne populære animerte komiserien følger vi Bob Belcher, som sammen med sin hustru og deres tre barn driver restauranten Bob's Burger. Restauranten er familiens siste håp for å holde sammen.",
            "por": "Uma série de desenhos animados que segue o dia a dia de um homem da classe trabalhadora, Bob, e da sua família peculiar. Juntos, gerem o restaurante Bob's Burgers.",
            "pt": "A série acompanha Bob da terceira geração de uma família de proprietários de restaurantes, responsável por administrar a hamburgueria \"Bob's Burgers\" junto com sua esposa e seus três filhos. Bob e sua peculiar família têm grandes ideias para os hambúrgueres, mas estão pobres em serviço e em sofisticação.",
            "rus": "«Закусочная Боба» — это забегаловка по соседству с крематорием, которой заправляет Боб Белчер со своей женой и тремя детьми. Сам Боб знает всё о приготовлении самых вкусных бургеров в округе, но такие понятия, как «обслуживание клиентов», «санитарные нормы» и «продвижение товара», даются ему с большим трудом. Но на то и существует семья, чтобы... Хотя нет, не тот случай: семья на рабочем месте — помощник тот ещё.",
            "spa": "Bob's Burgers muestra la vida de un cocinero de tercera generación, Bob, trabajando en su hamburguesería Bob's Burgers con la ayuda de su mujer y sus tres hijos. Bob y su peculiar familia tienen grandes ideas sobre hamburguesas, pero les falta un mejor y más sofisticado servicio. A pesar del local grasiento, la terrible localización y la escasez de clientela, Bob y su familia están decididos a hacer de la \"gran re-re-re-apertura\" de Bob's Burgers un éxito.",
            "swe": "“Bob’s Burgers” följer den underbart skandalösa familjen Belcher, med unika talanger för att förvandla de mest alldagliga situationer till komplett kaos.",
            "tur": "Karısı ve üç çocuğunun yardımıyla işlettiği hamburger restoranı sahibi Bob ve ailesinin hikayesini konu alan animasyon dizisidir.",
            "zhtw": "本劇圍繞Belcher一家和他們在Ocean Avenue上的漢堡店展開。創作者Loren Bouchard曾表示漢堡店位於美國東北部某個海邊小鎮。然而一些評論家根據「It Snakes a Village」推斷劇中的小鎮應該坐落在新澤西南部。 Bob的漢堡店是一座兩層的綠色樓房，一樓是漢堡店，二樓則是Bob一家生活的地方。店面周圍有不少其他店鋪，其中「It's Your Funeral Home and Crematorium」的主人Mort是漢堡店的常客。\r\n\r\n"
        },
        "translations": {
            "bul": "Бургерите на Боб",
            "ces": "Bobovy burgery",
            "deu": "Bob's Burgers",
            "eng": "Bob's Burgers",
            "fin": "Bob's Burgers",
            "fra": "Bob's Burgers",
            "heb": "הבורגרים של בוב",
            "hun": "Bob Burger Falodája",
            "ita": "Bob's Burgers",
            "por": "Bob's Burgers",
            "pt": "Bob's Burgers",
            "rus": "Закусочная Боба",
            "spa": "Bob's Burgers",
            "swe": "Bob's Burgers",
            "tur": "Bob's Burgers",
            "zhtw": "開心漢堡店"
        },
        "network": "FOX",
        "remote_ids": [
            {
                "id": "10.5240/7312-38DB-5B25-19BB-BDCF-E",
                "type": 13,
                "sourceName": "EIDR"
            },
            {
                "id": "tt1561755",
                "type": 2,
                "sourceName": "IMDB"
            },
            {
                "id": "32726",
                "type": 12,
                "sourceName": "TheMovieDB.com"
            },
            {
                "id": "EP01279298",
                "type": 3,
                "sourceName": "TMS (Zap2It)"
            }
        ],
        "thumbnail": "https://artworks.thetvdb.com/banners/posters/194031-2_t.jpg"
    }
]
}

function selectTvdbMatch(match) {
  show.value.name = match.name;
  show.value.tvdb_id = match.tvdb_id;
  show.value.tvdb_slug = match.slug;
  handleUpdate();
}

</script>

<template>
  
  <div v-if="!!show" class="max-w-5xl mx-auto dark">
    
    <div class="flex">
      <h2 class="text-2xl text-slate-200">
        {{ show.name }}
      </h2>
      <!-- <RouterLink :to="{ name: 'clearPlayback' }" class="px-1 py-2 ml-auto font-medium text-blue-300 transition duration-150 ease-in-out focus:outline-none focus:ring-1 focus:ring-gray-600 hover:text-blue-400">
        Clear playback positions
      </RouterLink> -->
    </div>
    
    <div class="flex gap-8 mt-6">
      
      <Button btnstyle="solid" btncolor="blue" @click="openTvdbSlug(show.tvdb_slug)" :disabled="!show.tvdb_slug">
        <span class="relative bottom-0.5 right-0.5">📺</span>
        TVDB
      </Button>
      
      <Button btnstyle="outline" btncolor="green" @click="useOpenOrHomeDir(store.settings.tv_dir + '/' + show.dir_name)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h1.879a1.5 1.5 0 0 1 1.06.44l1.122 1.12A1.5 1.5 0 0 0 9.62 4H11.5A1.5 1.5 0 0 1 13 5.5v1H3v-3ZM3.081 8a1.5 1.5 0 0 0-1.423 1.974l1 3A1.5 1.5 0 0 0 4.081 14h7.838a1.5 1.5 0 0 0 1.423-1.026l1-3A1.5 1.5 0 0 0 12.919 8H3.081Z" />
        </svg>
        {{ show.dir_name }}
      </Button>
      
      <Button btnstyle="solid" btncolor="gray" @click="showEdit = !showEdit">
        <svg v-show="!showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path fill-rule="evenodd" d="M11.013 2.513a1.75 1.75 0 0 1 2.475 2.474L6.226 12.25a2.751 2.751 0 0 1-.892.596l-2.047.848a.75.75 0 0 1-.98-.98l.848-2.047a2.75 2.75 0 0 1 .596-.892l7.262-7.261Z" clip-rule="evenodd" />
        </svg>
        <svg v-show="showEdit" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
        Edit
      </Button>
      
    </div>
    
    <TransitionExpand>
      <div v-show="showEdit" class="py-1">
        
        <InputWithLabel class="mt-8" id="name" v-model="show.name" :readonly="store.loading" @input="handleUpdate">
          Name
          <template v-slot:afterInput>
            <Button btnstyle="outline" btncolor="green" @click="searchShowInTvdb">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z" clip-rule="evenodd" />
              </svg>
              Search TVDB
            </Button>
          </template>
        </InputWithLabel>
        
        <div v-if="show.tvdb_matches.length" class="mt-4">
          <div class="text-sm font-medium">
            Search results ({{ show.tvdb_matches.length }})
            <button type="button" @click="showMatches = !showMatches" class="ml-6 text-gray-300">
              <span v-if="showMatches">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="relative inline-block w-4 h-4 bottom-0.5">
                  <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clip-rule="evenodd" />
                </svg>
                hide
              </span>
              <span v-if="!showMatches">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="relative inline-block w-4 h-4 bottom-0.5">
                  <path fill-rule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
                </svg>
                show
              </span>
            </button>
          </div>
          <TransitionExpand>
            <ul v-show="showMatches" class="p-1">
              <li v-for="match in show.tvdb_matches" class="my-1">
                <button type="button" @click="selectTvdbMatch(match)" class="py-1 font-semibold text-green-300">
                  {{ match.name }}
                  ({{ match.country }} {{ match.year }})
                </button>
                <button href="https://google.com" class="ml-6 hover:underline" @click="openTvdbSlug(match.slug)">
                  <span class="relative bottom-0.5">📺</span>
                  TVDB
                </button>
              </li>
            </ul>
          </TransitionExpand>
        </div>
        
        <div class="flex flex-wrap gap-8 mt-8">
          
          <div class="">
            <InputWithLabel class="w-40" id="tvdb_id" v-model="show.tvdb_id" :readonly="store.loading" @input="handleUpdate">
              TVDB ID
            </InputWithLabel>
          </div>
          
          <div class="">
            <InputWithLabel class="w-72" id="tvdb_slug" v-model="show.tvdb_slug" :readonly="store.loading" @input="handleUpdate">
              TVDB Slug
            </InputWithLabel>
          </div>
          
        </div>
        
      </div>
    </TransitionExpand>
    
    <div class="mt-8">
      <EpisodeCard
        v-for="episodeID in show.episode_ids"
        :episode="show.episodes[episodeID]"
        :is-selected="show.current_episode_id == episodeID"
        :playback-position="store.playback_positions[show.episodes[episodeID].filename]"
        >
      </EpisodeCard>
    </div>
    
  </div>
  
</template>