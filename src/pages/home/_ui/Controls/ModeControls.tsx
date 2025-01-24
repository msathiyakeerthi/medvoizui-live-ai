import {AudioLines, ScreenShare} from "lucide-react";
import {Button} from "../../../../components/ui/button";
import {useGlobal} from "@/provider/GlobalContext";
// Shared button styles
const buttonStyles = `bg-white hover:bg-gray-50 hover:text-black text-gray-700 rounded-full w-10 h-10 p-0 shadow-md transition-all border border-gray-200`;
const activeButtonStyles = `bg-blue-500 text-white`;
export function ModeControls() {
	const {audioSource, setAudioSource} = useGlobal();

	const handleAudioMode = () => setAudioSource("audio");
	const handleScreenCaptureMode = () => setAudioSource("ScreenCapture");

	return (
		<>
			<Button onClick={handleAudioMode} className={`${buttonStyles} ${audioSource === "audio" ? activeButtonStyles : ""}`}>
				<AudioLines className='h-4 w-4' />
			</Button>
			<Button onClick={handleScreenCaptureMode} className={`${buttonStyles} ${audioSource === "ScreenCapture" ? activeButtonStyles : ""}`}>
				<ScreenShare className='h-4 w-4' />
			</Button>
		</>
	);
}
