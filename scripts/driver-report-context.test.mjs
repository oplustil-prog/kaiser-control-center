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
    model: "Svoz 1",
    assignedDriverId: "employee-radim",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  },
  {
    id: "vehicle-radim-2",
    licensePlate: "2A2 2222",
    model: "Svoz 2",
    assignedDriverId: "user-radim",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  },
  {
    id: "vehicle-other",
    licensePlate: "3A4 1234",
    model: "Cizí vozidlo",
    assignedDriverId: "employee-other",
    assignedDriverName: "Radim Opluštil",
    assignedDriverPhone: "731 000 000",
    status: "active"
  }
];

function findInFakeDom(nodes, predicate) {
  for (const node of nodes || []) {
    if (predicate(node)) {
      return node;
    }

    const child = findInFakeDom(node.children || [], predicate);
    if (child) {
      return child;
    }
  }

  return null;
}

function createFakeElement(tagName) {
  return {
    tagName,
    id: "",
    type: "",
    className: "",
    textContent: "",
    disabled: false,
    dataset: {},
    attributes: {},
    children: [],
    eventHandlers: {},
    classList: {
      add() {},
      remove() {}
    },
    append(...children) {
      this.children.push(...children);
    },
    appendChild(child) {
      this.children.push(child);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, handler) {
      this.eventHandlers[type] = handler;
    },
    remove() {
      this.removed = true;
    },
    focus() {
      this.focused = true;
    },
    querySelector(selector) {
      if (selector === "button:not(:disabled)") {
        return findInFakeDom(this.children, (node) => node.tagName === "button" && !node.disabled);
      }

      return null;
    }
  };
}

async function withFakeDriverPickerDom(callback) {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const roots = [];
  const listeners = {};

  globalThis.document = {
    body: {
      append(node) {
        roots.push(node);
      }
    },
    createElement: createFakeElement,
    querySelectorAll(selector) {
      if (selector === "[data-ai-driver-vehicle-picker]") {
        return roots.filter((node) => node.dataset?.aiDriverVehiclePicker === "true");
      }

      return [];
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    removeEventListener(type) {
      delete listeners[type];
    }
  };
  globalThis.window = {
    location: { pathname: "/hlaseni-ridicu" },
    setTimeout() {
      return 1;
    },
    clearTimeout() {},
    dispatchEvent() {},
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    }
  };

  try {
    await callback({
      roots,
      find: (predicate) => findInFakeDom(roots, predicate)
    });
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
}

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
        { id: "fake", displayName: "Nesmí být řečeno", licensePlate: "5A4 8912" }
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
  assert.match(result.answerText, /Vyber|Otevřu|SPZ/);
  assert.equal(result.answerText.includes("Nesmí být řečeno"), false);
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
      vehiclePickerAvailable: true,
      vehicles: [
        { id: "vehicle-radim-1", displayName: "Utajený vůz", licensePlate: "1A1 1111" }
      ],
      vehiclesCount: 1,
      vehicleLookupMode: "verified_ui_picker",
      messageForAssistant: "Otevřu ti výběr vozidla v aplikaci.",
      apiStatus: "ready"
    })
  });
  const result = await tools.get_driver_report_context({ sessionId: "voice-radim-verified" });

  assert.equal(result.ok, true);
  assert.equal(result.vehiclesVerified, false);
  assert.equal(result.vehiclePickerAvailable, true);
  assert.deepEqual(result.vehicles, []);
  assert.equal(result.vehiclesCount, 0);
  assert.match(result.answerText, /výběr vozidla v aplikaci/);
  assert.equal(result.answerText.includes("Utajený vůz"), false);
  assert.equal(result.answerText.includes("1A1 1111"), false);
}

{
  let posted = false;
  const tools = createElevenLabsClientTools({
    requestJson: async () => {
      posted = true;
      throw new Error("create_driver_part_request must not post without vehicle selection");
    }
  });
  const result = await tools.create_driver_part_request({
    defectDescription: "upadnuté zrcátko",
    confirmed: true
  });

  assert.equal(posted, false);
  assert.equal(result.ok, false);
  assert.equal(result.status, "needs_input");
  assert.equal(result.code, "VEHICLE_SPZ_REQUIRED");
  assert.equal(result.message, "Potřebuji vybrat vozidlo v aplikaci, nebo mi řekni SPZ vozidla.");
}

{
  await withFakeDriverPickerDom(async ({ find }) => {
    const tools = createElevenLabsClientTools({
      requestJson: async () => ({
        ok: true,
        module: "hlaseni-ridicu",
        userName: "Radim",
        userResolved: true,
        employeeResolved: true,
        driverResolved: true,
        vehiclesVerified: true,
        vehiclePickerAvailable: true,
        vehicles: [
          { id: "vehicle-radim-1", displayName: "Utajený vůz", licensePlate: "1A1 1111" }
        ],
        vehiclesCount: 1,
        apiStatus: "ready"
      })
    });

    const opened = await tools.show_driver_vehicle_picker({ sessionId: "picker-open-test" });
    assert.equal(opened.ok, true);
    assert.equal(opened.status, "picker_opened");
    assert.equal(opened.pickerOpened, true);
    assert.deepEqual(opened.vehicles, []);
    assert.equal(opened.toolDiagnostics.includes("Tool called: show_driver_vehicle_picker"), true);
    assert.equal(opened.toolDiagnostics.includes("Tool succeeded: show_driver_vehicle_picker"), true);

    const pending = await tools.get_driver_vehicle_picker_selection({ sessionId: "picker-open-test" });
    assert.equal(pending.ok, false);
    assert.equal(pending.status, "needs_input");
    assert.equal(pending.answerText, "Potřebuji vybrat vozidlo v aplikaci, nebo mi řekni SPZ vozidla.");

    const option = find((node) => node.className === "ai-driver-vehicle-picker__option" && !node.disabled);
    assert.ok(option);
    option.eventHandlers.click();

    const selected = await tools.get_driver_vehicle_picker_selection({ sessionId: "picker-open-test" });
    assert.equal(selected.ok, true);
    assert.equal(selected.status, "selected");
    assert.equal(selected.vehicleId, "vehicle-radim-1");
    assert.deepEqual(selected.vehicles, []);
  });
}

{
  const tools = createElevenLabsClientTools();
  const result = await tools.highlight_element({
    selector: "[data-driver-report-vehicle]",
    message: "Toto vozidlo"
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "DRIVER_VEHICLE_PICKER_REQUIRED");
  assert.deepEqual(result.vehicles, []);
}

console.log("driver-report-context tests passed");
