import {useEffect, useRef} from "react";
import {useGlobal} from "@/provider/GlobalContext";

const ScreenShareOutput = () => {
	const {screenShareStream} = useGlobal();

	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (screenShareStream && videoRef.current) {
			videoRef.current.srcObject = screenShareStream;
		}
	}, [screenShareStream]);

	return (
		<div className='screen-share-output'>
			<video ref={videoRef} autoPlay playsInline muted />
		</div>
	);
};

export default ScreenShareOutput;
