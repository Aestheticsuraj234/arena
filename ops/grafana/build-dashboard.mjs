// Generates ops/grafana/dashboards/arena.json. Edit the panels here, not the JSON.
import {writeFileSync} from 'node:fs';

const ds = {type: 'prometheus', uid: 'arena-prometheus'};
let id = 0;

function panel(title, type, gridPos, targets, extra = {}) {
  return {
    id: ++id,
    title,
    type,
    datasource: ds,
    gridPos,
    targets: targets.map(([expr, legendFormat], i) => ({
      datasource: ds,
      expr,
      legendFormat,
      refId: String.fromCharCode(65 + i),
    })),
    ...extra,
  };
}

const unit = (u) => ({fieldConfig: {defaults: {unit: u}, overrides: []}});

/** Stat colors: green, then amber and red from the given values. */
const thresholds = (...steps) => ({
  fieldConfig: {
    defaults: {
      color: {mode: 'thresholds'},
      thresholds: {
        mode: 'absolute',
        steps: [{color: 'green', value: null}, ...steps.map(([value, color]) => ({value, color}))],
      },
    },
    overrides: [],
  },
});

const panels = [
  panel(
    'Queue depth',
    'stat',
    {x: 0, y: 0, w: 6, h: 5},
    [['max(arena_queue_depth)', 'queued']],
    thresholds([20, 'orange'], [50, 'red']),
  ),
  panel(
    'Running now',
    'stat',
    {x: 6, y: 0, w: 6, h: 5},
    [['sum(arena_active_executions)', 'running']],
    thresholds(),
  ),
  panel(
    'Judged (last hour)',
    'stat',
    {x: 12, y: 0, w: 6, h: 5},
    [['sum(increase(arena_submissions_processed_total[1h]))', 'judged']],
    {...thresholds(), options: {colorMode: 'value', reduceOptions: {calcs: ['lastNotNull']}}},
  ),
  panel(
    'Internal errors (last hour)',
    'stat',
    {x: 18, y: 0, w: 6, h: 5},
    [['sum(increase(arena_execution_failures_total{final="true"}[1h])) or vector(0)', 'failed']],
    thresholds([1, 'red']),
  ),
  panel(
    'Verdicts per minute',
    'timeseries',
    {x: 0, y: 5, w: 12, h: 8},
    [['sum by (status) (rate(arena_submissions_processed_total[1m])) * 60', '{{status}}']],
    unit('short'),
  ),
  panel(
    'Execution time p95 by language (claim → verdict)',
    'timeseries',
    {x: 12, y: 5, w: 12, h: 8},
    [
      [
        'histogram_quantile(0.95, sum by (le, language) (rate(arena_execution_duration_seconds_bucket[5m])))',
        '{{language}}',
      ],
    ],
    unit('s'),
  ),
  panel(
    'API requests per second by route',
    'timeseries',
    {x: 0, y: 13, w: 12, h: 8},
    [['sum by (route) (rate(arena_http_requests_total[1m]))', '{{route}}']],
    unit('reqps'),
  ),
  panel(
    'API latency p95 by route',
    'timeseries',
    {x: 12, y: 13, w: 12, h: 8},
    [
      [
        'histogram_quantile(0.95, sum by (le, route) (rate(arena_http_request_duration_seconds_bucket[5m])))',
        '{{route}}',
      ],
    ],
    unit('s'),
  ),
  panel(
    'Submissions created by source',
    'timeseries',
    {x: 0, y: 21, w: 12, h: 8},
    [['sum by (source) (rate(arena_submissions_created_total[1m])) * 60', '{{source}}']],
    unit('short'),
  ),
  panel(
    'Process memory',
    'timeseries',
    {x: 12, y: 21, w: 12, h: 8},
    [['arena_process_resident_memory_bytes', '{{service}}']],
    unit('bytes'),
  ),
];

const dashboard = {
  uid: 'arena-overview',
  title: 'Arena overview',
  tags: ['arena'],
  timezone: 'browser',
  schemaVersion: 39,
  refresh: '10s',
  time: {from: 'now-30m', to: 'now'},
  panels,
};

writeFileSync(
  new URL('./dashboards/arena.json', import.meta.url),
  `${JSON.stringify(dashboard, null, 2)}\n`,
);
console.log(`Wrote ${panels.length} panels`);
