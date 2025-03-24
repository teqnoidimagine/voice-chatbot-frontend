import React, { useState, useEffect, useRef } from "react";

function App() {
  const [recording, setRecording] = useState(false);
  const [messages, setMessages] = useState([]);
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/conversation");
    wsRef.current = ws;

    ws.onopen = () => console.log("WebSocket connected");
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message);
      setMessages((prev) => [...prev, message]);
    };
    ws.onerror = (error) => console.error("WebSocket error:", error);
    ws.onclose = () => console.log("WebSocket closed");

    return () => ws.close();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        sendAudio(blob);
      };

      mediaRecorderRef.current.start();
      setRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const sendAudio = (audioBlob) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioBlob);
    } else {
      console.error("WebSocket is not connected");
    }
  };

  const playAudio = (base64Audio) => {
    try {
      console.log("Base64 audio length:", base64Audio.length);
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mpeg" }); // Change to "audio/wav" if Deepgram outputs WAV
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play().catch((error) => console.error("Audio playback error:", error));
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error("Error processing audio:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Voice Chatbot</h1>
      <button
        onClick={recording ? stopRecording : startRecording}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 transition-all rounded-lg text-lg font-semibold mb-6"
      >
        {recording ? "Stop Recording" : "Start Recording"}
      </button>
      <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg h-[70vh] overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.side === "right" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg ${
                  msg.side === "right" ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"
                }`}
              >
                <p>{msg.text}</p>
                <div className="flex items-center justify-between mt-1">
                  <small className="text-xs text-gray-400">
                    {msg.timestamp} - {msg.speaker}
                  </small>
                  {msg.audio && msg.side === "left" && (
                    <button
                      onClick={() => playAudio(msg.audio)}
                      className="text-gray-400 hover:text-white focus:outline-none"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 4v16a1 1 0 01-1.707.707L5.586 15z"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default App;