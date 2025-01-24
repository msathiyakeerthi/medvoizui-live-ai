import {FC} from "react";
import "@aws-amplify/ui-react/styles.css";
import Controls from "@/pages/home/_ui/Controls/Controls";
import {useGlobal} from "@/provider/GlobalContext";
import AudioOutputScreen from "./_ui/AudioOutputScreen";
import MediaCopilot from "./_ui/MedicalCopilot";
import ScreenShareOutput from "./_ui/ScreenShareOutput";
import Transcriptions from "./_ui/Transcriptions";

interface IHomePageProps {}

const HomePage: FC<IHomePageProps> = () => {
	const {audioSource, transcribeStatus, combinedTranscriptions, apiResponses} = useGlobal();
	return (
		<div className='flex flex-col lg:flex-row min-h-screen bg-gray-50'>
			<div className='w-full lg:w-[60%] p-6 border-b lg:border-b-0 lg:border-r border-gray-200'>
				<div className='space-y-6'>
					<Controls />
					{audioSource === "audio" ? <AudioOutputScreen transcribeStatus={transcribeStatus} /> : <ScreenShareOutput />}
					<Transcriptions transcriptions={combinedTranscriptions} />
				</div>
			</div>
			<MediaCopilot apiResponses={apiResponses} />
		</div>
	);
};

export default HomePage;
