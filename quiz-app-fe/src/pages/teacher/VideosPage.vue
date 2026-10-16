<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('teacher.videos.title') }}</h1>
        <p class="text-muted-foreground mt-2">{{ $t('teacher.videos.subtitle') }}</p>
      </div>
      <Button @click="showUploadModal = true">
        <Upload class="mr-2 h-4 w-4" />
        {{ $t('teacher.videos.uploadVideo') }}
      </Button>
    </div>

    <!-- Filter by Class -->
    <div class="animate-fade-in-up delay-100 mb-6">
      <select
        v-model="selectedClass"
        class="bg-secondary text-foreground h-10 rounded-xl border-0 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">{{ $t('teacher.videos.allClasses') }}</option>
        <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
      </select>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <!-- Videos Grid -->
    <div v-else class="animate-fade-in-up delay-150 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="video in filteredVideos"
        :key="video.id"
        class="bg-card border-border group overflow-hidden rounded-2xl border transition-all hover:shadow-lg"
      >
        <!-- Thumbnail -->
        <div class="bg-secondary relative aspect-video">
          <div class="flex h-full items-center justify-center">
            <Play class="text-muted-foreground h-12 w-12" />
          </div>
          <div class="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
            {{ formatDuration(video.duration) }}
          </div>
        </div>

        <!-- Info -->
        <div class="p-4">
          <h3 class="text-foreground mb-1 font-semibold">{{ video.title }}</h3>
          <p class="text-muted-foreground mb-2 text-sm line-clamp-2">{{ video.description }}</p>
          <div class="flex items-center justify-between text-sm">
            <span class="text-primary">{{ video.lesson_name }}</span>
            <span class="text-muted-foreground">{{ getClassName(video.class_id) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="border-border flex border-t">
          <button
            class="text-muted-foreground hover:text-destructive hover:bg-accent flex-1 py-3 transition-colors"
            @click="handleDelete(video.id)"
          >
            <Trash2 class="mx-auto h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="filteredVideos.length === 0"
        class="bg-card border-border col-span-full flex flex-col items-center justify-center rounded-2xl border p-12"
      >
        <div class="bg-secondary mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Video class="text-muted-foreground h-8 w-8" />
        </div>
        <h3 class="text-foreground mb-2 font-medium">{{ $t('teacher.videos.noVideos') }}</h3>
        <p class="text-muted-foreground mb-4 text-sm">{{ $t('teacher.videos.noVideosDesc') }}</p>
        <Button @click="showUploadModal = true">
          <Upload class="mr-2 h-4 w-4" />
          {{ $t('teacher.videos.uploadVideo') }}
        </Button>
      </div>
    </div>

    <!-- Upload Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showUploadModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="showUploadModal = false"></div>
          <div class="bg-card border-border relative w-full max-w-lg rounded-2xl border p-6 shadow-xl">
            <h2 class="text-foreground mb-6 text-xl font-semibold">{{ $t('teacher.videos.uploadVideo') }}</h2>

            <form class="space-y-5" @submit.prevent="uploadVideo">
              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('teacher.videos.modal.titleLabel') }}</label>
                <input
                  v-model="uploadForm.title"
                  type="text"
                  :placeholder="$t('teacher.videos.modal.titlePlaceholder')"
                  required
                  class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('teacher.videos.modal.descriptionLabel') }}</label>
                <textarea
                  v-model="uploadForm.description"
                  rows="3"
                  :placeholder="$t('teacher.videos.modal.descPlaceholder')"
                  class="bg-secondary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 p-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('teacher.videos.modal.classLabel') }}</label>
                <select
                  v-model="uploadForm.class_id"
                  class="bg-secondary text-foreground h-12 w-full rounded-xl border-0 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{{ $t('teacher.videos.modal.noSpecificClass') }}</option>
                  <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('teacher.videos.modal.urlLabel') }}</label>
                <input
                  v-model="uploadForm.video_url"
                  type="url"
                  :placeholder="$t('teacher.videos.modal.urlPlaceholder')"
                  required
                  class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p class="text-muted-foreground mt-1 text-xs">{{ $t('teacher.videos.modal.urlHint') }}</p>
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('teacher.videos.modal.lessonNameLabel') }}</label>
                <input
                  v-model="uploadForm.lesson_name"
                  type="text"
                  :placeholder="$t('teacher.videos.modal.lessonNamePlaceholder')"
                  class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div class="flex gap-3 pt-2">
                <Button type="button" variant="outline" class="flex-1" @click="showUploadModal = false">
                  {{ $t('teacher.videos.modal.cancel') }}
                </Button>
                <Button type="submit" class="flex-1" :disabled="uploading">
                  {{ uploading ? $t('teacher.videos.modal.uploading') : $t('teacher.videos.modal.upload') }}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Upload, Play, Video, Trash2 } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { useToast } from '@/composables/useToast'
import { formatDuration } from '@/types/video'
import { api } from '@/utils/api'

const { t } = useI18n()
const toast = useToast()

const selectedClass = ref('')
const showUploadModal = ref(false)
const loading = ref(true)
const uploading = ref(false)

const uploadForm = ref({
  title: '',
  description: '',
  class_id: '' as number | '',
  video_url: '',
  lesson_name: '',
})

interface ClassItem { id: number; name: string }
interface VideoItem {
  id: number
  title: string
  description?: string
  class_id?: number
  duration?: number
  lesson_name?: string
  video_url: string
}

const classes = ref<ClassItem[]>([])
const videos = ref<VideoItem[]>([])

const filteredVideos = computed(() => {
  if (!selectedClass.value) return videos.value
  return videos.value.filter(v => v.class_id === Number(selectedClass.value))
})

const getClassName = (classId?: number) => {
  if (!classId) return ''
  return classes.value.find(c => c.id === classId)?.name || ''
}

onMounted(async () => {
  try {
    const [cls, vids] = await Promise.all([
      api.getClasses() as Promise<ClassItem[]>,
      api.getVideos() as Promise<VideoItem[]>,
    ])
    classes.value = cls
    videos.value = vids
  } catch {
    toast.error(t('teacher.videos.toast.loadFailed'))
  } finally {
    loading.value = false
  }
})

const uploadVideo = async () => {
  uploading.value = true
  try {
    const created = await api.createVideo({
      title: uploadForm.value.title,
      description: uploadForm.value.description || undefined,
      class_id: uploadForm.value.class_id || undefined,
      video_url: uploadForm.value.video_url,
      lesson_name: uploadForm.value.lesson_name || undefined,
    }) as VideoItem
    videos.value.unshift(created)
    toast.success(t('teacher.videos.toast.uploaded'))
    showUploadModal.value = false
    uploadForm.value = { title: '', description: '', class_id: '', video_url: '', lesson_name: '' }
  } catch {
    toast.error(t('teacher.videos.toast.uploadFailed'))
  } finally {
    uploading.value = false
  }
}

const handleDelete = async (id: number) => {
  try {
    await api.deleteVideo(id)
    videos.value = videos.value.filter(v => v.id !== id)
    toast.success(t('teacher.videos.toast.deleted'))
  } catch {
    toast.error(t('teacher.videos.toast.deleteFailed'))
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
</style>
