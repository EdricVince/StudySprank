<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="bg-card border-border my-8 w-full max-w-2xl rounded-3xl border p-6 shadow-xl lg:p-8">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-foreground text-xl font-bold lg:text-2xl">
              {{ isEditing ? 'Edit Card' : 'Add New Card' }}
            </h2>
            <button
              class="hover:bg-secondary rounded-lg p-2 transition-colors"
              @click="close"
            >
              <X class="text-muted-foreground h-5 w-5" />
            </button>
          </div>

          <form class="space-y-5" @submit.prevent="handleSubmit">
            <!-- Image Upload -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">Image (Optional)</label>
              <div class="flex items-start gap-4">
                <div
                  v-if="form.image"
                  class="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl"
                >
                  <img
                    :src="form.image"
                    alt="Card image"
                    class="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    class="absolute right-2 top-2 rounded-lg bg-black/50 p-1.5 text-white transition-colors hover:bg-black/70"
                    @click="removeImage"
                  >
                    <X class="h-4 w-4" />
                  </button>
                </div>
                <div
                  v-else
                  class="border-border hover:border-primary/50 flex h-32 w-32 shrink-0 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors"
                  @click="triggerImageInput"
                >
                  <ImageIcon class="text-muted-foreground mb-2 h-8 w-8" />
                  <span class="text-muted-foreground text-xs">Upload</span>
                </div>
                <input
                  ref="imageInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleImageUpload"
                />
                <div class="flex-1">
                  <p class="text-muted-foreground mb-2 text-sm">
                    Or paste an image URL:
                  </p>
                  <input
                    v-model="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    class="bg-secondary text-foreground placeholder:text-muted-foreground h-10 w-full rounded-lg border-0 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    @blur="applyImageUrl"
                  />
                </div>
              </div>
            </div>

            <!-- Term -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">Term / Question</label>
              <input
                v-model="form.term"
                type="text"
                placeholder="Enter the term or question"
                required
                class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <!-- Definition -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">Definition / Answer</label>
              <textarea
                v-model="form.definition"
                placeholder="Enter the definition or answer"
                required
                rows="3"
                class="bg-secondary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              ></textarea>
            </div>

            <!-- Example -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">Example (Optional)</label>
              <input
                v-model="form.example"
                type="text"
                placeholder="Add an example sentence or usage"
                class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <!-- Audio URL -->
            <div>
              <label class="text-foreground mb-2 block text-sm font-medium">Audio URL (Optional)</label>
              <input
                v-model="form.audio"
                type="url"
                placeholder="https://example.com/audio.mp3"
                class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div class="flex gap-3 pt-4">
              <Button type="button" variant="outline" class="flex-1" @click="close">
                Cancel
              </Button>
              <Button type="submit" class="flex-1">
                {{ isEditing ? 'Save Changes' : 'Add Card' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Image as ImageIcon } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import type { FlashcardItem, CardFormData } from '@/types/flashcard'

interface Props {
  modelValue: boolean
  card?: FlashcardItem | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: CardFormData]
}>()

const imageInput = ref<HTMLInputElement | null>(null)
const imageUrl = ref('')

const form = ref<CardFormData>({
  term: '',
  definition: '',
  example: '',
  image: '',
  audio: '',
})

const isEditing = ref(false)

// Watch for card changes to populate form
watch(
  () => props.card,
  (newCard) => {
    if (newCard) {
      isEditing.value = true
      form.value = {
        term: newCard.term,
        definition: newCard.definition,
        example: newCard.example || '',
        image: newCard.image || '',
        audio: newCard.audio || '',
      }
      imageUrl.value = newCard.image || ''
    } else {
      isEditing.value = false
      resetForm()
    }
  },
  { immediate: true }
)

// A hoisted function declaration: the immediate watcher above calls it during setup.
function resetForm() {
  form.value = { term: '', definition: '', example: '', image: '', audio: '' }
  imageUrl.value = ''
}

const close = () => {
  emit('update:modelValue', false)
  resetForm()
}

const handleSubmit = () => {
  emit('save', { ...form.value })
  close()
}

const triggerImageInput = () => {
  imageInput.value?.click()
}

const handleImageUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.image = e.target?.result as string
      imageUrl.value = ''
    }
    reader.readAsDataURL(file)
  }
}

const applyImageUrl = () => {
  if (imageUrl.value) {
    form.value.image = imageUrl.value
  }
}

const removeImage = () => {
  form.value.image = ''
  imageUrl.value = ''
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95) translateY(20px);
}
</style>
