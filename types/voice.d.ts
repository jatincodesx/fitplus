// Lightweight shims for browsers without built-in TS definitions
type SpeechRecognition = unknown;
type SpeechRecognitionEvent = unknown;

interface Window {
  webkitSpeechRecognition?: typeof SpeechRecognition;
  SpeechRecognition?: typeof SpeechRecognition;
}
