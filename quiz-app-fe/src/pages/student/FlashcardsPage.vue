<template>
  <div class="min-h-[calc(100vh-4rem)] p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('flashcards.title') }}</h1>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.subtitle') }}</p>
      </div>
      <div v-if="!authStore.isStudent" class="flex flex-wrap gap-3">
        <Button variant="outline" @click="showImportModal = true">
          <Upload class="mr-2 h-5 w-5" />
          {{ $t('flashcards.import') }}
        </Button>
        <Button @click="openCreateDeck">
          <Plus class="mr-2 h-5 w-5" />
          {{ $t('flashcards.createDeck') }}
        </Button>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="animate-fade-in-up delay-100 mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
      <div class="bg-card border-border rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg lg:p-6">
        <div class="mb-3 flex items-center gap-3">
          <div class="bg-chart-1/10 flex h-12 w-12 items-center justify-center rounded-xl lg:h-14 lg:w-14">
            <Layers class="text-chart-1 h-6 w-6 lg:h-7 lg:w-7" />
          </div>
        </div>
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ stats.totalDecks }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.totalDecks') }}</p>
      </div>

      <div class="bg-card border-border rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg lg:p-6">
        <div class="mb-3 flex items-center gap-3">
          <div class="bg-chart-2/10 flex h-12 w-12 items-center justify-center rounded-xl lg:h-14 lg:w-14">
            <CreditCard class="text-chart-2 h-6 w-6 lg:h-7 lg:w-7" />
          </div>
        </div>
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ stats.totalCards }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.totalCards') }}</p>
      </div>

      <div class="bg-card border-border rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg lg:p-6">
        <div class="mb-3 flex items-center gap-3">
          <div class="bg-chart-3/10 flex h-12 w-12 items-center justify-center rounded-xl lg:h-14 lg:w-14">
            <CheckCircle class="text-chart-3 h-6 w-6 lg:h-7 lg:w-7" />
          </div>
        </div>
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ stats.masteredCards }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.mastered') }}</p>
      </div>

      <div class="bg-card border-border rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg lg:p-6">
        <div class="mb-3 flex items-center gap-3">
          <div class="bg-chart-4/10 flex h-12 w-12 items-center justify-center rounded-xl lg:h-14 lg:w-14">
            <TrendingUp class="text-chart-4 h-6 w-6 lg:h-7 lg:w-7" />
          </div>
        </div>
        <span class="text-foreground text-3xl font-bold lg:text-4xl">{{ stats.studyStreak }}</span>
        <p class="text-muted-foreground mt-1 text-base">{{ $t('flashcards.stats.dayStreak') }}</p>
      </div>
    </div>

    <!-- Vocab Practice Banner -->
    <div
      class="animate-fade-in-up delay-125 mb-6 cursor-pointer rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 flex items-center gap-4 hover:border-primary/40 transition-all"
      @click="router.push('/flashcards/vocab-practice')"
    >
      <div class="bg-primary/10 flex h-14 w-14 shrink-0 items-center justify-center rounded-xl">
        <span class="text-2xl">🎯</span>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-foreground font-semibold text-lg">{{ $t('flashcards.vocabPractice') }}</h3>
        <p class="text-muted-foreground text-sm">{{ $t('flashcards.vocabPracticeDesc') }}</p>
      </div>
      <div class="shrink-0">
        <span class="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-xl">{{ $t('flashcards.startBtn') }}</span>
      </div>
    </div>

    <!-- Search and Filters -->
    <div class="animate-fade-in-up delay-150 mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="relative flex-1 lg:max-w-md">
        <Search class="text-muted-foreground absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('flashcards.searchPlaceholder')"
          class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 pl-12 pr-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div class="flex items-center gap-3">
        <select
          v-model="selectedCategory"
          class="bg-secondary text-foreground h-12 rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">{{ $t('flashcards.allCategories') }}</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <div class="bg-secondary flex items-center gap-1 rounded-xl p-1">
          <button
            class="rounded-lg p-2 transition-colors"
            :class="viewMode === 'grid' ? 'bg-card shadow-sm' : 'hover:bg-card/50'"
            @click="viewMode = 'grid'"
          >
            <LayoutGrid class="text-foreground h-5 w-5" />
          </button>
          <button
            class="rounded-lg p-2 transition-colors"
            :class="viewMode === 'list' ? 'bg-card shadow-sm' : 'hover:bg-card/50'"
            @click="viewMode = 'list'"
          >
            <List class="text-foreground h-5 w-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- Three sides: your own decks, other teachers' decks, student community -->
    <template v-if="deckSections.length">
      <section v-for="section in deckSections" :key="section.key" class="mb-8">
        <h2 class="text-foreground mb-4 flex items-center gap-2 text-lg font-semibold">
          <component :is="section.icon" class="text-primary h-5 w-5" />
          {{ $t(section.titleKey) }}
          <span class="text-muted-foreground text-sm font-normal">· {{ section.total }}</span>
        </h2>

        <!-- Teacher vocab sets (flip-card study) -->
        <div v-if="section.key === 'teacher' && teacherSets.length" class="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            v-for="set in teacherSets"
            :key="`vs-${set.id}`"
            class="bg-card border-border hover:border-primary/40 group rounded-2xl border p-5 text-left transition-all hover:shadow-md"
            @click="studyVocabSet(set.id)"
          >
            <div class="bg-primary/10 mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-2xl">🔤</div>
            <h3 class="text-foreground font-semibold">{{ set.name }}</h3>
            <p class="text-muted-foreground mt-0.5 text-sm">{{ set.words.length }} {{ $t('flashcards.deck.cards') }} · {{ set.level }}</p>
            <span class="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium group-hover:underline">
              <Play class="h-3.5 w-3.5" /> {{ $t('flashcards.deck.study') }}
            </span>
          </button>
        </div>

      <!-- Grid View -->
      <div v-if="section.decks.length && viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
        <div
          v-for="(deck, index) in section.decks"
          :key="deck.id"
          class="deck-card bg-card border-border group cursor-pointer rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg lg:p-6"
          :style="{ animationDelay: `${index * 50}ms` }"
        >
          <!-- Deck Header -->
          <div class="mb-4 flex items-start justify-between">
            <div
              class="flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
              :class="getCategoryColor(deck.category)"
            >
              <component :is="getCategoryIcon(deck.category)" class="h-7 w-7" />
            </div>
            <div class="relative">
              <button
                class="hover:bg-secondary rounded-lg p-2 transition-colors"
                @click.stop="toggleDeckMenu(deck.id)"
              >
                <MoreVertical class="text-muted-foreground h-5 w-5" />
              </button>
              <!-- Dropdown Menu -->
              <div
                v-if="activeDeckMenu === deck.id"
                class="bg-card border-border absolute right-0 top-10 z-10 w-40 rounded-xl border py-2 shadow-lg"
              >
                <button
                  v-if="isOwner(deck)"
                  class="hover:bg-secondary text-foreground flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors"
                  @click.stop="openEditDeck(deck)"
                >
                  <Pencil class="h-4 w-4" />
                  {{ $t('flashcards.deck.edit') }}
                </button>
                <button
                  class="hover:bg-secondary text-foreground flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors"
                  @click.stop="duplicateDeck(deck)"
                >
                  <Copy class="h-4 w-4" />
                  {{ $t('flashcards.deck.duplicate') }}
                </button>
                <button
                  v-if="isOwner(deck)"
                  class="hover:bg-destructive/10 text-destructive flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors"
                  @click.stop="confirmDeleteDeck(deck)"
                >
                  <Trash2 class="h-4 w-4" />
                  {{ $t('flashcards.deck.delete') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Deck Info -->
          <div @click="openDeck(deck.id)">
            <h3 class="text-foreground mb-1 text-lg font-semibold lg:text-xl">{{ deck.title }}</h3>
            <p class="text-muted-foreground mb-4 line-clamp-2 text-sm">{{ deck.description }}</p>

            <!-- Stats -->
            <div class="mb-4 flex items-center gap-4">
              <span class="text-muted-foreground flex items-center gap-1 text-sm">
                <CreditCard class="h-4 w-4" />
                {{ deck.cards.length }} {{ $t('flashcards.deck.cards') }}
              </span>
              <span class="text-muted-foreground flex items-center gap-1 text-sm">
                <Clock class="h-4 w-4" />
                {{ isOwner(deck) ? $t('flashcards.deck.you') : (deck.owner_name || $t('flashcards.deck.shared')) }}
              </span>
            </div>

            <!-- Visibility -->
            <div class="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Globe class="h-3.5 w-3.5" />
              {{ deck.is_public ? 'Public' : 'Private' }}
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="mt-4 flex gap-2">
            <Button
              variant="default"
              class="flex-1"
              size="sm"
              @click.stop="startStudy(deck.id)"
            >
              <Play class="mr-2 h-4 w-4" />
              {{ $t('flashcards.deck.study') }}
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click.stop="openPreview(deck)"
            >
              <Eye class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else-if="section.decks.length" class="space-y-3">
        <div
          v-for="(deck, index) in section.decks"
          :key="deck.id"
          class="deck-list-item bg-card border-border group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg lg:gap-6 lg:p-5"
          :style="{ animationDelay: `${index * 50}ms` }"
          @click="openDeck(deck.id)"
        >
          <div
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
            :class="getCategoryColor(deck.category)"
          >
            <component :is="getCategoryIcon(deck.category)" class="h-7 w-7" />
          </div>

          <div class="min-w-0 flex-1">
            <h3 class="text-foreground mb-1 text-lg font-semibold">{{ deck.title }}</h3>
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-muted-foreground text-sm">{{ deck.cards.length }} {{ $t('flashcards.deck.cards') }}</span>
              <span class="text-muted-foreground text-sm">{{ isOwner(deck) ? $t('flashcards.deck.you') : (deck.owner_name || $t('flashcards.deck.shared')) }}</span>
              <span class="text-muted-foreground text-sm">{{ deck.is_public ? 'Public' : 'Private' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Button variant="default" size="sm" @click.stop="startStudy(deck.id)">
              <Play class="mr-2 h-4 w-4" />
              {{ $t('flashcards.deck.study') }}
            </Button>
            <button
              class="hover:bg-secondary rounded-lg p-2 transition-colors"
              @click.stop="toggleDeckMenu(deck.id)"
            >
              <MoreVertical class="text-muted-foreground h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
      </section>
    </template>

    <!-- Empty State -->
    <div v-else class="animate-fade-in-up flex flex-col items-center justify-center py-20 text-center">
      <div class="bg-secondary mb-6 flex h-24 w-24 items-center justify-center rounded-full">
        <Layers class="text-muted-foreground h-12 w-12" />
      </div>
      <h3 class="text-foreground mb-2 text-xl font-semibold lg:text-2xl">{{ $t('flashcards.empty.title') }}</h3>
      <p class="text-muted-foreground mb-6 max-w-md text-base">
        {{ $t('flashcards.empty.desc') }}
      </p>
      <div class="flex gap-3">
        <Button variant="outline" @click="showImportModal = true">
          <Upload class="mr-2 h-5 w-5" />
          {{ $t('flashcards.import') }}
        </Button>
        <Button @click="openCreateDeck">
          <Plus class="mr-2 h-5 w-5" />
          {{ $t('flashcards.createDeck') }}
        </Button>
      </div>
    </div>

    <!-- Create/Edit Deck Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeckModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="closeDeckModal"
        >
          <div class="bg-card border-border max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border p-6 shadow-xl lg:p-8">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-foreground text-xl font-bold lg:text-2xl">
                {{ editingDeck ? $t('flashcards.modal.editTitle') : $t('flashcards.modal.createTitle') }}
              </h2>
              <button
                class="hover:bg-secondary rounded-lg p-2 transition-colors"
                @click="closeDeckModal"
              >
                <X class="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            <form class="space-y-5" @submit.prevent="saveDeck">
              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('flashcards.modal.deckTitle') }}</label>
                <input
                  v-model="deckForm.title"
                  type="text"
                  :placeholder="$t('flashcards.modal.deckTitlePlaceholder')"
                  required
                  class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('flashcards.modal.description') }}</label>
                <textarea
                  v-model="deckForm.description"
                  :placeholder="$t('flashcards.modal.descPlaceholder')"
                  rows="3"
                  class="bg-secondary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                ></textarea>
              </div>

              <div>
                <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('flashcards.modal.category') }}</label>
                <select
                  v-model="deckForm.category"
                  class="bg-secondary text-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{{ $t('flashcards.modal.selectCategory') }}</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>

              <!-- Share publicly so everyone can study this deck -->
              <label class="flex cursor-pointer items-center gap-2.5">
                <input v-model="deckForm.isPublic" type="checkbox" class="accent-primary h-4 w-4 rounded" />
                <span class="text-foreground text-sm">{{ $t('flashcards.modal.sharePublic') }}</span>
              </label>

              <!-- Inline cards editor — enter words + meanings, edit existing
                   cards and keep adding more (works when creating and editing). -->
              <div>
                <div class="mb-2 flex items-center justify-between">
                  <label class="text-foreground block text-sm font-medium">
                    {{ $t('flashcards.modal.cardsLabel') }}
                    <span class="text-muted-foreground font-normal">({{ deckForm.cards.filter(c => c.term.trim()).length }})</span>
                  </label>
                  <button type="button" class="text-primary flex items-center gap-1 text-xs font-medium" @click="addFormCard">
                    <Plus class="h-3.5 w-3.5" /> {{ $t('flashcards.modal.addCard') }}
                  </button>
                </div>
                <div class="max-h-56 space-y-2 overflow-y-auto pr-1">
                  <div v-for="(card, i) in deckForm.cards" :key="i" class="flex items-center gap-2">
                    <input v-model="card.term" type="text" :placeholder="$t('flashcards.modal.wordPlaceholder')" class="bg-secondary text-foreground placeholder:text-muted-foreground h-11 min-w-0 flex-1 rounded-xl border-0 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <input v-model="card.definition" type="text" :placeholder="$t('flashcards.modal.meaningPlaceholder')" class="bg-secondary text-foreground placeholder:text-muted-foreground h-11 min-w-0 flex-1 rounded-xl border-0 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button type="button" class="text-muted-foreground hover:text-destructive shrink-0 p-1.5" @click="removeFormCard(i)"><X class="h-4 w-4" /></button>
                  </div>
                </div>
                <p class="text-muted-foreground mt-1.5 text-xs">{{ editingDeck ? $t('flashcards.modal.editCardsHint') : $t('flashcards.modal.cardsHint') }}</p>
              </div>

              <div class="flex gap-3 pt-4">
                <Button type="button" variant="outline" class="flex-1" @click="closeDeckModal">
                  {{ $t('flashcards.modal.cancel') }}
                </Button>
                <Button type="submit" class="flex-1" :disabled="!deckForm.title.trim() || saving">
                  {{ editingDeck ? $t('flashcards.modal.saveChanges') : $t('flashcards.modal.createDeck') }}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Import Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showImportModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showImportModal = false"
        >
          <div class="bg-card border-border w-full max-w-lg rounded-3xl border p-6 shadow-xl lg:p-8">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-foreground text-xl font-bold lg:text-2xl">{{ $t('flashcards.importModal.title') }}</h2>
              <button
                class="hover:bg-secondary rounded-lg p-2 transition-colors"
                @click="showImportModal = false"
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
                  accept=".csv,.xlsx,.xls"
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
              <div v-if="importFile" class="bg-secondary flex items-center gap-3 rounded-xl p-4">
                <FileSpreadsheet class="text-primary h-6 w-6" />
                <div class="min-w-0 flex-1">
                  <p class="text-foreground truncate text-sm font-medium">{{ importFile.name }}</p>
                  <p class="text-muted-foreground text-xs">{{ formatFileSize(importFile.size) }}</p>
                </div>
                <button
                  class="hover:bg-card rounded-lg p-2 transition-colors"
                  @click="importFile = null"
                >
                  <X class="text-muted-foreground h-4 w-4" />
                </button>
              </div>

              <!-- Import Options -->
              <div v-if="importFile" class="space-y-4">
                <div>
                  <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('flashcards.importModal.deckName') }}</label>
                  <input
                    v-model="importDeckName"
                    type="text"
                    :placeholder="$t('flashcards.importModal.deckNamePlaceholder')"
                    class="bg-secondary text-foreground placeholder:text-muted-foreground h-12 w-full rounded-xl border-0 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

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
                          <td class="text-muted-foreground px-3 py-2">image_url</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div class="flex gap-3 pt-4">
                <Button type="button" variant="outline" class="flex-1" @click="showImportModal = false">
                  {{ $t('flashcards.importModal.cancel') }}
                </Button>
                <Button class="flex-1" :disabled="!importFile || !importDeckName" @click="importCards">
                  <Upload class="mr-2 h-4 w-4" />
                  {{ $t('flashcards.importModal.import') }}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Deck Preview Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPreviewModal && previewDeck"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showPreviewModal = false"
        >
          <div class="bg-card border-border flex w-full max-w-2xl flex-col rounded-3xl border shadow-xl" style="max-height: 85vh">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-border p-6">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <component :is="getCategoryIcon(previewDeck.category)" class="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 class="text-foreground text-lg font-bold">{{ previewDeck.title }}</h2>
                  <p class="text-muted-foreground text-sm">{{ previewDeck.cards.length }} {{ $t('flashcards.deck.cards') }}</p>
                </div>
              </div>
              <button class="hover:bg-secondary rounded-lg p-2 transition-colors" @click="showPreviewModal = false">
                <X class="text-muted-foreground h-5 w-5" />
              </button>
            </div>

            <!-- Cards List -->
            <div class="flex-1 overflow-y-auto p-6">
              <div class="overflow-hidden rounded-2xl border border-border">
                <table class="w-full text-sm">
                  <thead class="bg-secondary">
                    <tr>
                      <th class="text-foreground px-4 py-3 text-left font-medium w-8">#</th>
                      <th class="text-foreground px-4 py-3 text-left font-medium">{{ $t('flashcards.previewModal.term') }}</th>
                      <th class="text-foreground px-4 py-3 text-left font-medium">{{ $t('flashcards.previewModal.definition') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(card, index) in previewDeck.cards"
                      :key="index"
                      class="border-t border-border hover:bg-secondary/30 transition-colors"
                    >
                      <td class="text-muted-foreground px-4 py-3">{{ index + 1 }}</td>
                      <td class="text-foreground px-4 py-3 font-medium">{{ card.term }}</td>
                      <td class="text-muted-foreground px-4 py-3">{{ card.definition }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex gap-3 border-t border-border p-6">
              <Button variant="outline" class="flex-1" @click="showPreviewModal = false">{{ $t('flashcards.previewModal.close') }}</Button>
              <Button class="flex-1" @click="startStudy(previewDeck.id); showPreviewModal = false">
                <Play class="mr-2 h-4 w-4" />
                {{ $t('flashcards.previewModal.studyNow') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          @click.self="showDeleteModal = false"
        >
          <div class="bg-card border-border w-full max-w-md rounded-3xl border p-6 text-center shadow-xl lg:p-8">
            <div class="bg-destructive/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
              <Trash2 class="text-destructive h-8 w-8" />
            </div>
            <h2 class="text-foreground mb-2 text-xl font-bold">{{ $t('flashcards.deleteModal.title') }}</h2>
            <p class="text-muted-foreground mb-6">
              {{ $t('flashcards.deleteModal.message', { title: deckToDelete?.title }) }}
            </p>
            <div class="flex gap-3">
              <Button variant="outline" class="flex-1" @click="showDeleteModal = false">
                {{ $t('flashcards.deleteModal.cancel') }}
              </Button>
              <Button variant="destructive" class="flex-1" @click="deleteDeck">
                {{ $t('flashcards.deleteModal.confirm') }}
              </Button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Upload,
  Search,
  Layers,
  CreditCard,
  CheckCircle,
  TrendingUp,
  Clock,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Play,
  Eye,
  X,
  FileSpreadsheet,
  BookOpen,
  Globe,
  MessageCircle,
  ArrowUpDown,
  Mic,
  GraduationCap,
  Users,
} from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import { useProgressStore } from '@/stores/progress.store'
import { useAuthStore } from '@/stores/auth.store'
import { api, ApiError } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import type { FlashcardDeckData as Deck, VocabSetData } from '@/types/content'

const router = useRouter()
const progressStore = useProgressStore()
const authStore = useAuthStore()
const toast = useToast()

// State
const searchQuery = ref('')
const selectedCategory = ref('all')
const viewMode = ref<'grid' | 'list'>('grid')
const showDeckModal = ref(false)
const showImportModal = ref(false)
const showDeleteModal = ref(false)
const showPreviewModal = ref(false)
const previewDeck = ref<Deck | null>(null)
const editingDeck = ref<Deck | null>(null)
const deckToDelete = ref<Deck | null>(null)
const activeDeckMenu = ref<number | null>(null)
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const importFile = ref<File | null>(null)
const importDeckName = ref('')

// Categories
const categories = [
  'Vocabulary',
  'Grammar',
  'Idioms',
  'Phrasal Verbs',
  'Pronunciation',
  'IELTS/TOEFL',
  'General',
]

// Deck form — used for both creating (cards entered inline) and editing (the
// deck's existing cards are loaded so the owner can edit them and add more).
// Extra fields (example/image/audio) are preserved even though this quick
// editor only exposes term + definition.
type FormCard = { term: string; definition: string; example?: string; image?: string; audio?: string }
const deckForm = ref({
  title: '',
  description: '',
  category: '',
  isPublic: true,
  cards: [{ term: '', definition: '' }] as FormCard[],
})

// Decks loaded from the backend: the user's own decks + everyone's PUBLIC decks.
const decks = ref<Deck[]>([])
const loading = ref(true)
const saving = ref(false)

const stats = computed(() => ({
  totalDecks: decks.value.length,
  totalCards: decks.value.reduce((sum, d) => sum + d.cards.length, 0),
  masteredCards: progressStore.totalCardsStudied,
  studyStreak: progressStore.streakCount,
}))

const isOwner = (deck: Deck) => deck.owner_id === authStore.user?.id
const errMsg = (e: unknown, fb: string) => (e instanceof ApiError ? e.errorMessage : fb)

// Published vocabulary sets from the student's teachers (studyable as flip cards).
const teacherSets = ref<VocabSetData[]>([])
const studyVocabSet = (id: number) => router.push(`/flashcards/vocab-set/${id}/study`)

const load = async () => {
  loading.value = true
  try {
    const [ds, sets] = await Promise.all([
      api.getFlashcardDecks(),
      api.getVocabSets().catch(() => [] as VocabSetData[]),
    ])
    decks.value = ds
    // Published vocab sets available to study (own + teachers'). Backend already
    // scopes what a student can see; we just need published sets that have words.
    teacherSets.value = sets.filter(s => s.is_published && (s.words?.length ?? 0) > 0)
  } catch (e) {
    toast.error(errMsg(e, 'Failed to load decks'))
  } finally {
    loading.value = false
  }
}

// Computed
const filteredDecks = computed(() => {
  return decks.value.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         (deck.description ?? '').toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || deck.category === selectedCategory.value
    return matchesSearch && matchesCategory
  })
})

// Decks are grouped into three clearly separated sections so a teacher's own
// deck never gets lumped in with other teachers' content:
//  - "Your decks"       → whatever the current user made (any role)
//  - "From teachers"    → OTHER teachers' decks + teacher vocab sets
//  - "Student community"→ OTHER students' decks (for everyone to study)
const ROLE_TEACHER = 2
const isMine = (d: Deck) => d.owner_id === authStore.user?.id
const myDecks = computed(() => filteredDecks.value.filter(isMine))
const teacherDecks = computed(() => filteredDecks.value.filter(d => !isMine(d) && d.owner_role === ROLE_TEACHER))
const communityDecks = computed(() => filteredDecks.value.filter(d => !isMine(d) && d.owner_role !== ROLE_TEACHER))

const deckSections = computed(() => {
  const s: { key: 'mine' | 'teacher' | 'community'; titleKey: string; icon: Component; decks: Deck[]; total: number }[] = []
  if (myDecks.value.length)
    s.push({ key: 'mine', titleKey: 'flashcards.yourDecks', icon: Layers, decks: myDecks.value, total: myDecks.value.length })
  if (teacherSets.value.length || teacherDecks.value.length)
    s.push({ key: 'teacher', titleKey: 'flashcards.teacherDecks', icon: GraduationCap, decks: teacherDecks.value, total: teacherSets.value.length + teacherDecks.value.length })
  if (communityDecks.value.length)
    s.push({ key: 'community', titleKey: 'flashcards.communityDecks', icon: Users, decks: communityDecks.value, total: communityDecks.value.length })
  return s
})

const addFormCard = () => deckForm.value.cards.push({ term: '', definition: '' })
const removeFormCard = (i: number) => deckForm.value.cards.splice(i, 1)

// Methods
const getCategoryIcon = (category: string): Component => {
  const icons: Record<string, Component> = {
    Vocabulary: Globe,
    Grammar: BookOpen,
    Idioms: MessageCircle,
    'Phrasal Verbs': ArrowUpDown,
    Pronunciation: Mic,
    'IELTS/TOEFL': GraduationCap,
    General: BookOpen,
  }
  return icons[category] || BookOpen
}

const getCategoryColor = (_category: string): string => {
  return 'bg-primary/10 text-primary'
}

const toggleDeckMenu = (deckId: number) => {
  activeDeckMenu.value = activeDeckMenu.value === deckId ? null : deckId
}

const openCreateDeck = () => {
  editingDeck.value = null
  deckForm.value = { title: '', description: '', category: '', isPublic: true, cards: [{ term: '', definition: '' }] }
  showDeckModal.value = true
}

const openEditDeck = (deck: Deck) => {
  editingDeck.value = deck
  deckForm.value = {
    title: deck.title,
    description: deck.description ?? '',
    category: deck.category,
    isPublic: deck.is_public,
    // Load existing cards so the owner can edit them and keep adding more.
    cards: deck.cards.length
      ? deck.cards.map(c => ({ term: c.term, definition: c.definition, example: c.example, image: c.image, audio: c.audio }))
      : [{ term: '', definition: '' }],
  }
  activeDeckMenu.value = null
  showDeckModal.value = true
}

const closeDeckModal = () => {
  showDeckModal.value = false
  editingDeck.value = null
}

const saveDeck = async () => {
  if (!deckForm.value.title.trim() || saving.value) return
  saving.value = true
  try {
    if (editingDeck.value) {
      // Keep every card that still has a term; preserve rich fields (example/
      // image/audio) that this quick editor doesn't surface.
      const cards = deckForm.value.cards
        .filter(c => c.term.trim())
        .map(c => ({ term: c.term.trim(), definition: c.definition.trim(), example: c.example, image: c.image, audio: c.audio }))
      const updated = await api.updateFlashcardDeck(editingDeck.value.id, {
        title: deckForm.value.title,
        description: deckForm.value.description,
        category: deckForm.value.category || editingDeck.value.category,
        is_public: deckForm.value.isPublic,
        cards,
      })
      const i = decks.value.findIndex(d => d.id === updated.id)
      if (i >= 0) decks.value[i] = updated
    } else {
      const cards = deckForm.value.cards
        .filter(c => c.term.trim())
        .map(c => ({ term: c.term.trim(), definition: c.definition.trim() }))
      const created = await api.createFlashcardDeck({
        title: deckForm.value.title,
        description: deckForm.value.description,
        category: deckForm.value.category || 'General',
        is_public: deckForm.value.isPublic,
        cards,
      })
      decks.value.unshift(created)
    }
    closeDeckModal()
  } catch (e) {
    toast.error(errMsg(e, 'Failed to save deck'))
  } finally {
    saving.value = false
  }
}

const duplicateDeck = async (deck: Deck) => {
  activeDeckMenu.value = null
  try {
    const created = await api.createFlashcardDeck({
      title: `${deck.title} (Copy)`,
      description: deck.description ?? '',
      category: deck.category,
      is_public: deck.is_public,
      cards: deck.cards,
    })
    decks.value.unshift(created)
    toast.success('Deck copied to your decks')
  } catch (e) {
    toast.error(errMsg(e, 'Failed to duplicate'))
  }
}

const confirmDeleteDeck = (deck: Deck) => {
  deckToDelete.value = deck
  activeDeckMenu.value = null
  showDeleteModal.value = true
}

const deleteDeck = async () => {
  if (deckToDelete.value) {
    try {
      await api.deleteFlashcardDeck(deckToDelete.value.id)
      decks.value = decks.value.filter(d => d.id !== deckToDelete.value!.id)
    } catch (e) {
      toast.error(errMsg(e, 'Failed to delete'))
    }
  }
  showDeleteModal.value = false
  deckToDelete.value = null
}

const openDeck = (deckId: number) => {
  router.push(`/flashcards/${deckId}`)
}

const openPreview = (deck: Deck) => {
  previewDeck.value = deck
  showPreviewModal.value = true
}

const startStudy = (deckId: number) => {
  router.push(`/flashcards/${deckId}/study`)
}

// File import methods
const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    importFile.value = target.files[0]
    importDeckName.value = target.files[0].name.replace(/\.[^/.]+$/, '')
  }
}

const handleFileDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    const file = event.dataTransfer.files[0]
    if (file.type === 'text/csv' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      importFile.value = file
      importDeckName.value = file.name.replace(/\.[^/.]+$/, '')
    }
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const importCards = async () => {
  try {
    const deck = await api.createFlashcardDeck({
      title: importDeckName.value || 'Imported deck',
      description: importFile.value ? 'Imported from ' + importFile.value.name : '',
      category: 'General',
    })
    showImportModal.value = false
    importFile.value = null
    importDeckName.value = ''
    // Navigate to the new deck to add cards from the file
    router.push(`/flashcards/${deck.id}`)
  } catch (e) {
    toast.error(errMsg(e, 'Failed to create deck'))
  }
}

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('[data-deck-menu]')) {
    activeDeckMenu.value = null
  }
}

onMounted(() => {
  load()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
/* Deck card animation */
.deck-card,
.deck-list-item {
  animation: fadeInUp 0.4s ease forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Modal animation */
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

/* Line clamp */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
