import { FC } from "react";
import { useSearchParams } from "react-router-dom"; // Import search params hook
import Controls from "@/pages/home/_ui/Controls/Controls";
import { useGlobal } from "@/provider/GlobalContext";
import AudioOutputScreen from "./_ui/AudioOutputScreen";
import MediaCopilot from "./_ui/MedicalCopilot";
import ScreenShareOutput from "./_ui/ScreenShareOutput";
import Transcriptions from "./_ui/Transcriptions";

const HomePage: FC = () => {
    const { audioSource, transcribeStatus, combinedTranscriptions, apiResponses } = useGlobal();
    
    // Get search params from URL
    const [searchParams] = useSearchParams();
    const doctorEmail = searchParams.get("doctor_email"); // Extract doctor_email

    console.log("Doctor Email from URL:", doctorEmail); // Debugging

    return (
        <div className='flex flex-col lg:flex-row min-h-screen bg-gray-50'>
            <div className='w-full lg:w-[60%] p-6 border-b lg:border-b-0 lg:border-r border-gray-200'>
                <div className='space-y-6'>
                    <h2 className="text-xl font-bold">Doctor Email: {doctorEmail || "Not Provided"}</h2>
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
