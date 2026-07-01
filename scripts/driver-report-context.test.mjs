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
  assert.equal(shouldBlockFleetPayloadForDriverReports({}, { provider: "local_mock" }), true);
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

function clientToolsWithResponses(responses = []) {
  const calls = [];
  const tools = createElevenLabsClientTools({
    requestJson: async (path, options = {}) => {
      calls.push({ path, options });
      if (!responses.length) {
        throw new Error(`Unexpected request: ${path}`);
      }
      const next = responses.shift();
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }
  });

  return { tools, calls };
}

const verifiedContext = {
  ok: true,
  module: "hlaseni-ridicu",
  driverResolved: true,
  vehiclesVerified: true,
  isDemoData: false,
  fallbackUsed: false,
  vehicles: [
    { id: "vehicle-radim-1", displayName: "Mercedes Actros", licensePlate: "1A1 1111" }
  ],
  vehiclesCount: 1,
  message: "Vidím u tebe Mercedes Actros. Mám hlášení zapsat k němu?"
};

const unverifiedContextWithForeignVehicle = {
  ok: true,
  module: "hlaseni-ridicu",
  driverResolved: false,
  vehiclesVerified: false,
  isDemoData: false,
  fallbackUsed: false,
  errorCode: "DRIVER_NOT_MAPPED",
  vehicles: [
    { id: "vehicle-foreign", displayName: "Ford Transit", licensePlate: "3A4 1234" }
  ],
  vehiclesCount: 0,
  fallbackQuestion: "Nemám u tebe teď přiřazené žádné vozidlo. Můžeš mi říct SPZ, ke které chceš závadu nahlásit?",
  message: "Nemám u tebe teď přiřazené žádné vozidlo. Můžeš mi říct SPZ, ke které chceš závadu nahlásit?"
};

{
  const { tools, calls } = clientToolsWithResponses([{ ...verifiedContext }]);
  const first = await tools.get_driver_report_context({ conversationId: "conv-radim" });
  const second = await tools.get_driver_report_context({ conversationId: "conv-radim" });

  assert.equal(calls.length, 1);
  assert.equal(first.cached, false);
  assert.equal(second.cached, true);
  assert.match(second.answerText, /Ano, mám je načtená/);
  assert.match(second.answerText, /Mercedes Actros/);
}

{
  const { tools, calls } = clientToolsWithResponses([
    { ...unverifiedContextWithForeignVehicle },
    { ...unverifiedContextWithForeignVehicle }
  ]);
  const first = await tools.get_driver_report_context({ conversationId: "conv-foreign" });
  const second = await tools.get_driver_report_context({ conversationId: "conv-foreign" });

  assert.equal(calls.length, 2);
  assert.equal(first.cached, false);
  assert.equal(second.cached, false);
  assert.doesNotMatch(first.answerText, /Ford Transit|3A4 1234/);
  assert.doesNotMatch(second.answerText, /Ano, mám je načtená|Ford Transit|3A4 1234/);
}

{
  const { tools, calls } = clientToolsWithResponses([
    { ...verifiedContext },
    { ...verifiedContext, vehicles: [{ id: "vehicle-radim-2", displayName: "MAN TGE" }] }
  ]);
  const first = await tools.get_driver_report_context({});
  const second = await tools.get_driver_report_context({});

  assert.equal(calls.length, 2);
  assert.equal(first.sessionCacheEnabled, false);
  assert.equal(second.sessionCacheEnabled, false);
}

{
  const { tools, calls } = clientToolsWithResponses([{ ...unverifiedContextWithForeignVehicle }]);
  const result = await tools.create_driver_part_request({
    conversationId: "conv-part-request",
    defectDescription: "poškozené brzdy"
  });

  assert.equal(calls.length, 1);
  assert.equal(result.status, "needs_input");
  assert.equal(result.verified, false);
  assert.equal(result.driverPartRequest, null);
  assert.doesNotMatch(result.answerText, /Ford Transit|3A4 1234/);
}

console.log("driver-report-context tests passed");
