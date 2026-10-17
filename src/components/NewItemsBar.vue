<script setup>
import { Check } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import { store } from '../store';
import { RouterLink } from 'vue-router';
import Button from './Button.vue';

const itemID = ref(null);
const isNewItem = ref(false);
const itemLinkTo = ref({});

nextItem();

const item = computed(() => {
    return itemID.value ? store.items[itemID.value] : null;
});

const itemCount = computed(() => {
    return store.scan_results.new_item_ids.size + store.scan_results.item_ids_with_new_episodes.size;
});

watch(itemCount, (newItemCount, oldItemCount) => {
    if (newItemCount && !oldItemCount) nextItem();
});

function nextItem() {
    let tempItemID = itemID.value;
    if (tempItemID) {
        if (isNewItem.value) {
            store.scan_results.new_item_ids.delete(tempItemID);
        } else {
            store.scan_results.item_ids_with_new_episodes.delete(tempItemID);
        }
    }
    if (tempItemID && isNewItem.value) {
        isNewItem.value = false;
    } else {
        tempItemID = null;
        if (store.scan_results.new_item_ids.size) {
            [tempItemID] = store.scan_results.new_item_ids;
            isNewItem.value = true;
        } else if (store.scan_results.item_ids_with_new_episodes.size) {
            [tempItemID] = store.scan_results.item_ids_with_new_episodes;
            isNewItem.value = false;
        }
    }
    if (tempItemID) {
        const linkTo = { name: 'item', params: { id: tempItemID }, query: { view: (isNewItem.value ? 'edit' : 'episodes') } };
        itemLinkTo.value = linkTo;
        store.router.push(linkTo);
    } else {
        itemLinkTo.value = {};
        store.router.push({ name: 'home' });
    }
    itemID.value = tempItemID;
}

</script>

<template>
    <div class="flex justify-end items-center gap-8 bg-black px-12 py-4 w-full max-w-full"  v-if="item && itemCount > 0">
        
        <RouterLink :to="itemLinkTo" class="px-3 py-2 rounded-md focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium text-gray-300 hover:text-gray-400 text-sm leading-6 transition duration-150 ease-in-out cursor-pointer">
            <template v-if="isNewItem">
                <template v-if="item.name">
                    New Item: {{ item.name }}
                </template>
                <template v-else>
                    New Item
                </template>
            </template>
            <template v-else>
                <template v-if="item.name">
                    New Episodes: {{ item.name }}
                </template>
                <template v-else>
                    New Episodes
                </template>
            </template>
        </RouterLink>
        <Button @click="nextItem">
            <Check class="size-5" />
            Next
        </Button>
        
    </div>
</template>