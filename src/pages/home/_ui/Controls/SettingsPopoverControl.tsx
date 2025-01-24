import {Button} from "@/components/ui/button";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Settings, BookOpen, Send} from "lucide-react"; // Import the Settings icon
import {Input} from "@/components/ui/input"; // Import the Input component from shadcn/ui
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select"; // Import the Select components from shadcn/ui
import {Label} from "@/components/ui/label"; // Import the Label component from shadcn/ui
import {useGlobal} from "@/provider/GlobalContext";

export function SettingsPopoverControl() {
	const {wordLimit, setWordLimit, sendMode, setSendMode} = useGlobal();

	return (
		<Popover>
			<PopoverTrigger asChild>
				{/* Replace the default button with your styled settings button */}
				<Button className='bg-white hover:bg-gray-50 text-gray-700 rounded-full w-10 h-10 p-0 shadow-md transition-all border border-gray-200 data-[state=open]:bg-blue-500 data-[state=open]:text-white'>
					<Settings className='h-4 w-4' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-40 mt-2'>
				<div className='grid gap-4'>
					<div className='grid gap-4'>
						{/* Input for word limit */}
						<div className='grid gap-1.5'>
							<Label htmlFor='wordLimit' className='flex items-center gap-2'>
								<BookOpen className='h-4 w-4' />
								Word Limit
							</Label>
							<Input
								id='wordLimit'
								value={wordLimit.toString()}
								onChange={e => setWordLimit(parseInt(e.target.value, 10) || 20)}
								type='number'
								placeholder='Word Limit'
								className='focus-visible:ring-2 focus-visible:ring-blue-500'
							/>
						</div>

						{/* Select for send mode */}
						<div className='grid gap-1.5'>
							<Label htmlFor='sendMode' className='flex items-center gap-2'>
								<Send className='h-4 w-4' />
								Send Mode
							</Label>
							<Select value={sendMode} onValueChange={(value: "auto" | "manual") => setSendMode(value)}>
								<SelectTrigger id='sendMode' className='w-full focus-visible:ring-2 focus-visible:ring-blue-500'>
									<SelectValue placeholder='Select send mode' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='auto' className='focus:bg-blue-50'>
										Auto Send (20 words)
									</SelectItem>
									<SelectItem value='manual' className='focus:bg-blue-50'>
										Manual Send (Report Button)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
