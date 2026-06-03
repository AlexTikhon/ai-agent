import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import GridLayout, { WidthProvider, Layout } from "react-grid-layout";
import { api } from "../api/client";
import { WidgetCard } from "../components/dashboard/WidgetCard";
import { useWs } from "../hooks/useWs";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const AutoGrid = WidthProvider(GridLayout);

const defaultLayout: Layout[] = [
  { i: "weather", x: 0, y: 0, w: 3, h: 2 },
  { i: "stats", x: 3, y: 0, w: 3, h: 2 },
  { i: "notes", x: 0, y: 2, w: 3, h: 3 },
  { i: "files", x: 3, y: 2, w: 3, h: 3 },
  { i: "events", x: 0, y: 5, w: 6, h: 2 }
];

type WidgetsData = {
  notesCount: number;
  tasksCount: number;
  filesCount: number;
  recentFiles: { id: string; fileName: string }[];
  recentNotes: { id: string; title: string }[];
  weather: { location: string; temperatureC: number; condition: string };
};

// Handles DashboardPage logic.
export const DashboardPage = () => {
  const [layout, setLayout] = useState<Layout[]>(defaultLayout);
  const [events, setEvents] = useState<string[]>([]);

  const widgetsQuery = useQuery({
    queryKey: ["dashboard", "widgets"],
    queryFn: async () => (await api.get<WidgetsData>("/dashboard/widgets")).data
  });

  const layoutQuery = useQuery({
    queryKey: ["dashboard", "layout"],
    queryFn: async () => (await api.get<{ layout: Layout[] | null }>("/dashboard/layout")).data
  });

  const saveLayoutMutation = useMutation({
    mutationFn: (nextLayout: Layout[]) => api.put("/dashboard/layout", { layout: nextLayout })
  });

  useEffect(() => {
    if (layoutQuery.data?.layout) setLayout(layoutQuery.data.layout);
  }, [layoutQuery.data]);

  const onWsMessage = useCallback((payload: unknown) => {
    const data = payload as { type?: string; title?: string; at?: string };
    if (data.type === "automation:executed") {
      setEvents((prev) => [`${data.title} at ${data.at}`, ...prev].slice(0, 10));
    }
  }, []);
  useWs(onWsMessage);

  const widgets = widgetsQuery.data;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Real-time Dashboard</h2>
      <AutoGrid
        className="layout"
        layout={layout}
        cols={6}
        rowHeight={80}
        onLayoutChange={(next) => {
          setLayout(next);
          saveLayoutMutation.mutate(next);
        }}
      >
        <div key="weather">
          <WidgetCard title="Weather">
            <p>{widgets?.weather.location}</p>
            <p className="text-2xl font-semibold">{widgets?.weather.temperatureC}C</p>
            <p className="text-sm text-slate-600">{widgets?.weather.condition}</p>
          </WidgetCard>
        </div>
        <div key="stats">
          <WidgetCard title="Workspace stats">
            <p>Notes: {widgets?.notesCount ?? 0}</p>
            <p>Tasks: {widgets?.tasksCount ?? 0}</p>
            <p>Files: {widgets?.filesCount ?? 0}</p>
          </WidgetCard>
        </div>
        <div key="notes">
          <WidgetCard title="Recent notes">
            <ul className="space-y-2 text-sm">
              {(widgets?.recentNotes || []).map((note) => (
                <li key={note.id}>{note.title}</li>
              ))}
            </ul>
          </WidgetCard>
        </div>
        <div key="files">
          <WidgetCard title="Recent files">
            <ul className="space-y-2 text-sm">
              {(widgets?.recentFiles || []).map((file) => (
                <li key={file.id}>{file.fileName}</li>
              ))}
            </ul>
          </WidgetCard>
        </div>
        <div key="events">
          <WidgetCard title="Live events">
            <ul className="space-y-1 text-sm">
              {events.map((event, idx) => (
                <li key={`${event}-${idx}`}>{event}</li>
              ))}
            </ul>
          </WidgetCard>
        </div>
      </AutoGrid>
    </div>
  );
};
