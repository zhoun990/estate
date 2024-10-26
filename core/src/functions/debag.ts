import { settings } from "./GlobalStore";
let last_log_timestamp = 0;
export const debag = (...data: any[]) => {
  if (settings.debag) {
    const current_timestamp = Date.now();
    if (last_log_timestamp) {
      const elapsed_time = current_timestamp - last_log_timestamp;
      console.log(
        "[DEBAG_LOG]",
        new Date().toISOString(),
        ...data,
        `経過時間: ${elapsed_time}ms`,
      );
    } else {
      console.log("[DEBAG_LOG]", new Date().toISOString(), ...data);
    }
    last_log_timestamp = current_timestamp;
  }
};
