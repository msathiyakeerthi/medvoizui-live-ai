import {createContext, useContext, useState, ReactNode, useEffect} from "react";
import {TranscribeStreamingClient, StartStreamTranscriptionCommand, LanguageCode} from "@aws-sdk/client-transcribe-streaming";
import {ICredentials} from "@aws-amplify/core";
import pEvent from "p-event";
import {RecordingProperties, MessageDataType, Transcript} from "../types";
import {transcriptionApi} from "@/aws/api";
import {Auth} from "aws-amplify";
import {pcmEncode} from "@/audio";

const sampleRate = import.meta.env.VITE_TRANSCRIBE_SAMPLING_RATE || 16000;
const language = import.meta.env.VITE_TRANSCRIBE_LANGUAGE_CODE as LanguageCode;
const region = import.meta.env.VITE_REACT_APP_AWS_REGION || "us-east-1";

interface GlobalContextType {
	audioSource: string;
	setAudioSource: (source: string) => void;
	wordLimit: number;
	setWordLimit: (limit: number) => void;
	sendMode: string;
	setSendMode: (mode: string) => void;
	handleManualSend: () => void;
	handleTranscribe: () => void;
	transcribeStatus: boolean;
	apiResponses: string[];
	combinedTranscriptions: (string | undefined)[];
	audioStream: MediaStream | null;
	screenShareStream: MediaStream | null;
}

const GlobalContext = createContext<GlobalContextType | null>(null);

export const useGlobal = () => {
	const context = useContext(GlobalContext);
	if (!context) {
		throw new Error("useGlobal must be used within an GlobalProvider");
	}
	return context;
};

export const GlobalProvider = ({children}: {children: ReactNode}) => {
	const [currentCredentials, setCurrentCredentials] = useState<ICredentials>({
		accessKeyId: "",
		authenticated: false,
		expiration: undefined,
		identityId: "",
		secretAccessKey: "",
		sessionToken: "",
	});
	const [transcriptionClient, setTranscriptionClient] = useState<TranscribeStreamingClient | null>(null);
	const [transcribeStatus, setTranscribeStatus] = useState<boolean>(false); // Transcription status
	const [transcript, setTranscript] = useState<Transcript>();
	const [lines, setLines] = useState<Transcript[]>([]);
	const [currentLine, setCurrentLine] = useState<Transcript[]>([]);
	const [mediaRecorder, setMediaRecorder] = useState<AudioWorkletNode>();
	const [apiResponses, setApiResponses] = useState<string[]>([]);
	const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
	const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);

	const [audioSource, setAudioSource] = useState<string>("audio");
	const [wordLimit, setWordLimit] = useState<number>(20);
	const [sendMode, setSendMode] = useState<string>("auto");

	const [finalTranscriptions, setFinalTranscriptions] = useState<string[]>([]);
	const [isApiCallInProgress, setIsApiCallInProgress] = useState<boolean>(false);

	useEffect(() => {
		async function getAuth() {
			const currCreds = await Auth.currentUserCredentials();
			setCurrentCredentials(currCreds);
		}

		getAuth();
	}, []);

	const handleTranscribe = async () => {
		if (transcribeStatus) {
			console.log("Stopping transcription");
	
			// Ensure transcriptions is an array before joining
			const accumulatedTranscriptions = Array.isArray(finalTranscriptions)
				? finalTranscriptions.join(" ").trim()
				: String(finalTranscriptions).trim(); // Convert to string if not an array
	
			if (accumulatedTranscriptions.length > 0) {
				await saveToDatabase(finalTranscriptions); // Always pass an array
			} else {
				console.warn("No transcriptions to save.");
			}
		} else {
			console.log("Starting transcription...");
			setFinalTranscriptions([]); // Reset transcription when starting new session
		}
	
		setTranscribeStatus((prev) => !prev);
	};
	
	
// Combine `lines` and `currentLine` into a single array of strings
	const combinedTranscriptions = [...lines.map(line => line.text), ...currentLine.map(line => line.text)];

