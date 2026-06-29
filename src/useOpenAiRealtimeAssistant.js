import { DEFAULT_AI_ASSISTANT_ID, assistantById } from "./data/aiAssistants.js";
import { routeForAiModule } from "./elevenLabsClientTools.js";

const OPENAI_REALTIME_WEBRTC_ENDPOINT = "https://api.openai.com/v1/realtime/calls";
const VOICE_MICROPHONE_ERROR_CODE = "voice_microphone_denied";

function cleanString(value) {
  return String(value ?? "").trim();
}

function parseJson(value, fallback = {}) {
  if (value && typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(cleanString(value));
  } catch {
    return fallback;
  }
}

function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((track) => track.stop());
}

function microphoneError(error) {
  const wrapped = new Error(
    error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError"
      ? "Mikrofon není povolený. Povol mikrofon pro tento web a zkus to znovu."
      : "Mikrofon se nepodařilo spustit."
  );
  wrapped.code = VOICE_MICROPHONE_ERROR_CODE;
  return wrapped;
}

function createHiddenAudioElement() {
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.playsInline = true;
  audio.controls = false;
  audio.style.position = "fixed";
  audio.style.width = "1px";
  audio.style.height = "1px";
  audio.style.opacity = "0";
  audio.style.pointerEvents = "none";
  audio.style.left = "-9999px";
  audio.setAttribute("aria-hidden", "true");
  document.body.appendChild(audio);
  return audio;
}

function safeToolOutput(value) {
  return JSON.stringify(value ?? {});
}

function normalizeKey(value) {
  return cleanString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pragueIsoDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addIsoDays(isoDate, amount) {
  const match = cleanString(isoDate).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "";
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + amount, 12));
  return date.toISOString().slice(0, 10);
}

function czechDateFromText(text, baseIso = pragueIsoDate()) {
  const raw = cleanString(text);
  const normalized = normalizeKey(raw);

  if (!raw) {
    return "";
  }

  if (/\bpozitri\b/.test(normalized)) {
    return addIsoDays(baseIso, 2);
  }

  if (/\bzitra\b/.test(normalized)) {
    return addIsoDays(baseIso, 1);
  }

  if (/\bdnes\b/.test(normalized)) {
    return baseIso;
  }

  const isoMatch = raw.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const czechMatch = raw.match(/\b(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{2,4}))?/);
  if (czechMatch) {
    const baseYear = Number(baseIso.slice(0, 4));
    let year = czechMatch[3] ? Number(czechMatch[3]) : baseYear;
    if (year < 100) {
      year += 2000;
    }
    let date = new Date(Date.UTC(year, Number(czechMatch[2]) - 1, Number(czechMatch[1]), 12));
    if (!czechMatch[3] && date.toISOString().slice(0, 10) < baseIso) {
      date = new Date(Date.UTC(year + 1, Number(czechMatch[2]) - 1, Number(czechMatch[1]), 12));
    }
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }

  return "";
}

function dayPartFromText(text) {
  const normalized = normalizeKey(text);

  if (/\b(pulden|pul dne|puldne|dopoledne|odpoledne|half|half day)\b/.test(normalized)) {
    return "half_day";
  }

  if (/\b(cely den|celou smenu|cela smena|celodenni|full day|full_day)\b/.test(normalized)) {
    return "full_day";
  }

  return "";
}

function confirmationFromText(text) {
  const normalized = normalizeKey(text);

  if (/\b(ne|nezapisuj|neukladej|zrus|storno|stop)\b/.test(normalized)) {
    return "rejected";
  }

  if (/\b(ano|jo|jasne|souhlas|souhlasim|potvrzuji|zapis|zapis to|uloz|vytvor)\b/.test(normalized)) {
    return "confirmed";
  }

  return "";
}

function isAbsenceRelatedText(text, draft = {}) {
  const normalized = normalizeKey(text);
  return Boolean(
    /\bdovolen/.test(normalized) ||
    draft.active ||
    (draft.awaiting && (dayPartFromText(text) || confirmationFromText(text) || czechDateFromText(text)))
  );
}

function createAbsenceDraft() {
  return {
    active: false,
    dateFrom: "",
    dateTo: "",
    dayPart: "",
    awaiting: "",
    note: ""
  };
}

