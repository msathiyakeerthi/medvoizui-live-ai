import {FC} from "react";
import {Mic, Clock} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

import {ModeControls} from "./ModeControls";
import TranscriptionControls from "./TranscriptionControls";
import {SettingsPopoverControl} from "./SettingsPopoverControl";
interface IControlsProps {}

const Controls: FC<IControlsProps> = () => {
	return (
		<div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
			<div className='flex flex-col items-center sm:items-start gap-2'>
				<h1 className='font-semibold text-xl text-gray-900'>Live Meeting</h1>
				<div className='flex items-center gap-3'>
					<Badge className='bg-orange-500/90 text-white px-3 py-1 text-xs font-medium rounded-full'>Premium</Badge>
					<div className='flex items-center gap-2 text-gray-600 bg-gray-100 rounded-full px-3 py-1'>
						<Clock className='h-4 w-4' />
						<span className='text-sm'>52:38</span>
					</div>
				</div>
			</div>
			<div className='flex items-center gap-3'>
				<ModeControls />

				<SettingsPopoverControl />
				<Button className='bg-white hover:bg-gray-50 text-gray-700 rounded-full w-10 h-10 p-0 shadow-md transition-all border border-gray-200'>
					<Mic className='h-4 w-4' />
				</Button>
				<TranscriptionControls />
			</div>
		</div>
	);
};
export default Controls;
