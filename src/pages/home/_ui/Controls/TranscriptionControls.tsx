import {useEffect, useRef} from "react";
import {Button} from "@/components/ui/button";
import {Phone, ChevronDown} from "lucide-react"; // Import the icons
import {useGlobal} from "@/provider/GlobalContext";

const TranscriptionControls = () => {
	const {transcribeStatus, handleTranscribe, audioStream, screenShareStream} = useGlobal();

	const audioStreamRef = useRef(audioStream);
	const screenStreamRef = useRef(screenShareStream);

	// Update refs when streams change
	useEffect(() => {
		audioStreamRef.current = audioStream;
		screenStreamRef.current = screenShareStream;
	}, [audioStream, screenShareStream]);

	// Cleanup function to stop all tracks when component unmounts
	// or when transcription is stopped
	const stopAllTracks = () => {
		if (audioStreamRef.current) {
			audioStreamRef.current.getTracks().forEach(track => {
				track.stop();
			});
		}
		if (screenStreamRef.current) {
			screenStreamRef.current.getTracks().forEach(track => {
				track.stop();
			});
		}
	};

	// Handle cleanup when component unmounts
	useEffect(() => {
		return () => {
			stopAllTracks();
		};
	}, []);

	// Handle cleanup when transcription stops
	useEffect(() => {
		if (!transcribeStatus) {
			stopAllTracks();
		}
	}, [transcribeStatus]);

	const handleTranscribeClick = async () => {
		if (transcribeStatus) {
			// If we're stopping, make sure to clean up
			stopAllTracks();
		}
		handleTranscribe();
	};

	return (
		<Button
			onClick={handleTranscribeClick}
			className={`${
				!transcribeStatus ? "bg-blue-500 hover:bg-blue-600" : "bg-red-500 hover:bg-red-600"
			} text-white px-4 py-2.5 rounded-full shadow-md transition-all flex items-center gap-2 w-full md:w-auto`}
		>
			<Phone className='h-4 w-4' />
			{transcribeStatus ? "Leave" : "Start"}
			<ChevronDown className='h-4 w-4' />
		</Button>
	);
};

export default TranscriptionControls;
