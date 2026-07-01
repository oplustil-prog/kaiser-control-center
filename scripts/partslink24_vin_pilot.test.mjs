import assert from "node:assert/strict";

import {
  maskVin,
  parseBoolean,
  redactSensitive,
  runPartslink24VinPilot
} from "./partslink24_vin_pilot.mjs";

assert.equal(maskVin("WDB12345678901234"), "WDB**********1234");
assert.equal(maskVin("ABC1234"), "*******");
assert.equal(parseBoolean("true"), true);
assert.equal(parseBoolean("0"), false);
assert.equal(redactSensitive("login admin pass dummy-password VIN WDB12345678901234", [
  "admin",
  "dummy-password",
  "WDB12345678901234"
]), "login [REDACTED] pass [REDACTED] VIN [REDACTED]");

{
  const result = await runPartslink24VinPilot({}, {
    PARTSLINK24_COMPANY_ID: "cz-879576",
    PARTSLINK24_USERNAME: "admin",
    PARTSLINK24_PASSWORD: "dummy-password",
    PARTSLINK24_TEST_VIN: "WDB12345678901234",
    PARTSLINK24_PILOT_DRY_RUN: "true"
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "dry_run_ready");
  assert.equal(result.vinMasked, "WDB**********1234");
}

{
  const result = await runPartslink24VinPilot({}, {
    PARTSLINK24_TEST_VIN: "WDB12345678901234"
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "configuration_missing");
  assert.equal(result.errorCode, "PARTSLINK24_SECRETS_MISSING");
  assert.deepEqual(result.missingSecrets, [
    "PARTSLINK24_COMPANY_ID",
    "PARTSLINK24_USERNAME",
    "PARTSLINK24_PASSWORD"
  ]);
}

console.log("partslink24 VIN pilot tests passed");
