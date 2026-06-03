import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { AutomationForm } from "../components/automations/AutomationForm";
import { EmptyState, ErrorState, LoadingState, getErrorMessage } from "../components/ui/Status";
import { useWs } from "../hooks/useWs";
import { AutomationTask } from "../types/models";

// Handles AutomationsPage logic.
export const AutomationsPage = () => {
  const qc = useQueryClient();
  const [events, setEvents] = useState<string[]>([]);

  const tasksQuery = useQuery({
    queryKey: ["automations"],
    queryFn: async () => (await api.get<AutomationTask[]>("/automations")).data
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string; cronExpr: string }) =>
      api.post("/automations", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automations"] })
  });

  const onWsMessage = useCallback((payload: unknown) => {
    const data = payload as { type?: string; title?: string; at?: string };
    if (data.type !== "automation:executed") return;
    setEvents((prev) => [`${data.title} executed at ${data.at}`, ...prev].slice(0, 8));
    qc.invalidateQueries({ queryKey: ["automations"] });
  }, [qc]);

  useWs(onWsMessage);

  const tasks = tasksQuery.data || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Task Automations</h2>
      <AutomationForm
        isPending={createMutation.isPending}
        onCreate={async (payload) => createMutation.mutateAsync(payload).then(() => undefined)}
      />
      {createMutation.isError && (
        <ErrorState title="Could not create automation" message={getErrorMessage(createMutation.error)} />
      )}

      <div className="card">
        <h3 className="font-semibold mb-2">Scheduled tasks</h3>
        {tasksQuery.isLoading && <LoadingState title="Loading scheduled tasks" />}
        {tasksQuery.isError && (
          <ErrorState title="Could not load automations" message={getErrorMessage(tasksQuery.error)} />
        )}
        {tasksQuery.isSuccess && tasks.length === 0 && (
          <EmptyState title="No automations yet" message="Create one above to start scheduling work." />
        )}
        {tasks.length > 0 && (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-2">
                <p className="font-medium">{task.title}</p>
                <p className="text-sm text-slate-600">Cron: {task.cronExpr}</p>
                <p className="text-sm text-slate-600">
                  Last run: {task.lastRunAt ? new Date(task.lastRunAt).toLocaleString() : "Not yet"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 className="font-semibold mb-2">Live events</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-600">No automation events in this session.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {events.map((event, idx) => (
              <p key={`${event}-${idx}`}>{event}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