export function useOpenAiRealtimeAssistant({
  requestJson = null,
  navigate = () => {},
  canUseRoute = () => true
} = {}) {
  let activeVoiceSession = null;

  async function defaultRequestJson(path, options = {}) {
    const response = await fetch(path, {
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(payload.error || `Požadavek selhal (${response.status}).`);
      error.payload = payload;
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function requester() {
    return requestJson || defaultRequestJson;
  }

  function closeVoiceSession(reason = "voice-stopped") {
    const session = activeVoiceSession;
    activeVoiceSession = null;

    if (!session) {
      return;
    }

    session.closed = true;
    stopMediaStream(session.mediaStream);

    try {
      session.dataChannel?.close();
    } catch {
      // The data channel may already be closed.
    }

    try {
      session.peerConnection?.close();
    } catch {
      // The peer connection may already be closed.
    }

    if (session.audioElement) {
      session.audioElement.srcObject = null;
      session.audioElement.remove();
    }

    session.callbacks?.onDisconnected?.({ reason });
  }

  async function callAbsenceTool(args = {}, context = {}) {
    const confirmed = args.confirmed === true;
    const rejected = args.rejected === true;
    const dayPart = cleanString(args.dayPart);
    const dateFrom = cleanString(args.dateFrom);
    const dateTo = cleanString(args.dateTo || args.dateFrom);
    const summary = cleanString(args.spokenSummary);
    const note = cleanString(args.note);
    const text = summary || `Zapiš dovolenou ${dateFrom || ""} ${dayPart || ""}`.trim();
    const parameters = {
      type: "vacation",
      dateFrom,
      dateTo,
      dayPart,
      note
    };
    const contextPayload = {
      conversationId: context.conversationId || "",
      absenceType: "vacation",
      absenceDateFrom: dateFrom,
      absenceDateTo: dateTo,
      absenceDayPart: dayPart
    };

    if (confirmed) {
      parameters.confirmed = true;
      contextPayload.absenceConfirmed = true;
    }

    if (rejected) {
      parameters.confirmed = false;
      contextPayload.absenceRejected = true;
    }

    const payload = {
      transcript: text,
      text,
      intent: "absence_vacation_request",
      parameters,
      context: contextPayload,
      metadata: {
        source: "openai_realtime",
        callId: context.callId || ""
      }
    };
    const result = await requester()("/api/voice/sarlota", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    return {
      ok: result.ok === true,
      status: result.status || "unknown",
      answerText: result.reply || result.text || "",
      intent: result.intent || "absence_vacation_request",
      verified: result.verified === true,
      requiresConfirmation: result.status === "needs_confirmation",
      absenceRequest: result.absenceRequest || null,
      notificationsSent: result.notificationsSent === true
    };
  }

  function speakText(session, text) {
    const answerText = cleanString(text);
    if (!answerText || session.dataChannel?.readyState !== "open") {
      return false;
    }

    session.assistantTranscript = "";
    session.callbacks?.onAgentResponse?.({
      text: answerText,
      conversationId: session.conversationId
    });
    session.dataChannel.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: `Řekni česky, stručně a přirozeně tuto odpověď. Neměň význam: ${answerText}`
      }
    }));
    return true;
  }

  function requestModelResponse(session) {
    if (session.dataChannel?.readyState !== "open") {
      return false;
    }

    session.dataChannel.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["text", "audio"]
      }
    }));
    return true;
  }

  function updateAbsenceDraftFromResult(session, args, result) {
    const draft = session.absenceDraft || createAbsenceDraft();
    draft.active = true;
    draft.dateFrom = cleanString(args.dateFrom || draft.dateFrom);
    draft.dateTo = cleanString(args.dateTo || draft.dateTo || draft.dateFrom);
    draft.dayPart = cleanString(args.dayPart || draft.dayPart);

    if (result.status === "needs_input") {
      draft.awaiting = draft.dateFrom ? "day_part" : "date";
    } else if (result.status === "needs_confirmation") {
      draft.awaiting = "confirmation";
    } else if (["created", "cancelled", "failed", "forbidden"].includes(result.status)) {
      session.absenceDraft = createAbsenceDraft();
      return;
    } else {
      draft.awaiting = "";
    }

    session.absenceDraft = draft;
  }

  async function handleDeterministicAbsence(session, transcript) {
    const text = cleanString(transcript);
    const draft = session.absenceDraft || createAbsenceDraft();

    if (!isAbsenceRelatedText(text, draft)) {
      return false;
    }

    const nextDateFrom = czechDateFromText(text) || draft.dateFrom;
    const nextDateTo = nextDateFrom || draft.dateTo;
    const nextDayPart = dayPartFromText(text) || draft.dayPart;
    const confirmation = draft.awaiting === "confirmation" ? confirmationFromText(text) : "";
    const confirmed = confirmation === "confirmed";
    const rejected = confirmation === "rejected";

    const args = {
      dateFrom: nextDateFrom,
      dateTo: nextDateTo,
      dayPart: nextDayPart,
      confirmed,
      rejected,
      note: "",
      spokenSummary: confirmed
        ? "ano, zapiš to"
        : rejected
          ? "ne, nezapisuj"
          : text
    };

    session.absenceDraft = {
      active: true,
      dateFrom: nextDateFrom,
      dateTo: nextDateTo,
      dayPart: nextDayPart,
      awaiting: draft.awaiting,
      note: ""
    };

    const result = await callAbsenceTool(args, {
      conversationId: session.conversationId,
      callId: "deterministic_absence"
    });

    updateAbsenceDraftFromResult(session, args, result);
    session.callbacks?.onToolResult?.({
      name: "create_absence_request",
      status: result.status,
      text: result.answerText || ""
    });
    speakText(session, result.answerText || "Rozumím.");
    return true;
  }

  async function callOpenModuleTool(args = {}) {
    const route = routeForAiModule(args.moduleId);
    if (!route) {
      return {
        ok: false,
        status: "not_found",
        answerText: "Tenhle modul neumím jednoznačně otevřít."
      };
    }

    if (!canUseRoute(route)) {
      return {
        ok: false,
        status: "forbidden",
        answerText: "K tomu modulu nemáš oprávnění."
      };
    }

    navigate(route);
    return {
      ok: true,
      status: "opened",
      route,
      answerText: "Otevírám modul."
    };
  }

  async function handleToolCall(session, event) {
    const callId = cleanString(event.call_id || event.callId || event.item?.call_id || event.item?.callId);
    const name = cleanString(event.name || event.item?.name);
    const rawArguments = event.arguments || event.item?.arguments || "{}";
    const args = parseJson(rawArguments, {});
    const toolKey = callId || `${name}:${rawArguments}`;

    if (!name || session.handledToolCalls.has(toolKey)) {
      return;
    }

    session.handledToolCalls.add(toolKey);

    let output = {
      ok: false,
      status: "unsupported",
      answerText: "Tohle zatím neumím bezpečně provést."
    };

    try {
      if (name === "create_absence_request") {
        output = await callAbsenceTool(args, {
          conversationId: session.conversationId,
          callId
        });
      } else if (name === "open_kso_module") {
        output = await callOpenModuleTool(args);
      }
    } catch (error) {
      output = {
        ok: false,
        status: "failed",
        answerText: error?.payload?.error || error?.message || "Nástroj se nepodařilo provést."
      };
    }

    session.callbacks?.onToolResult?.({
      name,
      status: output.status,
      text: output.answerText || ""
    });

    if (session.dataChannel?.readyState !== "open" || !callId) {
      return;
    }

    session.dataChannel.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: safeToolOutput(output)
      }
    }));
    session.dataChannel.send(JSON.stringify({
      type: "response.create",
      response: {
        modalities: ["text", "audio"],
        instructions: output.answerText
          ? `Řekni uživateli krátce tento výsledek: ${output.answerText}`
          : "Řekni uživateli krátce výsledek nástroje."
      }
    }));
  }

  function handleRealtimeEvent(session, event) {
    const type = cleanString(event?.type);

    if (!type) {
      return;
    }

    if (type === "session.created" || type === "session.updated") {
      session.callbacks?.onReady?.({
        assistantId: session.assistant.id,
        assistantName: session.assistant.name,
        provider: "openai_realtime",
        conversationId: session.conversationId
      });
      return;
    }

    if (type === "conversation.created") {
      session.conversationId = cleanString(event.conversation?.id || session.conversationId);
      return;
    }

    if (type === "input_audio_buffer.speech_started") {
      session.callbacks?.onInputLevel?.({
        speaking: true,
        inputLevel: 1,
        conversationId: session.conversationId
      });
      return;
    }

    if (type === "input_audio_buffer.speech_stopped") {
      session.callbacks?.onInputLevel?.({
        speaking: false,
        inputLevel: 0,
        conversationId: session.conversationId
      });
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      session.userTranscript = cleanString(event.transcript || session.userTranscript);
      if (session.userTranscript) {
        session.assistantTranscript = "";
        session.callbacks?.onUserTranscript?.({
          text: session.userTranscript,
          conversationId: session.conversationId
        });
        void handleDeterministicAbsence(session, session.userTranscript)
          .then((handled) => {
            if (!handled) {
              requestModelResponse(session);
            }
          })
          .catch((error) => {
            const message = error?.payload?.error || error?.message || "Zápis se nepodařil.";
            session.callbacks?.onError?.({ message, status: message });
            speakText(session, message);
          });
      }
      return;
    }

    if (type === "response.audio_transcript.delta" || type === "response.text.delta") {
      const delta = cleanString(event.delta);
      if (delta) {
        session.assistantTranscript += delta;
        session.callbacks?.onAgentResponse?.({
          text: session.assistantTranscript,
          conversationId: session.conversationId
        });
      }
      return;
    }

    if (type === "response.audio_transcript.done" || type === "response.text.done") {
      const text = cleanString(event.transcript || event.text || session.assistantTranscript);
      if (text) {
        session.assistantTranscript = text;
        session.callbacks?.onAgentResponse?.({
          text,
          conversationId: session.conversationId
        });
      }
      return;
    }

    if (type === "response.function_call_arguments.done") {
      void handleToolCall(session, event);
      return;
    }

    if (type === "response.output_item.done" && event.item?.type === "function_call") {
      void handleToolCall(session, event);
      return;
    }

    if (type === "response.done") {
      session.callbacks?.onReady?.({
        assistantId: session.assistant.id,
        assistantName: session.assistant.name,
        provider: "openai_realtime",
        conversationId: session.conversationId
      });
      return;
    }

    if (type === "error") {
      const message = cleanString(event.error?.message || event.message || "OpenAI Realtime vrátil chybu.");
      session.callbacks?.onError?.({ message, status: message });
    }
  }

  async function startVoiceConversation(assistantId = DEFAULT_AI_ASSISTANT_ID, callbacks = {}) {
    const assistant = assistantById(assistantId);

    if (typeof RTCPeerConnection === "undefined") {
      throw new Error("OpenAI hlasový režim není v tomto prohlížeči dostupný.");
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("Mikrofon není v tomto prohlížeči dostupný.");
    }

    closeVoiceSession("new-openai-realtime-session");

    const sessionConfig = await requester()("/api/sarlota/realtime-session", {
      method: "POST",
      body: JSON.stringify({
        currentModule: typeof window !== "undefined" ? window.location.pathname : ""
      })
    });
    const clientSecret = cleanString(sessionConfig.clientSecret);
    if (!clientSecret) {
      throw new Error("OpenAI Realtime nevrátil krátkodobý token.");
    }

    let mediaStream = null;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (error) {
      throw microphoneError(error);
    }

    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel("oai-events");
    const audioElement = createHiddenAudioElement();
    const session = {
      assistant,
      callbacks,
      peerConnection,
      dataChannel,
      mediaStream,
      audioElement,
      conversationId: "",
      userTranscript: "",
      assistantTranscript: "",
      absenceDraft: createAbsenceDraft(),
      handledToolCalls: new Set(),
      closed: false
    };
    activeVoiceSession = session;

    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });

    peerConnection.ontrack = (event) => {
      audioElement.srcObject = event.streams[0];
      audioElement.play?.().catch(() => {
        callbacks.onAudioWarning?.("Zvuk odpovědi se nepodařilo automaticky přehrát. Zkontroluj hlasitost a tichý režim.");
      });
      callbacks.onAudio?.({
        audioPlaybackStarted: true,
        audioPlaybackFailed: false
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (["failed", "disconnected", "closed"].includes(peerConnection.connectionState) && !session.closed) {
        callbacks.onDisconnected?.({
          reason: peerConnection.connectionState
        });
      }
    };

    dataChannel.onmessage = (messageEvent) => {
      handleRealtimeEvent(session, parseJson(messageEvent.data, {}));
    };
    dataChannel.onerror = () => {
      callbacks.onError?.({
        message: "OpenAI Realtime datový kanál vrátil chybu.",
        status: "Chyba hlasu"
      });
    };

    const dataChannelReady = new Promise((resolve, reject) => {
      let opened = false;
      const timer = window.setTimeout(() => {
        reject(new Error("OpenAI hlasové spojení se nepodařilo otevřít včas."));
      }, 12000);
      dataChannel.onopen = () => {
        opened = true;
        window.clearTimeout(timer);
        callbacks.onConnected?.({
          assistantId: assistant.id,
          assistantName: assistant.name,
          provider: "openai_realtime",
          model: sessionConfig.model,
          voice: sessionConfig.voice,
          conversationId: session.conversationId
        });
        callbacks.onListening?.({
          assistantId: assistant.id,
          assistantName: assistant.name,
          provider: "openai_realtime",
          conversationId: session.conversationId
        });
        resolve();
      };
      dataChannel.onclose = () => {
        window.clearTimeout(timer);
        if (!opened) {
          reject(new Error("OpenAI hlasové spojení se zavřelo před dokončením."));
        }
      };
    });

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const sdpResponse = await fetch(OPENAI_REALTIME_WEBRTC_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp"
        },
        body: offer.sdp
      });

      if (!sdpResponse.ok) {
        throw new Error("OpenAI Realtime WebRTC spojení se nepodařilo připravit.");
      }

      const answer = {
        type: "answer",
        sdp: await sdpResponse.text()
      };
      await peerConnection.setRemoteDescription(answer);
      await dataChannelReady;
    } catch (error) {
      closeVoiceSession("openai-realtime-start-failed");
      throw error;
    }

    return {
      assistantId: assistant.id,
      assistantName: assistant.name,
      provider: "openai_realtime",
      model: sessionConfig.model,
      voice: sessionConfig.voice,
      configured: true
    };
  }

  return {
    closeVoiceSession,
    startVoiceConversation,
    stopVoiceAudio: closeVoiceSession
  };
}
