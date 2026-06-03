import { DashboardRepository } from "./dashboard.repository";

export class DashboardService {
  // Handles constructor logic.
  constructor(private readonly repo: DashboardRepository) {}

  // Handles widgets logic.
  async widgets(userId: string) {
    const data = await this.repo.getWidgetData(userId);
    return {
      ...data,
      weather: {
        location: "Warsaw",
        temperatureC: 21,
        condition: "Partly cloudy"
      }
    };
  }

  // Handles getLayout logic.
  async getLayout(userId: string) {
    const row = await this.repo.getLayout(userId);
    return row?.layout ?? null;
  }

  // Handles saveLayout logic.
  saveLayout(userId: string, layout: unknown) {
    return this.repo.saveLayout(userId, layout);
  }
}
