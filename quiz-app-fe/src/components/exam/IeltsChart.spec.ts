import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IeltsChart, { type ChartData } from './IeltsChart.vue'

const mountChart = (data: ChartData) => mount(IeltsChart, { props: { data } })

const series = [
  { name: 'Norway', color: '#6366f1', values: [20, 40, 60, 80, 95] },
  { name: 'Chile', color: '#f59e0b', values: [5, 15, 30, 50, 70] },
]
const categories = ['2000', '2005', '2010', '2015', '2020']

describe('IeltsChart — Writing Task 1 visuals drawn from data', () => {
  it('draws a grouped bar chart: one bar per value and a legend', () => {
    const w = mountChart({ type: 'bar-grouped', title: 'Internet access', yLabel: '%', yMax: 100, categories, series })
    expect(w.text()).toContain('Internet access')
    expect(w.findAll('rect[rx="3"]')).toHaveLength(10)
    expect(w.text()).toContain('Norway')
    expect(w.text()).toContain('2015')
  })

  it('draws a line graph: one polyline per series with a dot per point', () => {
    const w = mountChart({ type: 'line', title: 'Trends', yLabel: '%', yMax: 100, categories, series })
    expect(w.find('[data-test="chart-line"]').exists()).toBe(true)
    expect(w.findAll('polyline')).toHaveLength(2)
    expect(w.findAll('circle')).toHaveLength(10)
    expect(w.text()).toContain('Chile')
  })

  it('draws a pie chart with the share of every slice', () => {
    const w = mountChart({
      type: 'pie', title: 'Shares',
      slices: [
        { label: 'Rent', value: 50, color: '#111' },
        { label: 'Food', value: 30, color: '#222' },
        { label: 'Other', value: 20, color: '#333' },
      ],
    })
    expect(w.findAll('path')).toHaveLength(3)
    expect(w.text()).toContain('50%')
    expect(w.text()).toContain('Food (30%)')
  })

  it('renders a table with its headers and rows', () => {
    const w = mountChart({
      type: 'table', title: 'Costs', headers: ['Item', '2010', '2020'],
      rows: [['Bread', '$1', '$2'], ['Milk', '$2', '$3']], note: 'Source: survey',
    })
    expect(w.find('[data-test="chart-table"]').exists()).toBe(true)
    expect(w.findAll('th').map((h) => h.text())).toEqual(['Item', '2010', '2020'])
    expect(w.findAll('tbody tr')).toHaveLength(2)
    expect(w.text()).toContain('Source: survey')
  })

  it('renders a process as numbered steps in order', () => {
    const w = mountChart({
      type: 'process', title: 'How paper is made',
      steps: [{ label: 'Logging' }, { label: 'Pulping', detail: 'Chips are cooked' }, { label: 'Pressing' }],
    })
    const steps = w.findAll('[data-test="chart-process"] li')
    expect(steps).toHaveLength(3)
    expect(steps[1]!.text()).toContain('Pulping')
    expect(steps[1]!.text()).toContain('Chips are cooked')
    expect(w.findAll('[aria-hidden="true"]')).toHaveLength(2) // arrows between the steps
  })
})
