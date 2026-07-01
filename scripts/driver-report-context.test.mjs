import assert from "node:assert/strict";

import {
  driverVehicleCandidateMatches,
  fleetPayloadUsesMockData,
  shouldBlockFleetPayloadForDriverReports
} from "../functions/_lib/fleet-vehicles-store.js";
import {
  driverPartRequestNeedsManualVehicleReview,
  driverPartRequestSourceHasManualVehicleReview
} from "../functions/_lib/driver-part-requests-store.js";
import { createElevenLabsClientTools } from "../src/elevenLabsClientTools.js";

const radimUser = {
  id: "user-radim",
  name: "Radim Opluštil",
  phone: "731 000 000"
};

const vehicles = [
  {
    id: "vehicle-radim-1",
    licensePlate: "1A1 1111",
    model: "Mercedes Actros",
    assignedDriverId: "employee-radim",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  },
  {
    id: "vehicle-radim-2",
    licensePlate: "2A2 2222",
    model: "MAN TGE",
    assignedDriverId: "user-radim",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  },
  {
    id: "vehicle-other",
    licensePlate: "3A4 1234",
    model: "Ford Transit",
    assignedDriverId: "employee-other",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  }
];

{
  const result = driverVehicleCandidateMatches(vehicles, {
    strictDriverAssignment: true,
    driverIds: ["employee-radim", "user-radim"]
  }, radimUser);

  assert.equal(result.fallbackUsed, false);
  assert.equal(result.lookupReason, "driver_id");
  assert.deepEqual(result.matches.map((vehicle) => vehicle.id).sort(), ["vehicle-radim-1", "vehicle-radim-2"]);
}

{
  const result = driverVehicleCandidateMatches(vehicles, {
    strictDriverAssignment: true,
    driverIds: ["employee-without-vehicles"]
  }, { id: "user-without-vehicles", name: "Bez Vozidel" });

  assert.equal(result.lookupReason, "strict_driver_id_no_match");
  assert.deepEqual(result.matches, []);
}

{
  const result = driverVehicleCandidateMatches(vehicles, {
    strictDriverAssignment: true,
    driverIds: ["employee-radim"]
  }, { ...radimUser, name: "Radim Opluštil" });

  assert.deepEqual(result.matches.map((vehicle) => vehicle.id).sort(), ["vehicle-radim-1", "vehicle-radim-2"]);
  assert.equal(result.matches.some((vehicle) => vehicle.id === "vehicle-other"), false);
}

{
  const result = driverVehicleCandidateMatches(vehicles, {
    strictDriverAssignment: true
  }, { id: "user-unmapped", name: "Radim Opluštil", phone: "731 000 000" });

  assert.deepEqual(result.matches, []);
  assert.equal(result.fallbackUsed, false);
}

{
  assert.equal(fleetPayloadUsesMockData({ provider: "local_mock", source: "Lokální mock T-Cars" }), true);
  assert.equal(shouldBlockFleetPayloadForDriverReports({ APP_ENV: "production" }, { provider: "local_mock" }), true);
  assert.equal(shouldBlockFleetPayloadForDriverReports({ APP_ENV: "development" }, { provider: "local_mock" }), false);
}

{
  const assignedMatch = {
    candidates: [
      { id: "vehicle-radim-1", licensePlate: "1A1 1111" }
    ]
  };
  const validation = { exact: true };

  assert.equal(driverPartRequestNeedsManualVehicleReview(assignedMatch, "1A1 1111", validation), false);
  assert.equal(driverPartRequestNeedsManualVehicleReview(assignedMatch, "3A4 1234", validation), true);
  assert.equal(driverPartRequestSourceHasManualVehicleReview("voice_manual_vehicle_review"), true);
  assert.equal(driverPartRequestSourceHasManualVehicleReview("voice"), false);
}

{
  const tools = createElevenLabsClientTools({
    requestJson: async () => ({
      ok: true,
      module: "hlaseni-ridicu",
      userName: "Radim",
      userResolved: true,
      employeeResolved: true,
      driverResolved: false,
      vehiclesVerified: false,
      vehicles: [
        { id: "fake", displayName: "Mercedes Sprinter", licensePlate: "5A4 8912" }
      ],
      vehiclesCount: 1,
      vehicleLookupMode: "manual_spz_required",
      messageForAssistant: "Nemám u tebe teď bezpečně ověřené žádné přiřazené vozidlo. Řekni mi prosím SPZ vozidla.",
      apiStatus: "ready"
    })
  });
  const result = await tools.get_driver_report_context({ sessionId: "voice-radim" });

  assert.equal(result.ok, true);
  assert.equal(result.vehiclesVerified, false);
  assert.deepEqual(result.vehicles, []);
  assert.match(result.answerText, /bezpečně ověřené žádné přiřazené vozidlo/);
  assert.equal(result.answerText.includes("Mercedes Sprinter"), false);
  assert.equal(result.answerText.includes("5A4 8912"), false);
}

{
  const tools = createElevenLabsClientTools({
    requestJson: async () => ({
      ok: true,
      module: "hlaseni-ridicu",
      userName: "Radim",
      userResolved: true,
      employeeResolved: true,
      driverResolved: true,
      vehiclesVerified: true,
      vehicles: [
        { id: "vehicle-radim-1", displayName: "Mercedes Actros", licensePlate: "1A1 1111" }
      ],
      vehiclesCount: 1,
      vehicleLookupMode: "verified_list",
      messageForAssistant: "Vidím u tebe Mercedes Actros. Mám hlášení zapsat k němu?",
      apiStatus: "ready"
    })
  });
  const result = await tools.get_driver_report_context({ sessionId: "voice-radim-verified" });

  assert.equal(result.ok, true);
  assert.equal(result.vehiclesVerified, true);
  assert.equal(result.vehicles.length, 1);
  assert.match(result.answerText, /Mercedes Actros/);
}

console.log("driver-report-context tests passed");