const startStreaming = async (
    handleTranscribeOutput: (data: string, isFinal: boolean, transcriptionClient: TranscribeStreamingClient, mediaRecorder: AudioWorkletNode) => void,
    currentCredentials: ICredentials,
    audioSource: string
) => {
    const audioContext = new window.AudioContext();
    let screenStream: MediaStream | null = null;
    let micStream: MediaStream | null = null;
    let combinedStream: MediaStream;

    try {
        // Capture screen audio and video
        if (audioSource === "ScreenCapture") {
            screenStream = await window.navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true, // Ensure screen capture includes audio
            });
            setScreenShareStream(screenStream);
        }

        // Capture microphone audio
        micStream = await window.navigator.mediaDevices.getUserMedia({
            video: true,
			audio: true, // Microphone input
        });
        setAudioStream(micStream);

        // Merge audio tracks from both streams
        const combinedAudioTracks = [
            ...(screenStream ? screenStream.getAudioTracks() : []),
            ...(micStream ? micStream.getAudioTracks() : []),
        ];

        // Create a new MediaStream with combined audio tracks
        combinedStream = new MediaStream(combinedAudioTracks);

        // Log the combined stream for debugging
        console.log("Combined Stream Tracks:", combinedStream.getTracks());
    } catch (err) {
        console.error("Error capturing media:", err);
        return;
    }

    // Create an audio source from the combined stream
    const source1 = audioContext.createMediaStreamSource(combinedStream);

    const recordingprops: RecordingProperties = {
        numberOfChannels: 1,
        sampleRate: audioContext.sampleRate,
        maxFrameCount: (audioContext.sampleRate * 1) / 10,
    };

    try {
        await audioContext.audioWorklet.addModule("./worklets/recording-processor.js");
    } catch (error) {
        console.log(`Error loading audio worklet module: ${error}`);
        return;
    }

    const mediaRecorder = new AudioWorkletNode(audioContext, "recording-processor", {
        processorOptions: recordingprops,
    });

    const destination = audioContext.createMediaStreamDestination();

    mediaRecorder.port.postMessage({
        message: "UPDATE_RECORDING_STATE",
        setRecording: true,
    });

    source1.connect(mediaRecorder).connect(destination);

    mediaRecorder.port.onmessageerror = error => {
        console.log(`Error receiving message from worklet: ${error}`);
    };

    const audioDataIterator = pEvent.iterator<"message", MessageEvent<MessageDataType>>(mediaRecorder.port, "message");

    const getAudioStream = async function* () {
        for await (const chunk of audioDataIterator) {
            if (chunk.data.message === "SHARE_RECORDING_BUFFER") {
                const abuffer = pcmEncode(chunk.data.buffer[0]);
                const audiodata = new Uint8Array(abuffer);
                yield {
                    AudioEvent: {
                        AudioChunk: audiodata,
                    },
                };
            }
        }
    };

    const transcribeClient = new TranscribeStreamingClient({
        region: region,
        credentials: currentCredentials,
    });

    const command = new StartStreamTranscriptionCommand({
        LanguageCode: language,
        MediaEncoding: "pcm",
        MediaSampleRateHertz: sampleRate,
        AudioStream: getAudioStream(),
    });

    try {
        const data = await transcribeClient.send(command);
        console.log("Transcribe session established:", data.SessionId);

        if (data.TranscriptResultStream) {
            for await (const event of data.TranscriptResultStream) {
                if (event?.TranscriptEvent?.Transcript) {
                    for (const result of event?.TranscriptEvent?.Transcript.Results || []) {
                        if (result?.Alternatives && result?.Alternatives[0].Items) {
                            const completeSentence = result.Alternatives[0].Items.map(item => item.Content).join(" ");
                            handleTranscribeOutput(completeSentence.trim(), !result.IsPartial, transcribeClient, mediaRecorder);
                        }
                    }
                }
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error("Error during streaming:", error.message);
        } else {
            console.error("Unknown error during streaming");
        }
    }
};

	// Stop streaming function
	const stopStreaming = async (mediaRecorder: AudioWorkletNode, transcribeClient: TranscribeStreamingClient | {destroy: () => void}) => {
		try {
			if (mediaRecorder) {
				mediaRecorder.port.postMessage({
					message: "UPDATE_RECORDING_STATE",
					setRecording: false,
				});
				mediaRecorder.port.close();
				mediaRecorder.disconnect();
			} else {
				console.log("No media recorder available to stop");
			}

			if (transcribeClient) {
				transcribeClient.destroy();
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error("Error stopping streaming:", error.message);
			} else {
				console.error("Unknown error while stopping streaming");
			}
		}
	};

	// Define the manual send API function
	const handleManualSend = async () => {
		const accumulatedTranscriptions = finalTranscriptions.join(" ");
		if (accumulatedTranscriptions.length === 0 || isApiCallInProgress) {
			return;
		}

		try {
			setIsApiCallInProgress(true);
			const response = await transcriptionApi({question: accumulatedTranscriptions});

			if (response.text) {
				setApiResponse(response.text); // Update the API response
			} else {
				setApiResponse("No response text found.");
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				setApiResponse(`Error: ${error.message}`);
			}
		} finally {
			setIsApiCallInProgress(false);
		}
	};

	const onTranscriptionDataReceived = (data: string, isFinal: boolean, transcriptionClient: TranscribeStreamingClient, mediaRecorder: AudioWorkletNode) => {
		if (isFinal) {
			setFinalTranscriptions((prev: string[]) => {
				const updatedTranscriptions = [...prev, data];
				const wordCount = updatedTranscriptions.join(" ").split(" ").length;

				// Check if we're in auto mode and if word count exceeds the limit
				if (sendMode === "auto" && wordCount >= wordLimit) {
	//				saveToDatabase(updatedTranscriptions);
					sendToApi(updatedTranscriptions); // Auto-send only if in auto mode
				}

				return updatedTranscriptions;
			});
		}

		setTranscript({
			channel: "0",
			partial: !isFinal,
			text: data,
		});

		setMediaRecorder(mediaRecorder);
		setTranscriptionClient(transcriptionClient);
	};

	const setApiResponse = (response: string) => {
		setApiResponses(prev => [...prev, response]);
	};

	const sendToApi = async (transcriptionsToSend: string[]) => {
		const accumulatedTranscriptions = transcriptionsToSend.join(" ");

		if (accumulatedTranscriptions.length === 0 || isApiCallInProgress) {
			return;
		}

		try {
			setIsApiCallInProgress(true);
			const response = await transcriptionApi({question: accumulatedTranscriptions});

			if (response.text) {
				setApiResponse(response.text); // Now calling the prop setApiResponse to update in App.tsx
			} else {
				setApiResponse("No response text found.");
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				setApiResponse(`Error: ${error.message}`);
			}
		} finally {
			setIsApiCallInProgress(false);
		}
	};
	const saveToDatabase = async (transcriptions: string | string[]) => {
		// Ensure transcriptions is always treated as an array
		const accumulatedTranscriptions = Array.isArray(transcriptions)
			? transcriptions.join(" ").trim()
			: String(transcriptions).trim(); // Convert to string if not an array
	
		if (accumulatedTranscriptions.length === 0) {
			console.warn("No transcription data to save.");
			return;
		}
	
		try {
			console.log("Saving transcription data:", accumulatedTranscriptions);
	
			const response = await fetch("https://largeinfra.com/api/react-api/save_response_patients-1.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: "Brindha4", // Replace with dynamic username if needed
					transcription: accumulatedTranscriptions, // Send accumulated transcriptions
					medicalReport: "Generated Report Data",
				}),
			});
	
			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status}`);
			}
	
			const data = await response.json();
			console.log("Database Save Response:", data);
	
			if (data.status !== "success") {
				throw new Error(`API Error: ${data.message}`);
			}
	
		} catch (error: unknown) {
			console.error("Error saving to database:", error);
		}
	};
	
	
	const startRecording = async () => {
		if (!currentCredentials) return;

		await startStreaming(onTranscriptionDataReceived, currentCredentials, audioSource);
	};

	const stopRecording = async () => {
		if (mediaRecorder && transcriptionClient) {
			await stopStreaming(mediaRecorder, transcriptionClient);
		}
	};

	useEffect(() => {
		if (transcribeStatus) {
			startRecording();
		} else {
			stopRecording();
		}
	}, [transcribeStatus]);

	useEffect(() => {
		console.log("Transcript updated:", transcript);
		if (transcript) {
			if (transcript.partial) {
				setCurrentLine([transcript]);
			} else {
				setLines([...lines, transcript]);
				setCurrentLine([]);
			}
			console.log("Lines updated:", lines);
			console.log("Current line updated:", currentLine);
		}
	}, [transcript]);

	return (
		<GlobalContext.Provider
			value={{
				audioSource: audioSource,
				setAudioSource: setAudioSource,
				wordLimit: wordLimit,
				sendMode: sendMode,
				setSendMode: setSendMode,
				handleManualSend: handleManualSend,
				handleTranscribe: handleTranscribe,
				transcribeStatus: transcribeStatus,
				apiResponses: apiResponses,
				setWordLimit: setWordLimit,
				combinedTranscriptions: combinedTranscriptions,
				audioStream: audioStream,
				screenShareStream: screenShareStream,
			}}
		>
			{children}
		</GlobalContext.Provider>
	);
};
