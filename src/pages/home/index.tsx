import { FC, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Controls from "@/pages/home/_ui/Controls/Controls";
import { useGlobal } from "@/provider/GlobalContext";
import AudioOutputScreen from "./_ui/AudioOutputScreen";
import MediaCopilot from "./_ui/MedicalCopilot";
import ScreenShareOutput from "./_ui/ScreenShareOutput";
import Transcriptions from "./_ui/Transcriptions";

const HomePage: FC = () => {
    const { audioSource, transcribeStatus, combinedTranscriptions, apiResponses } = useGlobal();
    
    // Get and memoize search params
    const [searchParams] = useSearchParams();
    const doctorEmail = useMemo(() => searchParams.get("doctor_email") || "Not Provided", [searchParams]);

    console.log("Doctor Email from URL:", doctorEmail); // Debugging

    // Render the appropriate output screen
    const renderOutputScreen = () => (
        audioSource === "audio" ? 
        <AudioOutputScreen transcribeStatus={transcribeStatus} /> : 
        <ScreenShareOutput />
    );

    return (
        <div className='flex flex-col lg:flex-row min-h-screen bg-gray-50'>
            <div className='w-full lg:w-[60%] p-6 border-b lg:border-b-0 lg:border-r border-gray-200'>
                <div className='space-y-6'>
                    {/* <h2 className="text-xl font-bold">Doctor Email: {doctorEmail}</h2> */}
                    <Controls />
                    {renderOutputScreen()}
                    <Transcriptions transcriptions={combinedTranscriptions} />
                </div>
            </div>
            <MediaCopilot apiResponses={apiResponses} />
        </div>
    );
};

export default HomePage;
