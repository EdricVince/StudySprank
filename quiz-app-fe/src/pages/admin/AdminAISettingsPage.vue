<template>
  <div class="adm-page p-6 lg:p-8 space-y-6">

    <!-- ── Page Header ── -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="adm-h1 text-2xl">AI Configuration</h1>
        <p class="adm-text mt-1">Manage the Anthropic API key that powers all AI features on this platform.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden sm:block">
          <div class="adm-model-pill">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .29 2.798-1.132 2.798H4.913c-1.423 0-2.133-1.798-1.132-2.798l1.403-1.403" />
            </svg>
            claude-haiku-4-5
          </div>
        </div>
        <div
          class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
          :class="status?.enabled ? 'adm-status-on' : 'adm-status-off'"
        >
          <span class="relative flex h-2 w-2">
            <span
class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              :class="status?.enabled ? 'adm-ping-on' : 'adm-ping-off'" />
            <span
class="relative inline-flex h-2 w-2 rounded-full"
              :class="status?.enabled ? 'adm-dot-on' : 'adm-dot-off'" />
          </span>
          {{ status?.enabled ? 'AI Active' : 'AI Inactive' }}
        </div>
      </div>
    </div>

    <!-- ── Hero Banner (full width) ── -->
    <div
      class="relative overflow-hidden rounded-2xl p-7 lg:p-9"
      :class="status?.enabled ? 'adm-hero-on' : 'adm-hero-off'"
    >
      <!-- Decorations -->
      <div class="adm-hero-orb -right-12 -top-12 h-56 w-56" />
      <div class="adm-hero-orb right-32 -bottom-10 h-40 w-40" />
      <div class="adm-hero-orb -bottom-6 -left-6 h-32 w-32" />
      <div class="adm-hero-orb left-1/3 -top-8 h-28 w-28" />

      <div class="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
        <!-- Icon + text -->
        <div class="flex items-center gap-5 flex-1 min-w-0">
          <div class="adm-hero-icon-box">
            <svg v-if="status?.enabled" class="h-8 w-8 adm-hero-icon-on" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <svg v-else class="h-8 w-8 adm-hero-icon-off" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <div>
            <div class="adm-hero-sublabel">System Status</div>
            <div class="adm-hero-title">
              {{ status?.enabled ? 'AI Engine Online' : 'AI Engine Offline' }}
            </div>
            <div class="adm-hero-desc">
              <template v-if="status?.enabled">
                {{ status.provider }} · Key ending in
                <code class="adm-hero-code">{{ status.key_preview?.slice(-8) }}</code>
              </template>
              <template v-else>No API key configured — AI-powered features are disabled until a key is added</template>
            </div>
          </div>
        </div>

        <!-- Stat bubbles row (right side) -->
        <div class="flex items-stretch gap-3 shrink-0">
          <div class="adm-stat-bubble adm-stat-bubble-off">
            <div class="adm-stat-num">{{ features.length }}</div>
            <div class="adm-stat-label">Features</div>
          </div>
          <div class="adm-stat-bubble adm-stat-bubble-off">
            <div class="adm-stat-num">{{ status?.enabled ? '100' : '0' }}<span class="text-lg">%</span></div>
            <div class="adm-stat-label">Coverage</div>
          </div>
          <div class="adm-stat-bubble adm-stat-bubble-off">
            <div class="adm-stat-num-sm">Claude<br>Haiku</div>
            <div class="adm-stat-label">Model</div>
          </div>
          <div class="adm-stat-bubble" :class="status?.enabled ? 'adm-stat-bubble-on' : 'adm-stat-bubble-off'">
            <div class="text-2xl">{{ status?.enabled ? '✅' : '⏸️' }}</div>
            <div class="adm-stat-label">{{ status?.enabled ? 'Active' : 'Paused' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── 3-column layout ── -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

      <!-- ── Col 1-2: API Key Management ── -->
      <div class="lg:col-span-2 adm-card-2xl shadow-sm">
        <div class="adm-card-header px-6 py-4">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl adm-icon-indigo">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <div>
              <div class="adm-h3">Anthropic API Key</div>
              <div class="adm-meta">Paste your key from console.anthropic.com</div>
            </div>
          </div>
          <a
href="https://console.anthropic.com" target="_blank" rel="noopener"
            class="adm-link text-xs hidden sm:flex items-center gap-1">
            Get a key
            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div class="p-6 space-y-5">
          <!-- Input area -->
          <div class="space-y-3">
            <label class="adm-label uppercase tracking-wider">API Key</label>
            <div class="relative">
              <input
                v-model="keyInput"
                :type="showKey ? 'text' : 'password'"
                placeholder="sk-ant-api03-..."
                class="adm-api-input"
                @keydown.enter="handleSave"
              />
              <button
                class="absolute right-3 top-1/2 -translate-y-1/2 adm-icon-btn adm-icon-btn-close"
                @click="showKey = !showKey"
              >
                <svg v-if="showKey" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                </svg>
                <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
            <p class="adm-meta">Keys always start with <code class="adm-code">sk-ant-</code></p>
          </div>

          <!-- Alerts -->
          <div v-if="saveError" class="adm-alert adm-alert-error">
            <svg class="adm-alert-icon-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="adm-alert-text-error">{{ saveError }}</p>
          </div>
          <div v-if="saveSuccess" class="adm-alert adm-alert-success">
            <svg class="adm-alert-icon-ok" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="adm-alert-text-ok">{{ saveSuccess }}</p>
          </div>

          <!-- Actions row -->
          <div class="flex gap-3">
            <button
              :disabled="saving || !keyInput.trim()"
              class="adm-ai-save-btn"
              :class="keyInput.trim() && !saving ? 'adm-ai-save-btn-on' : 'adm-ai-save-btn-off'"
              @click="handleSave"
            >
              <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {{ saving ? 'Activating...' : 'Save & Activate AI' }}
            </button>
            <button
              v-if="status?.enabled"
              :disabled="saving"
              class="adm-btn-deactivate"
              @click="handleRemove"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Deactivate
            </button>
          </div>

          <!-- Security note -->
          <div class="adm-alert adm-alert-info">
            <svg class="adm-alert-icon-info" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p class="adm-alert-text-info">Your API key is stored securely on the server and never exposed to the browser. It is only used server-side to call the Anthropic API.</p>
          </div>
        </div>
      </div>

      <!-- ── Col 3: Sidebar ── -->
      <div class="space-y-4">
        <!-- Mini stats -->
        <div class="grid grid-cols-2 gap-3">
          <div class="adm-card-2xl shadow-sm p-4 text-center">
            <div :class="status?.enabled ? 'adm-count-on' : 'adm-count-off'">{{ features.length }}</div>
            <div class="adm-meta mt-0.5 font-medium">AI Features</div>
          </div>
          <div class="adm-card-2xl shadow-sm p-4 text-center">
            <div :class="status?.enabled ? 'adm-count-ok' : 'adm-count-off'">{{ status?.enabled ? '100%' : '0%' }}</div>
            <div class="adm-meta mt-0.5 font-medium">Coverage</div>
          </div>
          <div class="adm-card-2xl shadow-sm p-4 text-center col-span-2">
            <div class="adm-model-name">claude-haiku-4-5-20251001</div>
            <div class="adm-meta mt-0.5 font-medium">AI Model</div>
          </div>
        </div>

        <!-- How it works -->
        <div class="adm-card-2xl shadow-sm overflow-hidden">
          <div class="adm-card-header px-5 py-4">
            <div class="adm-h3">How it works</div>
          </div>
          <div class="p-5 space-y-4">
            <div class="flex gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg adm-icon-indigo">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <div class="adm-h4">AI Active Mode</div>
                <div class="adm-meta mt-0.5 leading-relaxed">Uses Claude Haiku for real-time generation, evaluation, and analysis.</div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg adm-icon-amber">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <div>
                <div class="adm-h4">Fallback Mode</div>
                <div class="adm-meta mt-0.5 leading-relaxed">Static content — app works normally, zero API cost.</div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg adm-icon-emerald">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
              </div>
              <div>
                <div class="adm-h4">Instant Activation</div>
                <div class="adm-meta mt-0.5 leading-relaxed">Key activates immediately — no server restart required.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── AI Features Grid (full width, 3 columns) ── -->
    <div class="adm-card-2xl shadow-sm overflow-hidden">
      <div class="adm-card-header px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl adm-icon-violet">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <div>
            <div class="adm-h3">AI-Powered Features</div>
            <div class="adm-meta">{{ features.length }} features managed by this key</div>
          </div>
        </div>
        <div
          class="rounded-full px-3 py-1 text-xs font-semibold"
          :class="status?.enabled ? 'adm-feat-status-on' : 'adm-feat-status-off'"
        >
          {{ status?.enabled ? 'All Active' : 'All Fallback' }}
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="statusLoading" class="adm-feat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="i in 8" :key="i" class="adm-skel-cell">
          <div class="flex items-center gap-3">
            <div class="adm-skel-c h-10 w-10" />
            <div class="flex-1 space-y-2">
              <div class="adm-skel h-3 w-2/3" />
              <div class="adm-skel h-2.5 w-1/3" />
            </div>
          </div>
        </div>
      </div>

      <!-- Features: 4-col card grid (8 built-ins fill 2 tidy rows) -->
      <div v-else class="adm-feat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="feat in featuresWithMeta"
          :key="feat.key"
          class="adm-feat-cell group"
        >
          <div class="mb-3 flex items-start justify-between gap-2">
            <div
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl transition-transform group-hover:scale-110"
              :class="status?.enabled ? feat.bgColor : 'adm-feat-bg-off'"
            >{{ feat.icon }}</div>
            <span
              class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
              :class="status?.enabled ? 'adm-feat-status-on' : 'adm-feat-status-off'"
            >
              <span class="h-1.5 w-1.5 rounded-full" :class="status?.enabled ? 'adm-dot-on' : 'adm-dot-dim'" />
              {{ status?.enabled ? 'Active' : 'Fallback' }}
            </span>
          </div>
          <div class="adm-h3 truncate">{{ feat.name }}</div>
          <div class="adm-meta mt-0.5 line-clamp-2 leading-relaxed">{{ feat.desc }}</div>
        </div>
      </div>

      <!-- ── Custom (admin-added) features + add form ── -->
      <div class="border-t border-border bg-linear-to-b from-violet-50/50 to-transparent dark:from-violet-500/6 p-6 space-y-5">
        <!-- Sub-header -->
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl adm-icon-violet">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <div class="adm-h3">Custom Features</div>
              <div class="adm-meta">Register extra AI features, each with its own key</div>
            </div>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold shrink-0"
            :class="customFeatures.length ? 'adm-feat-status-on' : 'adm-feat-status-off'"
          >
            {{ customFeatures.length }} added
          </span>
        </div>

        <!-- Existing custom features -->
        <div v-if="customFeatures.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="feat in customFeatures"
            :key="feat.id"
            class="group relative flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-violet-300/70 dark:hover:border-violet-500/40"
          >
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl adm-feat-bg-violet transition-transform group-hover:scale-105">🧩</div>
            <div class="flex-1 min-w-0">
              <div class="adm-h3 truncate">{{ feat.name }}</div>
              <div class="mt-1 flex items-center gap-2">
                <span
                  class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                  :class="feat.enabled ? 'adm-feat-status-on' : 'adm-feat-status-off'"
                >
                  <span class="h-1.5 w-1.5 rounded-full" :class="feat.enabled ? 'adm-dot-on' : 'adm-dot-dim'" />
                  {{ feat.enabled ? 'Active' : 'Fallback' }}
                </span>
                <code class="adm-code truncate">{{ feat.key_preview ?? 'no key' }}</code>
              </div>
            </div>
            <button
              class="adm-icon-btn adm-icon-btn-del shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              title="Remove feature"
              @click="handleRemoveFeature(feat.id, feat.name)"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 py-8 text-center"
        >
          <div class="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl adm-feat-bg-violet text-2xl">🧩</div>
          <p class="adm-h4">No custom features yet</p>
          <p class="adm-meta mt-0.5 max-w-xs">Use the form below to register a new AI-powered feature with its own Anthropic key.</p>
        </div>

        <!-- Add form card -->
        <div class="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg adm-icon-violet">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <div class="adm-h4">Add a new feature</div>
              <div class="adm-meta">Activates instantly once a valid key is saved</div>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="adm-label uppercase tracking-wider">Feature name</label>
              <input
                v-model="newFeatureName"
                type="text"
                placeholder="e.g. Grammar Coach"
                maxlength="60"
                class="adm-api-input pr-4! font-sans!"
                @keydown.enter="handleAddFeature"
              />
            </div>
            <div class="space-y-1.5">
              <label class="adm-label uppercase tracking-wider">Anthropic API key</label>
              <div class="relative">
                <input
                  v-model="newFeatureKey"
                  :type="showNewFeatureKey ? 'text' : 'password'"
                  placeholder="sk-ant-api03-..."
                  class="adm-api-input"
                  @keydown.enter="handleAddFeature"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 -translate-y-1/2 adm-icon-btn adm-icon-btn-close"
                  @click="showNewFeatureKey = !showNewFeatureKey"
                >
                  <svg v-if="showNewFeatureKey" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p class="adm-meta">Keys start with <code class="adm-code">sk-ant-</code></p>
            </div>
          </div>

          <div v-if="featError" class="adm-alert adm-alert-error">
            <svg class="adm-alert-icon-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="adm-alert-text-error">{{ featError }}</p>
          </div>

          <div class="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="adm-meta flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              Stored server-side — never shown in full.
            </p>
            <button
              class="adm-ai-save-btn flex-none! w-full sm:w-auto sm:px-8"
              :class="(newFeatureName.trim() && newFeatureKey.trim() && !addingFeature) ? 'adm-ai-save-btn-on' : 'adm-ai-save-btn-off'"
              :disabled="addingFeature || !newFeatureName.trim() || !newFeatureKey.trim()"
              @click="handleAddFeature"
            >
              <svg v-if="addingFeature" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {{ addingFeature ? 'Adding…' : 'Add Feature & Activate' }}
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAdminStore, type AiCustomFeature } from '@/stores/admin.store'

const adminStore = useAdminStore()

const status = ref<{
  enabled: boolean
  provider: string
  key_preview: string | null
  features: { name: string; key: string }[]
  custom_features: AiCustomFeature[]
} | null>(null)
const statusLoading = ref(true)
const keyInput = ref('')
const showKey = ref(false)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref('')

// Add-a-custom-feature form
const newFeatureName = ref('')
const newFeatureKey = ref('')
const showNewFeatureKey = ref(false)
const addingFeature = ref(false)
const featError = ref('')

const features = computed(() => status.value?.features ?? [])
const customFeatures = computed(() => status.value?.custom_features ?? [])

// Keyed by the exact feature keys returned by the backend (admin.controller getAiStatus),
// so every built-in feature shows its own icon, colour tint and description.
const FEATURE_META: Record<string, { icon: string; bgColor: string; desc: string }> = {
  entrance_exam:   { icon: '📝', bgColor: 'adm-feat-bg-indigo', desc: 'IELTS · TOEFL · TOEIC mock exams' },
  writing:         { icon: '✍️',  bgColor: 'adm-feat-bg-purple', desc: 'Score & give feedback on essays' },
  speaking:        { icon: '🎤', bgColor: 'adm-feat-bg-pink',   desc: 'Analyse and rate spoken answers' },
  reading:         { icon: '📖', bgColor: 'adm-feat-bg-blue',   desc: 'Generate reading comprehension tasks' },
  listening:       { icon: '🎧', bgColor: 'adm-feat-bg-teal',   desc: 'Generate listening exercises' },
  schedule:        { icon: '📅', bgColor: 'adm-feat-bg-cyan',   desc: 'Personalised study schedules' },
  word_of_the_day: { icon: '💡', bgColor: 'adm-feat-bg-amber',  desc: 'Daily vocabulary selection & explanation' },
  content_import:  { icon: '🔎', bgColor: 'adm-feat-bg-lime',   desc: 'Scan a URL or text into a lesson' },
}

const featuresWithMeta = computed(() =>
  features.value.map(f => ({
    ...f,
    ...(FEATURE_META[f.key] ?? { icon: '🤖', bgColor: 'adm-feat-bg-slate', desc: 'AI-powered feature' }),
  }))
)

async function loadStatus() {
  statusLoading.value = true
  try {
    status.value = await adminStore.fetchAiStatus()
  } catch {
    // ignore
  } finally {
    statusLoading.value = false
  }
}

async function handleSave() {
  if (!keyInput.value.trim() || saving.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    const msg = await adminStore.setAiKey(keyInput.value.trim())
    saveSuccess.value = msg
    keyInput.value = ''
    await loadStatus()
  } catch (e: any) {
    saveError.value = e?.message ?? 'Failed to save key'
  } finally {
    saving.value = false
  }
}

async function handleRemove() {
  if (!confirm('Deactivate AI? AI-powered features (battle questions, exams, skills, schedule, word of the day) will be disabled until a key is added again.')) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    await adminStore.removeAiKey()
    saveSuccess.value = 'AI deactivated. Fallback mode is now active.'
    await loadStatus()
  } catch (e: any) {
    saveError.value = e?.message ?? 'Failed to remove key'
  } finally {
    saving.value = false
  }
}

async function handleAddFeature() {
  featError.value = ''
  if (!newFeatureName.value.trim() || !newFeatureKey.value.trim() || addingFeature.value) return
  addingFeature.value = true
  try {
    await adminStore.addAiFeature(newFeatureName.value.trim(), newFeatureKey.value.trim())
    newFeatureName.value = ''
    newFeatureKey.value = ''
    await loadStatus()
  } catch (e: any) {
    featError.value = e?.message ?? 'Failed to add feature'
  } finally {
    addingFeature.value = false
  }
}

async function handleRemoveFeature(id: string, name: string) {
  if (!confirm(`Remove the "${name}" feature?`)) return
  try {
    await adminStore.removeAiFeature(id)
    await loadStatus()
  } catch (e: any) {
    featError.value = e?.message ?? 'Failed to remove feature'
  }
}

onMounted(loadStatus)
</script>
