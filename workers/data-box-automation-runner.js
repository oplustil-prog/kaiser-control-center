import { runDataBoxAutomation } from "../functions/_lib/data-box-automation-runner.js";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const mode = String(env.DATA_BOX_AUTOMATION_MODE || "live").trim() === "dry-run" ? "dry-run" : "live";
      const summary = await runDataBoxAutomation(env, {
        mode,
        confirmed: mode === "live",
        scheduledAt: new Date(controller.scheduledTime).toISOString(),
        triggeredBy: "cloudflare-cron"
      });

      console.log("data_box_automation_runner.completed", {
        mode: summary.mode,
        status: summary.status,
        runnerRunId: summary.runnerRunId,
        rulesTotal: summary.rulesTotal,
        dryRunCount: summary.dryRunCount,
        skippedCount: summary.skippedCount,
        failedCount: summary.failedCount,
        emailSending: "requires_user_confirmation",
        dataBoxSending: "disabled_without_confirmed_knf_endpoint"
      });
    })());
  },

  async fetch() {
    return Response.json({
      status: "ready",
      runner: "data-box-cloud-runner",
      mode: "live",
      cron: "*/30 * * * *",
      emailSending: "requires_user_confirmation",
      dataBoxSending: "only via confirmed backend endpoint",
      message: "DS cloud runner vyhodnocuje pravidla. E-maily připravuje k ručnímu potvrzení."
    });
  }
};
