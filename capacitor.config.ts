import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.coursedesk",
  appName: "Course Desk",
  webDir: "dist",
  android: { backgroundColor: "#F3F5F8" },
  plugins: {
    // Send Moodle requests through the phone's native HTTP stack, so the app works
    // even where a school's Moodle doesn't accept requests from websites.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
