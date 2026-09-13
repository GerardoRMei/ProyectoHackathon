import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";
import { COLORS, FONT, RADIUS, SPACING } from "../../components/chat/theme";

type Persona = { id: string; nombre: string };

const PERSONAS: Persona[] = [
  { id: "sofia", nombre: "Sofía Carpio" },
  { id: "sebastian", nombre: "Sebastián Hernández" },
  { id: "ricardo", nombre: "Ricardo Arias" },
  { id: "jorge", nombre: "Jorge Benavides" },
  { id: "rodrigo", nombre: "Rodrigo Vanegas" },
];

type Props = {
  onSeleccionar: (personaId: string) => void;
};

// Selector de persona demo -- reemplaza al login. El tap aquí es el gesto
// de usuario, igual que "Comenzar" en WelcomeScreen, así que también sirve
// para desbloquear speechSynthesis si este es el primer tap de la sesión.
export default function PersonaSelectScreen({ onSeleccionar }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>bancoagrícola</Text>
      <View style={styles.card}>
        <Text style={styles.titulo}>¿Con quién probamos hoy?</Text>
        <Text style={styles.subtitulo}>Selecciona un cliente demo</Text>

        <ScrollView style={styles.lista} contentContainerStyle={{ gap: SPACING.sm }}>
          {PERSONAS.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.botonPersona}
              onPress={() => onSeleccionar(p.id)}
            >
              <Text style={styles.botonPersonaTexto}>{p.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.header,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  wordmark: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  titulo: { fontSize: FONT.title, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center" },
  subtitulo: {
    fontSize: FONT.subtitle,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  lista: { width: "100%", maxHeight: 280 },
  botonPersona: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    width: "100%",
    alignItems: "center",
  },
  botonPersonaTexto: { color: "#fff", fontWeight: "700", fontSize: FONT.body },
});