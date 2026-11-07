<template>
  <div class="w-full">
    <p class="mb-3 text-center text-xs font-semibold text-foreground/80 leading-snug">{{ data.title }}</p>

    <!-- ── Grouped Bar Chart ─────────────────────────────────────────────── -->
    <svg
      v-if="bc"
      :viewBox="`0 0 ${bc.W} ${bc.H}`"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full"
      :style="`max-height:${bc.H}px`"
    >
      <!-- Horizontal grid lines + Y labels -->
      <g v-for="tick in bc.yTicks" :key="tick.val">
        <line
          :x1="bc.PL" :y1="tick.y"
          :x2="bc.PL + bc.chartW" :y2="tick.y"
          stroke="currentColor" stroke-opacity="0.10" stroke-dasharray="4 3" stroke-width="1"
        />
        <text
          :x="bc.PL - 6" :y="tick.y + 4"
          text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.50"
        >{{ tick.label }}</text>
      </g>

      <!-- Axes -->
      <line
:x1="bc.PL" :y1="bc.PT" :x2="bc.PL" :y2="bc.PT + bc.chartH"
        stroke="currentColor" stroke-opacity="0.25" stroke-width="1" />
      <line
:x1="bc.PL" :y1="bc.PT + bc.chartH" :x2="bc.PL + bc.chartW" :y2="bc.PT + bc.chartH"
        stroke="currentColor" stroke-opacity="0.25" stroke-width="1" />

      <!-- Y-axis label (rotated) -->
      <text
        :x="10" :y="bc.PT + bc.chartH / 2"
        text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.45"
        :transform="`rotate(-90,10,${bc.PT + bc.chartH / 2})`"
      >{{ data.yLabel }}</text>

      <!-- Bars -->
      <g v-for="bar in bc.bars" :key="`${bar.ci}-${bar.si}`">
        <rect
          :x="bar.x" :y="bar.y" :width="bar.w" :height="bar.h"
          :fill="bar.color" rx="3" opacity="0.88"
        />
        <!-- Value label inside bar if tall enough -->
        <text
          v-if="bar.h > 18"
          :x="bar.x + bar.w / 2" :y="bar.y + 13"
          text-anchor="middle" font-size="9" font-weight="700" fill="white"
        >{{ bar.val }}</text>
      </g>

      <!-- Category labels -->
      <text
        v-for="cat in bc.catLabels" :key="cat.label"
        :x="cat.x" :y="cat.y"
        text-anchor="middle" font-size="11" fill="currentColor" fill-opacity="0.65"
      >{{ cat.label }}</text>

      <!-- Legend -->
      <g v-for="(leg, i) in bc.legend" :key="i">
        <rect :x="leg.x" :y="bc.H - 22" width="11" height="11" :fill="leg.color" rx="2" />
        <text
:x="leg.x + 15" :y="bc.H - 13"
          font-size="11" fill="currentColor" fill-opacity="0.70">{{ leg.name }}</text>
      </g>
    </svg>

    <!-- ── Pie Chart ─────────────────────────────────────────────────────── -->
    <svg
      v-else-if="pc"
      :viewBox="`0 0 ${pc.W} ${pc.H}`"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full"
      :style="`max-height:${pc.H}px`"
    >
      <!-- Slices -->
      <path
        v-for="(slice, i) in pc.slices" :key="i"
        :d="slice.path" :fill="slice.color"
        stroke="white" stroke-width="1.5" opacity="0.90"
      />
      <!-- Percentage labels on slices -->
      <text
        v-for="(slice, i) in pc.slices" :key="`lbl-${i}`"
        :x="slice.lx" :y="slice.ly"
        text-anchor="middle" dominant-baseline="middle"
        font-size="11" font-weight="700" fill="white"
      >{{ slice.pct }}%</text>

      <!-- Legend -->
      <g v-for="(leg, i) in pc.legend" :key="i">
        <rect :x="leg.x" :y="leg.y - 9" width="13" height="13" :fill="leg.color" rx="2" />
        <text
