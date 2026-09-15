import AudioRecorder from "../components/AudioRecorder";
import LiveTranscript from "../components/LiveTranscript";
import NotesPanel from "../components/NotesPanel";
import QAWidget from "../components/QAWidget";
import useAudioWebSocket from "../hooks/useAudioWebSocket";

export default function LectureDashboard() {
  const {
    isRecording,
    connectionStatus,
    transcript,
    notes,
    error,
    sessionId,
    startRecording,
    stopRecording,
  } = useAudioWebSocket();

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <AudioRecorder
        isRecording={isRecording}
        connectionStatus={connectionStatus}
        error={error}
        onStart={startRecording}
        onStop={stopRecording}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-260px)] min-h-[400px]">
        <div className="lg:col-span-1">
          <LiveTranscript transcript={transcript} isRecording={isRecording} />
        </div>
        <div className="lg:col-span-1">
          <NotesPanel notes={notes} isRecording={isRecording} />
        </div>
        <div className="lg:col-span-1">
          <QAWidget sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
