// Model Monitoring System

import type { ModelMetrics, MonitoringAlert } from "./types";

// In-memory metrics store (replace with database in production)
const metricsStore: ModelMetrics[] = [];
const alerts: MonitoringAlert[] = [];

// Thresholds for alerts
const THRESHOLDS = {
  latency: { warning: 3000, critical: 5000 }, // milliseconds
  errorRate: { warning: 0.1, critical: 0.2 }, // 10%, 20%
  quality: { warning: 0.6, critical: 0.5 }, // quality score
  tokenUsage: { warning: 10000, critical: 20000 }, // tokens per request
};

export async function trackMetrics(metrics: ModelMetrics): Promise<void> {
  metricsStore.push(metrics);

  // Keep only last 10000 metrics
  if (metricsStore.length > 10000) {
    metricsStore.shift();
  }

  // Check for anomalies and generate alerts
  await checkAnomalies(metrics);
}

export async function getMetrics(
  provider?: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ModelMetrics[]> {
  let filtered = metricsStore;

  if (provider) {
    filtered = filtered.filter((m) => m.provider === provider);
  }

  if (startDate) {
    filtered = filtered.filter((m) => m.timestamp >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter((m) => m.timestamp <= endDate);
  }

  return filtered;
}

export async function getProviderStats(provider: string): Promise<{
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  avgTokens: number;
  errorRate: number;
}> {
  const providerMetrics = metricsStore.filter((m) => m.provider === provider);
  const total = providerMetrics.length;
  const successful = providerMetrics.filter((m) => m.success).length;
  const failed = total - successful;

  const avgLatency =
    providerMetrics.reduce((sum, m) => sum + m.latency, 0) / total || 0;
  const avgTokens =
    providerMetrics.reduce((sum, m) => sum + m.totalTokens, 0) / total || 0;

  return {
    totalRequests: total,
    successRate: total > 0 ? successful / total : 0,
    avgLatency,
    avgTokens,
    errorRate: total > 0 ? failed / total : 0,
  };
}

async function checkAnomalies(metrics: ModelMetrics): Promise<void> {
  // Check latency
  if (metrics.latency > THRESHOLDS.latency.critical) {
    await createAlert({
      type: "latency",
      severity: "critical",
      message: `Critical latency detected: ${metrics.latency}ms`,
      threshold: THRESHOLDS.latency.critical,
      currentValue: metrics.latency,
      timestamp: metrics.timestamp,
    });
  } else if (metrics.latency > THRESHOLDS.latency.warning) {
    await createAlert({
      type: "latency",
      severity: "high",
      message: `High latency detected: ${metrics.latency}ms`,
      threshold: THRESHOLDS.latency.warning,
      currentValue: metrics.latency,
      timestamp: metrics.timestamp,
    });
  }

  // Check token usage
  if (metrics.totalTokens > THRESHOLDS.tokenUsage.critical) {
    await createAlert({
      type: "token_usage",
      severity: "high",
      message: `High token usage: ${metrics.totalTokens} tokens`,
      threshold: THRESHOLDS.tokenUsage.critical,
      currentValue: metrics.totalTokens,
      timestamp: metrics.timestamp,
    });
  }

  // Check error
  if (!metrics.success) {
    await createAlert({
      type: "error_rate",
      severity: metrics.error ? "high" : "medium",
      message: `Request failed: ${metrics.error || "Unknown error"}`,
      threshold: 0,
      currentValue: 1,
      timestamp: metrics.timestamp,
    });
  }

  // Check quality score
  if (metrics.qualityScore !== undefined && metrics.qualityScore < THRESHOLDS.quality.critical) {
    await createAlert({
      type: "quality",
      severity: "high",
      message: `Low quality score: ${metrics.qualityScore}`,
      threshold: THRESHOLDS.quality.critical,
      currentValue: metrics.qualityScore,
      timestamp: metrics.timestamp,
    });
  }
}

async function createAlert(alert: Omit<MonitoringAlert, "id">): Promise<void> {
  const newAlert: MonitoringAlert = {
    ...alert,
    id: crypto.randomUUID(),
    resolved: false,
  };

  alerts.push(newAlert);

  // Keep only last 1000 alerts
  if (alerts.length > 1000) {
    alerts.shift();
  }

  // In production, send alert to monitoring system (e.g., Sentry, PagerDuty)
  console.warn("Alert:", newAlert);
}

export async function getAlerts(
  resolved?: boolean,
  severity?: MonitoringAlert["severity"],
): Promise<MonitoringAlert[]> {
  let filtered = alerts;

  if (resolved !== undefined) {
    filtered = filtered.filter((a) => a.resolved === resolved);
  }

  if (severity) {
    filtered = filtered.filter((a) => a.severity === severity);
  }

  return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function resolveAlert(alertId: string): Promise<void> {
  const alert = alerts.find((a) => a.id === alertId);
  if (alert) {
    alert.resolved = true;
  }
}

// Quality scoring
export function calculateQualityScore(response: string, expectedLength?: number): number {
  let score = 0.5; // Base score

  // Length check
  if (expectedLength) {
    const lengthRatio = response.length / expectedLength;
    if (lengthRatio >= 0.8 && lengthRatio <= 1.2) {
      score += 0.2; // Good length
    }
  }

  // Completeness check (has key phrases)
  const keyPhrases = ["eligibility", "documents", "requirements", "visa"];
  const foundPhrases = keyPhrases.filter((phrase) =>
    response.toLowerCase().includes(phrase),
  ).length;
  score += (foundPhrases / keyPhrases.length) * 0.2;

  // Structure check (has JSON or structured content)
  if (response.includes("{") && response.includes("}")) {
    score += 0.1;
  }

  return Math.min(1.0, score);
}

// Hallucination detection (simple heuristic)
export function detectHallucination(
  response: string,
  context: string[],
): { isHallucination: boolean; confidence: number; reason?: string } {
  // Check if response contains information not in context
  const responseLower = response.toLowerCase();
  const contextText = context.join(" ").toLowerCase();

  // Extract key claims from response
  const claims = responseLower.match(/\d+\s*(years?|months?|days?|percent|%|\$)/g) || [];
  const contextClaims = contextText.match(/\d+\s*(years?|months?|days?|percent|%|\$)/g) || [];

  // If response has many numeric claims not in context, might be hallucination
  const uniqueClaims = claims.filter((c) => !contextClaims.includes(c));
  const hallucinationScore = uniqueClaims.length / Math.max(claims.length, 1);

  if (hallucinationScore > 0.5) {
    return {
      isHallucination: true,
      confidence: hallucinationScore,
      reason: "Response contains claims not found in context",
    };
  }

  return {
    isHallucination: false,
    confidence: 1 - hallucinationScore,
  };
}

export async function trackUserSatisfaction(
  requestId: string,
  satisfaction: number,
): Promise<void> {
  const metric = metricsStore.find((m) => m.requestId === requestId);
  if (metric) {
    metric.userSatisfaction = satisfaction;
  }
}

