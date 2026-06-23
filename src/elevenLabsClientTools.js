export const AI_ROUTE_ALIASES = {
  "/rychle-zadani": "/dovolena-nemoc/rychle-zadani"
};

export const AI_ALLOWED_ROUTES = [
  "/",
  "/dashboard",
  "/rychle-zadani",
  "/dovolena-nemoc/rychle-zadani",
  "/dovolena-nemoc",
  "/dovolena-nemoc/moje-zadosti",
  "/dovolena-nemoc/ke-schvaleni",
  "/dovolena-nemoc/kalendar",
  "/dovolena-nemoc/zamestnanci",
  "/pneumatiky",
  "/hlaseni-ridicu",
  "/vozovy-park",
  "/servis-udrzba",
  "/trasy-svozu",
  "/trasy-vzorku",
  "/vistos",
  "/naklady",
  "/reporty",
  "/uzivatele",
  "/nastaveni",
  "/pripominky"
];

export const AI_MODULE_ROUTE_MAP = {
  dashboard: "/dashboard",
  "rychle-zadani": "/dovolena-nemoc/rychle-zadani",
  absence: "/dovolena-nemoc",
  "dovolena-nemoc": "/dovolena-nemoc",
  "moje-zadosti": "/dovolena-nemoc/moje-zadosti",
  "ke-schvaleni": "/dovolena-nemoc/ke-schvaleni",
  kalendar: "/dovolena-nemoc/kalendar",
  zamestnanci: "/dovolena-nemoc/zamestnanci",
  tyres: "/pneumatiky",
  pneumatiky: "/pneumatiky",
  "driver-reports": "/hlaseni-ridicu",
  "hlaseni-ridicu": "/hlaseni-ridicu",
  fleet: "/vozovy-park",
  "vozovy-park": "/vozovy-park",
  "service-maintenance": "/servis-udrzba",
  "servis-udrzba": "/servis-udrzba",
  "collection-routes": "/trasy-svozu",
  "trasy-svozu": "/trasy-svozu",
  "sampling-routes": "/trasy-vzorku",
  "trasy-vzorku": "/trasy-vzorku",
  vistos: "/vistos",
  costs: "/naklady",
  naklady: "/naklady",
  reports: "/reporty",
  reporty: "/reporty",
  users: "/uzivatele",
  uzivatele: "/uzivatele",
  settings: "/nastaveni",
  nastaveni: "/nastaveni",
  feedback: "/pripominky",
  pripominky: "/pripominky"
};

export const ELEVENLABS_CLIENT_TOOL_SCHEMAS = [
  {
    name: "navigate_to",
    description: "Přejde na povolenou route v aplikaci Smart odpady.",
    parameters: [{ name: "route", type: "string", required: true }]
  },
  {
    name: "open_module",
    description: "Otevře známý modul aplikace podle moduleId.",
    parameters: [{ name: "moduleId", type: "string", required: true }]
  },
  {
    name: "show_confirmation",
    description: "Zobrazí potvrzení před citlivou akcí.",
    parameters: [
      { name: "title", type: "string", required: true },
      { name: "message", type: "string", required: true },
      { name: "confirmLabel", type: "string", required: false },
      { name: "cancelLabel", type: "string", required: false }
    ]
  },
  {
    name: "show_toast",
    description: "Zobrazí krátkou stavovou zprávu v UI.",
    parameters: [
      { name: "type", type: "string", required: true },
      { name: "message", type: "string", required: true }
    ]
  },
  {
    name: "highlight_element",
    description: "Dočasně zvýrazní prvek v aktuální obrazovce.",
    parameters: [
      { name: "selector", type: "string", required: true },
      { name: "message", type: "string", required: false }
    ]
  }
];

const ALLOWED_ROUTE_SET = new Set(AI_ALLOWED_ROUTES.map((route) => AI_ROUTE_ALIASES[route] || route));
const TOAST_TYPES = new Set(["success", "error", "info", "warning"]);

function cleanString(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeAiRoute(route) {
  const cleaned = cleanString(route);

  if (!cleaned || cleaned.startsWith("//") || /^https?:\/\//i.test(cleaned)) {
    return "";
  }

  const path = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  const withoutQuery = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  return AI_ROUTE_ALIASES[withoutQuery] || withoutQuery;
}

export function isAllowedAiRoute(route) {
  const normalizedRoute = normalizeAiRoute(route);
  return Boolean(normalizedRoute && ALLOWED_ROUTE_SET.has(normalizedRoute));
}

export function routeForAiModule(moduleId) {
  return AI_MODULE_ROUTE_MAP[normalizeKey(moduleId)] || "";
}

export function createElevenLabsClientTools({
  navigate = () => {},
  canUseRoute = () => true,
  confirm = async () => false,
  toast = () => {},
  highlight = () => {}
} = {}) {
  function guardedRoute(route) {
    const normalizedRoute = normalizeAiRoute(route);

    if (!normalizedRoute || !isAllowedAiRoute(normalizedRoute)) {
      return { ok: false, error: "Route není povolená.", route: normalizedRoute };
    }

    if (!canUseRoute(normalizedRoute)) {
      return { ok: false, error: "Nemáte oprávnění k této části aplikace.", route: normalizedRoute };
    }

    return { ok: true, route: normalizedRoute };
  }

  return {
    async navigate_to(parameters = {}) {
      const result = guardedRoute(parameters.route);

      if (!result.ok) {
        return result;
      }

      navigate(result.route);
      return result;
    },

    async open_module(parameters = {}) {
      const route = routeForAiModule(parameters.moduleId);

      if (!route) {
        return { ok: false, error: "Modul není známý." };
      }

      return this.navigate_to({ route });
    },

    async show_confirmation(parameters = {}) {
      const confirmed = await confirm({
        title: cleanString(parameters.title) || "Potvrdit akci",
        message: cleanString(parameters.message) || "Chcete pokračovat?",
        confirmLabel: cleanString(parameters.confirmLabel) || "Potvrdit",
        cancelLabel: cleanString(parameters.cancelLabel) || "Zrušit"
      });

      return { ok: true, confirmed: Boolean(confirmed) };
    },

    async show_toast(parameters = {}) {
      const type = TOAST_TYPES.has(cleanString(parameters.type)) ? cleanString(parameters.type) : "info";
      const message = cleanString(parameters.message);

      if (!message) {
        return { ok: false, error: "Chybí text zprávy." };
      }

      toast({ type, message });
      return { ok: true, type, message };
    },

    async highlight_element(parameters = {}) {
      const selector = cleanString(parameters.selector);
      const message = cleanString(parameters.message);

      if (!selector || selector.length > 160 || typeof document === "undefined") {
        return { ok: false, error: "Selector není platný." };
      }

      let element = null;
      try {
        element = document.querySelector(selector);
      } catch {
        return { ok: false, error: "Selector není platný." };
      }

      if (!element) {
        return { ok: false, error: "Prvek nebyl nalezen." };
      }

      element.classList.add("ai-assistant-highlight");
      window.setTimeout(() => element.classList.remove("ai-assistant-highlight"), 2600);
      highlight({ selector, message });
      return { ok: true, selector, message };
    }
  };
}

