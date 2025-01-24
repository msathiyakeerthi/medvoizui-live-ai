import {useGlobal} from "@/provider/GlobalContext";
import {FC, useEffect, useRef} from "react";

interface AudioOutputScreenProps {
	transcribeStatus: boolean;
}

const AudioOutputScreen: FC<AudioOutputScreenProps> = ({transcribeStatus}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const analyserRef = useRef<AnalyserNode | null>(null);
	const {audioStream} = useGlobal();

	useEffect(() => {
		if (!audioStream || !transcribeStatus) return;

		const audioContext = new AudioContext();
		const source = audioContext.createMediaStreamSource(audioStream);
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		source.connect(analyser);
		analyserRef.current = analyser;

		return () => {
			audioContext.close();
			analyserRef.current = null;
		};
	}, [audioStream, transcribeStatus]);

	useEffect(() => {
		const analyser = analyserRef.current;
		if (!analyser || !transcribeStatus) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const context = canvas.getContext("2d");
		if (!context) return;

		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);

		const draw = () => {
			if (!transcribeStatus) return;

			requestAnimationFrame(draw);
			analyser.getByteFrequencyData(dataArray);

			const width = canvas.width;
			const height = canvas.height;
			context.clearRect(0, 0, width, height);

			let sum = 0;
			for (let i = 0; i < bufferLength; i++) {
				sum += dataArray[i];
			}
			const averageVolume = sum / bufferLength;

			const radius = (averageVolume / 255) * 100 + 20;
			context.beginPath();
			context.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
			context.fillStyle = "rgba(0, 128, 255, 0.5)";
			context.fill();
		};

		draw();
	}, [analyserRef.current, transcribeStatus]);

	return (
		<div className='audio-visualizer'>
			<canvas ref={canvasRef} width={200} height={200} />
		</div>
	);
};

export default AudioOutputScreen;
