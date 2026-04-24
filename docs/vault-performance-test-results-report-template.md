# Vault Enterprise Performance Test Results Report Template

## 1. Document control
| Field | Value |
| --- | --- |
| Report title | Vault Enterprise Performance Test Results |
| Version | `<version>` |
| Author | `<name/team>` |
| Date | `<yyyy-mm-dd>` |
| Test window | `<start-end>` |
| Environment | `<env/region/cluster>` |

## 2. Executive summary
Provide a concise summary of:
- Objectives tested
- Overall pass/fail against success criteria
- Highest-impact findings
- Recommended next actions

## 3. Scope and scenarios executed
| Scenario | Planned | Executed | Status | Notes |
| --- | --- | --- | --- | --- |
| Load | `<yes/no>` | `<yes/no>` | `<pass/fail/partial>` | `<notes>` |
| Endurance | `<yes/no>` | `<yes/no>` | `<pass/fail/partial>` | `<notes>` |
| Stress | `<yes/no>` | `<yes/no>` | `<pass/fail/partial>` | `<notes>` |
| Breakpoint | `<yes/no>` | `<yes/no>` | `<pass/fail/partial>` | `<notes>` |

## 4. Environment and configuration snapshot
| Item | Value |
| --- | --- |
| Vault version/edition | `<value>` |
| Cluster topology | `<value>` |
| Node count and instance size | `<value>` |
| Storage backend | `<value>` |
| Auth and secret workflows tested | `<value>` |
| Injector configuration | `<value>` |
| Monitoring stack | `<Prometheus/Grafana/etc.>` |

## 5. Workload profile summary
| Scenario | Target load profile | Actual observed profile | Duration |
| --- | --- | --- | --- |
| Load | `<target>` | `<actual>` | `<duration>` |
| Endurance | `<target>` | `<actual>` | `<duration>` |
| Stress | `<target>` | `<actual>` | `<duration>` |
| Breakpoint | `<target>` | `<actual>` | `<duration>` |

## 6. Scenario-by-scenario results
Repeat this section for each scenario.

### 6.x `<Scenario name>`
#### Purpose
`<scenario goal>`

#### Approach
`<execution method>`

#### Metrics summary
| Metric | Target | Observed | Result |
| --- | --- | --- | --- |
| p95 latency | `<target>` | `<observed>` | `<pass/fail>` |
| p99 latency | `<target>` | `<observed>` | `<pass/fail>` |
| Throughput/TPS | `<target>` | `<observed>` | `<pass/fail>` |
| Error rate | `<target>` | `<observed>` | `<pass/fail>` |
| Concurrency | `<target>` | `<observed>` | `<pass/fail>` |

#### Capacity observations (Vault platform)
| Resource metric | Peak observed | Steady state | Threshold | Result |
| --- | --- | --- | --- | --- |
| CPU utilization | `<value>` | `<value>` | `<limit>` | `<ok/risk>` |
| Memory utilization | `<value>` | `<value>` | `<limit>` | `<ok/risk>` |
| Disk utilization/IOPS | `<value>` | `<value>` | `<limit>` | `<ok/risk>` |
| Network I/O | `<value>` | `<value>` | `<limit>` | `<ok/risk>` |

#### Injector health observations
| Injector metric | Observed | Threshold | Result |
| --- | --- | --- | --- |
| CPU utilization | `<value>` | `<limit>` | `<ok/risk>` |
| Memory utilization | `<value>` | `<limit>` | `<ok/risk>` |
| Network throughput/errors | `<value>` | `<limit>` | `<ok/risk>` |
| Client-side timeouts/drops | `<value>` | `<limit>` | `<ok/risk>` |

#### Anomalies and bottlenecks
| ID | Time | Symptom | Suspected cause | Evidence |
| --- | --- | --- | --- | --- |
| `<id>` | `<timestamp>` | `<issue>` | `<cause>` | `<dashboard/run log link>` |

## 7. Success criteria assessment
| Criterion | Target | Outcome | Status |
| --- | --- | --- | --- |
| Latency SLA | `<target>` | `<observed>` | `<pass/fail>` |
| Throughput goal | `<target>` | `<observed>` | `<pass/fail>` |
| Error budget | `<target>` | `<observed>` | `<pass/fail>` |
| Capacity headroom | `<target>` | `<observed>` | `<pass/fail>` |
| Stability (endurance) | `<target>` | `<observed>` | `<pass/fail>` |

## 8. Recommendations
### 8.1 Immediate (short-term)
| Recommendation | Rationale | Owner | Priority |
| --- | --- | --- | --- |
| `<action>` | `<reason>` | `<team>` | `<high/med/low>` |

### 8.2 Medium-term
| Recommendation | Rationale | Owner | Priority |
| --- | --- | --- | --- |
| `<action>` | `<reason>` | `<team>` | `<high/med/low>` |

### 8.3 Retest triggers
- `<trigger 1>`
- `<trigger 2>`

## 9. Final decision and action log
| Decision area | Outcome |
| --- | --- |
| Production readiness | `<go/no-go/conditional>` |
| Residual risks accepted | `<yes/no + details>` |
| Mandatory follow-up actions | `<list>` |

| Action ID | Action | Owner | Status |
| --- | --- | --- | --- |
| `<id>` | `<task>` | `<team>` | `<open/in-progress/closed>` |

## 10. Evidence index
| Evidence type | Location |
| --- | --- |
| K6 raw output | `<path/url>` |
| Dashboard snapshot(s) | `<path/url>` |
| Vault telemetry export | `<path/url>` |
| Incident/log excerpts | `<path/url>` |

