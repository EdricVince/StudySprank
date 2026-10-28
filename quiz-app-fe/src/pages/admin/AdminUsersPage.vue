<template>
  <div class="p-6 space-y-5">
    <!-- Toast notifications -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="globalError" class="adm-toast adm-toast-error">
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          {{ globalError }}
        </div>
      </Transition>
      <Transition name="modal">
        <div v-if="globalSuccess" class="adm-toast adm-toast-success">
          <svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          {{ globalSuccess }}
        </div>
      </Transition>
    </Teleport>

    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="adm-h1">{{ pageTitle }}</h2>
        <p class="adm-text mt-0.5">{{ $t('staff.users.found', { n: filteredUsers.length }) }}</p>
      </div>
      <button
        v-if="roleFilter === 'teacher' || roleFilter === 'all'"
        class="adm-btn-primary"
        @click="openCreateTeacher"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {{ $t('staff.users.createTeacher') }}
      </button>
    </div>

    <!-- Tabs + Search -->
    <div class="flex items-center gap-4 flex-wrap">
      <div class="adm-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="adm-tab"
          :class="{ 'adm-tab-on': roleFilter === tab.value }"
          @click="roleFilter = tab.value"
        >
          {{ tab.label }}
          <span class="ml-1 text-[10px] opacity-60">({{ tab.count }})</span>
        </button>
      </div>

      <div class="relative flex-1 min-w-48 max-w-xs">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input v-model="search" type="search" :placeholder="$t('staff.users.search')" class="adm-search" />
      </div>
    </div>

    <!-- Bulk action bar -->
    <Transition name="modal">
      <div
        v-if="selectedIds.length"
        class="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5"
      >
        <span class="text-sm font-medium text-indigo-700 dark:text-indigo-300">{{ $t('staff.users.selected', { n: selectedIds.length }) }}</span>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/30 rounded-lg transition" @click="clearSelection">
            {{ $t('staff.users.clear') }}
          </button>
          <button class="adm-btn-danger" @click="openBulkDelete">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {{ $t('staff.users.deleteSelected') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Table -->
    <div class="adm-card">
      <!-- Skeleton -->
      <div v-if="adminStore.loading" class="p-6 space-y-3">
        <div v-for="i in 5" :key="i" class="flex items-center gap-4">
          <div class="adm-skel-c w-10 h-10 shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="adm-skel h-3 w-1/4" />
            <div class="adm-skel h-2.5 w-1/3" />
          </div>
          <div class="adm-skel h-5 w-14 rounded-full" />
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="filteredUsers.length === 0" class="py-16 text-center">
        <svg class="w-12 h-12 mx-auto text-slate-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p class="adm-text">{{ $t('staff.users.none') }}</p>
      </div>

      <!-- Data table -->
      <table v-else class="w-full text-sm">
        <thead class="adm-thead">
          <tr>
            <th class="adm-th w-10">
              <input
                type="checkbox"
                :checked="allVisibleSelected"
                class="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                :title="$t('staff.users.selectAll')"
                @change="toggleSelectAll"
              />
            </th>
            <th class="adm-th">#</th>
            <th class="adm-th">{{ $t('staff.users.cols.user') }}</th>
            <th class="adm-th hidden md:table-cell">{{ $t('staff.users.cols.role') }}</th>
            <th class="adm-th hidden lg:table-cell">XP</th>
            <th class="adm-th hidden lg:table-cell">{{ $t('staff.users.cols.joined') }}</th>
            <th class="adm-th text-center">{{ $t('staff.users.cols.status') }}</th>
            <th class="adm-th text-right">{{ $t('staff.users.cols.actions') }}</th>
          </tr>
        </thead>
        <tbody class="adm-divide">
          <tr
            v-for="(user, idx) in filteredUsers"
            :key="user.id"
            class="adm-tr"
            :class="{ 'bg-indigo-50/60 dark:bg-indigo-500/5': isSelected(user.id) }"
          >
            <td class="adm-td">
              <input
                type="checkbox"
                :checked="isSelected(user.id)"
                :disabled="user.role_id === UserRole.ADMIN"
                class="h-4 w-4 cursor-pointer rounded border-slate-300 accent-indigo-600"
                @click.stop
                @change="toggleSelect(user.id)"
              />
            </td>
            <td class="adm-td adm-meta">{{ idx + 1 }}</td>
            <td class="adm-td">
              <button type="button" class="flex items-center gap-3 text-left group/user" :title="$t('staff.users.viewProfile')" @click="openProfile(user)">
                <div class="adm-avatar" :class="user.role_id === UserRole.TEACHER ? 'adm-avatar-teacher' : 'adm-avatar-student'">
                  {{ initials(user.name ?? user.email) }}
                </div>
                <div class="min-w-0">
                  <p class="font-medium text-foreground truncate flex items-center gap-1.5 group-hover/user:text-indigo-600 dark:group-hover/user:text-indigo-400 transition-colors">
                    {{ user.name ?? '—' }}
                    <span
                      v-if="user.teacher_status === 'approved'"
                      class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                      :title="$t('staff.users.verified')"
                    >
                      <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                      {{ $t('staff.users.verified') }}
                    </span>
                    <span
                      v-if="user.role_id === UserRole.TEACHER && user.teacher_status === 'pending'"
                      class="inline-flex rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                    >{{ $t('staff.status.pending') }}</span>
                    <span
                      v-if="user.role_id === UserRole.TEACHER && user.teacher_status === 'rejected'"
                      class="inline-flex rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 px-1.5 py-0.5 text-[10px] font-semibold shrink-0"
                    >{{ $t('staff.status.rejected') }}</span>
                  </p>
                  <p class="adm-meta truncate">{{ user.email }}</p>
                </div>
              </button>
            </td>
            <td class="adm-td hidden md:table-cell">
              <span class="adm-badge" :class="user.role_id === UserRole.TEACHER ? 'adm-badge-teacher' : 'adm-badge-student'">
                {{ roleName(user.role_id) }}
              </span>
            </td>
            <td class="adm-td adm-text hidden lg:table-cell">{{ user.xp.toLocaleString() }} XP</td>
            <td class="adm-td adm-meta hidden lg:table-cell">{{ formatDate(user.created_at) }}</td>
            <td class="adm-td text-center">
              <button
                :disabled="togglingId === user.id || user.role_id === UserRole.ADMIN"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                :class="user.is_active ? 'adm-toggle-on' : 'adm-toggle-off'"
                :title="user.is_active ? $t('staff.users.deactivate') : $t('staff.users.activate')"
                @click="toggleActive(user)"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="user.is_active ? 'translate-x-4.5' : 'translate-x-0.5'"
                />
              </button>
            </td>
            <td class="adm-td">
              <div class="flex items-center justify-end gap-1">
                <button class="adm-icon-btn adm-icon-btn-close" :title="$t('staff.users.viewProfile')" @click="openProfile(user)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                </button>
                <button v-if="user.has_teacher_card" class="adm-icon-btn adm-icon-btn-close" :title="$t('staff.users.viewCard')" @click="openCardView(user)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M18 6h.008v.008H18V6zm2.25 12H3.75A2.25 2.25 0 011.5 15.75V4.5A2.25 2.25 0 013.75 2.25h16.5A2.25 2.25 0 0122.5 4.5v11.25A2.25 2.25 0 0120.25 18z" />
                  </svg>
                </button>
                <button class="adm-icon-btn adm-icon-btn-warn" :title="$t('staff.users.resetPassword')" @click="openResetPwd(user)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </button>
                <button v-if="user.role_id !== UserRole.ADMIN" class="adm-icon-btn adm-icon-btn-del" :title="$t('staff.users.deleteUser')" @click="confirmDelete(user)">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Create Teacher Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="showCreateModal = false" />
          <div class="relative w-full max-w-md adm-card-2xl shadow-2xl">
            <div class="adm-card-header px-6 py-4">
              <h3 class="adm-h3 text-base">{{ $t('staff.users.create.title') }}</h3>
              <button class="adm-icon-btn adm-icon-btn-close" @click="showCreateModal = false">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="px-6 py-5 space-y-4">
              <p class="adm-text text-xs">
                {{ $t('staff.users.create.intro') }}
              </p>
              <div>
                <label class="adm-form-label">{{ $t('staff.users.create.fullName') }} <span class="adm-required">*</span></label>
                <input v-model="form.name" type="text" :placeholder="$t('staff.users.create.namePlaceholder')" class="adm-input" />
              </div>
              <div>
                <label class="adm-form-label">
                  {{ $t('staff.users.create.loginEmail') }}
                  <span class="adm-meta font-normal ml-1">{{ $t('staff.users.create.loginEmailHint') }}</span>
                </label>
                <input v-model="form.email" type="email" :placeholder="emailPreview" class="adm-input" />
                <p class="mt-1 text-[11px] adm-meta">
                  {{ $t('staff.users.create.auto') }} <span class="text-indigo-500 font-mono">{{ emailPreview }}</span>
                </p>
              </div>
              <div>
                <label class="adm-form-label">{{ $t('staff.users.create.password') }} <span class="adm-required">*</span></label>
                <div class="relative">
                  <input v-model="form.password" :type="showFormPwd ? 'text' : 'password'" :placeholder="$t('staff.users.create.passwordPlaceholder')" class="adm-input pr-10" />
                  <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 adm-icon-btn" tabindex="-1" @click="showFormPwd = !showFormPwd">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path v-if="showFormPwd" stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Teacher ID card drop zone (verifies the teacher) -->
              <div>
                <label class="adm-form-label">
                  {{ $t('staff.users.create.card') }}
                  <span class="adm-meta font-normal ml-1">{{ $t('staff.users.create.cardHint') }}</span>
                </label>
                <div
                  class="relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden"
                  :class="cardDragOver ? 'border-indigo-400 bg-indigo-500/5' : 'border-border hover:border-indigo-400/60'"
                  @dragover.prevent="cardDragOver = true"
                  @dragleave.prevent="cardDragOver = false"
                  @drop.prevent="onCardDrop"
                  @click="cardInputEl?.click()"
                >
                  <input ref="cardInputEl" type="file" accept="image/*" class="hidden" @change="onCardSelect" />
                  <template v-if="form.card">
                    <img :src="form.card" :alt="$t('staff.users.create.cardAlt')" class="mx-auto max-h-44 w-full rounded-lg object-contain p-2" />
                    <button
                      type="button"
                      class="absolute top-2 right-2 rounded-lg bg-black/50 p-1.5 text-white hover:bg-black/70 transition"
                      :title="$t('staff.users.create.remove')"
                      @click.stop="clearCard"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </template>
                  <div v-else class="flex flex-col items-center justify-center gap-1.5 py-7 text-center px-4">
                    <svg class="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p class="text-sm font-medium text-foreground">{{ $t('staff.users.create.drop') }}</p>
                    <p class="adm-meta">{{ $t('staff.users.create.browse') }}</p>
                  </div>
                </div>
                <p v-if="cardError" class="mt-1 text-[11px] text-red-500">{{ cardError }}</p>
                <p v-else-if="form.card" class="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                  {{ $t('staff.users.create.attached') }}
                </p>
              </div>

              <p v-if="formError" class="text-xs text-red-500 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                {{ formError }}
              </p>

              <div v-if="createdEmail" class="flex items-start gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                <svg class="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <div>
                  <p class="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{{ $t('staff.users.create.created') }}</p>
                  <p class="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">{{ $t('staff.users.create.loginEmailLabel') }} <span class="font-mono">{{ createdEmail }}</span></p>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border">
              <button class="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 rounded-lg transition" @click="showCreateModal = false">
                {{ createdEmail ? $t('common.close') : $t('common.cancel') }}
              </button>
              <button
                v-if="!createdEmail"
                :disabled="formLoading || !form.name.trim() || form.password.length < 8"
                class="adm-btn-primary"
                @click="submitCreateTeacher"
              >
                <svg v-if="formLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ formLoading ? $t('staff.users.create.submitting') : $t('staff.users.create.submit') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Reset Password Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="resetTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="resetTarget = null" />
          <div class="relative w-full max-w-sm adm-card-2xl shadow-2xl">
            <div class="adm-card-header px-6 py-4">
              <h3 class="adm-h3 text-base">{{ $t('staff.users.reset.title') }}</h3>
              <button class="adm-icon-btn adm-icon-btn-close" @click="resetTarget = null">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="px-6 py-5 space-y-4">
              <p class="text-sm text-muted-foreground">
                {{ $t('staff.users.reset.intro', { name: resetTarget?.name ?? resetTarget?.email }) }}
              </p>
              <div>
                <label class="adm-form-label">{{ $t('staff.users.reset.newPassword') }}</label>
                <input v-model="newPwd" type="password" :placeholder="$t('staff.users.create.passwordPlaceholder')" class="adm-input" />
              </div>
              <p v-if="resetError" class="text-xs text-red-500">{{ resetError }}</p>
            </div>
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border">
              <button class="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 rounded-lg transition" @click="resetTarget = null">{{ $t('common.cancel') }}</button>
              <button
                :disabled="resetLoading || newPwd.length < 8"
                class="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-lg transition"
                @click="submitResetPwd"
              >
                <svg v-if="resetLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ $t('staff.users.reset.submit') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Delete Confirm Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="deleteTarget = null" />
          <div class="relative w-full max-w-sm adm-card-2xl shadow-2xl">
            <div class="px-6 pt-6 pb-5">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 class="adm-h3 text-base">{{ $t('staff.users.del.title') }}</h3>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ $t('staff.users.del.confirm', { name: deleteTarget?.name ?? deleteTarget?.email }) }}
              </p>
            </div>
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border">
              <button class="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 rounded-lg transition" @click="deleteTarget = null">{{ $t('common.cancel') }}</button>
              <button :disabled="deleteLoading" class="adm-btn-danger" @click="submitDelete">
                <svg v-if="deleteLoading" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── User Profile Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="profileTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="profileTarget = null" />
          <div class="relative w-full max-w-md adm-card-2xl shadow-2xl">
            <div class="adm-card-header px-6 py-4">
              <h3 class="adm-h3 text-base">{{ $t('staff.users.profile.title') }}</h3>
              <button class="adm-icon-btn adm-icon-btn-close" @click="profileTarget = null">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div v-if="profileLoading" class="flex items-center justify-center py-16">
              <div class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            </div>

            <div v-else-if="profile" class="px-6 py-5 space-y-5">
              <!-- Identity -->
              <div class="flex items-center gap-4">
                <img
                  v-if="profile.avatar"
                  :src="profile.avatar"
                  :alt="$t('staff.users.profile.avatar')"
                  class="h-14 w-14 rounded-full object-cover"
                />
                <div
                  v-else
                  class="adm-avatar h-14 w-14 text-lg"
                  :class="profile.role_id === UserRole.TEACHER ? 'adm-avatar-teacher' : 'adm-avatar-student'"
                >
                  {{ initials(profile.name ?? profile.email) }}
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-foreground truncate flex items-center gap-1.5">
                    {{ profile.name ?? '—' }}
                    <span
                      v-if="profile.teacher_status === 'approved'"
                      class="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold"
                    >{{ $t('staff.users.verified') }}</span>
                  </p>
                  <p class="adm-meta truncate">{{ profile.email }}</p>
                  <div class="mt-1 flex items-center gap-2">
                    <span class="adm-badge" :class="profile.role_id === UserRole.TEACHER ? 'adm-badge-teacher' : 'adm-badge-student'">
                      {{ roleName(profile.role_id) }}
                    </span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      :class="profile.is_active ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700/40 text-slate-500'"
                    >{{ profile.is_active ? $t('staff.users.profile.active') : $t('staff.users.profile.inactive') }}</span>
                  </div>
                </div>
              </div>

              <!-- Stats grid -->
              <div class="grid grid-cols-3 gap-3">
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.level }}</div>
                  <div class="adm-meta">{{ $t('staff.users.profile.level') }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.xp.toLocaleString() }}</div>
                  <div class="adm-meta">XP</div>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.streak_count }}🔥</div>
                  <div class="adm-meta">{{ $t('staff.users.profile.streak') }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.longest_streak }}</div>
                  <div class="adm-meta">{{ $t('staff.users.profile.best') }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.total_cards_studied }}</div>
                  <div class="adm-meta">{{ $t('staff.users.profile.cards') }}</div>
                </div>
                <div class="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-center">
                  <div class="text-lg font-bold text-foreground">{{ profile.total_quizzes_completed }}</div>
                  <div class="adm-meta">{{ $t('staff.users.profile.quizzes') }}</div>
                </div>
              </div>

              <!-- Meta rows -->
              <div class="space-y-2 text-sm">
                <div class="flex items-center justify-between">
                  <span class="adm-meta">{{ $t('staff.users.profile.id') }}</span>
                  <span class="font-mono text-foreground">#{{ profile.id }}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="adm-meta">{{ $t('staff.users.cols.joined') }}</span>
                  <span class="text-foreground">{{ formatDate(profile.created_at) }}</span>
                </div>
                <div v-if="profile.role_id === UserRole.TEACHER" class="flex items-center justify-between">
                  <span class="adm-meta">{{ $t('staff.users.profile.document') }}</span>
                  <span class="text-foreground">{{ profile.has_teacher_card ? $t('staff.users.profile.onFile') : $t('staff.users.profile.notUploaded') }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border">
              <button class="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 rounded-lg transition" @click="profileTarget = null">{{ $t('common.close') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Bulk Delete Confirm Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="bulkDeleteOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="bulkDeleteOpen = false" />
          <div class="relative w-full max-w-sm adm-card-2xl shadow-2xl">
            <div class="px-6 pt-6 pb-5">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 class="adm-h3 text-base">{{ $t('staff.users.del.bulkTitle', { n: selectedIds.length }) }}</h3>
              </div>
              <p class="text-sm text-muted-foreground">
                {{ $t('staff.users.del.bulkConfirm') }}
              </p>
            </div>
            <div class="flex items-center justify-end gap-3 px-6 py-4 bg-muted/10 border-t border-border">
              <button class="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/20 rounded-lg transition" @click="bulkDeleteOpen = false">{{ $t('common.cancel') }}</button>
              <button :disabled="bulkDeleting" class="adm-btn-danger" @click="submitBulkDelete">
                <svg v-if="bulkDeleting" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {{ $t('staff.users.deleteSelected') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── View Teacher ID Card Modal ── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="cardViewTarget" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cardViewTarget = null" />
          <div class="relative w-full max-w-lg adm-card-2xl shadow-2xl">
            <div class="adm-card-header px-6 py-4">
              <div>
                <h3 class="adm-h3 text-base">{{ $t('staff.users.cardView.title') }}</h3>
                <p class="adm-meta">{{ cardViewTarget?.name ?? cardViewTarget?.email }}</p>
              </div>
              <button class="adm-icon-btn adm-icon-btn-close" @click="cardViewTarget = null">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="p-6">
              <div v-if="cardViewLoading" class="flex items-center justify-center py-16">
                <div class="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
              </div>
              <img
                v-else-if="cardViewImage"
                :src="cardViewImage"
                :alt="$t('staff.users.create.cardAlt')"
                class="mx-auto max-h-[60vh] w-full rounded-xl border border-border object-contain bg-muted/20"
              />
              <p v-else class="py-16 text-center adm-meta">{{ $t('staff.users.cardView.none') }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAdminStore, type AdminUser, type AdminUserProfile } from '@/stores/admin.store'
import { UserRole } from '@/types/role'

const { t, locale } = useI18n()
const route = useRoute()
const adminStore = useAdminStore()

// Determine default tab from route
const routeRole = computed(() => {
  if (route.path.includes('/students')) return 'student'
  if (route.path.includes('/teachers')) return 'teacher'
  return 'all'
})

const roleFilter = ref<'all' | 'student' | 'teacher'>(routeRole.value as 'all' | 'student' | 'teacher')
const search = ref('')
const togglingId = ref<number | null>(null)
const globalError = ref('')
const globalSuccess = ref('')

function showToast(msg: string, type: 'error' | 'success' = 'error') {
  if (type === 'error') { globalError.value = msg; setTimeout(() => { globalError.value = '' }, 4000) }
  else { globalSuccess.value = msg; setTimeout(() => { globalSuccess.value = '' }, 3000) }
}

const pageTitle = computed(() => {
  if (roleFilter.value === 'student') return t('staff.users.title.student')
  if (roleFilter.value === 'teacher') return t('staff.users.title.teacher')
  return t('staff.users.title.all')
})

const tabs = computed((): { value: 'all' | 'student' | 'teacher'; label: string; count: number }[] => [
  { value: 'all', label: t('staff.users.tabs.all'), count: adminStore.users.length },
  { value: 'student', label: t('staff.users.tabs.student'), count: adminStore.students.length },
  { value: 'teacher', label: t('staff.users.tabs.teacher'), count: adminStore.teachers.length },
])

const filteredUsers = computed(() => {
  let list = adminStore.users
  if (roleFilter.value === 'student') list = adminStore.students
  if (roleFilter.value === 'teacher') list = adminStore.teachers
  const q = search.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(u =>
    u.email.toLowerCase().includes(q) ||
    (u.name?.toLowerCase().includes(q) ?? false)
  )
})

const roleName = (roleId: number) =>
  t(roleId === UserRole.ADMIN ? 'staff.roles.admin' : roleId === UserRole.TEACHER ? 'staff.roles.teacher' : 'staff.roles.student')

function initials(str: string) {
  return str.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(locale.value, { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Multi-select (bulk delete) ───────────────────────────────────────────────
const selectedIds = ref<number[]>([])
const isSelected = (id: number) => selectedIds.value.includes(id)
function toggleSelect(id: number) {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter(x => x !== id)
    : [...selectedIds.value, id]
}
const selectable = computed(() => filteredUsers.value.filter(u => u.role_id !== UserRole.ADMIN))
const allVisibleSelected = computed(() =>
  selectable.value.length > 0 && selectable.value.every(u => selectedIds.value.includes(u.id)),
)
function toggleSelectAll() {
  const visible = new Set(selectable.value.map(u => u.id))
  if (allVisibleSelected.value) {
    selectedIds.value = selectedIds.value.filter(id => !visible.has(id))
  } else {
    const ids = new Set(selectedIds.value)
    visible.forEach(id => ids.add(id))
    selectedIds.value = [...ids]
  }
}
function clearSelection() { selectedIds.value = [] }

const bulkDeleteOpen = ref(false)
const bulkDeleting = ref(false)
function openBulkDelete() { if (selectedIds.value.length) bulkDeleteOpen.value = true }
async function submitBulkDelete() {
  bulkDeleting.value = true
  try {
    const n = await adminStore.bulkDeleteUsers([...selectedIds.value])
    showToast(t('staff.users.toast.deleted', { n }), 'success')
    clearSelection()
    bulkDeleteOpen.value = false
  } catch {
    showToast(t('staff.users.toast.bulkFailed'))
  } finally {
    bulkDeleting.value = false
  }
}

// ── View profile ─────────────────────────────────────────────────────────────
const profileTarget = ref<AdminUser | null>(null)
const profile = ref<AdminUserProfile | null>(null)
const profileLoading = ref(false)
async function openProfile(user: AdminUser) {
  profileTarget.value = user
  profile.value = null
  profileLoading.value = true
  try {
    profile.value = await adminStore.getUserProfile(user.id)
  } catch {
    showToast(t('staff.users.toast.profileFailed'))
  } finally {
    profileLoading.value = false
  }
}

async function toggleActive(user: AdminUser) {
  togglingId.value = user.id
  try {
    await adminStore.setActive(user.id, !user.is_active)
    showToast(t(user.is_active ? 'staff.users.toast.deactivated' : 'staff.users.toast.activated', { name: user.name ?? user.email }), 'success')
  } catch {
    showToast(t('staff.users.toast.statusFailed'))
  } finally {
    togglingId.value = null
  }
}

// ── Create Teacher modal ─────────────────────────────────────────────────────
const showCreateModal = ref(false)
const showFormPwd = ref(false)
const formLoading = ref(false)
const formError = ref('')
const createdEmail = ref('')
const form = ref({ name: '', email: '', password: '', card: '' })

// ── Teacher ID card upload ───────────────────────────────────────────────────
const cardInputEl = ref<HTMLInputElement | null>(null)
const cardDragOver = ref(false)
const cardError = ref('')
const MAX_CARD_BYTES = 2_500_000

function readCardFile(file: File) {
  cardError.value = ''
  if (!file.type.startsWith('image/')) { cardError.value = t('staff.users.cardErr.type'); return }
  if (file.size > MAX_CARD_BYTES) { cardError.value = t('staff.users.cardErr.size'); return }
  const reader = new FileReader()
  reader.onload = () => { form.value.card = reader.result as string }
  reader.onerror = () => { cardError.value = t('staff.users.cardErr.read') }
  reader.readAsDataURL(file)
}
function onCardDrop(e: DragEvent) {
  cardDragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) readCardFile(f)
}
function onCardSelect(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) readCardFile(f)
}
function clearCard() {
  form.value.card = ''
  cardError.value = ''
  if (cardInputEl.value) cardInputEl.value.value = ''
}

const emailPreview = computed(() => {
  const slug = form.value.name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '')
  return slug ? `${slug}@teacher.sprk` : 'name.here@teacher.sprk'
})

function openCreateTeacher() {
  form.value = { name: '', email: '', password: '', card: '' }
  formError.value = ''
  cardError.value = ''
  createdEmail.value = ''
  showFormPwd.value = false
  showCreateModal.value = true
}

async function submitCreateTeacher() {
  if (!form.value.name.trim() || form.value.password.length < 8) return
  formLoading.value = true
  formError.value = ''
  try {
    const email = await adminStore.createTeacher(
      form.value.name.trim(),
      form.value.password,
      form.value.email.trim() || undefined,
      form.value.card || undefined,
    )
    createdEmail.value = email
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : t('staff.users.toast.createFailed')
  } finally {
    formLoading.value = false
  }
}

// ── View teacher card ────────────────────────────────────────────────────────
const cardViewTarget = ref<AdminUser | null>(null)
const cardViewImage = ref('')
const cardViewLoading = ref(false)

async function openCardView(user: AdminUser) {
  cardViewTarget.value = user
  cardViewImage.value = ''
  cardViewLoading.value = true
  try {
    cardViewImage.value = (await adminStore.getTeacherCard(user.id)) ?? ''
  } catch {
    cardViewImage.value = ''
  } finally {
    cardViewLoading.value = false
  }
}

// ── Reset Password modal ─────────────────────────────────────────────────────
const resetTarget = ref<AdminUser | null>(null)
const newPwd = ref('')
const resetLoading = ref(false)
const resetError = ref('')

function openResetPwd(user: AdminUser) {
  resetTarget.value = user
  newPwd.value = ''
  resetError.value = ''
}

async function submitResetPwd() {
  if (!resetTarget.value || newPwd.value.length < 8) return
  resetLoading.value = true
  resetError.value = ''
  try {
    await adminStore.resetPassword(resetTarget.value.id, newPwd.value)
    resetTarget.value = null
  } catch (e: unknown) {
    resetError.value = e instanceof Error ? e.message : t('staff.users.toast.resetFailed')
  } finally {
    resetLoading.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────────────
const deleteTarget = ref<AdminUser | null>(null)
const deleteLoading = ref(false)

function confirmDelete(user: AdminUser) {
  deleteTarget.value = user
}

async function submitDelete() {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    const id = deleteTarget.value.id
    await adminStore.deleteUser(id)
    selectedIds.value = selectedIds.value.filter(x => x !== id)
    deleteTarget.value = null
  } catch {
    showToast(t('staff.users.toast.deleteFailed'))
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  try {
    if (!adminStore.users.length) await adminStore.fetchUsers()
    if (!adminStore.stats) await adminStore.fetchStats()
  } catch {
    showToast(t('staff.users.toast.loadFailed'))
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
