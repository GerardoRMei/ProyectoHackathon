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
import { listen, speak, cancelListening } from "../../components/Voiceservice";
import DashboardScreen from "./Dashboardscreen"; // ajusta la ruta según dónde lo guardes

import ChatHeader from "../../components/chat/Chatheader";
import ChatBubble, { Mensaje } from "../../components/chat/Chatbubble";
import VoiceInputBar from "../../components/chat/Voiceinputbar";
import CallEndedBanner from "../../components/chat/Callendedbar";
import WelcomeScreen from "./Homescreen";
import { COLORS } from "../../components/chat/theme";

// -----------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------
const API_BASE_URL = "http://localhost:8000";

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
  const [pantalla, setPantalla] = useState<"chat" | "dashboard">("chat");
  const [sesionId, setSesionId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [cerrada, setCerrada] = useState(false);
  const [debug, setDebug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Apenas la conversación se cierra, cortamos cualquier reconocimiento de
  // voz que siga activo -- sin esto, el micrófono podía quedar "vivo" de
  // fondo aunque la UI ya se hubiera reemplazado por CallEndedBanner.
  useEffect(() => {
    if (cerrada) {
      cancelListening();
      setEscuchando(false);
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
      speak(data.audio_base64).catch((e) => console.warn("Error en speak():", e));
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

  const iniciarConversacion = async () => {
    cancelListening();
    setCargando(true);
    setError(null);
    setCerrada(false);
    setEscuchando(false);
    setMensajes([]);
    setSesionId(null);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(USUARIO_DE_PRUEBA),
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
    if (!limpio || !sesionId || cargando || cerrada) return;

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
    if (cargando || cerrada || escuchando) return;
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

  if (!sesionId && !cargando) {
    return (
      <WelcomeScreen
        onComenzar={iniciarConversacion}
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
        onReiniciarPress={iniciarConversacion}
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