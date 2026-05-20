import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.devhub.controlproyectos",
  appName: "Control Proyectos",
  webDir: "apps/web/.next",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "http://192.168.1.30:3000",
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
