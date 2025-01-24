import {TranscribeStreamingClient} from "@aws-sdk/client-transcribe-streaming";
import {ICredentials} from "@aws-amplify/core";

export interface Transcript {
	channel: string;
	partial?: boolean;
	text?: string;
}

export interface LiveTranscriptionProps {
	currentCredentials: ICredentials;
	mediaRecorder: AudioWorkletNode | undefined;
	setMediaRecorder: (m: AudioWorkletNode | undefined) => void;
	setTranscriptionClient: (a: TranscribeStreamingClient | null) => void; // Change from undefined to null
	transcriptionClient: TranscribeStreamingClient | null; // Ensure this matches the state initialization
	transcribeStatus: boolean;
	setTranscript: (t: Transcript) => void;
	setApiResponse: (response: string) => void;
	audioSource: string;
	wordLimit: number;
	setTranscribeStatus: (status: boolean) => void;
}

export type RecordingProperties = {
	numberOfChannels: number;
	sampleRate: number;
	maxFrameCount: number;
};

export type MessageDataType = {
	message: string;
	buffer: Array<Float32Array>;
	recordingLength: number;
};
