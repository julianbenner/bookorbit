<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import BookDetailTabs from './BookDetailTabs.vue'
import { useBookNavigation } from '../../composables/useBookNavigation'

const props = defineProps<{ bookId: number }>()

const { t } = useI18n()
const route = useRoute()

const { bookIds, getNextId, getPrevId, hasContext, currentIndex, total } = useBookNavigation()

const nextId = ref<number | null>(null)
const prevId = ref<number | null>(null)
const index = computed(() => currentIndex(props.bookId))

watch(
  [() => props.bookId, bookIds],
  async ([id]) => {
    prevId.value = getPrevId(id) ?? null
    nextId.value = (await getNextId(id)) ?? null
  },
  { immediate: true },
)
</script>

<template>
  <div
    class="flex items-stretch border-b shrink-0 h-12 md:h-11 px-3 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] md:px-3"
  >
    <BookDetailTabs :book-id="bookId" />

    <div v-if="hasContext" class="hidden sm:flex items-center gap-1 ml-4 border-l pl-4">
      <span v-if="index !== -1" class="text-xs text-muted-foreground mr-2 font-medium tabular-nums">
        {{ index + 1 }} <span class="opacity-50">/</span> {{ total }}
      </span>
      <RouterLink
        v-if="prevId"
        :to="{ name: 'book-detail', params: { bookId: prevId }, query: route.query }"
        class="h-7 w-7 flex items-center justify-center rounded-md transition-colors text-foreground hover:bg-muted"
        :title="t('book.detail.header.previousBook')"
      >
        <ChevronLeft :size="16" />
      </RouterLink>
      <button
        v-else
        disabled
        class="h-7 w-7 flex items-center justify-center rounded-md transition-colors text-muted-foreground cursor-not-allowed"
        :title="t('book.detail.header.previousBook')"
      >
        <ChevronLeft :size="16" />
      </button>
      <RouterLink
        v-if="nextId"
        :to="{ name: 'book-detail', params: { bookId: nextId }, query: route.query }"
        class="h-7 w-7 flex items-center justify-center rounded-md transition-colors text-foreground hover:bg-muted"
        :title="t('book.detail.header.nextBook')"
      >
        <ChevronRight :size="16" />
      </RouterLink>
      <button
        v-else
        disabled
        class="h-7 w-7 flex items-center justify-center rounded-md transition-colors text-muted-foreground cursor-not-allowed"
        :title="t('book.detail.header.nextBook')"
      >
        <ChevronRight :size="16" />
      </button>
    </div>
  </div>
</template>
