import { FC } from "react";
import { format } from "date-fns"; // Add date-fns import

interface ITranscriptionsProps {
  transcriptions: (string | undefined)[];
}

const Transcriptions: FC<ITranscriptionsProps> = ({ transcriptions }) => {
  const getTimestamp = () => {
    try {
      return format(new Date(), "HH:mm");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "00:00";
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between px-2'>
        <h2 className='text-sm font-medium text-gray-900'>Transcription</h2>
        <div className='flex items-center gap-2'>
          <span className='flex h-2 w-2 rounded-full bg-green-500 animate-pulse' />
          <span className='text-xs font-medium text-green-700'>Ready</span>
        </div>
      </div>
      <div className='space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent w-full'>
        {transcriptions?.slice().reverse().map((text, index) => (
          <div key={index} className='flex items-center w-full'>
            <div className='bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-full'>
              <div className='flex flex-col gap-2'>
                <div className='text-xs font-medium text-gray-400'>
                  {getTimestamp()}
                </div>
                <div className='text-sm text-gray-600'>
                  <p>{text}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Transcriptions;