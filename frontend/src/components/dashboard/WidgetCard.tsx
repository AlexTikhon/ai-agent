import { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

// Handles WidgetCard logic.
export const WidgetCard = ({ title, children }: Props) => (
  <section className="card h-full">
    <h3 className="font-semibold mb-2">{title}</h3>
    {children}
  </section>
);