:x="leg.x + 18" :y="leg.y + 2"
          font-size="12" fill="currentColor" fill-opacity="0.80">{{ leg.label }}</text>
      </g>
    </svg>

    <!-- ── Line graph ────────────────────────────────────────────────────── -->
    <svg
      v-else-if="lc"
      :viewBox="`0 0 ${lc.W} ${lc.H}`"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full"
      :style="`max-height:${lc.H}px`"
      data-test="chart-line"
    >
      <g v-for="tick in lc.yTicks" :key="tick.val">
        <line
          :x1="lc.PL" :y1="tick.y" :x2="lc.PL + lc.chartW" :y2="tick.y"
          stroke="currentColor" stroke-opacity="0.10" stroke-dasharray="4 3" stroke-width="1"
        />
        <text :x="lc.PL - 6" :y="tick.y + 4" text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.50">{{ tick.label }}</text>
      </g>
      <line :x1="lc.PL" :y1="lc.PT" :x2="lc.PL" :y2="lc.PT + lc.chartH" stroke="currentColor" stroke-opacity="0.25" stroke-width="1" />
      <line :x1="lc.PL" :y1="lc.PT + lc.chartH" :x2="lc.PL + lc.chartW" :y2="lc.PT + lc.chartH" stroke="currentColor" stroke-opacity="0.25" stroke-width="1" />
      <text
        :x="10" :y="lc.PT + lc.chartH / 2"
        text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.45"
        :transform="`rotate(-90,10,${lc.PT + lc.chartH / 2})`"
      >{{ data.yLabel }}</text>
      <g v-for="(line, si) in lc.lines" :key="si">
        <polyline :points="line.points" fill="none" :stroke="line.color" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-for="(pt, pi) in line.dots" :key="pi" :cx="pt.x" :cy="pt.y" r="3.5" :fill="line.color" />
      </g>
      <text
        v-for="cat in lc.catLabels" :key="cat.label"
        :x="cat.x" :y="cat.y" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity="0.65"
      >{{ cat.label }}</text>
      <g v-for="(leg, i) in lc.legend" :key="i">
        <rect :x="leg.x" :y="lc.H - 22" width="11" height="11" :fill="leg.color" rx="2" />
        <text :x="leg.x + 15" :y="lc.H - 13" font-size="11" fill="currentColor" fill-opacity="0.70">{{ leg.name }}</text>
      </g>
    </svg>

    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <div v-else-if="data.type === 'table' && data.headers && data.rows" class="overflow-x-auto" data-test="chart-table">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th
              v-for="(h, i) in data.headers" :key="i"
              class="border-border bg-muted/40 text-foreground border px-3 py-2 text-left text-xs font-bold"
            >{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, ri) in data.rows" :key="ri">
            <td
              v-for="(cell, ci) in row" :key="ci"
              class="border-border border px-3 py-2"
              :class="ci === 0 ? 'text-foreground font-semibold' : 'text-foreground/80 tabular-nums'"
            >{{ cell }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Process diagram ───────────────────────────────────────────────── -->
    <ol v-else-if="data.type === 'process' && data.steps" class="flex flex-wrap items-stretch justify-center gap-y-3" data-test="chart-process">
      <li v-for="(step, i) in data.steps" :key="i" class="flex items-center">
        <div class="border-primary/40 bg-primary/5 flex w-36 flex-col gap-1 rounded-xl border p-3 text-center">
          <span class="bg-primary text-primary-foreground mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">{{ i + 1 }}</span>
          <span class="text-foreground text-xs font-bold leading-snug">{{ step.label }}</span>
          <span v-if="step.detail" class="text-muted-foreground text-[11px] leading-snug">{{ step.detail }}</span>
        </div>
        <span v-if="i < data.steps.length - 1" class="text-muted-foreground px-1.5 text-lg" aria-hidden="true">→</span>
      </li>
    </ol>

    <p v-if="data.note" class="mt-1 text-center text-[10px] text-muted-foreground italic">
      {{ data.note }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Series { name: string; color: string; values: number[] }
interface Slice  { label: string; value: number; color: string }

export interface ChartData {
  type: 'bar-grouped' | 'line' | 'pie' | 'table' | 'process'
  title: string
  yLabel?: string
  yMax?: number
  note?: string
  categories?: string[]
  series?: Series[]
  slices?: Slice[]
  headers?: string[]
  rows?: string[][]
  steps?: { label: string; detail?: string }[]
}

const props = defineProps<{ data: ChartData }>()

// ── Grouped bar chart ──────────────────────────────────────────────────────────
const bc = computed(() => {
  const d = props.data
  if (d.type !== 'bar-grouped' || !d.series || !d.categories) return null

  const W = 560, H = 300
  const PL = 52, PR = 16, PT = 16, PB = 60
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const yMax  = d.yMax ?? 100
  const nCats = d.categories.length
  const nSer  = d.series.length

  const groupW = chartW / nCats
  const groupPad = groupW * 0.18
  const barAreaW  = groupW - groupPad
  const barW = barAreaW / nSer
  const barInner = barW * 0.88

  // Y ticks: four equal intervals from 0 to yMax
  const step = yMax / 4
  const yTicks = Array.from({ length: 5 }, (_, k) => {
    const val = k * step
    return { val, label: Number.isInteger(val) ? String(val) : val.toFixed(1), y: PT + chartH - (val / yMax) * chartH }
  })

  const bars = d.categories.flatMap((_, ci) =>
    d.series!.map((ser, si) => {
      const val  = ser.values[ci] ?? 0
      const barH = (val / yMax) * chartH
      const x    = PL + ci * groupW + groupPad / 2 + si * barW + (barW - barInner) / 2
      return { ci, si, x, y: PT + chartH - barH, w: barInner, h: barH, color: ser.color, val }
    })
  )

  const catLabels = d.categories.map((label, ci) => ({
    label, x: PL + ci * groupW + groupW / 2, y: PT + chartH + 18,
  }))

  // Centre legend
  const totalLegendW = nSer * 90
  const legendStartX = (W - totalLegendW) / 2
  const legend = d.series.map((ser, i) => ({ name: ser.name, color: ser.color, x: legendStartX + i * 90 }))

  return { W, H, PL, PR, PT, PB, chartW, chartH, yTicks, bars, catLabels, legend }
})

// ── Line graph ─────────────────────────────────────────────────────────────────
const lc = computed(() => {
  const d = props.data
  if (d.type !== 'line' || !d.series || !d.categories) return null

  const W = 560, H = 300
  const PL = 52, PR = 24, PT = 16, PB = 60
  const chartW = W - PL - PR
  const chartH = H - PT - PB
  const yMax = d.yMax ?? 100
  const n = d.categories.length
  const xOf = (ci: number) => PL + (n > 1 ? (ci / (n - 1)) * chartW : chartW / 2)
  const yOf = (val: number) => PT + chartH - (val / yMax) * chartH

  const step = yMax / 4
  const yTicks = Array.from({ length: 5 }, (_, k) => {
    const val = k * step
    return { val, label: Number.isInteger(val) ? String(val) : val.toFixed(1), y: yOf(val) }
  })
  const lines = d.series.map(ser => {
    const dots = ser.values.map((v, ci) => ({ x: xOf(ci), y: yOf(v) }))
    return { color: ser.color, dots, points: dots.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') }
  })
  const catLabels = d.categories.map((label, ci) => ({ label, x: xOf(ci), y: PT + chartH + 18 }))
  const legendStartX = (W - d.series.length * 90) / 2
  const legend = d.series.map((ser, i) => ({ name: ser.name, color: ser.color, x: legendStartX + i * 90 }))
  return { W, H, PL, PT, chartW, chartH, yTicks, lines, catLabels, legend }
})

// ── Pie chart ─────────────────────────────────────────────────────────────────
const pc = computed(() => {
  const d = props.data
  if (d.type !== 'pie' || !d.slices) return null

  const W = 560, H = 260
  const cx = 148, cy = 125, r = 108
  const total = d.slices.reduce((s, sl) => s + sl.value, 0)

  let angle = -Math.PI / 2
  const slices = d.slices.map(sl => {
    const sweep  = (sl.value / total) * 2 * Math.PI
    const end    = angle + sweep
    const mid    = angle + sweep / 2
    const la     = sweep > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
    const path = `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${la} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}Z`
    const lr = r * 0.65
    const lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid)
    const pct = Math.round((sl.value / total) * 100)
    angle = end
    return { path, color: sl.color, lx: lx.toFixed(2), ly: ly.toFixed(2), pct }
  })

  const legend = d.slices.map((sl, i) => ({
    label: `${sl.label} (${sl.value}%)`, color: sl.color, x: 290, y: 28 + i * 40,
  }))

  return { W, H, cx, cy, r, slices, legend }
})
</script>
