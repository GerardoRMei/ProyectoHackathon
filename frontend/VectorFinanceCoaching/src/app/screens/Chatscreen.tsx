import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { listen, speak, cancelListening, cancelSpeaking } from "../../components/Voiceservice";
import DashboardScreen from "./Dashboardscreen"; // ajusta la ruta según dónde lo guardes

import ChatHeader from "../../components/chat/Chatheader";
import ChatBubble, { Mensaje } from "../../components/chat/Chatbubble";
import VoiceInputBar from "../../components/chat/Voiceinputbar";
import CallEndedBanner from "../../components/chat/Callendedbar";
import WelcomeScreen from "./Homescreen";
import PersonaSelectScreen from "./Personascreen"; // <-- nuevo
import { COLORS } from "../../components/chat/theme";

// -----------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------
const API_BASE_URL = "http://localhost:8000";

// Fallback generico -- solo se usa si el persona_id no esta en
// FEATURES_POR_PERSONA (no deberia pasar en la demo, pero evita que el
// chat se rompa si se agrega una persona nueva y se olvida el mapeo).
const USUARIO_DE_PRUEBA = {
  RevolvingUtilizationOfUnsecuredLines: 0.85,
  age: 34,
  "NumberOfTime30-59DaysPastDueNotWorse": 2,
  DebtRatio: 0.55,
  MonthlyIncome: 650,
  NumberOfOpenCreditLinesAndLoans: 6,
  NumberOfTimes90DaysLate: 0,
  NumberRealEstateLoansOrLines: 1,
  "NumberOfTime60-89DaysPastDueNotWorse": 0,
  NumberOfDependents: 2,
};

// Un set de features REAL por persona demo -- antes se mandaba siempre
// USUARIO_DE_PRUEBA sin importar la persona elegida en el selector, por
// eso el score_riesgo salia identico para todas (ej. Sofia y Rodrigo).
// Los valores de abajo estan pensados para calzar con los arquetipos que
// clasifica contexto_riesgo.py (clasificar_arquetipo):
const FEATURES_POR_PERSONA: Record<string, typeof USUARIO_DE_PRUEBA> = {
  sofia: {
    // tension_temprana: utilizacion muy alta, todavia SIN atrasos
    RevolvingUtilizationOfUnsecuredLines: 0.95,
    age: 28,
    "NumberOfTime30-59DaysPastDueNotWorse": 0,
    DebtRatio: 0.3,
    MonthlyIncome: 900,
    NumberOfOpenCreditLinesAndLoans: 4,
    NumberOfTimes90DaysLate: 0,
    NumberRealEstateLoansOrLines: 0,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfDependents: 1,
  },
  sebastian: {
    // atraso_aislado: un atraso leve, sin presion de utilizacion detras
    RevolvingUtilizationOfUnsecuredLines: 0.4,
    age: 40,
    "NumberOfTime30-59DaysPastDueNotWorse": 1,
    DebtRatio: 0.35,
    MonthlyIncome: 1200,
    NumberOfOpenCreditLinesAndLoans: 5,
    NumberOfTimes90DaysLate: 0,
    NumberRealEstateLoansOrLines: 1,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfDependents: 2,
  },
  ricardo: {
    // reincidente EXAGERADO: multiples atrasos severos + utilizacion al limite,
    // pensado para disparar la alerta del XGBoost con margen amplio
    RevolvingUtilizationOfUnsecuredLines: 1.1,
    age: 33,
    "NumberOfTime30-59DaysPastDueNotWorse": 3,
    DebtRatio: 0.85,
    MonthlyIncome: 450,
    NumberOfOpenCreditLinesAndLoans: 8,
    NumberOfTimes90DaysLate: 4,
    NumberRealEstateLoansOrLines: 2,
    "NumberOfTime60-89DaysPastDueNotWorse": 2,
    NumberOfDependents: 3,
  },
  jorge: {
    // presion_sostenida: uso alto Y ya hay atraso
    RevolvingUtilizationOfUnsecuredLines: 0.9,
    age: 30,
    "NumberOfTime30-59DaysPastDueNotWorse": 1,
    DebtRatio: 0.6,
    MonthlyIncome: 500,
    NumberOfOpenCreditLinesAndLoans: 3,
    NumberOfTimes90DaysLate: 0,
    NumberRealEstateLoansOrLines: 0,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfDependents: 3,
  },
  rodrigo: {
    // reincidente: atrasos graves/repetidos
    RevolvingUtilizationOfUnsecuredLines: 0.7,
    age: 45,
    "NumberOfTime30-59DaysPastDueNotWorse": 2,
    DebtRatio: 0.5,
    MonthlyIncome: 1000,
    NumberOfOpenCreditLinesAndLoans: 7,
    NumberOfTimes90DaysLate: 1,
    NumberRealEstateLoansOrLines: 1,
    "NumberOfTime60-89DaysPastDueNotWorse": 0,
    NumberOfDependents: 2,
  },
};

