import { useState, useEffect, useCallback } from "react";
import type { ConnectorWithStatus, ConnectorStatus } from "./connector-types.js";

// ponytail: lightweight toast fallback; avoids pulling in heavy unneeded react-toastify package
const toast = {
  success: (msg: string) => console.log(`[Connectors] ${msg}`),
  error: (msg: string) => console.error(`[Connectors] ${msg}`),
  info: (msg: string) => console.info(`[Connectors] ${msg}`),
};

// ============================================================================
// USE CONNECTORS HOOK
// Custom React hook managing the connector lifecycle, OAuth redirects,
// real-time status polling, and connection/disconnection handlers.
// ============================================================================

export interface UseConnectorsOptions {
  pollingIntervalMs?: number;
  autoFetch?: boolean;
}

export interface UseConnectorsReturn {
  connectors: ConnectorWithStatus[];
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  selectedConnector: ConnectorWithStatus | null;
  setSelectedConnector: (connector: ConnectorWithStatus | null) => void;
  fetchConnectors: () => Promise<void>;
  pollStatuses: () => Promise<void>;
  connect: (connectorId: string) => Promise<void>;
  disconnect: (connectorId: string) => Promise<boolean>;
}

export function useConnectors(options: UseConnectorsOptions = {}): UseConnectorsReturn {
  const { pollingIntervalMs, autoFetch = true } = options;

  const [connectors, setConnectors] = useState<ConnectorWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorWithStatus | null>(null);

  // Fetch all connectors with full definitions and status
  const fetchConnectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connectors");
      if (!res.ok) {
        throw new Error(`Failed to fetch connectors (${res.status})`);
      }
      const data = await res.json();
      const safeList: ConnectorWithStatus[] = Array.isArray(data) ? data : [];
      setConnectors(safeList);

      // Keep selected connector updated if open
      if (selectedConnector && Array.isArray(data)) {
        const updated = data.find((c: any) => c.id === selectedConnector.id);
        if (updated) setSelectedConnector(updated);
      }
    } catch (err: any) {
      console.error("[useConnectors] Fetch error:", err);
      setError(err.message || "Failed to load connectors");
      toast.error("Failed to load connectors");
    } finally {
      setIsLoading(false);
    }
  }, [selectedConnector]);

  // Lightweight status polling
  const pollStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/connectors/status/all");
      if (!res.ok) return;
      const statuses = await res.json();
      if (!Array.isArray(statuses)) return;
      const statusMap = new Map(statuses.map((s: ConnectorStatus) => [s.id, s]));

      setConnectors((prev) =>
        prev.map((conn) => {
          const newStatus = statusMap.get(conn.id);
          if (newStatus && JSON.stringify(newStatus) !== JSON.stringify(conn.status)) {
            return { ...conn, status: newStatus };
          }
          return conn;
        })
      );
    } catch {
      // Background poll failure is silent
    }
  }, []);

  // Initiate Connect / OAuth Flow
  const connect = useCallback(
    async (connectorId: string) => {
      setIsAuthenticating(true);
      try {
        const res = await fetch(`/api/connectors/${connectorId}/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const data = await res.json();

        if (data.authUrl) {
          // Redirect to external OAuth provider (Google, GitHub, etc.)
          window.location.href = data.authUrl;
        } else if (data.success) {
          toast.success("Connected successfully!");
          setIsAuthenticating(false);
          await fetchConnectors();
        } else {
          toast.error(data.error || "Authentication initiation failed");
          setIsAuthenticating(false);
        }
      } catch (err: any) {
        console.error("[useConnectors] Auth error:", err);
        toast.error(err.message || "Failed to initiate connector authentication");
        setIsAuthenticating(false);
      }
    },
    [fetchConnectors]
  );

  // Disconnect a connector
  const disconnect = useCallback(
    async (connectorId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/connectors/${connectorId}/disconnect`, {
          method: "POST",
        });

        if (!res.ok) throw new Error("Disconnect request failed");

        setConnectors((prev) =>
          prev.map((c) =>
            c.id === connectorId ? { ...c, status: { id: connectorId, connected: false } } : c
          )
        );

        if (selectedConnector?.id === connectorId) {
          setSelectedConnector((prev: ConnectorWithStatus | null) =>
            prev ? { ...prev, status: { id: connectorId, connected: false } } : null
          );
        }

        const connectorName = connectors.find((c) => c.id === connectorId)?.name || "Connector";
        toast.info(`${connectorName} disconnected`);
        return true;
      } catch (err: any) {
        console.error("[useConnectors] Disconnect error:", err);
        toast.error("Failed to disconnect connector");
        return false;
      }
    },
    [connectors, selectedConnector]
  );

  // Check URL params for OAuth callback return
  useEffect(() => {
    const url = new URL(window.location.href);
    const connected = url.searchParams.get("connector_connected");
    const errorParam = url.searchParams.get("connector_error");

    if (connected) {
      toast.success(`${connected} connected successfully!`);
      window.history.replaceState({}, "", "/");
      fetchConnectors();
    }

    if (errorParam) {
      toast.error(`Connection failed: ${errorParam}`);
      window.history.replaceState({}, "", "/");
    }
  }, [fetchConnectors]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchConnectors();
    }
  }, [autoFetch, fetchConnectors]);

  // Status Polling Interval
  useEffect(() => {
    if (!pollingIntervalMs || pollingIntervalMs <= 0) return;
    const interval = setInterval(pollStatuses, pollingIntervalMs);
    return () => clearInterval(interval);
  }, [pollingIntervalMs, pollStatuses]);

  return {
    connectors,
    isLoading,
    isAuthenticating,
    error,
    selectedConnector,
    setSelectedConnector,
    fetchConnectors,
    pollStatuses,
    connect,
    disconnect,
  };
}

export default useConnectors;
