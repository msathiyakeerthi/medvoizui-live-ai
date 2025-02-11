import {createContext, useContext, useState, ReactNode, useEffect} from "react";
import {TranscribeStreamingClient, StartStreamTranscriptionCommand, LanguageCode} from "@aws-sdk/client-transcribe-streaming";
import {ICredentials} from "@aws-amplify/core";
import pEvent from "p-event";
import {RecordingProperties, MessageDataType, Transcript} from "../types";
import {transcriptionApi} from "@/aws/api";
import {Auth} from "aws-amplify";
import {pcmEncode} from "@/audio";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

	const identityPoolId = import.meta.env.VITE_REACT_APP_IDENTITY_POOL_ID;
//	const region = import.meta.env.VITE_REACT_APP_AWS_REGION;
	
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
		async function getAnonymousCredentials() {
			try {
				const credentials = await fromCognitoIdentityPool({
					clientConfig: { region: region },
					identityPoolId: identityPoolId,
				})();
				console.log("✅ AWS Anonymous Credentials Retrieved:", credentials);
				setCurrentCredentials(credentials);
			} catch (error) {
				console.error("❌ Error retrieving AWS anonymous credentials:", error);
			}
		}
		getAnonymousCredentials();
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

/* const startStreaming = async (
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
            video: false,
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
        numberOfChannels: 2,
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
}; */
const startStreaming = async (
    handleTranscribeOutput: (data: string, isFinal: boolean, transcriptionClient: TranscribeStreamingClient, mediaRecorder: AudioWorkletNode) => void,
    currentCredentials: ICredentials,
    audioSource: string
) => {
    const audioContext = new window.AudioContext();
    let screenStream: MediaStream | null = null;
    let micStream: MediaStream | null = null;
       // Capture microphone audio
	   micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
        // Capture system audio if ScreenCapture is selected
        if (audioSource === "ScreenCapture") {
            screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true, // No need for video
                audio: true,
            });
        }

 

        if (!micStream && !screenStream) {
            throw new Error("No valid audio sources available.");
        }

        // Merge audio tracks from both sources
        const combinedAudioTracks = [
            ...(screenStream ? screenStream.getAudioTracks() : []),
            ...(micStream ? micStream.getAudioTracks() : []),
        ];

        // Ensure at least one track exists
        if (combinedAudioTracks.length === 0) {
            throw new Error("No audio tracks available.");
        }

        // Create a single MediaStream with merged tracks
        const combinedStream = new MediaStream(combinedAudioTracks);

        console.log("Combined Stream Tracks:", combinedStream.getTracks());

        // Create an AudioContext source from the merged stream
        const audioSourceNode = audioContext.createMediaStreamSource(combinedStream);

        const recordingProps = {
            numberOfChannels: 2, // Stereo
            sampleRate: audioContext.sampleRate,
            maxFrameCount: (audioContext.sampleRate * 1) / 10, // Short buffer
        };

        // Load the AudioWorklet processor
        try {
            await audioContext.audioWorklet.addModule("./worklets/recording-processor.js");
        } catch (error) {
            console.error(`Error loading audio worklet module: ${error}`);
            return;
        }

        // Create the Worklet Node
        const mediaRecorder = new AudioWorkletNode(audioContext, "recording-processor", {
            processorOptions: recordingProps,
        });

        // Create a destination node
        const destination = audioContext.createMediaStreamDestination();

        mediaRecorder.port.postMessage({
            message: "UPDATE_RECORDING_STATE",
            setRecording: true,
        });

        // Correct the connection flow
        audioSourceNode.connect(mediaRecorder);
        mediaRecorder.connect(destination);

        mediaRecorder.port.onmessageerror = (error) => {
            console.error(`Error receiving message from worklet: ${error}`);
        };

        // Capture PCM Data from Worklet
        const audioDataIterator = pEvent.iterator<"message", MessageEvent<MessageDataType>>(mediaRecorder.port, "message");

        const getAudioStream = async function* () {
            for await (const chunk of audioDataIterator) {
                if (chunk.data.message === "SHARE_RECORDING_BUFFER") {
                    const abuffer = pcmEncode(chunk.data.buffer[0]); // PCM Encoding
                    const audiodata = new Uint8Array(abuffer);
                    yield {
                        AudioEvent: {
                            AudioChunk: audiodata,
                        },
                    };
                }
            }
        };

        // Initialize AWS Transcribe Client
        const transcribeClient = new TranscribeStreamingClient({
            region: "us-east-1", // Change region if needed
            credentials: currentCredentials,
        });

        const command = new StartStreamTranscriptionCommand({
            LanguageCode: "en-US",
            MediaEncoding: "pcm",
            MediaSampleRateHertz: recordingProps.sampleRate,
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
        } catch (error) {
            console.error("Error during streaming:", error instanceof Error ? error.message : "Unknown error");
        }
    } catch (err) {
        console.error("Error capturing media:", err);
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

	/*const onTranscriptionDataReceived = (data: string, isFinal: boolean, transcriptionClient: TranscribeStreamingClient, mediaRecorder: AudioWorkletNode) => {
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
	};*/
	const onTranscriptionDataReceived = (
		data: string,
		isFinal: boolean,
		transcriptionClient: TranscribeStreamingClient,
		mediaRecorder: AudioWorkletNode
	) => {
		const timestamp = new Date().toISOString(); // Current timestamp
	
		console.log("📝 New Transcription Received:", data);
		console.log("✅ Is Final:", isFinal);
		console.log("⏳ Timestamp:", timestamp);
	
		if (isFinal) {
			setFinalTranscriptions((prev) => {
				const updatedTranscriptions = [...prev, { text: data, timestamp }];
				console.log("📌 Updated Final Transcriptions:", updatedTranscriptions);
	
				const wordCount = updatedTranscriptions.map(t => t.text).join(" ").split(" ").length;
				console.log("🧮 Word Count:", wordCount);
	
				if (sendMode === "auto" && wordCount >= wordLimit) {
					console.log("🚀 Auto-sending to API...");
					sendToApi(updatedTranscriptions);
				}
	
				return updatedTranscriptions;
			});
		}
	
		setTranscript({
			channel: "0",
			partial: !isFinal,
			text: data,
			timestamp,
		});
	
		setMediaRecorder(mediaRecorder);
		setTranscriptionClient(transcriptionClient);
	};
	
	const setApiResponse = (response: string) => {
		setApiResponses(prev => [...prev, response]);
	};
	const sendToApi = async (transcriptionsToSend: { text: string; timestamp: string }[]) => {
		const accumulatedTranscriptions = transcriptionsToSend.map(t => `[${t.timestamp}] ${t.text}`).join(" ");
	
		console.log("📤 Sending to API:", accumulatedTranscriptions);
	
		if (accumulatedTranscriptions.length === 0 || isApiCallInProgress) {
			console.warn("⚠️ No transcription data to send.");
			return;
		}
	
		try {
			setIsApiCallInProgress(true);
			const response = await transcriptionApi({ question: accumulatedTranscriptions });
	
			console.log("📩 API Response:", response);
	
			if (response.text) {
				setApiResponse(response.text);
			} else {
				setApiResponse("No response text found.");
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error("❌ API Error:", error.message);
				setApiResponse(`Error: ${error.message}`);
			}
		} finally {
			setIsApiCallInProgress(false);
		}
	};
	
	/* const sendToApi = async (transcriptionsToSend: string[]) => {
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
	}; */
	/*const saveToDatabase = async (transcriptions: string | string[]) => {
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
	}; */
	/*const saveToDatabase = async (transcriptions: { text: string; timestamp: string }[]) => {
		if (transcriptions.length === 0) {
			console.warn("⚠️ No transcription data to save.");
			return;
		}
	
		const formattedTranscriptions = transcriptions.map(t => `[${t.timestamp}] ${t.text}`).join(" ");
	
		try {
			console.log("💾 Saving transcription data:", formattedTranscriptions);
	
			const response = await fetch("https://largeinfra.com/api/react-api/save_response_patients-1.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					username: "Brindha4",
					transcription: formattedTranscriptions,
					medicalReport: "Generated Report Data",
				}),
			});
	
			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status}`);
			}
	
			const data = await response.json();
			console.log("📀 Database Save Response:", data);
	
			if (data.status !== "success") {
				throw new Error(`API Error: ${data.message}`);
			}
		} catch (error: unknown) {
			console.error("❌ Error saving to database:", error);
		}
	};*/
	/*const saveToDatabase = async (transcriptions: { text: string; timestamp: string }[]) => {
		if (transcriptions.length === 0) {
			console.warn("⚠️ No transcription data to save.");
			return;
		}
	
		const accumulatedTranscriptions = transcriptions.map((t) => t.text).join(" ").trim();
	
		// Construct the medicalReport format
		const formattedTranscriptions = {
			jobName: "GQACG37LQP",
			accountId: "891612551365",
			status: "COMPLETED",
			results: {
				transcripts: [{ transcript: accumulatedTranscriptions }],
				items: transcriptions.map((t, index) => ({
					id: index,
					type: "pronunciation",
					alternatives: [{ confidence: "0.9868", content: t.text }],
					start_time: (index * 0.5).toFixed(2),
					end_time: ((index + 1) * 0.5).toFixed(2),
				})),
				audio_segments: [
					{
						id: 0,
						transcript: accumulatedTranscriptions,
						start_time: "0.0",
						end_time: ((transcriptions.length) * 0.5).toFixed(2),
						items: transcriptions.map((_, index) => index),
					},
				],
			},
		};
	
		// Convert JSON to a string before sending
		const formattedTranscriptionsString = JSON.stringify(formattedTranscriptions);
	
		try {
			console.log("💾 Saving transcription data...");
			console.log("📝 Transcription (No timestamps):", accumulatedTranscriptions);
			console.log("📜 Medical Report (Stringified):", formattedTranscriptionsString);
	
			const response = await fetch("https://largeinfra.com/api/react-api/save_response_patients-1.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					username: "Brindha4",
					transcription: accumulatedTranscriptions, // Clean transcription
					medicalReport: formattedTranscriptionsString, // Stringified JSON
				}),
			});
	
			console.log("📩 Raw API Response:", response);
	
			if (!response.ok) {
				console.error(`❌ HTTP Error: ${response.status}`);
				const errorText = await response.text();
				console.error("❌ Error Response:", errorText);
				return;
			}
	
			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (contentType && contentType.includes("application/json")) {
				const data = await response.json();
				console.log("📀 Database Save Response:", data);
			} else {
				const textData = await response.text();
				console.warn("⚠️ Non-JSON Response Received:", textData);
			}
	
		} catch (error) {
			console.error("❌ Error saving to database:", error);
		}
	}; */
	
	/* const saveToDatabase = async (transcriptions: { text: string; timestamp: string }[]) => {
		if (transcriptions.length === 0) {
			console.warn("⚠️ No transcription data to save.");
			return;
		}
	
		const accumulatedTranscriptions = transcriptions.map((t) => t.text).join(" ").trim();
	
		let startTime = 0.0;
		const wordDuration = 0.3; // Estimated duration per word (replace with real timestamps if available)
	
		const words = accumulatedTranscriptions.match(/[\w']+|[.,!?;]/g) || []; // Splits words and punctuation separately
		const items = words.map((word, index) => {
			const isPunctuation = /[.,!?;]/.test(word);
			const endTime = isPunctuation ? startTime : startTime + wordDuration;
	
			const item = {
				id: index,
				type: isPunctuation ? "punctuation" : "pronunciation",
				alternatives: [{ confidence: (Math.random() * 0.5 + 0.5).toFixed(4), content: word }],
				...(isPunctuation ? {} : { start_time: startTime.toFixed(2), end_time: endTime.toFixed(2) }),
			};
	
			if (!isPunctuation) startTime = endTime; // Update start time only for words
			return item;
		});
	
		// Construct the medicalReport format
		const formattedTranscriptions = {
			jobName: "GQACG37LQP",
			accountId: "891612551365",
			status: "COMPLETED",
			results: {
				transcripts: [{ transcript: accumulatedTranscriptions }], // Full transcript sentence
				items: items, // Word-wise transcription with punctuation
				audio_segments: [
					{
						id: 0,
						transcript: accumulatedTranscriptions,
						start_time: "0.0",
						end_time: items.length ? items[items.length - 1].end_time || "0.0" : "0.0",
						items: items.map((_, index) => index), // Reference to items by ID
					}
				]
			}
		};
	
		// Convert JSON to a string before sending
		const formattedTranscriptionsString = JSON.stringify(formattedTranscriptions);
	
		try {
			console.log("💾 Saving transcription data...");
			console.log("📝 Transcription (No timestamps):", accumulatedTranscriptions);
			console.log("📜 Medical Report (Formatted):", formattedTranscriptionsString);
	
			const response = await fetch("https://largeinfra.com/api/react-api/save_response_patients-1.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					username: "Brindha4",
					transcription: accumulatedTranscriptions, // Clean transcription
					medicalReport: formattedTranscriptionsString, // Formatted JSON as a string
				}),
			});
	
			console.log("📩 Raw API Response:", response);
	
			if (!response.ok) {
				console.error(`❌ HTTP Error: ${response.status}`);
				const errorText = await response.text();
				console.error("❌ Error Response:", errorText);
				return;
			}
	
			// Check if response is JSON
			const contentType = response.headers.get("content-type");
			if (contentType && contentType.includes("application/json")) {
				const data = await response.json();
				console.log("📀 Database Save Response:", data);
			} else {
				const textData = await response.text();
				console.warn("⚠️ Non-JSON Response Received:", textData);
			}
	
		} catch (error) {
			console.error("❌ Error saving to database:", error);
		}
	}; */
	
	const fetchPatients = async () => {
		// Get the `doctor_email` from the URL
		const params = new URLSearchParams(window.location.search);
		const doctorEmail = params.get("doctor_email") || "admin@example.com"; // Use default if not provided
	
		try {
			const response = await fetch(`https://largeinfra.com/react-api/listpatients_foremail.php?doctor_email=${encodeURIComponent(doctorEmail)}`);
	
			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status}`);
			}
	
			const data = await response.json();
			console.log("📩 Fetched Patients:", data);
			return data.patients || [];
		} catch (error) {
			console.error("❌ Error fetching patients:", error);
			return [];
		}
	};
	
	
	const selectPatient = async () => {
		const patients = await fetchPatients();
		if (patients.length === 0) {
			console.warn("⚠️ No patients available.");
			return null;
		}
	
		// Create a dropdown selection prompt
		const patientNames = patients.map(p => p.name);
		const selectedName = prompt(`Select a patient: \n${patientNames.join("\n")}`, patientNames[0]);
		
		const selectedPatient = patients.find(p => p.name === selectedName);
		if (!selectedPatient) {
			console.warn("⚠️ Invalid selection. Using default patient.");
			return patients[0]; // Default to the first patient if invalid selection
		}
		return selectedPatient;
	};
	
	const saveToDatabase = async (transcriptions) => {
		if (transcriptions.length === 0) {
			console.warn("⚠️ No transcription data to save.");
			return;
		}
	// Retrieve `doctor_email` from URL
    const params = new URLSearchParams(window.location.search);
    const doctorEmail = params.get("doctor_email") || "admin@example.com"; // Use default if not provided

		const selectedPatient = await selectPatient();
		if (!selectedPatient) {
			console.warn("⚠️ No patient selected. Aborting save.");
			return;
		}
	
		const accumulatedTranscriptions = transcriptions.map((t) => t.text).join(" ").trim();
		let startTime = 0.0;
		const wordDuration = 0.3;
	
		const words = accumulatedTranscriptions.match(/[\w']+|[.,!?;]/g) || [];
		const items = words.map((word, index) => {
			const isPunctuation = /[.,!?;]/.test(word);
			const endTime = isPunctuation ? startTime : startTime + wordDuration;
	
			const item = {
				id: index,
				type: isPunctuation ? "punctuation" : "pronunciation",
				alternatives: [{ confidence: (Math.random() * 0.5 + 0.5).toFixed(4), content: word }],
				...(isPunctuation ? {} : { start_time: startTime.toFixed(2), end_time: endTime.toFixed(2) }),
			};
	
			if (!isPunctuation) startTime = endTime;
			return item;
		});
	
		const formattedTranscriptions = {
			jobName: "GQACG37LQP",
			accountId: "891612551365",
			status: "COMPLETED",
			results: {
				transcripts: [{ transcript: accumulatedTranscriptions }],
				items: items,
				audio_segments: [
					{
						id: 0,
						transcript: accumulatedTranscriptions,
						start_time: "0.0",
						end_time: items.length ? items[items.length - 1].end_time || "0.0" : "0.0",
						items: items.map((_, index) => index),
					}
				]
			}
		};
	
		try {
			console.log("💾 Saving transcription data...");
			console.log("📝 Transcription (No timestamps):", accumulatedTranscriptions);
			console.log("📜 Medical Report (Formatted):", JSON.stringify(formattedTranscriptions));
	
			const response = await fetch("https://largeinfra.com/api/react-api/save_response_patients-3.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json",
				},
				body: JSON.stringify({
					doctor_email: doctorEmail,
					username: selectedPatient.name, // Use dynamically selected patient name
					transcription: accumulatedTranscriptions,
					medicalReport: JSON.stringify(formattedTranscriptions),
				}),
			});
	
			console.log("📩 Raw API Response:", response);
	
			if (!response.ok) {
				console.error(`❌ HTTP Error: ${response.status}`);
				const errorText = await response.text();
				console.error("❌ Error Response:", errorText);
				return;
			}
	
			const contentType = response.headers.get("content-type");
			if (contentType && contentType.includes("application/json")) {
				const data = await response.json();
				console.log("📀 Database Save Response:", data);
			} else {
				const textData = await response.text();
				console.warn("⚠️ Non-JSON Response Received:", textData);
			}
	
		} catch (error) {
			console.error("❌ Error saving to database:", error);
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

/*	useEffect(() => {
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
	}, [transcript]); */
	useEffect(() => {
		if (transcript) {
			console.log("📜 Transcript State Updated:", transcript);
			console.log("⏳ Timestamp:", transcript.timestamp);
	
			if (transcript.partial) {
				console.log("🟡 Partial Transcript:", transcript.text);
				setCurrentLine([transcript]);
			} else {
				console.log("🟢 Final Transcript:", transcript.text);
				console.log("✅ Timestamp:", transcript.timestamp);
				setLines([...lines, transcript]);
				setCurrentLine([]);
			}
			console.log("📌 Current Lines:", lines);
			console.log("📌 Current Line:", currentLine);
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
