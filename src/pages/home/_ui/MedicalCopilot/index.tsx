import {FC, useState, useEffect} from "react";
import {Copy, RefreshCw, Maximize2, Minimize2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Switch} from "@/components/ui/switch";
import {format} from "date-fns";
import {Auth} from "aws-amplify";

interface IMediaCopilotProps {
  apiResponses: string[];
}

async function signOut() {
  try {
    await Auth.signOut();
  } catch (error) {
    console.log("error signing out: ", error);
  }
}

const MediaCopilot: FC<IMediaCopilotProps> = ({apiResponses}) => {
  const [responseData, setResponseData] = useState<Array<{ 
    content: string; 
    timestamp: string 
  }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (apiResponses.length > responseData.length) {
      const newResponses = apiResponses
        .slice(responseData.length)
        .map(content => ({
          content,
          timestamp: format(new Date(), "HH:mm")
        }));
      
      setResponseData(prev => [...prev, ...newResponses]);
    }
  }, [apiResponses, responseData.length]);

  return (
    <div className={`flex flex-col ${isExpanded ? 'lg:w-[90%]' : 'lg:w-[40%]'} w-full h-full transition-all duration-300 bg-white`}>
      <div className='flex justify-between p-6 pb-0'>
        <h1 className='font-mono text-lg font-bold'>MedVoiz - Ai Live Transcriptions</h1>
        <div className="flex gap-2">
          <Button 
            onClick={() => setIsExpanded(!isExpanded)} 
            variant="ghost" 
            size="icon"
            className="hover:bg-gray-100"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={signOut}>Sign out</Button>
        </div>
      </div>
      
      <hr className='mx-6 my-4' />
      
      <div className='flex-1 overflow-hidden px-6 pb-6'>
        <div className='space-y-6 h-full'>
          {/* Header Section */}
          <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            {/*<div className='space-y-2'>
              <h2 className='font-semibold text-lg text-gray-900'>Medical Copilot</h2>
              <div className='flex items-center gap-2 bg-green-100 px-2 py-1 rounded-full w-20'>
                <span className='flex h-2 w-2 rounded-full bg-green-500 animate-pulse' />
                <span className='text-xs font-medium text-green-700'>Ready</span>
              </div>
            </div>*/}
            <div className='flex flex-col sm:flex-row items-start sm:items-center gap-4'>
              {/*<div className='flex items-center gap-2'>
                <Button className='bg-[#4FD1C5] hover:bg-[#45B3AB] text-white px-3 py-1 text-sm font-medium rounded-md'>
                  Button 1
                </Button>
                <Button className='bg-[#63B3ED] hover:bg-[#5AA3DD] text-white px-3 py-1 text-sm font-medium rounded-md'>
                  Button 2
                </Button>
                <Button className='bg-white hover:bg-gray-50 text-gray-600 px-3 py-1 text-sm font-medium rounded-md border border-gray-200'>
                  Button 3
                </Button>
              </div>*/}
              <div className='flex items-center gap-2'>
                <Switch className='data-[state=checked]:bg-blue-500' />
                <span className='text-sm text-gray-600'>Auto Scroll</span>
              </div>
            </div>
          </div>

          {/* Messages Section */}
          <div className='h-[calc(100%-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent'>
            {responseData.length > 0 ? (
              [...responseData].reverse().map((item, index) => (
                <div key={`${item.timestamp}-${index}`} className='space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100 mb-4'>
                  <div className='flex items-center justify-between text-sm text-gray-500'>
                    <span>{item.timestamp}</span>
                    <div className='flex items-center gap-2'>
                      <Copy className='h-4 w-4 cursor-pointer' />
                      <RefreshCw className='h-4 w-4 cursor-pointer' />
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div className='api-response-html' dangerouslySetInnerHTML={{__html: item.content}} />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className='text-sm text-gray-500'>No AI report available yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaCopilot;