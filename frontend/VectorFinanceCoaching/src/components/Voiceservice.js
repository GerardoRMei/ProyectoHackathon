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

// --- Mic gating -------------------------------------------------------
// audioActivo: referencia al <audio> del bot mientras está sonando, o null.
// recognitionActivo: referencia al SpeechRecognition mientras escucha, o null.
// Nunca deben estar los dos "vivos" al mismo tiempo -- esto es lo que evita
// que el eco/ruido del audio del bot se cuele como si fuera texto del
// cliente. Exportamos getters para que el componente pueda deshabilitar
// visualmente el botón de mic mientras el bot habla.
let audioActivo = null;
let recognitionActivo = null;

/** true mientras el audio del bot está sonando. Úsalo para deshabilitar
 * el botón de mic en la UI. */
export function estaHablando() {
  return audioActivo !== null;
}

/** true mientras el mic está escuchando activamente. */
export function estaEscuchando() {
  return recognitionActivo !== null;
}

/**
 * Convierte texto a voz y lo reproduce de inmediato.
 * @param {string} audioBase64
 * @returns {Promise<void>} se resuelve cuando termina de hablar
 */
export function speak(audioBase64) {
  // Si por algun motivo el mic seguia abierto (ej. el usuario alcanzo a
  // tocar el boton justo antes de que empezara a sonar el audio), lo
  // cortamos de una vez: nunca deben sonar el audio del bot y el mic al
  // mismo tiempo, en ninguna direccion.
  cancelListening();

  return new Promise((resolve, reject) => {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audioActivo = audio;

    const limpiar = () => {
      audioActivo = null;
    };

    audio.onended = () => {
      limpiar();
      resolve();
    };
    audio.onerror = (e) => {
      limpiar();
      reject(e);
    };
    audio.play().catch((e) => {
      limpiar();
      reject(e);
    });
  });
}

/**
 * Corta la reproduccion del audio del bot a medio camino, si hay uno
 * sonando (patron "interrumpir"). Resuelve la promesa de speak() de
 * inmediato en vez de dejarla colgada. Seguro de llamar aunque no haya
 * nada sonando.
 */
export function cancelSpeaking() {
  if (audioActivo) {
    try {
      audioActivo.pause();
    } catch (e) {
      // Ya se habia detenido solo, no pasa nada.
    }
    audioActivo = null;
  }
}

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
 * @throws {Error} con message "MIC_BLOQUEADO_AUDIO_EN_CURSO" si se llama
 *   mientras el bot esta hablando -- el componente deberia evitar llegar a
 *   este caso deshabilitando el boton de mic segun estaHablando(), pero
 *   esta es la segunda linea de defensa por si se llama de todos modos.
 */
export function listen(onInterim) {
  return new Promise((resolve, reject) => {
    if (audioActivo) {
      reject(new Error("MIC_BLOQUEADO_AUDIO_EN_CURSO"));
      return;
    }

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
      // (ej. la conversacion acaba de cerrarse, o empezo a sonar el audio
      // del bot) -- no es un error real del usuario, así que no lo
      // mostramos ni lo rechazamos.
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
 *   import { listen, speak, cancelListening, estaHablando } from "./voiceService";
 *
 *   // en el render: deshabilita el boton de mic con estaHablando()
 *   // <MicButton disabled={estaHablando()} onPress={handleTurn} />
 *
 *   async function handleTurn() {
 *     const userText = await listen();
 *     const respuesta = await llamarCopiloto(userText); // tu lógica / backend
 *     await speak(respuesta.audioBase64);
 *   }
 */