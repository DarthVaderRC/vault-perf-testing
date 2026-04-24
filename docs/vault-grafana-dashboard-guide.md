# Vault Enterprise Grafana Dashboard Guide

This guide explains how to use `dashboards/grafana/vault-performance-observability-dashboard.json` for visual monitoring, troubleshooting, and reporting during Vault performance tests.

## 1. What this dashboard covers
- Vault request throughput and operation mix
- Latency (p95/p99)
- Error ratio and in-flight concurrency
- Vault platform resource usage (CPU, memory, disk, network)
- Load injector capacity usage (CPU, memory, disk, network)

## 2. Prerequisites
- Grafana with Prometheus datasource configured
- Vault and infrastructure metrics scraped into Prometheus
- Load injector metrics scraped (or metric names adapted)

## 3. Required metric families (or mapped equivalents)
| Purpose | Default metric used in dashboard |
| --- | --- |
| Request volume | `vault_request_total` |
| Request latency histogram | `vault_request_duration_seconds_bucket` |
| Request errors | `vault_request_errors_total` |
| In-flight requests | `vault_inflight_requests` |
| Vault process CPU | `process_cpu_seconds_total` (`job="vault"`) |
| Vault process memory | `process_resident_memory_bytes` (`job="vault"`) |
| Node network I/O | `node_network_receive_bytes_total`, `node_network_transmit_bytes_total` |
| Node filesystem | `node_filesystem_avail_bytes`, `node_filesystem_size_bytes` |
| Injector CPU/memory | `process_cpu_seconds_total`, `process_resident_memory_bytes` (`job="k6-injector"`) |
| Injector disk | `node_filesystem_avail_bytes`, `node_filesystem_size_bytes` (`job=~"k6.*"`) |

If your telemetry uses different metric names/labels, update the panel PromQL expressions after import.

## 4.1 Production telemetry mapping reference
Use this mapping when your production scrape jobs or exporters differ from the local preview labels.

| Section | Default query expectation | Common production variants to map |
| --- | --- | --- |
| Performance Metrics | `vault_request_total`, `vault_request_duration_seconds_bucket`, `vault_request_errors_total`, `vault_inflight_requests` with `env`,`cluster`,`namespace` labels | Vault telemetry relabeled via `job`, `instance`, `vault_cluster`; namespace missing (set `namespace=.*` or remove filter) |
| Capacity Metrics (Vault) | `process_*` with `job="vault"` and node metrics with `job=~"vault.*"` | `vault`, `vault-server`, or node-exporter jobs split by target; adjust `job` matchers and cluster label key |
| Injector Capacity Metrics | Injector process metrics at `job="k6-injector"` and node metrics at `job=~"k6.*"` | K6 container metrics via cAdvisor/node-exporter (`job="k6"`, `job="injector"`) requiring matcher updates |

## 5. Import and configure
1. In Grafana, go to **Dashboards** -> **Import**.
2. Upload `vault-performance-observability-dashboard.json`.
3. Select your Prometheus datasource for `DS_PROMETHEUS`.
4. Save dashboard.
5. Verify variable selectors (`env`, `cluster`, `namespace`) return expected values.
6. If labels differ, edit variable queries and panel queries accordingly.

## 6. Variable mapping guidance
- `env`: environment label (`prod`, `stage`, etc.)
- `cluster`: Vault cluster identifier
- `namespace`: Vault namespace (or use `.*` if not labeled)

For non-namespaced telemetry, keep `namespace` defaulted to `.*`.

## 7. Reporting workflow
1. Set dashboard time range to match each test scenario window.
2. Capture screenshots for:
   - Throughput/latency/error panels
   - Vault capacity panels (CPU/memory/disk/network)
   - Injector capacity panels (CPU/memory/disk/network)
3. Add screenshot links into the results report evidence section.
4. Correlate anomalies with K6 run summaries and raw logs.

## 8. Troubleshooting workflow
Use this panel sequence to isolate bottlenecks:
1. **Latency and error ratio spikes**
2. **Throughput and concurrency behavior** at same timestamps
3. **Vault capacity panels** (CPU, memory, disk, network)
4. **Injector capacity panels** to rule out client saturation
5. Confirm suspected root cause with logs and scenario notes

## 9. Notes
- This dashboard is a starter template. Tune thresholds and panel queries to your telemetry schema.
- Keep dashboard revisions versioned with test report versions for traceability.
