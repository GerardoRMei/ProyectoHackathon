// voiceService.js
// Servicio de voz "genérico" usando las Web Speech APIs nativas del navegador.
// Cero dependencias externas, cero API keys, funciona en Chrome/Edge (Expo web).
// Pensado para probar el flujo completo del Copiloto hoy mismo.
//
// Cuando llegue el momento de pasar a voces "premium" (ElevenLabs, etc.),
// solo se reemplaza el contenido de speak() y listen() por llamadas a la API
// externa, manteniendo la misma firma de funciones — el resto de la app
// (los componentes que llaman a voiceService.speak/listen) no cambia nada.

const LANG = "es-MX"; // ajusta a "es-SV" o "es-ES" si tu navegador lo soporta mejor

/**
 * Convierte texto a voz y lo reproduce de inmediato.
 * @param {string} text
 * @returns {Promise<void>} se resuelve cuando termina de hablar
 */
export function speak(audioBase64) {
  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.onended = () => resolve();
    audio.onerror = (e) => reject(e);
    audio.play().catch(reject);
  });
}

// Referencia al reconocimiento de voz activo, si hay uno. Se usa para poder
// cancelarlo desde afuera (ej. cuando la conversación se cierra) aunque el
// usuario siga hablando en ese momento.
let recognitionActivo = null;

/**
 * Aborta el reconocimiento de voz en curso, si lo hay. Seguro de llamar
 * aunque no haya nada escuchando (no hace nada en ese caso).
 * Úsalo apenas la conversación se cierre para que el micrófono no siga
 * "vivo" de fondo aunque los botones ya estén deshabilitados.
 */
export function cancelListening() {
  if (recognitionActivo) {
    try {
      recognitionActivo.abort();
    } catch (e) {
      // Ya se habia detenido solo, no pasa nada.
    }
  }
}

/**
 * Escucha el micrófono y devuelve el texto final reconocido.
 * @param {(textoParcial: string) => void} [onInterim] callback opcional que
 *   se llama repetidamente con el texto reconocido hasta el momento,
 *   mientras el usuario sigue hablando (útil para rellenar un input en vivo).
 * @returns {Promise<string>} el texto final, una vez que el usuario deja de hablar
 *   (si se cancela con cancelListening(), resuelve con lo que se alcanzó a
 *   transcribir hasta ese momento, normalmente vacío -- no rechaza).
 */
export function listen(onInterim) {
  return new Promise((resolve, reject) => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      reject(new Error("SpeechRecognition no soportado en este navegador"));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = LANG;
    recognition.interimResults = true; // necesario para ir mostrando texto en vivo
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognitionActivo = recognition;
    let finalTranscript = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const texto = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += texto;
        } else {
          interimTranscript += texto;
        }
      }
      if (onInterim) onInterim((finalTranscript + interimTranscript).trim());
    };

    recognition.onerror = (event) => {
      // "aborted" pasa cuando NOSOTROS llamamos cancelListening() a proposito
      // (ej. la conversacion acaba de cerrarse) -- no es un error real del
      // usuario, así que no lo mostramos ni lo rechazamos.
      if (event.error === "aborted") {
        return;
      }
      console.error("Código de error SpeechRecognition:", event.error);
      reject(new Error(`Error de reconocimiento: ${event.error}`));
    };

    recognition.onspeechend = () => {
      recognition.stop();
    };

    // onend se dispara después de que el reconocimiento termina por completo
    // (tras el stop de arriba, o tras un abort()), momento en que ya tenemos
    // el texto final (o lo que se haya alcanzado a transcribir).
    recognition.onend = () => {
      recognitionActivo = null;
      resolve(finalTranscript.trim());
    };

    recognition.start();
  });
}

/**
 * Ciclo completo de una "llamada" de un turno:
 * escucha al usuario -> le pasas el texto a tu lógica del copiloto ->
 * reproduces la respuesta en voz.
 *
 * Ejemplo de uso en un componente:
 *
 *   import { listen, speak, cancelListening } from "./voiceService";
 *
 *   async function handleTurn() {
 *     const userText = await listen();
 *     const respuesta = await llamarCopiloto(userText); // tu lógica / backend
 *     await speak(respuesta);
 *   }
 */