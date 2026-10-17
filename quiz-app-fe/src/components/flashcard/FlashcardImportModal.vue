<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        @click.self="close"
      >
        <div class="bg-card border-border w-full max-w-lg rounded-3xl border p-6 shadow-xl lg:p-8">
          <div class="mb-6 flex items-center justify-between">
            <h2 class="text-foreground text-xl font-bold lg:text-2xl">{{ $t('flashcards.importModal.title') }}</h2>
            <button
              class="hover:bg-secondary rounded-lg p-2 transition-colors"
              @click="close"
            >
              <X class="text-muted-foreground h-5 w-5" />
            </button>
          </div>

          <div class="space-y-4">
            <!-- File Upload Area -->
            <div
              class="border-border hover:border-primary/50 relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors"
              :class="{ 'border-primary bg-primary/5': isDragging }"
              @click="triggerFileInput"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleFileDrop"
            >
              <input
                ref="fileInput"
                type="file"
                accept=".csv,text/csv"
                class="hidden"
                @change="handleFileSelect"
              />
              <div class="bg-secondary mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <FileSpreadsheet class="text-muted-foreground h-8 w-8" />
              </div>
              <p class="text-foreground mb-1 text-base font-medium">
                {{ $t('flashcards.importModal.dropzoneText') }}
              </p>
              <p class="text-muted-foreground text-sm">{{ $t('flashcards.importModal.supportedFormats') }}</p>
            </div>

            <!-- Selected File -->
            <div v-if="selectedFile" class="bg-secondary flex items-center gap-3 rounded-xl p-4">
              <FileSpreadsheet class="text-primary h-6 w-6" />
              <div class="min-w-0 flex-1">
                <p class="text-foreground truncate text-sm font-medium">{{ selectedFile.name }}</p>
                <p class="text-muted-foreground text-xs">{{ formatFileSize(selectedFile.size) }}</p>
              </div>
              <button
                class="hover:bg-card rounded-lg p-2 transition-colors"
                @click="selectedFile = null"
              >
                <X class="text-muted-foreground h-4 w-4" />
              </button>
            </div>

            <!-- Format Guide -->
            <div class="bg-secondary/50 rounded-xl p-4">
              <p class="text-muted-foreground mb-2 text-sm">{{ $t('flashcards.importModal.expectedFormat') }}</p>
              <div class="bg-card overflow-hidden rounded-lg">
                <table class="w-full text-sm">
                  <thead class="bg-secondary">
                    <tr>
                      <th class="text-foreground px-3 py-2 text-left font-medium">{{ $t('flashcards.importModal.term') }}</th>
                      <th class="text-foreground px-3 py-2 text-left font-medium">{{ $t('flashcards.importModal.definition') }}</th>
                      <th class="text-foreground px-3 py-2 text-left font-medium">{{ $t('flashcards.importModal.image') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-border border-t">
                      <td class="text-muted-foreground px-3 py-2">Hello</td>
                      <td class="text-muted-foreground px-3 py-2">A greeting</td>
                      <td class="text-muted-foreground px-3 py-2">url (optional)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
              <Button type="button" variant="outline" class="flex-1" @click="close">
                {{ $t('flashcards.importModal.cancel') }}
              </Button>
              <Button class="flex-1" :disabled="!selectedFile" @click="handleImport">
                <Upload class="mr-2 h-4 w-4" />
                {{ $t('flashcards.importModal.import') }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X, FileSpreadsheet, Upload } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { isCsvFile } from '@/utils/csv'

interface Props {
  modelValue: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  import: [file: File]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)

const close = () => {
  emit('update:modelValue', false)
  selectedFile.value = null
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
  }
}

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0]
    if (isCsvFile(file)) selectedFile.value = file
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleImport = () => {
  if (selectedFile.value) {
    emit('import', selectedFile.value)
    close()
  }
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
