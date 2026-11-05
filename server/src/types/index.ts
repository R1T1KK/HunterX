export interface HealthResponse {
  status: "ok";
  service: "hiderush-server";
  uptime: number;
  timestamp: string;
  environment: string;
}