// -----------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------
type TurnoResponse = {
  texto: string;
  tool_usada: string | null;
  tool_input: Record<string, unknown> | null;
  conversacion_cerrada: boolean;
  audio_base64: string;
};

type IniciarResponse = TurnoResponse & {
  sesion_id: string;
  score_riesgo: number;
  en_riesgo: boolean;
};

export default function ChatScreen() {
  const [pantalla, setPantalla] = useState<"chat" | "dashboard" | "persona">("chat");
  const [personaId, setPersonaId] = useState<string | null>(null); // <-- nuevo
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  // true mientras el audio (mp3) del bot esta sonando. Se usa SOLO para
  // bloquear el boton de mic -- el mic gating vive aca y tambien, como
  // segunda linea de defensa, dentro de voiceService.listen(). No bloquea
  // el input de texto ni el boton de enviar, porque escribir no produce
  // el eco/ruido que causaba el problema.
  const [hablando, setHablando] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Apenas la conversación se cierra, cortamos cualquier reconocimiento de
  // voz o audio que siga activo -- sin esto, el micrófono o el audio podían
  // quedar "vivos" de fondo aunque la UI ya se hubiera reemplazado por
  // CallEndedBanner.
  useEffect(() => {
    if (cerrada) {
      cancelListening();
      cancelSpeaking();
      setEscuchando(false);
      setHablando(false);
    }
  }, [cerrada]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [mensajes]);

  const agregarMensaje = (autor: Mensaje["autor"], texto: string) => {
    setMensajes((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, autor, texto },
    ]);
  };

  const procesarTurno = (data: TurnoResponse) => {

    if (data.texto) {
      agregarMensaje("bot", data.texto);
      
    }if (data.audio_base64){
      // Antes: se llamaba speak() "al aire" sin marcar ningun estado, asi
      // que cargando ya volvia a false (por el finally del fetch) mucho
      // antes de que el audio terminara de sonar, dejando el mic
      // habilitado mientras el bot todavia hablaba. Ahora marcamos
      // hablando=true hasta que speak() resuelva o falle.
      setHablando(true);
      speak(data.audio_base64)
        .catch((e) => console.warn("Error en speak():", e))
        .finally(() => setHablando(false));
    }

    if (data.tool_usada === "escalar_a_humano") {
      agregarMensaje("sistema", `⚠️ Escalado a humano: ${data.tool_input?.motivo ?? ""}`);
    }
    if (data.tool_usada === "proponer_reestructuracion") {
      agregarMensaje("sistema", `✅ Propuesta registrada: ${data.tool_input?.resumen ?? ""}`);
    }
    if (data.tool_usada === "registrar_resultado") {
      agregarMensaje(
        "sistema",
        `🔒 Conversación cerrada — ${data.tool_input?.estado_final ?? ""}: ${data.tool_input?.resumen ?? ""}`
      );
    }
    setCerrada(data.conversacion_cerrada);
  };

  // Acepta un id de persona opcional -- lo usamos cuando viene directo del
  // selector, para no depender de que el estado personaId ya se haya
  // actualizado (setState es async). Si no se pasa, usa el que ya está en
  // estado (ej. cuando el usuario le da "Reiniciar" a media conversación).
  const iniciarConversacion = async (idPersona?: string) => {
    const personaResuelta = idPersona ?? personaId;
    if (idPersona) setPersonaId(idPersona);

    // Features reales de la persona elegida -- antes esto siempre era
    // USUARIO_DE_PRUEBA sin importar quien se seleccionaba, por eso dos
    // personas distintas (ej. Sofia y Rodrigo) sacaban el mismo score.
    const featuresPersona =
      (personaResuelta && FEATURES_POR_PERSONA[personaResuelta]) ?? USUARIO_DE_PRUEBA;

    cancelListening();
    cancelSpeaking();
    setCargando(true);
    setError(null);
    setCerrada(false);
    setEscuchando(false);
    setHablando(false);
    setMensajes([]);
    setSesionId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...featuresPersona, persona_id: personaResuelta }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al iniciar chat`);
      const data: IniciarResponse = await res.json();
      setSesionId(data.sesion_id);
      setDebug(`score: ${data.score_riesgo.toFixed(2)} · en_riesgo: ${data.en_riesgo}`);
      procesarTurno(data);
    } catch (e: any) {
      setError(e.message ?? "No se pudo conectar con la API");
    } finally {
      setCargando(false);
    }
  };

  const enviarTexto = async (texto: string) => {
    const limpio = texto.trim();
    if (!limpio || !sesionId || cargando || cerrada || hablando) return;

    agregarMensaje("usuario", limpio);
    setInput("");
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/mensaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesion_id: sesionId, mensaje: limpio }),
      });
      if (!res.ok) throw new Error(`Error ${res.status} al enviar mensaje`);
      const data: TurnoResponse = await res.json();
      procesarTurno(data);
    } catch (e: any) {
      setError(e.message ?? "No se pudo conectar con la API");
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = () => enviarTexto(input);

  const handleVoiceInput = async () => {
    // Agregamos "hablando" a la guarda: aunque el boton ya este
    // deshabilitado visualmente en VoiceInputBar mientras hablando=true,
    // esta es la segunda linea de defensa a nivel de logica (por si el
    // evento onPress se dispara de todos modos, ej. por un tap muy rapido
    // justo antes del re-render).
    if (cargando || cerrada || escuchando || hablando) return;
    setError(null);
    setEscuchando(true);
    setInput("");
    try {
      const transcript = await listen((textoParcial) => setInput(textoParcial));
      await enviarTexto(transcript);
    } catch (e: any) {
      setError(e.message ?? "No se pudo escuchar el micrófono");
    } finally {
      setEscuchando(false);
    }
  };

  if (pantalla === "dashboard") {
    return <DashboardScreen onVolver={() => setPantalla("chat")} />;
  }

  if (pantalla === "persona") {
    return (
      <PersonaSelectScreen
        onSeleccionar={(id) => {
          setPantalla("chat");
          iniciarConversacion(id);
        }}
      />
    );
  }

  if (!sesionId && !cargando) {
    return (
      <WelcomeScreen
        onComenzar={() => setPantalla("persona")}
        onVerDashboard={() => setPantalla("dashboard")}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ChatHeader
        debug={debug}
        onDashboardPress={() => setPantalla("dashboard")}
        onReiniciarPress={() => iniciarConversacion()}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <ScrollView ref={scrollRef} style={styles.chatArea} contentContainerStyle={{ padding: 12 }}>
        {mensajes.map((m) => (
          <ChatBubble key={m.id} mensaje={m} />
        ))}
        {cargando && <ActivityIndicator style={{ marginTop: 8 }} />}
      </ScrollView>

      {cerrada ? (
        <CallEndedBanner />
      ) : (
        <VoiceInputBar
          value={input}
          onChangeText={setInput}
          onSend={enviarMensaje}
          onVoicePress={handleVoiceInput}
          escuchando={escuchando}
          cargando={cargando}
          deshabilitadoPorAudio={hablando}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  errorText: { color: COLORS.error, padding: 8, textAlign: "center" },
  chatArea: { flex: 1 },
});