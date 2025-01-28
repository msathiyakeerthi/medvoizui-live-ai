import { FC, useState, useEffect } from "react";
import { Copy, RefreshCw, Maximize2, Minimize2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface IMediaCopilotProps {
  apiResponses: string[];
}

const MediaCopilot: FC<IMediaCopilotProps> = ({ apiResponses }) => {
  const [responseData, setResponseData] = useState<Array<{ content: string; timestamp: string }>>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [username, setUsername] = useState("");
  const [autoScroll, setAutoScroll] = useState(true); // State for auto scroll

  useEffect(() => {
    if (apiResponses.length > responseData.length) {
      const newResponses = apiResponses
        .slice(responseData.length)
        .map((content) => ({
          content,
          timestamp: format(new Date(), "HH:mm"),
        }));

      setResponseData((prev) => [...prev, ...newResponses]);
    }
  }, [apiResponses, responseData.length]);

  const handleSave = async () => {
    if (!username) {
      alert("Please enter a username.");
      return;
    }

    const transcription = responseData.map((item) => item.content).join(" ");
    const medicalReport = apiResponses.join(" ");

    try {
      const response = await fetch("/api/react-api/save_response.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          transcription,
          medicalReport,
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        alert("Data saved successfully!");
      } else {
        alert("Failed to save data.");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      alert("Error saving data.");
    }
  };

  return (
    <div className={`flex flex-col ${isExpanded ? 'lg:w-[90%]' : 'lg:w-[40%]'} w-full h-full transition-all duration-300 bg-white`}>
      {/* Header Section */}
      <div className='flex justify-between items-center p-6 pb-0'>
        <h1 className='font-mono text-lg font-bold'>MedVoiz - AI Report</h1>

        {/* Right-aligned controls */}
        <div className="flex items-center gap-4">
          {/* Auto Scroll Switch */}
          <div className='flex items-center gap-2'>
            <Switch
              checked={autoScroll}
              onCheckedChange={setAutoScroll}
              className='data-[state=checked]:bg-blue-500'
            />
            <span className='text-sm text-gray-600'>Auto Scroll</span>
          </div>

          {/* Username Input */}
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-48"
          />

          {/* Save Button */}
          <Button onClick={handleSave} variant="ghost" size="icon" className="hover:bg-gray-100">
            <Save className="h-4 w-4" />
          </Button>

          {/* Maximize Button */}
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
        </div>
      </div>

      <hr className='mx-6 my-4' />

      {/* Messages Section */}
      <div className='flex-1 overflow-hidden px-6 pb-6'>
        {/* Medical Report Display Area */}
        <div className='h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent'>
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
                  <div className='api-response-html' dangerouslySetInnerHTML={{ __html: item.content }} />
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
  );
};

export default MediaCopilot;