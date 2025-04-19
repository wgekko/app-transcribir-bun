import React, { useEffect, useRef, useState } from "react";
import logo from './assets/logo.png';
import microfono from './assets/microfono.png';
import record from './assets/record2.png';
import descargar from './assets/download.png';
/*import descargar2 from './assets/download2.png';*/
/*import mic from './assets/microfono2.png';*/
/*import transcribir from './assets/transcribir.png';*/
import transcribir2 from './assets/transcribir2.png';

//const SpeechRecognition =
//  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

const App = () => {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [listening, setListening] = useState<boolean>(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioURL, setAudioURL] = useState<string>("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  /*mejora en la inicacion de grabar audio para guardar el mismo*/ 
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedAudioURL, setRecordedAudioURL] = useState<string>("");

  // Función reutilizable para obtener dispositivos de entrada de audio
  const getDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");
      setMicrophones(audioInputs);
      if (audioInputs.length > 0) {
        setSelectedMic(audioInputs[0].deviceId);
      }
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("Debes permitir acceso al micrófono para usar la aplicación.");
    }
  };

  // Obtener dispositivos al inicio
  useEffect(() => {
    getDevices();
  }, []);

  // Detectar cambios en los dispositivos (cuando conectas o desconectas micrófonos)
  useEffect(() => {
    const handleDeviceChange = async () => {
      await getDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, []);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioURL(URL.createObjectURL(file));
    }
  };

  const transcribeAudioWithWhisper = async () => {
    if (!audioFile) return;
    const formData = new FormData();
    formData.append("file", audioFile);

    try {
      const response = await fetch("http://localhost:5000/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.text) {
        setText(data.text);
      } else {
        alert("Error al transcribir el audio");
      }
    } catch (err) {
      console.error("Error al transcribir:", err);
    }
  };

  
  const startListening = async () => {
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
  
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
      });
  
      // Speech Recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";
  
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };
  
      recognition.onerror = (event: any) => {
        console.error("Error de reconocimiento:", event.error);
        alert("Error en el reconocimiento de voz: " + event.error);
      };
  
      recognition.onend = () => {
        setListening(false);
      };
  
      recognition.start();
      recognitionRef.current = recognition;
  
      // MediaRecorder para guardar el audio
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
  
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
  
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedAudioURL(url);
        setRecordedChunks(chunks);
      };
  
      recorder.start();
      setMediaRecorder(recorder);
      setListening(true);
    } catch (err) {
      console.error("Error al iniciar el reconocimiento:", err);
      alert("No se pudo acceder al dispositivo seleccionado.");
    }
  };
  
  /*
  const startListening = async () => {
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz.");
      return;
    }

    try {
      await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
      });

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Error de reconocimiento:", event.error);
        alert("Error en el reconocimiento de voz: " + event.error);
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch (err) {
      console.error("Error al iniciar el reconocimiento:", err);
      alert("No se pudo acceder al dispositivo seleccionado.");
    }
  };
  */
  const stopListening = () => {
    recognitionRef.current?.stop();
    mediaRecorder?.stop();
    setListening(false);
  };
     
  /*
  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };
  */
  const downloadTextFile = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcripcion.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const downloadRecordedAudio = () => {
    if (recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grabacion.webm";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  

  return (
    <div className="container">
      {/* Encabezado con logo */}
      <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <img src={logo} alt="Logo" style={{ height: 70 }} />
        <h1>Transcripción de Audio a Texto</h1>
      </header>

      {/* Sección de carga de audio para Whisper */}
      <div className="section audio-upload-section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 10 }}>          
          <img src={record} alt="Grabando" style={{ height: 50 }} />
        </div>
        <h2>Transcribir con Whisper Audio pregrabado</h2>
        <div className="custom-file-upload">
          <label htmlFor="fileInput" className="styled-file-button">
            Seleccionar archivo .mp3 o .wav:
          </label>
          <input
            id="fileInput"
            type="file"
            accept="audio/mp3,audio/wav"
            onChange={handleAudioUpload}
            style={{ display: "none" }}
          />

          {audioFile && (
            <div style={{ marginTop: 16 }}>
              <p style={{ marginBottom: 8 }}>🎧 Reproducción del archivo:</p>
              <audio ref={audioRef} src={audioURL} controls style={{ display: "block", marginBottom: 12 }} />
              <button onClick={transcribeAudioWithWhisper}>Transcribir con Whisper</button>
            </div>
          )}
        </div>
      </div>

      {/* Sección de reconocimiento de voz en tiempo real */}
      <div className="section">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: 10 }}>
          <img src={microfono} alt="Micrófono" style={{ height: 50 }} />          
        </div>
        <h2>Transcripción en Tiempo Real</h2>

        <label>Selecciona el micrófono:</label>
        <select
          className="select-mic"
          value={selectedMic}
          onChange={(e) => setSelectedMic(e.target.value)}
        >
          {microphones.map((mic, index) => (
            <option key={mic.deviceId} value={mic.deviceId}>
              {mic.label || `Micrófono ${index + 1}`}
            </option>
          ))}
        </select>

        <div style={{ marginTop: 10 }}>
          <button onClick={getDevices}>Actualizar lista de micrófonos</button>
        </div>

        <div className="buttons" style={{ marginTop: 12 }}>
          {!listening ? (
            <button onClick={startListening}>Iniciar Grabación</button>
          ) : (
            <button onClick={stopListening}>Detener Grabación</button>
          )}
          <button onClick={downloadTextFile} disabled={!text}>
            Descargar Texto
          </button>
          {recordedAudioURL && (
          <div style={{ marginTop: 20 }}>
            <p>🎧 Reproducción del audio grabado:</p>
            <audio src={recordedAudioURL} controls style={{ display: "block", marginBottom: 12 }} />
            <button onClick={downloadRecordedAudio} style={{ padding: '8px 16px', borderRadius: 4 }}>
              Descargar Audio
            </button>
        </div>
      )}
        </div>        
      </div>

      {/* Texto de salida */}
      <div className="section">
        <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <img src={transcribir2} alt="Transcripción" style={{ height: 50 }} />
          <h2>Transcripción del audio</h2>
        </header>   
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aquí aparecerá tu transcripción..."
          rows={9}
        />
      </div>

      {text && (
        <div className="section">
          <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <img src={descargar} alt="Descargar" style={{ height: 50 }} />
            <h2>Descargar Transcripción</h2>
          </header> 
          <button onClick={downloadTextFile}>Descargar como .txt</button>
        </div>
      )}
    </div>
  );
};

export default App;
