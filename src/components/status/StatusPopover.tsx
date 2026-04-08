import { useState, useEffect } from "preact/hooks";
import { statusPopoverOpen, agentStatus } from "../../state/store";
import { getStatusInfo, stopVm, setupAgent, startAgent, stopAgent, getRecentLogs, getCalendarStatus, syncCalendarToTodos } from "../../api/commands";
import { listen } from "@tauri-apps/api/event";
import type { StatusInfo, CalendarStatus } from "../../types";

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "running" ? "running" :
    status === "starting" ? "starting" :
    status === "error" || status === "unreachable" ? "error" :
    "disconnected";
  return <span class={`status-indicator ${cls}`} />;
}

function Row({ label, value, status }: { label: string; value: string; status?: string }) {
  return (
    <div class="status-row">
      {status !== undefined && <StatusDot status={status} />}
      <span class="status-row-label">{label}</span>
      <span class="status-row-value">{value}</span>
    </div>
  );
}

export function StatusPopover() {
  const [info, setInfo] = useState<StatusInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupProgress, setSetupProgress] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [showLogs, setShowLogs] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);
  const [calSyncing, setCalSyncing] = useState(false);

  function refresh() {
    setLoading(true);
    setActionMsg("");
    getStatusInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (statusPopoverOpen.value) {
      refresh();
      setShowLogs(false);
      getCalendarStatus()
        .then(setCalStatus)
        .catch(() => setCalStatus(null));
    }
  }, [statusPopoverOpen.value]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>("setup-progress", (e) => {
      setSetupProgress(e.payload);
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  function loadLogs() {
    getRecentLogs(50).then(setLogContent).catch(() => setLogContent("(failed to load logs)"));
  }

  function toggleLogs() {
    const next = !showLogs;
    setShowLogs(next);
    if (next) loadLogs();
  }

  if (!statusPopoverOpen.value) return null;

  function close() {
    statusPopoverOpen.value = false;
  }

  async function handleFullSetup() {
    setSetupRunning(true);
    setSetupProgress("Starting setup...");
    setActionMsg("");
    agentStatus.value = "starting";
    try {
      const result = await setupAgent();
      setActionMsg(result);
      agentStatus.value = "running";
      refresh();
    } catch (e) {
      setActionMsg(`Setup failed: ${e}`);
      agentStatus.value = "error";
      // Auto-show logs on failure
      setShowLogs(true);
      loadLogs();
    } finally {
      setSetupRunning(false);
      setSetupProgress("");
    }
  }

  async function handleStopVm() {
    setActionMsg("");
    try {
      await stopVm();
      setActionMsg("Sandbox stopped");
      refresh();
    } catch (e) {
      setActionMsg(`Error: ${e}`);
    }
  }

  async function handleStartAgent() {
    setActionMsg("");
    agentStatus.value = "starting";
    try {
      await startAgent();
      setActionMsg("Agent started");
      agentStatus.value = "running";
      refresh();
    } catch (e) {
      setActionMsg(`Error: ${e}`);
      agentStatus.value = "error";
    }
  }

  async function handleStopAgent() {
    setActionMsg("");
    try {
      await stopAgent();
      setActionMsg("Agent stopped");
      agentStatus.value = "disconnected";
      refresh();
    } catch (e) {
      setActionMsg(`Error: ${e}`);
    }
  }

  async function handleCalendarSync() {
    setCalSyncing(true);
    setActionMsg("");
    try {
      const msg = await syncCalendarToTodos();
      setActionMsg(msg);
    } catch (e) {
      setActionMsg(`Calendar sync failed: ${e}`);
    } finally {
      setCalSyncing(false);
    }
  }

  const needsSetup = info && info.sandbox_status === "not_created";
  const sandboxStopped = info && info.sandbox_status === "stopped";

  return (
    <div class="status-popover-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class="status-popover">
        <div class="status-popover-header">
          <span class="status-popover-title">Status</span>
          <button class="settings-close" onClick={close} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {loading && !info && (
          <div class="status-popover-body">
            <span class="status-loading">Loading...</span>
          </div>
        )}

        {info && (
          <div class="status-popover-body">
            <Row label="Agent" value={info.agent_status} status={info.agent_status} />
            {info.agent_error && <div class="status-error">{info.agent_error}</div>}

            <Row label="Sandbox" value={info.sandbox_status} status={
              info.sandbox_status === "running" ? "running" :
              info.sandbox_status === "stopped" ? "disconnected" :
              info.sandbox_status === "not_created" ? "disconnected" : "error"
            } />
            <Row label="Name" value={info.sandbox_name} />
            {info.sandbox_error && <div class="status-error">{info.sandbox_error}</div>}

            <div class="status-divider" />
            <Row label="heyvm" value={info.heyvm_available ? "available" : "not found"} status={info.heyvm_available ? "running" : "error"} />
            <Row label="Data dir" value={info.data_dir} status={info.data_dir_exists ? "running" : "error"} />

            {/* Setup progress */}
            {setupRunning && (
              <div class="setup-progress">
                <div class="setup-progress-spinner" />
                <span>{setupProgress}</span>
              </div>
            )}

            {!setupRunning && info.heyvm_available && (
              <div class="status-divider" />
            )}

            {/* Setup button for fresh sandbox */}
            {!setupRunning && info.heyvm_available && needsSetup && (
              <div class="setup-section">
                <div class="setup-description">
                  Set up the sandbox and start the agent in one step.
                </div>
                <button class="btn btn-sm btn-primary setup-btn" onClick={handleFullSetup}>
                  Set Up Agent
                </button>
              </div>
            )}

            {/* Stopped sandbox — just needs a start */}
            {!setupRunning && info.heyvm_available && sandboxStopped && (
              <div class="status-actions">
                <button class="btn btn-sm btn-primary" onClick={handleFullSetup}>Start Agent</button>
                <button class="btn btn-sm btn-ghost" onClick={refresh} disabled={loading}>Refresh</button>
              </div>
            )}

            {/* Running sandbox actions */}
            {!setupRunning && info.heyvm_available && !needsSetup && !sandboxStopped && (
              <div class="status-actions">
                {info.sandbox_status === "running" && info.agent_status === "disconnected" && (
                  <button class="btn btn-sm btn-primary" onClick={handleStartAgent}>Start Agent</button>
                )}
                {(info.agent_status === "running" || info.agent_status === "unreachable") && (
                  <button class="btn btn-sm btn-secondary" onClick={handleStopAgent}>Stop Agent</button>
                )}
                {info.sandbox_status === "running" && (
                  <button class="btn btn-sm btn-secondary" onClick={handleStopVm}>Stop VM</button>
                )}
                <button class="btn btn-sm btn-ghost" onClick={refresh} disabled={loading}>Refresh</button>
              </div>
            )}

            {!info.heyvm_available && (
              <div class="status-error" style={{ marginTop: "6px" }}>
                Install heyvm to create and manage sandboxes.
              </div>
            )}

            {calStatus?.connected && (
              <>
                <div class="status-divider" />
                <div class="status-actions">
                  <button class="btn btn-sm btn-primary" onClick={handleCalendarSync} disabled={calSyncing}>
                    {calSyncing ? "Syncing..." : "Sync Calendar"}
                  </button>
                </div>
              </>
            )}

            {actionMsg && <div class="status-action-msg">{actionMsg}</div>}

            {/* Logs section */}
            <div class="status-divider" />
            <button class="status-logs-toggle" onClick={toggleLogs}>
              {showLogs ? "Hide Logs" : "View Logs"}
              {info.log_file && <span class="status-log-path">{info.log_file}</span>}
            </button>

            {showLogs && (
              <div class="status-logs">
                <div class="status-logs-actions">
                  <button class="btn btn-sm btn-ghost" onClick={loadLogs}>Refresh</button>
                </div>
                <pre class="status-logs-content">{logContent || "(empty)"}</pre>
              </div>
            )}
          </div>
        )}

        {!loading && !info && (
          <div class="status-popover-body">
            <span class="status-error">Could not load status info</span>
            <button class="btn btn-sm btn-ghost" onClick={refresh} style={{ marginTop: "6px" }}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
